# SDK Modes Implementation Plan

## Overview

The RoutstrClient now supports multiple operational modes to handle different payment and authentication strategies. This document tracks the implementation status and planned behavior for each mode.

## Implemented Modes

Three modes have been added to the `RoutstrClient`:

### 1. xcashu (Default)

**Status:** Implemented (mode flag added, behavior to be wired)

**Intended Behavior:**

- Uses `X-Cashu` header for authentication
- Provider responds with a Cashu token in the initial response
- No refund processing needed (token is consumed in-place by provider)
- Simpler flow: spend → request → done
- Full failover support (spend new token on provider switch)

**Flow:**

1. Client spends tokens via `CashuSpender.spend()` to create a token
2. Token is sent in `Authorization: Bearer <token>` header
3. Provider processes request and returns remaining balance in response
4. No refund call needed (provider already consumed the token)
5. Client updates local balance based on response

**Current State:**

- Mode type defined in `RoutstrClient.ts`
- Constructor accepts mode parameter with default value `"xcashu"`
- `getMode()` method exposed to query active mode
- Existing behavior partially matches (needs update to use X-Cashu header flow)

### 2. lazyrefund

**Status:** Implemented (mode flag added, behavior to be wired)

**Intended Behavior:**

- Creates spending request with ~20% extra margin above required sats
- Keeps balance with the provider based on last use timestamp
- Refunds after a certain time threshold (lazy/deferred refund)
- If a different model requires more sats, tops up the existing token rather than refunding and re-spending
- Reduces mint load by batching or delaying refund operations
- Tracks per-provider balance retention

**Flow:**

1. Calculate required sats for request
2. Add 20% margin: `spendAmount = requiredSats * 1.2`
3. Check if provider already has a retained balance
4. If retained balance exists and is sufficient: use it
5. If retained balance exists but is insufficient for new model: top up (spend additional tokens to existing key) instead of refund + redo
6. Spend tokens via `CashuSpender.spend()`
7. Send request with token
8. Provider returns unused balance
9. Store balance + timestamp per provider (do not refund immediately)
10. On next request to same provider: reuse retained balance if available
11. Refund old retained balances after time threshold expires

**Current State:**

- Mode type defined
- No behavioral changes implemented yet
- Will need: per-provider balance tracking, time-based refund scheduler

### 3. apikeys

**Status:** Implemented (mode flag added, behavior to be wired)

**Shared Storage:**

- Uses the same storage mechanism as lazyrefund mode
- Single API key stored per provider (like tokens in xcashu/lazyrefund)
- Stored persistently - never discarded even with 0 balance

**Intended Behavior:**

- Uses API key authentication instead of Cashu tokens
- Stores and persists API keys for providers permanently
- API keys can have 0 balance - never discard them (always keep stored)
- Uses the stored parent API key to create child keys for parallel requests
- No token spending or refund processing
- Bypasses `CashuSpender` and `RefundManager` for authentication

**Flow:**

1. Retrieve API key from storage for the provider (single key per provider)
2. If no API key exists, prompt user to add one
3. For parallel requests: derive child keys from the stored parent API key
4. Send request with `Authorization: Bearer <child-key>`
5. Track costs per child key for accounting
6. Update API key balance if provided by provider
7. Never remove API key from storage, even if balance is 0
8. On provider switch: use the stored API key for that provider

**Key Concepts:**

- **Parent API Key**: The main API key stored for a provider (one per provider)
- **Child Keys**: Derived keys created from parent for parallel requests to track individual usage/costs
- **Persistent Storage**: API keys remain stored regardless of balance state

**Current State:**

- Mode type defined
- No behavioral changes implemented yet
- Will need: child key derivation logic from stored parent key, cost tracking per child key

## Code Changes (Completed)

### File: `sdk/client/RoutstrClient.ts`

1. Added type definition:

   ```typescript
   export type RoutstrClientMode = "xcashu" | "lazyrefund" | "apikeys";
   ```

2. Added private property:

   ```typescript
   private mode: RoutstrClientMode;
   ```

3. Updated constructor signature:

   ```typescript
   constructor(
     private walletAdapter: WalletAdapter,
     private storageAdapter: StorageAdapter,
     private providerRegistry: ProviderRegistry,
     alertLevel: AlertLevel,
     mode: RoutstrClientMode = "xcashu"
   )
   ```

4. Added getter method:
   ```typescript
   getMode(): RoutstrClientMode {
     return this.mode;
   }
   ```

### File: `plans/sdk-docs.md`

Added "Client Modes" section documenting:

- The three available modes
- Default behavior (xcashu)
- Usage example with mode parameter
- Brief description of each mode's intended behavior

## Next Steps (Pending)

1. **Wire mode into `fetchAIResponse()` flow**
   - Add mode-based conditional logic for token spending
   - Implement lazyrefund delay/batching logic
   - Implement apikeys authentication bypass

2. **Update `CashuSpender` for lazyrefund mode**
   - Add deferred refund queuing
   - Implement batch refund processing

3. **Update `RefundManager` for apikeys mode**
   - Skip refund processing when in apikeys mode
   - Handle API key credential storage/retrieval

4. **Add mode-specific error handling**
   - Different error messages per mode
   - Mode-aware failover behavior

5. **Add tests for each mode**
   - Unit tests for mode selection
   - Integration tests for mode-specific flows

## Design Decisions

- Mode is immutable after construction (set once in constructor)
- Default mode is `"xcashu"` to maintain backward compatibility
- Mode checking happens at runtime via `getMode()` for future extensibility
- Mode-specific behavior will be implemented via conditional logic in existing methods (no major refactoring yet)
