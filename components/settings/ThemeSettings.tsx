"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Sunrise } from "lucide-react";
import { useEffect, useState } from "react";

type ThemeVoteStatsByTheme = {
  light: { optionId: string; count: number; trustScore: number };
  dark: { optionId: string; count: number; trustScore: number };
  solar: { optionId: string; count: number; trustScore: number };
};

type WinningTheme = {
  themeId: "light" | "dark" | "solar";
  optionId: string;
  count: number;
  trustScore: number;
} | null;

interface ThemeSettingsProps {
  themeVoteStats: ThemeVoteStatsByTheme;
  winningTheme: WinningTheme;
  isLoadingThemeVotes: boolean;
}

export default function ThemeSettings({
  themeVoteStats,
  winningTheme,
  isLoadingThemeVotes,
}: ThemeSettingsProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [solarSyncActive, setSolarSyncActive] = useState(false);
  const [solarMode, setSolarMode] = useState(false);

  const isSolarSyncTime = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentMinutes = hours * 60 + minutes;
    const startMinutes = 7 * 60 + 21; // 7:21 AM
    const endMinutes = 19 * 60 + 21; // 7:21 PM
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  };

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString());

      if (solarMode) {
        const shouldBeLight = isSolarSyncTime();
        setSolarSyncActive(shouldBeLight);
        if (shouldBeLight && resolvedTheme !== "light") {
          setTheme("light");
        } else if (!shouldBeLight && resolvedTheme !== "dark") {
          setTheme("dark");
        }
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [solarMode, resolvedTheme, setTheme]);

  useEffect(() => {
    if (
      !mounted ||
      isLoadingThemeVotes ||
      !winningTheme ||
      winningTheme.count <= 0
    ) {
      return;
    }

    if (winningTheme.themeId === "solar") {
      setSolarMode(true);
      if (isSolarSyncTime()) {
        if (theme !== "light") {
          setTheme("light");
        }
      } else if (theme !== "dark") {
        setTheme("dark");
      }
      return;
    }

    setSolarMode(false);
    if (theme !== winningTheme.themeId) {
      setTheme(winningTheme.themeId);
    }
  }, [isLoadingThemeVotes, mounted, setTheme, theme, winningTheme]);

  if (!mounted) {
    return (
      <div className="mb-6">
        <h3 className="text-sm font-medium text-foreground/80 mb-2">
          Theme{" "}
          {currentTime && (
            <span className="font-normal text-muted-foreground ml-2">
              {currentTime}
            </span>
          )}
        </h3>
        <div className="bg-muted/50 border border-border rounded-md p-1 flex gap-1">
          <div className="flex-1 h-9 bg-muted rounded animate-pulse" />
          <div className="flex-1 h-9 bg-muted rounded animate-pulse" />
          <div className="flex-1 h-9 bg-muted rounded animate-pulse" />
          <div className="flex-1 h-9 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const themes = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "solar", label: "Solar Sync", icon: Sunrise },
    { id: "system", label: "System", icon: Monitor },
  ] as const;

  const getVoteMeta = (themeId: (typeof themes)[number]["id"]) => {
    if (themeId === "system") {
      return null;
    }

    const stats = themeVoteStats[themeId];
    return {
      votes: stats?.count ?? 0,
      trust: (stats?.trustScore ?? 0).toFixed(4),
    };
  };

  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-foreground/80 mb-2">
        Theme{" "}
        {currentTime && (
          <span className="font-normal text-muted-foreground ml-2">
            {currentTime}
          </span>
        )}
      </h3>
      <div className="bg-muted/50 border border-border rounded-md p-1 grid grid-cols-2 sm:grid-cols-4 gap-1">
        {themes.map(({ id, label, icon: Icon }) => {
          const voteMeta = getVoteMeta(id);
          const isPollWinner = winningTheme?.count
            ? winningTheme.themeId === id
            : false;

          return (
            <div key={id} className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => {
                  if (id === "solar") {
                    setSolarMode(true);
                    if (isSolarSyncTime()) {
                      setTheme("light");
                    } else {
                      setTheme("dark");
                    }
                  } else {
                    setSolarMode(false);
                    setTheme(id);
                  }
                }}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${
                  (id === "solar" && solarMode) || theme === id
                    ? "bg-muted text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>

              <div className="h-9 px-1 text-[11px] text-muted-foreground leading-tight">
                {voteMeta ? (
                  <>
                    <div>
                      Trust:{" "}
                      <span className="text-foreground/70">
                        {voteMeta.trust}
                      </span>
                    </div>
                    <div>
                      Votes:{" "}
                      <span className="text-foreground/70">
                        {voteMeta.votes}
                      </span>
                      {isPollWinner ? (
                        <span className="ml-1 text-foreground/70">(top)</span>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="pt-2">No poll stats</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-foreground/40 mt-2">
        {theme === "system"
          ? "Theme follows your system preferences"
          : solarMode
            ? `Solar Sync: Light ${solarSyncActive ? "now" : ""} (7:21 AM - 7:21 PM)`
            : `Using ${theme} theme`}
      </p>
    </div>
  );
}
