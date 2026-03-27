import { useState, useEffect, useRef } from "react";
import { createSdkStore, type SdkStore } from "@/sdk/storage/store";
import { localStorageDriver } from "@/sdk/storage/drivers/localStorage";

let globalStore: ReturnType<typeof createSdkStore> | null = null;

const getSdkStore = (): ReturnType<typeof createSdkStore> => {
  if (!globalStore) {
    globalStore = createSdkStore({ driver: localStorageDriver });
  }
  return globalStore;
};

export function useSdkCachedBalance(): number {
  const [cachedBalance, setCachedBalance] = useState(0);
  const storeRef = useRef(getSdkStore());

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const computeBalance = () => {
      const apiKeys = storeRef.current.store.getState().apiKeys;
      const total = apiKeys.reduce((sum, k) => sum + (k.balance || 0), 0);
      setCachedBalance(total);
    };

    computeBalance();
    unsubscribe = storeRef.current.store.subscribe(computeBalance);

    void storeRef.current.hydrate.catch((error) => {
      console.warn("Failed to hydrate store", error);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return cachedBalance;
}
