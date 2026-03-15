"use client";

import React from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

interface BalanceOverviewTabProps {
  mintSelector?: React.ReactNode;
  truncatedNpub: string;
  displayBalance: string;
  onNavigate: (tab: "receive" | "send") => void;
}

const BalanceOverviewTab: React.FC<BalanceOverviewTabProps> = ({
  mintSelector,
  truncatedNpub,
  displayBalance,
  onNavigate,
}) => {
  return (
    <div className="p-4">
      {/* Mint Selector for Overview - Top Right */}
      {mintSelector && (
        <div className="flex justify-end mb-3">{mintSelector}</div>
      )}

      {/* Balance Display */}
      <div className="text-center mb-6">
        <div className="text-muted-foreground text-sm font-medium mb-1">
          {truncatedNpub}
        </div>
        <div className="text-muted-foreground text-sm mb-2">Balance</div>
        <div className="text-foreground text-2xl font-bold">{displayBalance}</div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onNavigate("receive")}
          className="flex flex-col items-center justify-center gap-2 bg-muted/50 hover:bg-muted border border-border rounded-lg p-6 transition-colors cursor-pointer"
          type="button"
        >
          <ArrowDownLeft className="h-6 w-6 text-muted-foreground" />
          <span className="text-muted-foreground text-sm font-medium">Receive</span>
        </button>

        <button
          onClick={() => onNavigate("send")}
          className="flex flex-col items-center justify-center gap-2 bg-muted/50 hover:bg-muted border border-border rounded-lg p-6 transition-colors cursor-pointer"
          type="button"
        >
          <ArrowUpRight className="h-6 w-6 text-muted-foreground" />
          <span className="text-muted-foreground text-sm font-medium">Send</span>
        </button>
      </div>
    </div>
  );
};

export default BalanceOverviewTab;
