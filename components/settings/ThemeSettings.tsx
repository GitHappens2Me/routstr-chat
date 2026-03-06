"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Sunrise } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeSettings() {
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
        {themes.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
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
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${
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
