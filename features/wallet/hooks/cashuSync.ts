/**
 * Cashu wallet sync using applesauce pattern
 * Compact, reactive event fetching for NIP-60 wallet events
 */
import {
  BehaviorSubject,
  combineLatest,
  filter,
  switchMap,
  tap,
  EMPTY,
  catchError,
  shareReplay,
  distinctUntilChanged,
  map,
  from,
  mergeMap,
} from "rxjs";
import { relayUrls$ } from "@/hooks/useChatSync1081";
import { eventStore, relayPool } from "@/lib/applesauce-core";
import { CASHU_EVENT_KINDS } from "@/lib/cashu";
import type { NostrEvent } from "nostr-tools";

// Debug toggle
const DEBUG = false;
const log = (...args: unknown[]) =>
  DEBUG && console.log("[cashuSync]", ...args);

// User pubkey for cashu sync
export const cashuUserPubkey$ = new BehaviorSubject<string | null>(null);

// Derive filtered streams
const pubkeyDefined$ = cashuUserPubkey$.pipe(
  filter((p): p is string => p !== null),
  distinctUntilChanged(),
  shareReplay(1)
);

const relaysDefined$ = relayUrls$.pipe(
  filter((urls): urls is string[] => urls.length > 0),
  distinctUntilChanged(
    (a, b) => a.length === b.length && a.every((u, i) => u === b[i])
  ),
  shareReplay(1)
);

// EOSE tracking
export const walletEose$ = new BehaviorSubject<boolean>(false);
export const tokensEose$ = new BehaviorSubject<boolean>(false);

// Sync wallet events (kind 17375) - replaceable, fetch latest
export const syncCashuWallet$ = combineLatest([
  pubkeyDefined$,
  relaysDefined$,
]).pipe(
  tap(() => walletEose$.next(false)),
  switchMap(([pubkey, relays]) => {
    log("Syncing wallet for", pubkey.slice(0, 8), "on", relays.length, "relays");
    return relayPool
      .subscription(relays, {
        kinds: [CASHU_EVENT_KINDS.WALLET],
        authors: [pubkey],
        limit: 1,
      })
      .pipe(
        mergeMap((value: unknown) => {
          if (value === "EOSE") {
            log("Wallet EOSE");
            walletEose$.next(true);
            return EMPTY;
          }
          return from([value as NostrEvent]);
        }),
        filter(
          (e): e is NostrEvent =>
            typeof e === "object" && e !== null && "id" in e
        ),
        tap((e) => {
          log("Wallet event:", e.id.slice(0, 8));
          eventStore.add(e);
        }),
        catchError((err) => {
          console.error("[cashuSync] Wallet sync error:", err);
          walletEose$.next(true);
          return EMPTY;
        })
      );
  }),
  shareReplay(1)
);

// Sync token events (kind 7375)
export const syncCashuTokens$ = combineLatest([
  pubkeyDefined$,
  relaysDefined$,
]).pipe(
  tap(() => tokensEose$.next(false)),
  switchMap(([pubkey, relays]) => {
    log("Syncing tokens for", pubkey.slice(0, 8));
    return relayPool
      .subscription(relays, {
        kinds: [CASHU_EVENT_KINDS.TOKEN],
        authors: [pubkey],
        limit: 100,
      })
      .pipe(
        mergeMap((value: unknown) => {
          if (value === "EOSE") {
            log("Tokens EOSE");
            tokensEose$.next(true);
            return EMPTY;
          }
          return from([value as NostrEvent]);
        }),
        filter(
          (e): e is NostrEvent =>
            typeof e === "object" && e !== null && "id" in e
        ),
        tap((e) => {
          log("Token event:", e.id.slice(0, 8));
          eventStore.add(e);
        }),
        catchError((err) => {
          console.error("[cashuSync] Token sync error:", err);
          tokensEose$.next(true);
          return EMPTY;
        })
      );
  }),
  shareReplay(1)
);

// Combined ready state
export const cashuSyncReady$ = combineLatest([walletEose$, tokensEose$]).pipe(
  map(([w, t]) => w && t),
  distinctUntilChanged(),
  shareReplay(1)
);

// Helper to get events from store
export const getCashuWalletEvents = (pubkey: string) =>
  eventStore.getByFilters({
    kinds: [CASHU_EVENT_KINDS.WALLET],
    authors: [pubkey],
  });

export const getCashuTokenEvents = (pubkey: string) =>
  eventStore.getByFilters({
    kinds: [CASHU_EVENT_KINDS.TOKEN],
    authors: [pubkey],
  });
