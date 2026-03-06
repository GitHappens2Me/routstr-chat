import { useEffect, useMemo } from "react";
import { useObservableState } from "applesauce-react/hooks";
import { useAccountManager } from "@/components/ClientProviders";
import { useAppContext } from "@/hooks/useAppContext";
import type { CalculateTrustScoresOutput } from "@/src/ctxcn/RoutstrChatClient";
import {
  kind1018Events$,
  kind1018Sync$,
  kind1018SyncEose$,
  kind1018TrustScores$,
  relayUrls$,
  updateKind1018ETag,
  userPubkey$,
} from "@/hooks/sync";

export function useKind1018TrustScores() {
  const { config } = useAppContext();
  const { manager } = useAccountManager();
  const activeAccount = useObservableState(manager.active$);
  const trustScores =
    (useObservableState(kind1018TrustScores$) as
      | CalculateTrustScoresOutput["trustScores"]
      | undefined) ?? [];
  const eose = useObservableState(kind1018SyncEose$) ?? false;

  useEffect(() => {
    if (config.relayUrls.length > 0) {
      relayUrls$.next(config.relayUrls);
    }
  }, [config.relayUrls]);

  useEffect(() => {
    userPubkey$.next(activeAccount?.pubkey ?? null);
  }, [activeAccount?.pubkey]);

  useEffect(() => {
    updateKind1018ETag(
      "2117b770e05d5f729ed125919514f8552e50df9c3833dec5cf5e99943088865e"
    );
  }, []);

  useEffect(() => {
    const syncSub = kind1018Sync$.subscribe({
      error: (err) => {
        console.error("[useKind1018TrustScores] kind 1018 sync error:", err);
      },
    });

    const eventsSub = kind1018Events$.subscribe({
      error: (err) => {
        console.error("[useKind1018TrustScores] kind 1018 events error:", err);
      },
    });

    return () => {
      syncSub.unsubscribe();
      eventsSub.unsubscribe();
    };
  }, []);

  const totalTrustScore = useMemo(
    () => trustScores.reduce((sum, score) => sum + score.score, 0),
    [trustScores]
  );

  return {
    trustScores,
    totalTrustScore,
    isLoading: !eose,
  };
}
