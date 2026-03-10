/**
 * useDiscoveryAdapter hook
 * Provides a DiscoveryAdapter implementation that wraps storageUtils
 * Bridges the SDK discovery module with the React app's localStorage
 */

import { useState, useEffect } from "react";
import type { DiscoveryAdapter } from "@/sdk/discovery";
import {
  createDiscoveryAdapterFromStore,
  createSdkStore,
} from "@/sdk/storage/store";
import { localStorageDriver } from "@/sdk/storage/drivers/localStorage";

let browserDiscoveryAdapterPromise: Promise<DiscoveryAdapter> | null = null;

const getBrowserDiscoveryAdapter = async (): Promise<DiscoveryAdapter> => {
  if (!browserDiscoveryAdapterPromise) {
    browserDiscoveryAdapterPromise = createSdkStore({
      driver: localStorageDriver,
    }).then((store) => createDiscoveryAdapterFromStore(store));
  }
  return browserDiscoveryAdapterPromise;
};

/**
 * Hook that returns a DiscoveryAdapter implementation
 * Uses localStorage for persistence via storageUtils
 */
export function useDiscoveryAdapter(): DiscoveryAdapter | null {
  const [adapter, setAdapter] = useState<DiscoveryAdapter | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getBrowserDiscoveryAdapter()
      .then((a) => {
        if (!cancelled) setAdapter(a);
      })
      .catch((error) => {
        console.warn("Failed to initialize discovery adapter", error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return adapter;
}
