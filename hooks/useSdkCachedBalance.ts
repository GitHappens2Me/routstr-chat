import { useState, useEffect } from "react";
import { createSdkStore, type SdkStore } from "@/sdk/storage/store";
import { localStorageDriver } from "@/sdk/storage/drivers/localStorage";

let storePromise: Promise<SdkStore> | null = null;

const getSdkStore = (): Promise<SdkStore> => {
  if (!storePromise) {
    storePromise = createSdkStore({ driver: localStorageDriver });
  }
  return storePromise;
};

export function useSdkCachedBalance(): number {
  const [cachedBalance, setCachedBalance] = useState(0);

  useEffect(() => {
    let store: SdkStore | null = null;
    let unsubscribe: (() => void) | null = null;

    const initStore = async () => {
      store = await getSdkStore();

      const computeBalance = () => {
        const tokens = store!.getState().cachedTokens;
        const total = tokens.reduce((sum, t) => sum + (t.balance || 0), 0);
        setCachedBalance(total);
      };

      computeBalance();
      unsubscribe = store.subscribe(computeBalance);
    };

    void initStore();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return cachedBalance;
}
