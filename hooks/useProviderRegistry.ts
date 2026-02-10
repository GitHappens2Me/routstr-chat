/**
 * useProviderRegistry - Creates a concrete ProviderRegistry implementation
 *
 * This hook bridges the SDK's ProviderRegistry interface with the existing
 * provider data storage and fetching logic.
 */

import { useMemo } from "react";
import type { ProviderRegistry } from "@/sdk/wallet/interfaces";
import { getDefaultProviderRegistry } from "@/sdk/storage";

/**
 * Hook that creates a ProviderRegistry for the SDK
 */
export function useProviderRegistry(): ProviderRegistry {
  return useMemo(() => getDefaultProviderRegistry(), []);
}
