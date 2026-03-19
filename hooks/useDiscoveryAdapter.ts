import { useState, useEffect, useRef } from "react";
import type { DiscoveryAdapter } from "@/sdk/discovery";
import {
  createDiscoveryAdapterFromStore,
  createSdkStore,
} from "@/sdk/storage/store";
import { localStorageDriver } from "@/sdk/storage/drivers/localStorage";

let browserDiscoveryStore: ReturnType<typeof createSdkStore> | null = null;

const getBrowserDiscoveryStore = (): ReturnType<typeof createSdkStore> => {
  if (!browserDiscoveryStore) {
    browserDiscoveryStore = createSdkStore({
      driver: localStorageDriver,
    });
  }
  return browserDiscoveryStore;
};

export function useDiscoveryAdapter(): DiscoveryAdapter {
  const storeRef = useRef(getBrowserDiscoveryStore());
  const [adapter] = useState(() =>
    createDiscoveryAdapterFromStore(storeRef.current.store)
  );

  useEffect(() => {
    let cancelled = false;
    storeRef.current.hydrate
      .then(() => {
        if (cancelled) return;
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
