/**
 * useStorageAdapter - Creates a concrete StorageAdapter implementation
 *
 * This hook bridges the SDK's StorageAdapter interface with the existing
 * storage utilities (storageUtils.ts).
 */

import { useMemo } from "react";
import type { StorageAdapter } from "@/sdk/wallet/interfaces";
import { getDefaultStorageAdapter } from "@/sdk/storage";

/**
 * Hook that creates a StorageAdapter for the SDK
 */
export function useStorageAdapter(): StorageAdapter {
  return useMemo(() => getDefaultStorageAdapter(), []);
}
