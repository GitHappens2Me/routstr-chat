---
name: routstr-sdk-integration
description: Guide for integrating the @routstr/sdk npm package to route OpenAI-compatible API requests with automatic payment handling
---

# Routstr SDK Integration

Integrate the `@routstr/sdk` npm package to route OpenAI-compatible API requests to the cheapest provider with automatic payment handling.

## Setup Steps

1. **Install the package**

   ```bash
   npm install @routstr/sdk
   ```

2. **Set up storage** (choose based on environment)

   ```typescript
   import {
     createSdkStore,
     createSqliteDriver,
     createLocalStorageDriver,
     createMemoryDriver,
   } from "@routstr/sdk";

   // Node.js / Bun - persistent SQLite
   const { store, hydrate } = createSdkStore({ driver: createSqliteDriver() });

   // Browser - localStorage
   const { store, hydrate } = createSdkStore({
     driver: createLocalStorageDriver(),
   });

   // Tests - in-memory
   const { store, hydrate } = createSdkStore({ driver: createMemoryDriver() });
   ```

3. **Bootstrap providers** (run once at startup)

   ```typescript
   import {
     ModelManager,
     MintDiscovery,
     createDiscoveryAdapterFromStore,
     createProviderRegistryFromStore,
   } from "@routstr/sdk";

   const discoveryAdapter = createDiscoveryAdapterFromStore(store);
   const providerRegistry = createProviderRegistryFromStore(store);

   const modelManager = new ModelManager(discoveryAdapter);
   const providers = await modelManager.bootstrapProviders(false); // false = no Tor
   await modelManager.fetchModels(providers);

   const mintDiscovery = new MintDiscovery(discoveryAdapter);
   await mintDiscovery.discoverMints(providers);
   ```

4. **Implement WalletAdapter** (only user responsibility)

   ```typescript
   const walletAdapter = {
     async getBalances(): Promise<Record<string, number>> {
       // Return { mintUrl: balanceInSats }
     },

     getMintUnits(): Record<string, "sat" | "msat"> {
       // Return { mintUrl: "sat" | "msat" }
     },

     getActiveMintUrl(): string | null {
       // Return currently selected mint URL
     },

     async sendToken(
       mintUrl: string,
       amount: number,
       p2pkPubkey?: string
     ): Promise<string> {
       // Create and return encoded Cashu token
     },

     async receiveToken(token: string): Promise<{
       success: boolean;
       amount: number;
       unit: "sat" | "msat";
       message?: string;
     }> {
       // Receive a Cashu token
     },
   };
   ```

5. **Route a request**

   ```typescript
   import { routeRequests, createStorageAdapterFromStore } from "@routstr/sdk";

   const storageAdapter = createStorageAdapterFromStore(store);

   const response = await routeRequests({
     modelId: "gpt-4o",
     requestBody: {
       messages: [{ role: "user", content: "Hello, world!" }],
       stream: true,
     },
     mode: "xcashu", // or "apikeys"
     walletAdapter,
     storageAdapter,
     providerRegistry,
     discoveryAdapter,
     modelManager,
   });
   ```

## Authentication Modes

| Mode      | Description                                                              | Best For                                                                         |
| --------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `xcashu`  | Cashu token spending with automatic refunds                              | Pay-per-use without pre-registration                                             |
| `apikeys` | Balance is temporarily kept with a routstr node, can be refunded anytime | Low latency inference with the trade off of balance being kept with the provider |

## Common Patterns

### Force a specific provider

```typescript
await routeRequests({
  forcedProvider: "https://specific.provider.com/",
  // ... other options
});
```

### Add custom providers

```typescript
const modelManager = new ModelManager(discoveryAdapter, {
  includeProviderUrls: ["https://my-private-provider.com/"],
});
```

### Check available providers for a model

```typescript
import { ProviderManager } from "@routstr/sdk";

const providerManager = new ProviderManager(providerRegistry);
const ranking = providerManager.getProviderPriceRankingForModel("gpt-4o");
// Returns cheapest-first list of providers with pricing
```

### Use apikeys mode (no Cashu)

```typescript
await routeRequests({
  mode: "apikeys",
  storageAdapter,
  providerRegistry,
  discoveryAdapter,
  modelManager,
  // walletAdapter not needed
});
```

## Building an HTTP Proxy

```typescript
import { createServer } from "http";
import { routeRequests } from "@routstr/sdk";

const server = createServer(async (req, res) => {
  const body = await readBody(req);
  const { model } = JSON.parse(body);

  const response = await routeRequests({
    modelId: model,
    requestBody: JSON.parse(body),
    path: "/v1/chat/completions",
    mode: "xcashu",
    walletAdapter,
    storageAdapter,
    providerRegistry,
    discoveryAdapter,
    modelManager,
  });

  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));

  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(value);
  }
  res.end();
});
```

## Directly consuming AI inference

```typescript
import { RoutstrClient } from "@routstr/sdk";

const client = new RoutstrClient(
  walletAdapter,
  storageAdapter,
  providerRegistry,
  "min", // alertLevel: "min" | "max"
  "xcashu" // mode: "xcashu" | "apikeys"
);

await client.fetchAIResponse(
  {
    messageHistory: [{ role: "user", content: userPrompt }],
    selectedModel: model,
    baseUrl: providerUrl,
    mintUrl: activeMintUrl,
  },
  {
    onStreamingUpdate: (content) => process.stdout.write(content),
    onBalanceUpdate: (balance) => console.error(`[Balance: ${balance} sats]`),
    onTransactionUpdate: (tx) => console.error(`[Spent: ${tx.amount} sats]`),
  }
);
```

## Package Reference

- **npm**: `@routstr/sdk`
- **Node/Bun**: Use `createSqliteDriver()` for persistent storage
- **Browser**: Use `createLocalStorageDriver()` or provide custom driver
- **Framework**: Fully framework-agnostic
