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

  const targetPubkeys = Array.from(
    new Set(responseEvents.map((event) => event.pubkey).filter(Boolean))
  );

  if (targetPubkeys.length === 0) {
    kind1018TrustScores$.next([]);
    return;
  }

  try {
    const { trustScores } =
      await getRoutstrClient().CalculateTrustScores(targetPubkeys);

    kind1018TrustScores$.next(trustScores);
  } catch (err) {
    kind1018TrustScores$.next([]);
    console.error("[taggedEventSync] Failed to fetch trust scores:", err);
  }
}

// Requested non-replaceable kind
export const KIND_1018 = 1018;
export const KIND_0 = 0;

export type Kind0Profile = {
  pubkey: string;
  name: string;
  picture?: string;
};

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
export const kind0SyncEose$ = new BehaviorSubject<boolean>(false);
export const kind0EventReceived$ = new Subject<NostrEvent>();

function extractResponsePubkeys(events: NostrEvent[]): string[] {
  const pubkeys = events
    .filter((event) =>
      event.tags.some(
        (tag) => Array.isArray(tag) && tag[0] === "response" && !!tag[1]
      )
    )
    .map((event) => event.pubkey)
    .filter(
      (pubkey): pubkey is string =>
        typeof pubkey === "string" && pubkey.length > 0
    );

  return Array.from(new Set(pubkeys)).sort();
}

function buildKind0Filter(pubkeys: string[]): NostrFilter {
  const filter: NostrFilter = {
    kinds: [KIND_0],
    authors: pubkeys,
  };

  return filter;
}

function parseKind0ProfileEvent(event: NostrEvent): Kind0Profile {
  const fallbackName = event.pubkey.slice(0, 12);

  try {
    const parsed = JSON.parse(event.content) as {
      name?: string;
      display_name?: string;
      picture?: string;
      nip05?: string;
    };

    const resolvedName =
      (typeof parsed.display_name === "string" && parsed.display_name.trim()) ||
      (typeof parsed.name === "string" && parsed.name.trim()) ||
      (typeof parsed.nip05 === "string" && parsed.nip05.trim()) ||
      fallbackName;

    const picture =
      typeof parsed.picture === "string" && parsed.picture.trim().length > 0
        ? parsed.picture.trim()
        : undefined;

    return {
      pubkey: event.pubkey,
      name: resolvedName,
      picture,
    };
  } catch {
    return {
      pubkey: event.pubkey,
      name: fallbackName,
    };
  }
}

function buildKind1018Filter(eTag: string | null): NostrFilter {
  const filter: NostrFilter = {
    kinds: [KIND_1018],
  };

  if (eTag && eTag.length > 0) {
    filter["#e"] = [eTag];
  }

  return filter;
}

export const kind1018Sync$ = combineLatest([
  relayUrlsDefined$,
  kind1018ETag$.pipe(distinctUntilChanged()),
]).pipe(
  tap(([relays, eTag]) => {
    kind1018SyncEose$.next(false);
  }),
  switchMap(([relays, eTag]) => {
    const filter = buildKind1018Filter(eTag);

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
  rxFilter(([_eTag, eose]) => eose),
  map(([eTag]) => getKind1018Events(eTag)),
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

const kind1018ResponsePubkeys$ = kind1018Events$.pipe(
  map((events) => extractResponsePubkeys(events)),
  distinctUntilChanged(
    (prev, curr) =>
      prev.length === curr.length &&
      prev.every((pubkey, i) => pubkey === curr[i])
  ),
  shareReplay(1)
);

export const kind0Sync$ = combineLatest([
  relayUrlsDefined$,
  kind1018ResponsePubkeys$,
]).pipe(
  tap(([relays, pubkeys]) => {
    kind0SyncEose$.next(false);
  }),
  switchMap(([relays, pubkeys]) => {
    if (pubkeys.length === 0) {
      kind0SyncEose$.next(true);
      return EMPTY;
    }

    const filter = buildKind0Filter(pubkeys);

    return relayPool.subscription(relays, filter).pipe(
      mergeMap((value: unknown) => {
        if (value === "EOSE") {
          kind0SyncEose$.next(true);
          return EMPTY;
        }

        return from([value as NostrEvent]);
      }),
      rxFilter(
        (event): event is NostrEvent =>
          typeof event === "object" &&
          event !== null &&
          "id" in event &&
          (event as NostrEvent).kind === KIND_0
      ),
      tap((event) => {
        eventStore.add(event);
        kind0EventReceived$.next(event);
      }),
      catchError((err) => {
        console.error("[taggedEventSync] Kind 0 subscription error:", err);
        kind0SyncEose$.next(true);
        return EMPTY;
      })
    );
  }),
  shareReplay(1)
);

function getKind0Events(pubkeys: string[]): NostrEvent[] {
  if (pubkeys.length === 0) {
    return [];
  }

  return eventStore.getTimeline({
    kinds: [KIND_0],
    authors: pubkeys,
  });
}

export const kind0Profiles$ = combineLatest([
  kind1018ResponsePubkeys$,
  kind0SyncEose$,
  kind0EventReceived$.pipe(startWith(null as NostrEvent | null)),
]).pipe(
  rxFilter(([_pubkeys, eose]) => eose),
  map(([pubkeys]) => {
    const timeline = getKind0Events(pubkeys);
    const latestByPubkey = new Map<string, NostrEvent>();

    for (const event of timeline) {
      if (!latestByPubkey.has(event.pubkey)) {
        latestByPubkey.set(event.pubkey, event);
      }
    }

    const profiles: Record<string, Kind0Profile> = {};
    for (const [pubkey, event] of latestByPubkey) {
      profiles[pubkey] = parseKind0ProfileEvent(event);
    }

    return profiles;
  }),
  distinctUntilChanged((prev, curr) => {
    const prevKeys = Object.keys(prev);
    const currKeys = Object.keys(curr);
    if (prevKeys.length !== currKeys.length) {
      return false;
    }

    return prevKeys.every((pubkey) => {
      const a = prev[pubkey];
      const b = curr[pubkey];
      return a?.name === b?.name && a?.picture === b?.picture;
    });
  }),
  shareReplay(1)
);
