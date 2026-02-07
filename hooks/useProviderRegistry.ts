/**
 * useProviderRegistry - Creates a concrete ProviderRegistry implementation
 *
 * This hook bridges the SDK's ProviderRegistry interface with the existing
 * provider data storage and fetching logic.
 */

import { useMemo, useCallback } from "react";
import type { ProviderRegistry, ProviderInfo } from "@/sdk/wallet/interfaces";
import type { Model } from "@/types/models";
import {
  getStorageItem,
  loadMintsFromAllProviders,
  loadDisabledProviders,
  loadInfoFromAllProviders,
  saveInfoFromAllProviders,
} from "@/utils/storageUtils";

/**
 * Hook that creates a ProviderRegistry for the SDK
 */
export function useProviderRegistry(): ProviderRegistry {
  return useMemo(() => {
    return {
      /**
       * Get all models available from a provider
       */
      getModelsForProvider(baseUrl: string): Model[] {
        const allProviders = getStorageItem<Record<string, Model[]>>(
          "modelsFromAllProviders",
          {}
        );
        const normalized = baseUrl.endsWith("/")
          ? baseUrl
          : `${baseUrl}/`;
        return allProviders[normalized] || [];
      },

      /**
       * Get list of disabled provider URLs
       */
      getDisabledProviders(): string[] {
        return loadDisabledProviders();
      },

      /**
       * Get mints accepted by a provider
       */
      getProviderMints(baseUrl: string): string[] {
        const allMints = loadMintsFromAllProviders();
        const normalized = baseUrl.endsWith("/")
          ? baseUrl
          : `${baseUrl}/`;
        return allMints[normalized] || [];
      },

      /**
       * Get provider info (cached or fetch fresh)
       */
      getProviderInfo: useCallback(
        async (baseUrl: string): Promise<ProviderInfo | null> => {
          const normalized = baseUrl.endsWith("/")
            ? baseUrl
            : `${baseUrl}/`;

          // Check cache first
          const allInfo = loadInfoFromAllProviders();
          const cached = allInfo[normalized];
          if (cached) {
            return cached;
          }

          // Fetch fresh
          try {
            const response = await fetch(`${normalized}v1/info`);
            if (!response.ok) {
              throw new Error(`Failed ${response.status}`);
            }
            const info = await response.json();

            // Cache the result
            allInfo[normalized] = info;
            saveInfoFromAllProviders(allInfo);

            return info;
          } catch (error) {
            console.warn(
              `Failed to fetch provider info from ${normalized}:`,
              error
            );
            return null;
          }
        },
        []
      ),

      /**
       * Get all providers with their models
       */
      getAllProvidersModels(): Record<string, Model[]> {
        return getStorageItem<Record<string, Model[]>>(
          "modelsFromAllProviders",
          {}
        );
      },
    };
  }, []);
}
