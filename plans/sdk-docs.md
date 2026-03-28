# Routstr SDK (current)

This SDK already exists under `sdk/`. This doc only tracks the minimal surface you need to use it.

## Entry Points

- `sdk/index.ts` exports core types, discovery, wallet interfaces, client, storage, utils.

## Core Modules

- Discovery: `ModelManager`, `MintDiscovery` in `sdk/discovery/`
  - Provider bootstrap, models cache, mint discovery, provider info cache
- Client: `RoutstrClient`, `ProviderManager`, `StreamProcessor` in `sdk/client/`
  - Main request flow, failover, streaming parsing
- Wallet: `CashuSpender`, `RefundManager` in `sdk/wallet/`
  - Cashu spend/retry, refund handling

## Interfaces (app provides)

- `WalletAdapter`, `StorageAdapter`, `ProviderRegistry`, `StreamingCallbacks` in `sdk/wallet/interfaces.ts`
- `DiscoveryAdapter` in `sdk/discovery/interfaces.ts`

## Storage Defaults

- `sdk/storage/index.ts` exposes:
  - `getDefaultSdkDriver()` (localStorage -> sqlite -> memory)
  - `getDefaultSdkStore()`
  - `getDefaultDiscoveryAdapter()`
  - `getDefaultStorageAdapter()`
  - `getDefaultProviderRegistry()`

## Minimal Usage

```ts
import {
  ModelManager,
  MintDiscovery,
  RoutstrClient,
  getDefaultDiscoveryAdapter,
  getDefaultProviderRegistry,
  getDefaultStorageAdapter,
} from "@/sdk";

const discovery = getDefaultDiscoveryAdapter();
const providerRegistry = getDefaultProviderRegistry();
const storageAdapter = getDefaultStorageAdapter();

const modelManager = await ModelManager.init(discovery, {}, { torMode: false });
const baseUrls = discovery.getBaseUrlsList();
const mintDiscovery = new MintDiscovery(discovery);
await mintDiscovery.discoverMints(baseUrls);

const client = new RoutstrClient(
  walletAdapter,
  storageAdapter,
  providerRegistry,
  "min"
);
await client.fetchAIResponse(fetchOptions, streamingCallbacks);
```

## Client Modes

The `RoutstrClient` supports two modes via the constructor `mode` parameter (defaults to `"xcashu"` if unspecified):

- `"xcashu"` — Default mode. Uses standard Cashu token spending with refunds.
- `"apikeys"` — Uses API key authentication instead of Cashu tokens; no token spending or refund flow.

```ts
const client = new RoutstrClient(
  walletAdapter,
  storageAdapter,
  providerRegistry,
  "min", // alertLevel
  "xcashu" // mode (optional, defaults to "xcashu")
);

const currentMode = client.getMode(); // Returns the active mode
```

## Notes

- `ModelManager` handles provider directory bootstrap, model caching, and best-price selection.
- `MintDiscovery` caches `/v1/info` and mints per provider.
- `RoutstrClient` orchestrates spending + request + streaming + refund handling, with behavior varying by mode.
