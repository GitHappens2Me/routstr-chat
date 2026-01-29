"use client";

import { NPool, NRelay1 } from "@nostrify/nostrify";
import { NostrContext } from "@nostrify/react";
import { type FC, type ReactNode, useRef, useEffect } from "react";
import { useAppContext } from "@/hooks/useAppContext";

interface NostrProviderProps {
  children: ReactNode;
}

/**
 * NostrProvider provides the Nostr context required by @nostrify/react hooks.
 * It initializes an NPool using the relay URLs from the application configuration.
 */
export const NostrProvider: FC<NostrProviderProps> = ({ children }) => {
  const { config } = useAppContext();
  const relays = config.relayUrls;
  const relaysRef = useRef(relays);

  // Keep relaysRef up to date for the pool routers
  useEffect(() => {
    relaysRef.current = relays;
  }, [relays]);

  const pool = useRef<NPool | null>(null);

  if (!pool.current) {
    pool.current = new NPool({
      open(url: string) {
        return new NRelay1(url);
      },
      reqRouter(filters) {
        // Use the latest relays from ref
        return new Map(relaysRef.current.map((url) => [url, filters]));
      },
      eventRouter() {
        // Use the latest relays from ref
        return relaysRef.current;
      },
    });
  }

  return (
    <NostrContext.Provider value={{ nostr: pool.current }}>
      {children}
    </NostrContext.Provider>
  );
};

export default NostrProvider;
