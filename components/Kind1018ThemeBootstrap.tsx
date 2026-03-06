"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useKind1018TrustScores } from "@/hooks/useKind1018TrustScores";

const WINNING_THEME_CACHE_KEY = "kind1018_winning_theme";

type PollTheme = "light" | "dark" | "solar";

function isSolarSyncTime(): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = 7 * 60 + 21;
  const endMinutes = 19 * 60 + 21;
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

function toAppliedTheme(themeId: PollTheme): "light" | "dark" {
  if (themeId === "solar") {
    return isSolarSyncTime() ? "light" : "dark";
  }

  return themeId;
}

export default function Kind1018ThemeBootstrap() {
  const { setTheme } = useTheme();
  const { winningTheme, isLoading } = useKind1018TrustScores();

  useEffect(() => {
    try {
      const cached = localStorage.getItem(WINNING_THEME_CACHE_KEY);
      if (!cached) return;

      const parsed = JSON.parse(cached) as { themeId?: PollTheme };
      if (!parsed.themeId) return;
      setTheme(toAppliedTheme(parsed.themeId));
    } catch {
      // Ignore cache parse failures
    }
  }, [setTheme]);

  useEffect(() => {
    if (isLoading || !winningTheme || winningTheme.count <= 0) {
      return;
    }

    const themeId = winningTheme.themeId;
    setTheme(toAppliedTheme(themeId));
    localStorage.setItem(
      WINNING_THEME_CACHE_KEY,
      JSON.stringify({ themeId, cachedAt: Date.now() })
    );
  }, [isLoading, setTheme, winningTheme]);

  useEffect(() => {
    if (!winningTheme || winningTheme.themeId !== "solar") {
      return;
    }

    const apply = () => setTheme(toAppliedTheme("solar"));
    apply();

    const interval = window.setInterval(apply, 60000);
    return () => window.clearInterval(interval);
  }, [setTheme, winningTheme]);

  return null;
}
