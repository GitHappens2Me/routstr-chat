"use client";

import { useState, useEffect } from "react";
import { useKeepAlive } from "@/hooks/useKeepAlive";
import { loadKeepAliveEnabled } from "@/utils/storageUtils";

/**
 * Provider component that enables silent audio keep-alive for the PWA.
 * This prevents mobile browsers from suspending the app when the screen is off.
 *
 * The feature is controlled by a user setting in localStorage and is OFF by default.
 * Place this component near the root of your app to enable keep-alive
 * functionality. It renders no visible UI.
 */
export function KeepAliveProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Load setting from localStorage after mount (client-side only)
    setEnabled(loadKeepAliveEnabled());
  }, []);

  // Initialize keep-alive - it auto-starts on first user interaction if enabled
  useKeepAlive(enabled);

  return <>{children}</>;
}
