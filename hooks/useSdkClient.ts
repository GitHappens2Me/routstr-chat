import { useEffect, useState } from "react";
import {
  createProviderRegistryFromStore,
  createSdkStore,
  createStorageAdapterFromStore,
} from "@/sdk/storage/store";
import { localStorageDriver } from "@/sdk/storage/drivers/localStorage";
import type { StorageAdapter, ProviderRegistry } from "@/sdk/wallet/interfaces";
import {
  RoutstrClient,
  type RoutstrClientMode,
} from "@/sdk/client/RoutstrClient";
import type { WalletAdapter } from "@/sdk/wallet/interfaces";

interface UseSdkClientResult {
  client: RoutstrClient | null;
  isReady: boolean;
  error: Error | null;
}

export function useSdkClient(
  walletAdapter: WalletAdapter | null,
  mode: RoutstrClientMode = "xcashu"
): UseSdkClientResult {
  const [deps, setDeps] = useState<{
    storageAdapter: StorageAdapter;
    providerRegistry: ProviderRegistry;
  } | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [client, setClient] = useState<RoutstrClient | null>(null);

  useEffect(() => {
    let cancelled = false;
    void createSdkStore({ driver: localStorageDriver })
      .then((store) => {
        if (cancelled) return;
        const storageAdapter = createStorageAdapterFromStore(store);
        const providerRegistry = createProviderRegistryFromStore(store);
        if (cancelled) return;
        setDeps({ storageAdapter, providerRegistry });
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(
          e instanceof Error ? e : new Error("Failed to load SDK dependencies")
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!walletAdapter || !deps) {
      setClient(null);
      return;
    }

    const nextClient = new RoutstrClient(
      walletAdapter,
      deps.storageAdapter,
      deps.providerRegistry,
      "min",
      mode
    );
    setClient(nextClient);
  }, [walletAdapter, deps, mode]);

  return {
    client,
    isReady: Boolean(client) && !error,
    error,
  };
}
