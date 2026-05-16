import { useEffect } from "react";
import { discoveryAdapter, hydrate } from "@/sdk/sharedStore";
import type { DiscoveryAdapter } from "@routstr/sdk/discovery";

export function useDiscoveryAdapter(): DiscoveryAdapter {
  useEffect(() => {
    let cancelled = false;
    hydrate
      .then(() => {
        if (cancelled) return;
      })
      .catch((error) => {
        if (cancelled) return;
        console.warn("Failed to initialize discovery adapter", error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return discoveryAdapter;
}
