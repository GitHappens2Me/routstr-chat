"use client";

import { useState, useRef, useMemo } from "react";
import { useCashuStore } from "@/features/wallet/state/cashuStore";

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

type TabType = "console" | "wallet" | "chat";

interface DevConsoleTabProps {
  logs?: string[];
}

// Console Tab Content
const ConsoleContent = ({
  logs,
  textAreaRef,
}: {
  logs: string[];
  textAreaRef: React.RefObject<HTMLTextAreaElement | null>;
}) => {
  const [copied, setCopied] = useState(false);
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
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-foreground">Console Logs</h3>
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
    </>
  );
};

// Helper to format timestamp
const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString();
};

// Helper to shorten mint URL for display
const shortenMintUrl = (url: string) => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url.slice(0, 20) + "...";
  }
};

// Wallet Tab Content
const WalletContent = () => {
  const mints = useCashuStore((state) => state.mints);
  const proofs = useCashuStore((state) => state.proofs);

  // Build a map from keyset ID to mint URL
  const keysetToMint = useMemo(() => {
    const map: Record<string, string> = {};
    for (const mint of mints) {
      for (const keyset of mint.keysets || []) {
        map[keyset.id] = mint.url;
      }
    }
    return map;
  }, [mints]);

  // Build a map from event ID to timestamp (from mint events)
  const eventTimestamps = useMemo(() => {
    const map: Record<string, number> = {};
    for (const mint of mints) {
      for (const event of mint.events || []) {
        map[event.id] = event.createdAt;
      }
    }
    return map;
  }, [mints]);

  // Group proofs by eventId with mint breakdown
  const proofsByEventId = useMemo(() => {
    const grouped: Record<
      string,
      {
        count: number;
        totalAmount: number;
        timestamp?: number;
        byMint: Record<string, { count: number; amount: number }>;
      }
    > = {};

    for (const proof of proofs) {
      if (!grouped[proof.eventId]) {
        grouped[proof.eventId] = {
          count: 0,
          totalAmount: 0,
          timestamp: eventTimestamps[proof.eventId],
          byMint: {},
        };
      }
      grouped[proof.eventId].count += 1;
      grouped[proof.eventId].totalAmount += proof.amount;

      // Determine which mint this proof belongs to
      const mintUrl = keysetToMint[proof.id] || "Unknown";
      if (!grouped[proof.eventId].byMint[mintUrl]) {
        grouped[proof.eventId].byMint[mintUrl] = { count: 0, amount: 0 };
      }
      grouped[proof.eventId].byMint[mintUrl].count += 1;
      grouped[proof.eventId].byMint[mintUrl].amount += proof.amount;
    }
    return grouped;
  }, [proofs, keysetToMint, eventTimestamps]);

  // Sort events by timestamp (newest first)
  const sortedEventIds = useMemo(() => {
    return Object.keys(proofsByEventId).sort((a, b) => {
      const tsA = proofsByEventId[a].timestamp || 0;
      const tsB = proofsByEventId[b].timestamp || 0;
      return tsB - tsA;
    });
  }, [proofsByEventId]);

  // Calculate balance per mint using keysets
  const mintBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    for (const mint of mints) {
      const keysetIds = mint.keysets?.map((k) => k.id) || [];
      const mintProofs = proofs.filter((p) => keysetIds.includes(p.id));
      const total = mintProofs.reduce((sum, p) => sum + p.amount, 0);
      balances[mint.url] = total;
    }
    return balances;
  }, [mints, proofs]);

  const totalBalance = proofs.reduce((sum, p) => sum + p.amount, 0);

  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-foreground">Wallet State</h3>
        <span className="text-sm font-mono text-muted-foreground">
          Total: {totalBalance} sats
        </span>
      </div>

      <p className="text-sm text-muted-foreground">
        View wallet event IDs, proof counts, and mint balances.
      </p>

      <div className="flex-1 min-h-0 overflow-auto space-y-4">
        {/* Mint Balances Section */}
        <div className="border border-border rounded-md">
          <div className="px-3 py-2 bg-muted/50 border-b border-border">
            <h4 className="text-sm font-medium text-foreground">
              Mint Balances ({mints.length})
            </h4>
          </div>
          <div className="divide-y divide-border max-h-[200px] overflow-auto">
            {mints.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                No mints configured
              </div>
            ) : (
              mints.map((mint) => (
                <div
                  key={mint.url}
                  className="px-3 py-2 flex items-center justify-between"
                >
                  <span className="text-xs font-mono text-foreground truncate max-w-[70%]">
                    {mint.url}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {mintBalances[mint.url] || 0} sats
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Event IDs Section */}
        <div className="border border-border rounded-md">
          <div className="px-3 py-2 bg-muted/50 border-b border-border">
            <h4 className="text-sm font-medium text-foreground">
              Proofs by Event ID ({sortedEventIds.length})
            </h4>
          </div>
          <div className="divide-y divide-border max-h-[350px] overflow-auto">
            {sortedEventIds.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                No proofs stored
              </div>
            ) : (
              sortedEventIds.map((eventId) => {
                const data = proofsByEventId[eventId];
                return (
                  <div key={eventId} className="px-3 py-2 space-y-1">
                    {/* Event ID and timestamp */}
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-mono text-foreground truncate max-w-[55%]">
                        {eventId}
                      </span>
                      <div className="text-xs font-mono text-muted-foreground text-right shrink-0">
                        <div>
                          {data.count} proofs • {data.totalAmount} sats
                        </div>
                        <div className="text-[10px] opacity-70">
                          {data.timestamp
                            ? formatTimestamp(data.timestamp)
                            : "No timestamp"}
                        </div>
                      </div>
                    </div>
                    {/* Breakdown by mint */}
                    <div className="pl-2 border-l-2 border-border/50 space-y-0.5">
                      {Object.entries(data.byMint).map(
                        ([mintUrl, mintData]) => (
                          <div
                            key={mintUrl}
                            className="flex items-center justify-between text-[10px] text-muted-foreground"
                          >
                            <span className="truncate max-w-[60%]">
                              {shortenMintUrl(mintUrl)}
                            </span>
                            <span>
                              {mintData.count} proofs • {mintData.amount} sats
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{proofs.length} total proofs</span>
        <span>{mints.length} mints</span>
      </div>
    </>
  );
};

// Chat Tab Content (Placeholder)
const ChatContent = () => {
  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-foreground">Chat Debug</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Chat-related debugging information and state.
      </p>

      <div className="flex-1 min-h-0 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">Chat debug information coming soon.</p>
          <p className="text-xs mt-2">
            This tab will display chat state, message history, and sync status.
          </p>
        </div>
      </div>
    </>
  );
};

const DevConsoleTab = ({ logs = placeholderLogs }: DevConsoleTabProps) => {
  const [activeTab, setActiveTab] = useState<TabType>("console");
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const tabs: { id: TabType; label: string }[] = [
    { id: "console", label: "Console" },
    { id: "wallet", label: "Wallet" },
    { id: "chat", label: "Chat" },
  ];

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Tab Navigation */}
      <div className="flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            type="button"
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "console" && (
        <ConsoleContent logs={logs} textAreaRef={textAreaRef} />
      )}
      {activeTab === "wallet" && <WalletContent />}
      {activeTab === "chat" && <ChatContent />}
    </div>
  );
};

export default DevConsoleTab;
