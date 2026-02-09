/**
 * useDiscoveryAdapter hook
 * Provides a DiscoveryAdapter implementation that wraps storageUtils
 * Bridges the SDK discovery module with the React app's localStorage
 */

import { useCallback } from "react";
import type { DiscoveryAdapter } from "@/sdk/discovery";
import type { Model } from "@/types/models";
import type { ProviderInfo } from "@/sdk/core";
import {
  getStorageItem,
  setStorageItem,
  loadDisabledProviders,
  loadBaseUrlsList,
  saveBaseUrlsList,
  loadLastUsedModel,
  saveLastUsedModel,
  loadModelProviderMap,
  saveModelProviderMap,
  getProviderLastUpdate,
  setProviderLastUpdate,
  loadMintsFromAllProviders,
  saveMintsFromAllProviders,
  loadInfoFromAllProviders,
  saveInfoFromAllProviders,
} from "@/utils/storageUtils";

/**
 * Hook that returns a DiscoveryAdapter implementation
 * Uses localStorage for persistence via storageUtils
 */
export function useDiscoveryAdapter(): DiscoveryAdapter {
  // Model caching
  const getCachedModels = useCallback((): Record<string, Model[]> => {
    return getStorageItem<Record<string, Model[]>>(
      "modelsFromAllProviders",
      {}
    );
  }, []);

  const setCachedModels = useCallback(
    (models: Record<string, Model[]>): void => {
      setStorageItem("modelsFromAllProviders", models);
    },
    []
  );

  // Mint caching
  const getCachedMints = useCallback((): Record<string, string[]> => {
    return loadMintsFromAllProviders();
  }, []);

  const setCachedMints = useCallback(
    (mints: Record<string, string[]>): void => {
      saveMintsFromAllProviders(mints);
    },
    []
  );

  // Provider info caching
  const getCachedProviderInfo = useCallback((): Record<string, ProviderInfo> => {
    return loadInfoFromAllProviders();
  }, []);

  const setCachedProviderInfo = useCallback(
    (info: Record<string, ProviderInfo>): void => {
      saveInfoFromAllProviders(info);
    },
    []
  );

  // Provider last update timestamps
  const getProviderLastUpdate = useCallback((baseUrl: string): number | null => {
    return getProviderLastUpdate(baseUrl);
  }, []);

  const setProviderLastUpdate = useCallback(
    (baseUrl: string, timestamp: number): void => {
      setProviderLastUpdate(baseUrl, timestamp);
    },
    []
  );

  // Last used model
  const getLastUsedModel = useCallback((): string | null => {
    return loadLastUsedModel();
  }, []);

  const setLastUsedModel = useCallback((modelId: string): void => {
    saveLastUsedModel(modelId);
  }, []);

  // Model -> provider mapping
  const getModelProviderMap = useCallback((): Record<string, string> => {
    return loadModelProviderMap();
  }, []);

  const setModelProviderMap = useCallback(
    (map: Record<string, string>): void => {
      saveModelProviderMap(map);
    },
    []
  );

  // Disabled providers
  const getDisabledProviders = useCallback((): string[] => {
    return loadDisabledProviders();
  }, []);

  // Base URLs list
  const getBaseUrlsList = useCallback((): string[] => {
    return loadBaseUrlsList();
  }, []);

  const setBaseUrlsList = useCallback((urls: string[]): void => {
    saveBaseUrlsList(urls);
  }, []);

  return {
    getCachedModels,
    setCachedModels,
    getCachedMints,
    setCachedMints,
    getCachedProviderInfo,
    setCachedProviderInfo,
    getProviderLastUpdate,
    setProviderLastUpdate,
    getLastUsedModel,
    setLastUsedModel,
    getModelProviderMap,
    setModelProviderMap,
    getDisabledProviders,
    getBaseUrlsList,
    setBaseUrlsList,
  };
}
