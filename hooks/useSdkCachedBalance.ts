import { useState, useEffect } from "react";
import { store, hydrate } from "@/sdk/sharedStore";

export function useSdkCachedBalance(): number {
  const [cachedBalance, setCachedBalance] = useState(0);

  useEffect(() => {
    const computeBalance = () => {
      const state = store.getState();
      const apiKeyTotal = state.apiKeys.reduce(
        (sum, k) => sum + (k.balance || 0),
        0,
      );
      const childKeyTotal = state.childKeys.reduce(
        (sum, k) => sum + (k.balance || 0),
        0,
      );
      setCachedBalance(apiKeyTotal + childKeyTotal);
    };

    computeBalance();
    const unsubscribe = store.subscribe(computeBalance);

    void hydrate.catch((error) => {
      console.warn("Failed to hydrate store", error);
    });

    // Log cached balance every 5 seconds
    const interval = setInterval(() => {
      const state = store.getState();
      const apiKeyTotal = state.apiKeys.reduce(
        (sum, k) => sum + (k.balance || 0),
        0,
      );
      const childKeyTotal = state.childKeys.reduce(
        (sum, k) => sum + (k.balance || 0),
        0,
      );
      console.log(
        `[useSdkCachedBalance] apiKeys: ${apiKeyTotal} sats | childKeys: ${childKeyTotal} sats | total: ${apiKeyTotal + childKeyTotal} sats`,
      );
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return cachedBalance;
}
