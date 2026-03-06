/**
 * Tagged Event Sync - Separate subscription for non-replaceable tagged events.
 *
 * This module handles kinds that are not parameterized replaceable (no d-tag identity),
 * using event-store timeline queries instead of getReplaceable lookups.
 */

import {
  BehaviorSubject,
  Subject,
  combineLatest,
  filter as rxFilter,
  switchMap,
  tap,
  EMPTY,
  catchError,
  shareReplay,
  mergeMap,
  from,
  startWith,
  map,
  distinctUntilChanged,
} from "rxjs";
import type { NostrEvent, Filter as NostrFilter } from "nostr-tools";
import { eventStore, relayPool } from "@/lib/applesauce-core";
import { relayUrlsDefined$, userPubkeyDefined$ } from "./chatSyncInputs";
import {
  RoutstrChatClient,
  type CalculateTrustScoresOutput,
} from "@/src/ctxcn/RoutstrChatClient";

const DEBUG = false;
const log = (...args: unknown[]) =>
  DEBUG && console.log("[taggedEventSync]", ...args);

let routstrClient: RoutstrChatClient | null = null;

function getRoutstrClient(): RoutstrChatClient {
  if (!routstrClient) {
    routstrClient = new RoutstrChatClient();
  }
  return routstrClient;
}

async function logKind1018TrustScores(events: NostrEvent[]): Promise<void> {
  const targetPubkeys = Array.from(
    new Set(events.map((event) => event.pubkey).filter(Boolean))
  );

  if (targetPubkeys.length === 0) {
    kind1018TrustScores$.next([]);
    return;
  }

  try {
    const { trustScores } =
      await getRoutstrClient().CalculateTrustScores(targetPubkeys);

    kind1018TrustScores$.next(trustScores);
    console.log("[taggedEventSync] kind 1018 trust scores:", trustScores);
  } catch (err) {
    kind1018TrustScores$.next([]);
    console.error("[taggedEventSync] Failed to fetch trust scores:", err);
  }
}

// Requested non-replaceable kind
export const KIND_1018 = 1018;

/**
 * e-tag target for kind 1018 sync.
 * Set this before subscribing to kind1018Sync$.
 */
export const kind1018ETag$ = new BehaviorSubject<string | null>(null);

export function updateKind1018ETag(eTag: string | null): void {
  kind1018ETag$.next(eTag);
}

export const kind1018ETagDefined$ = kind1018ETag$.pipe(
  rxFilter(
    (value): value is string => typeof value === "string" && value.length > 0
  ),
  distinctUntilChanged(),
  shareReplay(1)
);

export const kind1018SyncEose$ = new BehaviorSubject<boolean>(false);
export const kind1018EventReceived$ = new Subject<NostrEvent>();
export const kind1018TrustScores$ = new BehaviorSubject<
  CalculateTrustScoresOutput["trustScores"]
>([]);

function buildKind1018Filter(pubkey: string, eTag: string | null): NostrFilter {
  const filter: NostrFilter = {
    kinds: [KIND_1018],
    authors: [pubkey],
  };

  if (eTag && eTag.length > 0) {
    filter["#e"] = [eTag];
  }

  log("Built kind 1018 filter:", filter);
  return filter;
}

export const kind1018Sync$ = combineLatest([
  userPubkeyDefined$,
  relayUrlsDefined$,
  kind1018ETag$.pipe(distinctUntilChanged()),
]).pipe(
  tap(() => {
    kind1018SyncEose$.next(false);
    log("Starting kind 1018 sync");
  }),
  switchMap(([pubkey, relays, eTag]) => {
    const filter = buildKind1018Filter(pubkey, eTag);

    return relayPool.subscription(relays, filter).pipe(
      mergeMap((value: unknown) => {
        if (value === "EOSE") {
          kind1018SyncEose$.next(true);
          return EMPTY;
        }

        return from([value as NostrEvent]);
      }),
      rxFilter(
        (event): event is NostrEvent =>
          typeof event === "object" && event !== null && "id" in event
      ),
      tap((event) => {
        eventStore.add(event);
        kind1018EventReceived$.next(event);
      }),
      catchError((err) => {
        console.error("[taggedEventSync] Kind 1018 subscription error:", err);
        kind1018SyncEose$.next(true);
        return EMPTY;
      })
    );
  }),
  shareReplay(1)
);

/**
 * Read all kind-1018 events from local eventStore using tag filter.
 */
export function getKind1018Events(
  pubkey: string,
  eTag: string | null
): NostrEvent[] {
  const filter: NostrFilter = {
    kinds: [KIND_1018],
    authors: [pubkey],
  };

  if (eTag && eTag.length > 0) {
    filter["#e"] = [eTag];
  }

  return eventStore.getTimeline(filter);
}

/**
 * Reactive observable that emits all matching events from eventStore.
 */
export const kind1018Events$ = combineLatest([
  userPubkeyDefined$,
  kind1018ETag$,
  kind1018SyncEose$,
  kind1018EventReceived$.pipe(startWith(null as NostrEvent | null)),
]).pipe(
  rxFilter(([_pubkey, _eTag, eose]) => eose),
  map(([pubkey, eTag]) => getKind1018Events(pubkey, eTag)),
  distinctUntilChanged(
    (prev, curr) =>
      prev.length === curr.length &&
      prev.every((event, index) => event.id === curr[index]?.id)
  ),
  tap((events) => {
    void logKind1018TrustScores(events);
  }),
  shareReplay(1)
);
