"use client";

import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useObservableState } from "applesauce-react/hooks";
import {
  Sun,
  Moon,
  Monitor,
  Sunrise,
  ChevronsUpDown,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAccountManager } from "@/components/ClientProviders";
import { useAppContext } from "@/hooks/useAppContext";
import { CONFIG_TYPES, publishConfig, theme$, userSigner$ } from "@/hooks/sync";

const WINNING_THEME_CACHE_KEY = "kind1018_winning_theme";

function getColorFromPubkey(pubkey: string): string {
  let hash = 0;
  for (let i = 0; i < pubkey.length; i++) {
    hash = ((hash << 5) - hash + pubkey.charCodeAt(i)) | 0;
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 65%, 45%)`;
}

type ThemeVoter = {
  pubkey: string;
  name: string;
  picture?: string;
  trustScore: number;
};

type ThemeVoteStatsByTheme = {
  light: {
    optionId: string;
    count: number;
    trustScore: number;
    voterPubkeys: string[];
  };
  dark: {
    optionId: string;
    count: number;
    trustScore: number;
    voterPubkeys: string[];
  };
  solar: {
    optionId: string;
    count: number;
    trustScore: number;
    voterPubkeys: string[];
  };
};

type ThemeVotersByTheme = {
  light: ThemeVoter[];
  dark: ThemeVoter[];
  solar: ThemeVoter[];
};

type ThemeButtonId = "light" | "dark" | "solar" | "system";
type PollThemeId = Exclude<ThemeButtonId, "system">;
type ThemeConfig = "light-theme" | "dark-theme" | "solar-sync";

type WinningTheme = {
  themeId: Exclude<ThemeButtonId, "system">;
  optionId: string;
  count: number;
  trustScore: number;
} | null;

interface ThemeSettingsProps {
  themeVoteStats: ThemeVoteStatsByTheme;
  themeVoters: ThemeVotersByTheme;
  winningTheme: WinningTheme;
}

export default function ThemeSettings({
  themeVoteStats,
  themeVoters,
  winningTheme,
}: ThemeSettingsProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { config } = useAppContext();
  const { manager } = useAccountManager();
  const activeAccount = useObservableState(manager.active$);
  const syncedTheme = useObservableState(theme$);
  const hasSyncedTheme = !!syncedTheme && syncedTheme !== "unset";
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [solarSyncActive, setSolarSyncActive] = useState(false);
  const [solarMode, setSolarMode] = useState(false);
  const [openVoterList, setOpenVoterList] = useState<PollThemeId | null>(null);
  const [isUserSovereign, setIsUserSovereign] = useState(false);

  useEffect(() => {
    setIsUserSovereign(hasSyncedTheme);
  }, [hasSyncedTheme]);

  useEffect(() => {
    if (syncedTheme === "solar-sync") {
      setSolarMode(true);
    }
  }, [syncedTheme]);

  useEffect(() => {
    if (winningTheme?.themeId === "solar") {
      setSolarMode(true);
    }
  }, [winningTheme]);

  const mapThemeToConfig = (id: ThemeButtonId): ThemeConfig | null => {
    if (id === "light") return "light-theme";
    if (id === "dark") return "dark-theme";
    if (id === "solar") return "solar-sync";
    return null;
  };

  const publishThemeSelection = useCallback(
    async (id: ThemeButtonId) => {
      const configTheme = mapThemeToConfig(id);
      if (!configTheme || config.relayUrls.length === 0 || !activeAccount) {
        return;
      }

      const signerInfo = userSigner$.getValue();
      if (!signerInfo) {
        return;
      }

      try {
        await publishConfig(
          CONFIG_TYPES.THEME,
          configTheme,
          signerInfo,
          config.relayUrls
        );
      } catch (error) {
        console.error("[ThemeSettings] Failed to publish theme config:", error);
        toast.error("Failed to sync theme to Nostr");
      }
    },
    [activeAccount, config.relayUrls]
  );

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

  const themes: {
    id: ThemeButtonId;
    label: string;
    icon: LucideIcon;
  }[] = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "solar", label: "Solar Sync", icon: Sunrise },
    { id: "system", label: "System", icon: Monitor },
  ];

  const getVoteMeta = (themeId: (typeof themes)[number]["id"]) => {
    if (themeId === "system") {
      return null;
    }

    const stats = themeVoteStats[themeId];
    const voters = themeVoters[themeId] ?? [];
    return {
      votes: stats?.count ?? 0,
      trust: (stats?.trustScore ?? 0).toFixed(2),
      voters,
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
      <div className="bg-muted/50 border border-border rounded-md p-1">
        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-1">
          {!isUserSovereign && winningTheme && winningTheme.count > 0 && (
            <div className="absolute inset-0 bg-background/20 backdrop-blur-sm flex items-center justify-center gap-2 rounded-md z-10">
              <span className="text-xs font-medium text-foreground">
                Set by Nostr Defaults
              </span>
              <button
                type="button"
                onClick={() => setIsUserSovereign(hasSyncedTheme)}
                className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity"
              >
                Override
              </button>
            </div>
          )}
          {themes.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={async () => {
                setIsUserSovereign(hasSyncedTheme);
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

                await publishThemeSelection(id);
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
          ))}
        </div>

        <div className="mt-1 grid grid-cols-2 sm:grid-cols-4 gap-1">
          {themes.map(({ id }) => {
            const voteMeta = getVoteMeta(id);
            const isPollWinner = winningTheme?.count
              ? winningTheme.themeId === id
              : false;

            return (
              <div
                key={id}
                className="h-12 px-1 text-[11px] text-muted-foreground leading-tight"
              >
                {voteMeta ? (
                  <div className="relative group">
                    <div className="flex justify-center">
                      <span
                        className={`rounded px-1 py-0.5 ${
                          isPollWinner
                            ? "bg-foreground/10 text-foreground font-semibold"
                            : "text-foreground/80"
                        }`}
                      >
                        {voteMeta.trust} ({voteMeta.votes} votes)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (id === "system") return;
                        setOpenVoterList((current) =>
                          current === id ? null : (id as PollThemeId)
                        );
                      }}
                      className="mt-1 w-full flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded py-0.5 px-1 transition-colors"
                    >
                      <div className="flex items-center">
                        {voteMeta.voters.slice(0, 4).map((voter, index) => (
                          <div
                            key={voter.pubkey}
                            className="h-4 w-4 rounded-full border border-background overflow-hidden bg-muted"
                            style={{ marginLeft: index === 0 ? 0 : -4 }}
                          >
                            {voter.picture ? (
                              <img
                                src={voter.picture}
                                alt={voter.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div
                                className="h-full w-full flex items-center justify-center text-[8px] text-white font-medium"
                                style={{
                                  backgroundColor: getColorFromPubkey(
                                    voter.pubkey
                                  ),
                                }}
                              >
                                {voter.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        ))}
                        {voteMeta.voters.length > 4 ? (
                          <span className="ml-1 text-[10px] text-foreground/70">
                            +{voteMeta.voters.length - 4}
                          </span>
                        ) : null}
                      </div>
                      <ChevronsUpDown className="h-3 w-3" />
                    </button>
                    <div
                      className={`absolute left-0 bottom-full mb-2 z-50 min-w-52 max-w-64 rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-md transition-opacity ${
                        openVoterList === id
                          ? "opacity-100 pointer-events-auto"
                          : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
                      }`}
                    >
                      <div className="text-xs font-medium mb-2">Voters</div>
                      {voteMeta.voters.length > 0 ? (
                        <div className="max-h-44 overflow-y-auto space-y-1">
                          {voteMeta.voters.map((voter) => (
                            <div
                              key={voter.pubkey}
                              className="flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {voter.picture ? (
                                  <img
                                    src={voter.picture}
                                    alt={voter.name}
                                    className="h-4 w-4 rounded-full object-cover border border-border"
                                  />
                                ) : (
                                  <div
                                    className="h-4 w-4 rounded-full border border-border flex items-center justify-center text-[8px] text-white font-medium"
                                    style={{
                                      backgroundColor: getColorFromPubkey(
                                        voter.pubkey
                                      ),
                                    }}
                                  >
                                    {voter.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span className="truncate">{voter.name}</span>
                              </div>
                              <span className="text-foreground/70 tabular-nums">
                                {voter.trustScore.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          No voters yet
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-foreground/40 mt-2">
        {solarMode ? (
          isUserSovereign ? (
            <span className="text-foreground/70">
              You are Sovereign — Solar Sync: Light{" "}
              {solarSyncActive ? "now" : ""} (7:21 AM - 7:21 PM)
            </span>
          ) : (
            `Solar Sync: Light ${solarSyncActive ? "now" : ""} (7:21 AM - 7:21 PM)`
          )
        ) : isUserSovereign ? (
          <span className="text-foreground/70">
            You are Sovereign — Using {theme} theme
          </span>
        ) : theme === "system" ? (
          "Theme follows your system preferences"
        ) : (
          `Using ${theme} theme`
        )}
      </p>
    </div>
  );
}
