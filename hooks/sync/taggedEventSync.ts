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
import { relayUrlsDefined$ } from "./chatSyncInputs";
import {
  RoutstrChatClient,
  type CalculateTrustScoresOutput,
} from "@/src/ctxcn/RoutstrChatClient";

const DEBUG = true;
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
  const responseEvents = events.filter((event) =>
    event.tags.some(
      (tag) => Array.isArray(tag) && tag[0] === "response" && !!tag[1]
    )
  );

  log(
    "Calculating trust scores from response events:",
    responseEvents.length,
    responseEvents
  );
  const targetPubkeys = Array.from(
    new Set(responseEvents.map((event) => event.pubkey).filter(Boolean))
  );

  log("Target pubkeys for trust scores:", targetPubkeys);

  if (targetPubkeys.length === 0) {
    log("No target pubkeys found, resetting trust scores");
    kind1018TrustScores$.next([]);
    return;
  }

  try {
    log("Calling CalculateTrustScores for pubkeys:", targetPubkeys);
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
  log("Updating kind 1018 eTag:", eTag);
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

function buildKind1018Filter(eTag: string | null): NostrFilter {
  const filter: NostrFilter = {
    kinds: [KIND_1018],
  };

  if (eTag && eTag.length > 0) {
    filter["#e"] = [eTag];
  }

  log("Built kind 1018 filter:", filter);
  return filter;
}

export const kind1018Sync$ = combineLatest([
  relayUrlsDefined$,
  kind1018ETag$.pipe(distinctUntilChanged()),
]).pipe(
  tap(([relays, eTag]) => {
    kind1018SyncEose$.next(false);
    log("Starting kind 1018 sync", {
      relayCount: relays.length,
      eTag,
    });
  }),
  switchMap(([relays, eTag]) => {
    const filter = buildKind1018Filter(eTag);
    log("Subscribing to relays with filter", { relays, filter });

    return relayPool.subscription(relays, filter).pipe(
      mergeMap((value: unknown) => {
        log("kind1018 subscription emitted value:", value);
        if (value === "EOSE") {
          kind1018SyncEose$.next(true);
          log("Received EOSE for kind 1018 sync");
          return EMPTY;
        }

        return from([value as NostrEvent]);
      }),
      rxFilter(
        (event): event is NostrEvent =>
          typeof event === "object" && event !== null && "id" in event
      ),
      tap((event) => {
        log("Received kind 1018 event", {
          id: event.id,
          pubkey: event.pubkey,
          created_at: event.created_at,
          tags: event.tags,
        });
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
export function getKind1018Events(eTag: string | null): NostrEvent[] {
  const filter: NostrFilter = {
    kinds: [KIND_1018],
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
  kind1018ETag$,
  kind1018SyncEose$,
  kind1018EventReceived$.pipe(startWith(null as NostrEvent | null)),
]).pipe(
  tap(([eTag, eose, lastEvent]) => {
    log("kind1018Events$ combineLatest emission", {
      eTag,
      eose,
      lastEventId: lastEvent?.id ?? null,
    });
  }),
  rxFilter(([_eTag, eose]) => eose),
  tap(([eTag]) => {
    log("kind1018Events$ passed EOSE filter", { eTag });
  }),
  map(([eTag]) => getKind1018Events(eTag)),
  tap((events) => {
    log("kind1018Events$ fetched from eventStore", {
      count: events.length,
      eventIds: events.map((event) => event.id),
    });
  }),
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
