"use client";

import { useState, useRef } from "react";

// Placeholder logs - will be hooked up later
const placeholderLogs = [
  "[2024-01-26 16:30:01] INFO: Application initialized",
  "[2024-01-26 16:30:02] DEBUG: Loading user preferences",
  "[2024-01-26 16:30:03] INFO: Connected to relay wss://relay.example.com",
  "[2024-01-26 16:30:05] WARN: Slow network response detected",
  "[2024-01-26 16:30:10] DEBUG: Fetching models from API",
  "[2024-01-26 16:30:12] INFO: Successfully loaded 15 models",
  "[2024-01-26 16:30:15] ERROR: Failed to sync wallet state",
  "[2024-01-26 16:30:20] INFO: Retry attempt 1/3 for wallet sync",
  "[2024-01-26 16:30:25] INFO: Wallet sync successful",
  "[2024-01-26 16:30:30] DEBUG: User action: opened settings modal",
];

interface DevConsoleTabProps {
  logs?: string[];
}

const DevConsoleTab = ({ logs = placeholderLogs }: DevConsoleTabProps) => {
  const [copied, setCopied] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const logsText = logs.join("\n");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(logsText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      if (textAreaRef.current) {
        textAreaRef.current.select();
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleClear = () => {
    // Placeholder - will be hooked up later
    console.log("Clear logs clicked");
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-foreground">Dev Console</h3>
        <div className="flex gap-2">
          <button
            onClick={handleClear}
            className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-muted transition-colors"
            type="button"
          >
            Clear
          </button>
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 text-sm font-medium text-foreground bg-primary hover:bg-primary/90 rounded-md transition-colors"
            type="button"
          >
            {copied ? "Copied!" : "Copy All"}
          </button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Application logs for debugging purposes. Copy and paste these logs when
        reporting issues.
      </p>

      <div className="flex-1 min-h-0">
        <textarea
          ref={textAreaRef}
          readOnly
          value={logsText}
          className="w-full h-full min-h-[300px] p-3 font-mono text-xs bg-muted/50 border border-border rounded-md text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
          spellCheck={false}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{logs.length} log entries</span>
        <span>Scroll to see more</span>
      </div>
    </div>
  );
};

export default DevConsoleTab;
