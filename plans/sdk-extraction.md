# Routstr SDK Extraction Plan

## Goal

Extract the core Routstr API interaction logic and Cashu spending logic into a reusable, framework-agnostic SDK. This will decouple the business logic from React hooks and UI components, making it easier to test, reuse, and maintain.

## Core Components to Extract

### 1. Model & Provider Discovery (`hooks/useApiState.ts`)

- **Provider Bootstrapping**: Fetch available providers from the provider directory.
- **Model Fetching**: Fetch models from each provider's `/v1/models` endpoint.
- **Model Caching**: Cache models by provider via the SDK storage layer (localStorage in browser, sqlite in Node).
- **Cache Invalidation**: Track last update timestamp per provider (21-minute TTL).
- **Mint Discovery**: Fetch mints from each provider's `/v1/info` endpoint.
- **Best-Price Selection**: Select cheapest model across providers for a given model ID.
- **Model Selection Strategy**: Auto-select best available model based on balance and recommendations.
- **Base URL Management**: Store and select provider base URLs via SDK storage, filter for Tor compatibility.

### 2. API Logic (`utils/apiUtils.ts`)

- **Request Handling**: `routstrRequest` (token management, headers, retries).
- **Error Handling**: `handleApiError` (402, 401, 500 handling, refund triggering).
- **Provider Switching**: `findNextBestProvider` (failover logic).
- **Streaming**: `processStreamingResponse` and `processNonStreamingResponse`.
- **Main Flow**: `fetchAIResponse` (orchestration of the above).

### 3. Wallet Logic (`hooks/useCashuWithXYZ.ts` & `utils/cashuUtils.ts`)

- **Spending Logic**: `spendCashu` (mint selection, balance checks, retries, critical section management).
- **Refund Logic**: `unifiedRefund` (API call + wallet receive).
- **Mint Selection**: `selectMintWithBalance`.

## Proposed Architecture

We will create a new directory `sdk/` with the following structure:

```
sdk/
├── index.ts              # Main barrel export
├── core/
│   ├── index.ts          # Barrel export
│   ├── types.ts          # Shared types (Message, Model, SpendResult, etc.)
│   └── errors.ts         # Custom error classes (InsufficientBalanceError, etc.)
├── wallet/
│   ├── index.ts          # Barrel export
│   ├── interfaces.ts     # WalletAdapter, StorageAdapter, ProviderRegistry
│   ├── CashuSpender.ts   # Core spending & refund logic
│   └── RefundManager.ts  # Refund-specific logic (extracted from cashuUtils)
├── discovery/
│   ├── index.ts          # Barrel export
│   ├── ModelManager.ts   # Model fetching, caching, selection, provider discovery
│   └── MintDiscovery.ts  # Mint discovery logic (extracted from useApiState)
├── client/
│   ├── index.ts          # Barrel export
│   ├── RoutstrClient.ts  # Main API client (extracted from apiUtils)
│   ├── ProviderManager.ts # Provider switching/failover logic
│   └── StreamProcessor.ts # Streaming response handling
├── storage/
│   ├── index.ts           # Default drivers + default adapters
│   ├── store.ts           # Zustand vanilla store + adapter factories
│   ├── keys.ts            # SDK storage keys
│   ├── types.ts           # Storage driver/state types
│   └── drivers/
│       ├── localStorage.ts # Browser localStorage driver
│       ├── sqlite.ts      # Node sqlite driver (better-sqlite3)
│       └── memory.ts      # Fallback memory driver
└── utils/
    ├── index.ts          # Barrel export
    └── helpers.ts        # Shared utility functions
```

## Abstraction Strategy

To make the code reusable and independent of React, we need to abstract dependencies via interfaces:

### 1. DiscoveryAdapter Interface

Provides access to cached provider and model data for discovery operations. Implemented by the SDK's default storage layer.

```typescript
interface DiscoveryAdapter {
  /** Get cached models from all providers */
  getCachedModels(): Record<string, Model[]>;

  /** Save models cache */
  setCachedModels(models: Record<string, Model[]>): void;

  /** Get cached mints from all providers */
  getCachedMints(): Record<string, string[]>;

  /** Save mints cache */
  setCachedMints(mints: Record<string, string[]>): void;

  /** Get cached provider info from all providers */
  getCachedProviderInfo(): Record<string, any>;

  /** Save provider info cache */
  setCachedProviderInfo(info: Record<string, any>): void;

  /** Get provider last update timestamps */
  getProviderLastUpdate(baseUrl: string): number | null;

  /** Set provider last update timestamp */
  setProviderLastUpdate(baseUrl: string, timestamp: number): void;

  /** Get last used model ID */
  getLastUsedModel(): string | null;

  /** Save last used model ID */
  setLastUsedModel(modelId: string): void;

  /** Get model -> provider mapping */
  getModelProviderMap(): Record<string, string>;

  /** Save model -> provider mapping */
  setModelProviderMap(map: Record<string, string>): void;

  /** Get disabled providers list */
  getDisabledProviders(): string[];

  /** Get base URLs list */
  getBaseUrlsList(): string[];

  /** Save base URLs list */
  setBaseUrlsList(urls: string[]): void;
}
```

### 4. WalletAdapter Interface

The React app implements this adapter using its hooks. The SDK uses it for wallet operations.

```typescript
interface WalletAdapter {
  /** Get balances for all mints (mintUrl -> balance in sats) */
  getBalances(): Promise<Record<string, number>>;

  /** Get unit type for each mint (mintUrl -> 'sat' | 'msat') */
  getMintUnits(): Record<string, string>;

  /** Get the currently active mint URL */
  getActiveMintUrl(): string | null;

  /** Create and send a cashu token from a mint */
  sendToken(
    mintUrl: string,
    amount: number,
    p2pkPubkey?: string
  ): Promise<string>;

  /** Receive/store a cashu token (handles NIP-60 or legacy internally) */
  receiveToken(token: string): Promise<any[]>;

  /** Check if using NIP-60 wallet (for unit conversion decisions) */
  isUsingNip60(): boolean;
}
```

### 2. StorageAdapter Interface

Abstract storage operations for token management. Implemented by the SDK's default storage layer.

```typescript
interface StorageAdapter {
  /** Get stored API token for a provider */
  getToken(baseUrl: string): string | null;

  /** Store API token for a provider */
  setToken(baseUrl: string, token: string): void;

  /** Remove API token for a provider */
  removeToken(baseUrl: string): void;

  /** Get all stored tokens as distribution (baseUrl -> amount) */
  getPendingTokenDistribution(): Array<{ baseUrl: string; amount: number }>;
}
```

### 5. ProviderRegistry Interface

Provides access to provider/model data for failover logic.

```typescript
interface ProviderRegistry {
  /** Get all models available from a provider */
  getModelsForProvider(baseUrl: string): Model[];

  /** Get list of disabled provider URLs */
  getDisabledProviders(): string[];

  /** Get mints accepted by a provider */
  getProviderMints(baseUrl: string): string[];

  /** Get provider info (version, etc.) */
  getProviderInfo(baseUrl: string): Promise<ProviderInfo | null>;

  /** Get all providers with their models */
  getAllProvidersModels(): Record<string, Model[]>;
}
```

### 6. StreamingCallbacks Interface

Callbacks for real-time updates during API calls.

```typescript
interface StreamingCallbacks {
  onStreamingUpdate: (content: string) => void;
  onThinkingUpdate: (content: string) => void;
  onMessageAppend: (message: Message) => void;
  onBalanceUpdate: (balance: number) => void;
  onTransactionUpdate: (transaction: TransactionHistory) => void;
  onTokenCreated?: (amount: number) => void;
  onPaymentProcessing?: (isProcessing: boolean) => void;
  onLastMessageSatsUpdate?: (satsSpent: number) => void;
}
```

## Implementation Steps

### Phase 1: Setup & Interfaces

1. Create the SDK directory structure with barrel exports.
2. Define all interfaces in `sdk/wallet/interfaces.ts` and `sdk/discovery/interfaces.ts`.
3. Move/define shared types to `sdk/core/types.ts`.
4. Create custom error classes in `sdk/core/errors.ts`.
5. Create SDK storage layer with default drivers (localStorage, sqlite via better-sqlite3, memory fallback).
6. Expose default adapter factories (`getDefaultDiscoveryAdapter`, `getDefaultStorageAdapter`, `getDefaultProviderRegistry`).

### Phase 2: Extract Discovery Logic

5. Create `ModelManager` class in `sdk/discovery/ModelManager.ts`.
   - Migrate provider bootstrapping logic from `useApiState.ts`.
   - Migrate model fetching and caching logic.
   - Implement best-price selection logic.
   - Implement model selection strategy.
   - Manages base URL list and Tor filtering.
6. Create `MintDiscovery` class in `sdk/discovery/MintDiscovery.ts`.
   - Migrate mint fetching logic from `useApiState.ts` (fetchMints).
   - Cache mints from `/v1/info` endpoints.
   - Stores full provider info alongside mints.

### Phase 3: Extract Wallet Logic

7. Create `CashuSpender` class in SDK.
8. Migrate `spendCashu` logic from `useCashuWithXYZ.ts` to `CashuSpender`.
   - Replace hook calls with `WalletAdapter` calls.
   - Handle state updates via return values (not callbacks).
9. Create `RefundManager` and migrate `unifiedRefund` logic.
   - Uses `WalletAdapter.receiveToken` for token storage.
   - Uses `StorageAdapter` for token retrieval/removal.

### Phase 4: Extract API Logic

10. Create `StreamProcessor` class for streaming response handling.
11. Create `ProviderManager` class for failover logic.
    - Migrate `findNextBestProvider` logic.
    - Uses `ProviderRegistry` for model/provider data.
12. Create `RoutstrClient` class as the main entry point.
    - Inject `CashuSpender`, `StorageAdapter`, `ProviderRegistry`.
    - Migrate `routstrRequest` and `fetchAIResponse`.
    - Accept `StreamingCallbacks` for real-time updates.

### Phase 5: Integration

13. Replace the React hook adapters to consume SDK defaults (Zustand-backed storage).
14. Create a concrete implementation of `WalletAdapter` in the React app (e.g., `useWalletAdapter` hook) that wraps the existing hooks.
15. Use SDK default adapters for `DiscoveryAdapter`, `StorageAdapter`, and `ProviderRegistry`.
16. Ensure Node usage installs `better-sqlite3` for sqlite persistence.
17. Update `useApiState.ts` to instantiate and use `ModelManager` and `MintDiscovery`.
18. Update `useCashuWithXYZ.ts` to instantiate and use `CashuSpender`.
19. Update `apiUtils.ts` (or call sites) to use `RoutstrClient`.

## Key Considerations

### State Management

The SDK should be stateless where possible. React state updates (like `setBalance`) should happen by reacting to the SDK's return values, not via callbacks injected into the SDK. Storage is handled by a Zustand vanilla store with pluggable drivers.

### Circular Dependencies

The current code has `apiUtils` importing `SpendCashuResult` from `useCashuWithXYZ`. The SDK structure resolves this by having all types defined in `sdk/core/types.ts`.

### Critical Sections

The `isSpendingCritical` ref in the hook prevents page unloads during sensitive operations. The SDK can expose a `isBusy` flag or use an event emitter pattern:

```typescript
class CashuSpender {
  private _isBusy = false;

  get isBusy(): boolean { return this._isBusy; }

  async spend(...): Promise<SpendResult> {
    this._isBusy = true;
    try {
      // ... spending logic
    } finally {
      this._isBusy = false;
    }
  }
}
```

### NIP-60 Abstraction

The SDK should not branch on `usingNip60` directly. Instead, the `WalletAdapter` implementation handles the difference internally. The SDK only needs to know the mint unit (`sat` vs `msat`) for amount calculations.

### Error Handling

Create specific error classes for common failure modes:

```typescript
class InsufficientBalanceError extends Error {
  constructor(
    public required: number,
    public available: number
  ) {
    super(`Insufficient balance: need ${required} sats, have ${available}`);
  }
}

class ProviderError extends Error {
  constructor(
    public baseUrl: string,
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}

class MintUnreachableError extends Error {
  constructor(public mintUrl: string) {
    super(`Mint ${mintUrl} is unreachable`);
  }
}
```

## Dependency Diagram

```mermaid
flowchart TB
    subgraph SDK
        RT[RoutstrClient]
        CS[CashuSpender]
        PM[ProviderManager]
        RM[RefundManager]
        SP[StreamProcessor]
    end

    subgraph Interfaces
        WA[WalletAdapter]
        SA[StorageAdapter]
        PR[ProviderRegistry]
        SC[StreamingCallbacks]
    end

    subgraph React App
        UWA[useWalletAdapter]
        CSA[ConcreteStorageAdapter]
        CPR[ConcreteProviderRegistry]
    end

    RT --> CS
    RT --> PM
    RT --> SP
    RT --> SC
    CS --> WA
    CS --> RM
    RM --> WA
    RM --> SA
    PM --> PR

    UWA -.implements.-> WA
    CSA -.implements.-> SA
    CPR -.implements.-> PR
```
