/**
 * useStorageAdapter - Creates a concrete StorageAdapter implementation
 *
 * This hook bridges the SDK's StorageAdapter interface with the existing
 * storage utilities (storageUtils.ts).
 */

import { useMemo } from "react";
import type { StorageAdapter, ProviderInfo } from "@/sdk/wallet/interfaces";
import {
  getLocalCashuToken,
  setLocalCashuToken,
  removeLocalCashuToken,
  getLocalCashuTokens,
  loadInfoFromAllProviders,
  saveInfoFromAllProviders,
  loadLastModelsUpdate,
  loadDisabledProviders,
} from "@/utils/storageUtils";
import { getDecodedToken } from "@cashu/cashu-ts";

/**
 * Hook that creates a StorageAdapter for the SDK
 */
export function useStorageAdapter(): StorageAdapter {
  return useMemo(() => {
    return {
      /**
       * Get stored API token for a provider
       */
      getToken(baseUrl: string): string | null {
        return getLocalCashuToken(baseUrl);
      },

      /**
       * Store API token for a provider
       */
      setToken(baseUrl: string, token: string): void {
        setLocalCashuToken(baseUrl, token);
      },

      /**
       * Remove API token for a provider
       */
      removeToken(baseUrl: string): void {
        removeLocalCashuToken(baseUrl);
      },

      /**
       * Get all stored tokens as distribution (baseUrl -> amount in sats)
       */
      getPendingTokenDistribution(): Array<{ baseUrl: string; amount: number }> {
        const tokens = getLocalCashuTokens();
        const distributionMap: Record<string, number> = {};

        for (const entry of tokens) {
          try {
            const decoded = getDecodedToken(entry.token);
            const unitDivisor = decoded.unit === "msat" ? 1000 : 1;
            let sum = 0;
            for (const proof of decoded.proofs) {
              sum += proof.amount / unitDivisor;
            }
            if (sum > 0) {
              distributionMap[entry.baseUrl] =
                (distributionMap[entry.baseUrl] || 0) + sum;
            }
          } catch {
            // Skip malformed tokens
          }
        }

        return Object.entries(distributionMap)
          .map(([baseUrl, amt]) => ({ baseUrl, amount: Math.round(amt) }))
          .sort((a, b) => b.amount - a.amount);
      },

      /**
       * Get the last update timestamp for a provider
       */
      getProviderLastUpdate(baseUrl: string): number | null {
        const timestamps = loadLastModelsUpdate();
        const normalized = baseUrl.endsWith("/")
          ? baseUrl
          : `${baseUrl}/`;
        return timestamps[normalized] || null;
      },

      /**
       * Save provider info to cache
       */
      saveProviderInfo(baseUrl: string, info: ProviderInfo): void {
        const allInfo = loadInfoFromAllProviders();
        const normalized = baseUrl.endsWith("/")
          ? baseUrl
          : `${baseUrl}/`;
        allInfo[normalized] = info;
        saveInfoFromAllProviders(allInfo);
      },

      /**
       * Get cached provider info
       */
      getProviderInfo(baseUrl: string): ProviderInfo | null {
        const allInfo = loadInfoFromAllProviders();
        const normalized = baseUrl.endsWith("/")
          ? baseUrl
          : `${baseUrl}/`;
        return allInfo[normalized] || null;
      },
    };
  }, []);
}
