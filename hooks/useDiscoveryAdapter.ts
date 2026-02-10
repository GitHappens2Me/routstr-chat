/**
 * useDiscoveryAdapter hook
 * Provides a DiscoveryAdapter implementation that wraps storageUtils
 * Bridges the SDK discovery module with the React app's localStorage
 */

import { useMemo } from "react";
import type { DiscoveryAdapter } from "@/sdk/discovery";
import { getDefaultDiscoveryAdapter } from "@/sdk/storage";

/**
 * Hook that returns a DiscoveryAdapter implementation
 * Uses localStorage for persistence via storageUtils
 */
export function useDiscoveryAdapter(): DiscoveryAdapter {
  return useMemo(() => getDefaultDiscoveryAdapter(), []);
}
