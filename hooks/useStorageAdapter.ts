/**
 * useStorageAdapter - Creates a concrete StorageAdapter implementation
 *
 * This hook bridges the SDK's StorageAdapter interface with the existing
 * storage utilities (storageUtils.ts).
 */

import { useState, useEffect } from "react";
import type { StorageAdapter } from "@/sdk/wallet/interfaces";
import { getDefaultStorageAdapter } from "@/sdk/storage";

/**
 * Hook that creates a StorageAdapter for the SDK
 */
export function useStorageAdapter(): StorageAdapter | null {
  const [adapter, setAdapter] = useState<StorageAdapter | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDefaultStorageAdapter().then((a) => {
      if (!cancelled) setAdapter(a);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return adapter;
}
