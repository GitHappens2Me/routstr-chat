import { useEffect, useMemo } from "react";
import { useObservableState } from "applesauce-react/hooks";
import type { NostrEvent } from "nostr-tools";
import { useAccountManager } from "@/components/ClientProviders";
import { useAppContext } from "@/hooks/useAppContext";
import type { CalculateTrustScoresOutput } from "@/src/ctxcn/RoutstrChatClient";
import {
  kind0Profiles$,
  kind0Sync$,
  kind1018Events$,
  kind1018Sync$,
  kind1018SyncEose$,
  kind1018TrustScores$,
  type Kind0Profile,
  relayUrls$,
  updateKind1018ETag,
  userPubkey$,
} from "@/hooks/sync";

const THEME_POLL_EVENT_ID =
  "2117b770e05d5f729ed125919514f8552e50df9c3833dec5cf5e99943088865e";

const THEME_OPTION_IDS = {
  light: "DvlMq6JNF",
  dark: "w0H9IdDsU",
  solar: "3BsI7Itoi",
} as const;

const THEME_OPTION_ORDER = ["light", "dark", "solar"] as const;

type ThemeOptionId = (typeof THEME_OPTION_ORDER)[number];

type ThemeVoteStats = {
  optionId: string;
  count: number;
  trustScore: number;
  voterPubkeys: string[];
};

type ThemeVoteStatsByTheme = Record<ThemeOptionId, ThemeVoteStats>;

function extractResponseOptionId(event: NostrEvent): string | null {
  const responseTag = event.tags.find(
    (tag) => Array.isArray(tag) && tag[0] === "response" && !!tag[1]
  );

  return responseTag?.[1] ?? null;
}

function calculateThemeVoteStats(
  events: NostrEvent[],
  trustScores: CalculateTrustScoresOutput["trustScores"]
): ThemeVoteStatsByTheme {
  const scoreByPubkey = new Map<string, number>();
  for (const score of trustScores) {
    scoreByPubkey.set(score.targetPubkey, score.score);
  }

  const latestVoteByPubkey = new Map<string, NostrEvent>();

  for (const event of events) {
    const optionId = extractResponseOptionId(event);
    if (!optionId) continue;

    const existing = latestVoteByPubkey.get(event.pubkey);
    if (!existing) {
      latestVoteByPubkey.set(event.pubkey, event);
      continue;
    }

    if (event.created_at > existing.created_at) {
      latestVoteByPubkey.set(event.pubkey, event);
      continue;
    }

    if (event.created_at === existing.created_at && event.id > existing.id) {
      latestVoteByPubkey.set(event.pubkey, event);
    }
  }

  const stats: ThemeVoteStatsByTheme = {
    light: {
      optionId: THEME_OPTION_IDS.light,
      count: 0,
      trustScore: 0,
      voterPubkeys: [],
    },
    dark: {
      optionId: THEME_OPTION_IDS.dark,
      count: 0,
      trustScore: 0,
      voterPubkeys: [],
    },
    solar: {
      optionId: THEME_OPTION_IDS.solar,
      count: 0,
      trustScore: 0,
      voterPubkeys: [],
    },
  };

  for (const event of latestVoteByPubkey.values()) {
    const optionId = extractResponseOptionId(event);
    if (!optionId) continue;

    const optionKey = THEME_OPTION_ORDER.find(
      (themeOptionId) => THEME_OPTION_IDS[themeOptionId] === optionId
    );
    if (!optionKey) continue;

    stats[optionKey].count += 1;
    stats[optionKey].trustScore += scoreByPubkey.get(event.pubkey) ?? 0;
    stats[optionKey].voterPubkeys.push(event.pubkey);
  }

  return stats;
}

type ThemeVoter = {
  pubkey: string;
  name: string;
  picture?: string;
  trustScore: number;
};

type ThemeVotersByTheme = Record<ThemeOptionId, ThemeVoter[]>;

function toThemeVotersByTheme(
  stats: ThemeVoteStatsByTheme,
  profiles: Record<string, Kind0Profile>,
  trustScores: CalculateTrustScoresOutput["trustScores"]
): ThemeVotersByTheme {
  const scoreByPubkey = new Map<string, number>();
  for (const score of trustScores) {
    scoreByPubkey.set(score.targetPubkey, score.score);
  }

  const buildVoters = (pubkeys: string[]) =>
    pubkeys
      .map((pubkey) => {
        const profile = profiles[pubkey];
        return {
          pubkey,
          name: profile?.name ?? pubkey.slice(0, 12),
          picture: profile?.picture,
          trustScore: scoreByPubkey.get(pubkey) ?? 0,
        };
      })
      .sort((a, b) => b.trustScore - a.trustScore);

  return {
    light: buildVoters(stats.light.voterPubkeys),
    dark: buildVoters(stats.dark.voterPubkeys),
    solar: buildVoters(stats.solar.voterPubkeys),
  };
}

export function useKind1018TrustScores() {
  const { config } = useAppContext();
  const { manager } = useAccountManager();
  const activeAccount = useObservableState(manager.active$);
  const kind1018Events = useObservableState(kind1018Events$) ?? [];
  const trustScores =
    (useObservableState(kind1018TrustScores$) as
      | CalculateTrustScoresOutput["trustScores"]
      | undefined) ?? [];
  const kind0Profiles =
    (useObservableState(kind0Profiles$) as
      | Record<string, Kind0Profile>
      | undefined) ?? {};
  const eose = useObservableState(kind1018SyncEose$) ?? false;

  useEffect(() => {
    if (config.relayUrls.length > 0) {
      console.log(
        "[useKind1018TrustScores] Updating relay URLs:",
        config.relayUrls
      );
      relayUrls$.next(config.relayUrls);
    }
  }, [config.relayUrls]);

  useEffect(() => {
    console.log(
      "[useKind1018TrustScores] Updating active pubkey:",
      activeAccount?.pubkey ?? null
    );
    userPubkey$.next(activeAccount?.pubkey ?? null);
  }, [activeAccount?.pubkey]);

  useEffect(() => {
    console.log("[useKind1018TrustScores] Setting kind 1018 eTag");
    updateKind1018ETag(THEME_POLL_EVENT_ID);
  }, []);

  useEffect(() => {
    const syncSub = kind1018Sync$.subscribe({
      next: (event) => {
        console.log("[useKind1018TrustScores] kind 1018 sync next:", event);
      },
      error: (err) => {
        console.error("[useKind1018TrustScores] kind 1018 sync error:", err);
      },
    });

    const eventsSub = kind1018Events$.subscribe({
      next: (events) => {
        console.log(
          "[useKind1018TrustScores] kind 1018 events next:",
          events.length,
          events
        );
      },
      error: (err) => {
        console.error("[useKind1018TrustScores] kind 1018 events error:", err);
      },
    });

    const kind0SyncSub = kind0Sync$.subscribe({
      next: (event) => {
        console.log("[useKind1018TrustScores] kind 0 sync next:", event);
      },
      error: (err) => {
        console.error("[useKind1018TrustScores] kind 0 sync error:", err);
      },
    });

    return () => {
      syncSub.unsubscribe();
      eventsSub.unsubscribe();
      kind0SyncSub.unsubscribe();
    };
  }, []);

  const totalTrustScore = useMemo(
    () => trustScores.reduce((sum, score) => sum + score.score, 0),
    [trustScores]
  );

  const themeVoteStats = useMemo(
    () => calculateThemeVoteStats(kind1018Events, trustScores),
    [kind1018Events, trustScores]
  );

  const winningTheme = useMemo(() => {
    const orderedStats = THEME_OPTION_ORDER.map((themeId) => ({
      themeId,
      ...themeVoteStats[themeId],
    }));

    return orderedStats.reduce(
      (best, current) => {
        if (!best) return current;
        if (current.count > best.count) return current;
        if (current.count < best.count) return best;
        if (current.trustScore > best.trustScore) return current;
        return best;
      },
      null as (typeof orderedStats)[number] | null
    );
  }, [themeVoteStats]);

  const themeVoters = useMemo(
    () => toThemeVotersByTheme(themeVoteStats, kind0Profiles, trustScores),
    [kind0Profiles, themeVoteStats, trustScores]
  );

  useEffect(() => {
    console.log("[useKind1018TrustScores] eose state:", eose);
  }, [eose]);

  useEffect(() => {
    console.log("[useKind1018TrustScores] trust scores:", trustScores);
  }, [trustScores]);

  useEffect(() => {
    console.log("[useKind1018TrustScores] theme vote stats:", themeVoteStats);
  }, [themeVoteStats]);

  useEffect(() => {
    console.log("[useKind1018TrustScores] total trust score:", totalTrustScore);
  }, [totalTrustScore]);

  return {
    trustScores,
    totalTrustScore,
    themeVoteStats,
    themeVoters,
    winningTheme,
    isLoading: !eose,
  };
}
