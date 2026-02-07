/**
 * useWalletAdapter - Creates a concrete WalletAdapter implementation
 *
 * This hook bridges the SDK's WalletAdapter interface with the existing
 * React hooks and state management (useCashuToken, useCashuWallet, cashuStore).
 */

import { useMemo } from "react";
import {
  useCashuStore,
  useCashuWallet,
  useCashuToken,
  calculateBalanceByMint,
} from "@/features/wallet";
import type { WalletAdapter } from "@/sdk/wallet/interfaces";

/**
 * Hook that creates a WalletAdapter for the SDK
 */
export function useWalletAdapter(): WalletAdapter {
  const cashuStore = useCashuStore();
  const { wallet } = useCashuWallet();
  const { sendToken, receiveToken } = useCashuToken();

  return useMemo(() => {
    return {
      /**
       * Get balances for all mints
       */
      async getBalances(): Promise<Record<string, number>> {
        const proofs = cashuStore.getAllProofs
          ? await cashuStore.getAllProofs()
          : cashuStore.proofs || [];

        const { balances } = calculateBalanceByMint(proofs, cashuStore.mints);
        return balances;
      },

      /**
       * Get unit type for each mint
       */
      getMintUnits(): Record<string, string> {
        const units: Record<string, string> = {};
        const proofs = cashuStore.proofs || [];

        for (const proof of proofs) {
          if (proof.mintUrl && proof.unit) {
            units[proof.mintUrl] = proof.unit;
          }
        }

        // Also check mints from store
        for (const mint of cashuStore.mints) {
          if (mint.url && mint.unit) {
            units[mint.url] = mint.unit;
          }
        }

        return units;
      },

      /**
       * Get the currently active mint URL
       */
      getActiveMintUrl(): string | null {
        return cashuStore.activeMintUrl || null;
      },

      /**
       * Create and send a cashu token
       */
      async sendToken(
        mintUrl: string,
        amount: number,
        p2pkPubkey?: string
      ): Promise<string> {
        return sendToken(mintUrl, amount, p2pkPubkey);
      },

      /**
       * Receive/store a cashu token
       */
      async receiveToken(token: string): Promise<any[]> {
        return receiveToken(token);
      },

      /**
       * Check if using NIP-60 wallet
       */
      isUsingNip60(): boolean {
        return cashuStore.getUsingNip60?.() ?? true;
      },
    };
  }, [cashuStore, wallet, sendToken, receiveToken]);
}
