# Routstr SDK Integration

Guide for integrating the `routstr-sdk` npm package to route OpenAI-compatible API requests to the cheapest provider with automatic payment handling.

## Two Modes

The SDK supports two authentication/payment modes:

### 1. `xcashu` Mode (Default)
- Uses Cashu token spending with automatic refunds
- Users need a Cashu-compatible wallet (e.g., cocoxcashu, nutshell)
- Payment happens per-request via ecash tokens
- Best for pay-per-use without pre-registration with providers

### 2. `apikeys` Mode
- Uses API key authentication
- No Cashu token spending or refund flow
- Users register with providers to get API keys
- Best for users who prefer traditional API key billing

## What Users Must Provide

Only **one thing**: a `WalletAdapter` implementation that connects to their Cashu wallet.

The SDK handles everything else:
- Provider discovery and health tracking
- Model availability and pricing
- Automatic cheapest provider selection
- Payment token creation and refund handling
- Request routing with failover

## Minimal Integration Example

```typescript
import {
  createSdkStore,
  createSqliteDriver,
  createDiscoveryAdapterFromStore,
  createProviderRegistryFromStore,
  createStorageAdapterFromStore,
  ModelManager,
  MintDiscovery,
  routeRequests,
} from "routstr-sdk";

// 1. Set up storage (SQLite for Node, localStorage for browser)
const { store, hydrate } = createSdkStore({ driver: createSqliteDriver() });
await hydrate;

// 2. Create adapters from store
const discoveryAdapter = createDiscoveryAdapterFromStore(store);
const providerRegistry = createProviderRegistryFromStore(store);
const storageAdapter = createStorageAdapterFromStore(store);

// 3. Bootstrap providers (run once at startup)
const modelManager = new ModelManager(discoveryAdapter);
const providers = await modelManager.bootstrapProviders(false); // false = no Tor
await modelManager.fetchModels(providers);

const mintDiscovery = new MintDiscovery(discoveryAdapter);
await mintDiscovery.discoverMints(providers);

// 4. Implement WalletAdapter - the ONLY user responsibility
const walletAdapter = {
  async getBalances(): Promise<Record<string, number>> {
    // Return { mintUrl: balanceInSats }
    const output = await runWalletCommand(["balance"]);
    return parseBalances(output);
  },
  
  getMintUnits(): Record<string, "sat" | "msat"> {
    // Return { mintUrl: "sat" | "msat" }
    return { "https://mint.example.com": "sat" };
  },
  
  getActiveMintUrl(): string | null {
    // Return currently selected mint URL
    return "https://mint.example.com";
  },
  
  async sendToken(mintUrl: string, amount: number, p2pkPubkey?: string): Promise<string> {
    // Create and return encoded Cashu token
    const output = await runWalletCommand([
      "send", "cashu", String(amount), "--mint-url", mintUrl
    ]);
    return extractTokenFromOutput(output);
  },
  
  async receiveToken(token: string): Promise<{
    success: boolean;
    amount: number;
    unit: "sat" | "msat";
    message?: string;
  }> {
    // Receive/refund a Cashu token
    try {
      await runWalletCommand(["receive", "cashu", token]);
      const decoded = getDecodedToken(token);
      const amount = decoded?.proofs?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
      return { success: true, amount, unit: "sat" };
    } catch (error) {
      return { success: false, amount: 0, unit: "sat", message: String(error) };
    }
  },
};

// 5. Route a request
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

// Response is a standard fetch Response with streaming body
console.log(`Status: ${response.status}`);
for await (const chunk of response.body) {
  process.stdout.write(chunk);
}
```

## WalletAdapter Interface

```typescript
interface WalletAdapter {
  /** Get balances for all configured mints { mintUrl: balanceInSats } */
  getBalances(): Promise<Record<string, number>>;

  /** Get unit type for each mint { mintUrl: "sat" | "msat" } */
  getMintUnits(): Record<string, "sat" | "msat">;

  /** Get the currently selected/active mint URL */
  getActiveMintUrl(): string | null;

  /** Create a Cashu token by spending from a mint */
  sendToken(mintUrl: string, amount: number, p2pkPubkey?: string): Promise<string>;

  /** Receive/refund a Cashu token back to the wallet */
  receiveToken(token: string): Promise<{
    success: boolean;
    amount: number;
    unit: "sat" | "msat";
    message?: string;
  }>;
}
```

## Storage Drivers

| Environment | Driver | Usage |
|-------------|--------|-------|
| Node.js / Bun | `createSqliteDriver()` | Persistent SQLite file |
| Browser | `createLocalStorageDriver()` | localStorage |
| Ephemeral / Tests | `createMemoryDriver()` | In-memory only |

```typescript
import {
  createSqliteDriver,
  createLocalStorageDriver,
  createMemoryDriver,
} from "routstr-sdk";
```

## Building an HTTP Proxy

Create an OpenAI-compatible proxy server:

```typescript
import { createServer } from "http";
import { routeRequests } from "routstr-sdk";

const server = createServer(async (req, res) => {
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Only POST is supported" }));
    return;
  }

  const body = await readBody(req);
  const { model } = JSON.parse(body);

  try {
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
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // Stream response
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: error.message }));
  }
});

server.listen(8008);
```

## Building a CLI Tool

Use `RoutstrClient` directly for more control:

```typescript
import { RoutstrClient } from "routstr-sdk";

const client = new RoutstrClient(
  walletAdapter,
  storageAdapter,
  providerRegistry,
  "min",      // alertLevel: "min" | "max"
  "xcashu"    // mode: "xcashu" | "apikeys"
);

await client.fetchAIResponse(
  {
    messageHistory: [{ role: "user", content: userPrompt }],
    selectedModel: model,
    baseUrl: providerUrl,
    mintUrl: activeMintUrl,
  },
  {
    onStreamingUpdate: (content) => {
      process.stdout.write(content);
    },
    onBalanceUpdate: (balance) => {
      console.error(`\n[Balance: ${balance} sats]`);
    },
    onTransactionUpdate: (tx) => {
      console.error(`[Spent: ${tx.amount} sats on ${tx.provider}]`);
    },
    onPaymentProcessing: (isProcessing) => {
      console.error(isProcessing ? "[Processing payment...]" : "[Payment complete]");
    },
    onLastMessageSatsUpdate: (spent, estimated) => {
      console.error(`[Cost: ${spent.toFixed(3)} sats (estimated: ${estimated.toFixed(3)})]`);
    },
  }
);
```

## Common Patterns

**Force a specific provider:**
```typescript
await routeRequests({
  forcedProvider: "https://specific.provider.com/",
  // ... other options
});
```

**Add custom providers to the discovery pool:**
```typescript
const modelManager = new ModelManager(discoveryAdapter, {
  includeProviderUrls: ["https://my-private-provider.com/"],
});
```

**Check available providers for a model:**
```typescript
const allModels = modelManager.getAllCachedModels();
// { "https://provider1.com/": [Model1, Model2], ... }

import { ProviderManager } from "routstr-sdk";
const providerManager = new ProviderManager(providerRegistry);
const ranking = providerManager.getProviderPriceRankingForModel("gpt-4o");
// Returns cheapest-first list of providers with pricing
```

**Handle insufficient balance:**
```typescript
import { InsufficientBalanceError } from "routstr-sdk";

try {
  await routeRequests({ /* ... */ });
} catch (error) {
  if (error instanceof InsufficientBalanceError) {
    console.error(`Need ${error.required} sats, have ${error.available}`);
    console.error(`Max mint balance: ${error.maxMintBalance} at ${error.maxMintUrl}`);
    // Prompt user to fund their wallet
  }
}
```

**Use apikeys mode (no Cashu):**
```typescript
const response = await routeRequests({
  mode: "apikeys",
  // No walletAdapter needed for apikeys mode
  storageAdapter,  // Still needed for storing API keys
  providerRegistry,
  discoveryAdapter,
  modelManager,
  // ...
});
```

## Package Reference

- **npm**: `routstr-sdk`
- **Repository**: Routstr SDK is part of the routstr-chat monorepo
- **Node/Bun**: Use `createSqliteDriver()` for persistent storage
- **Browser**: Use `createLocalStorageDriver()` or provide custom driver
- **Framework**: Fully framework-agnostic, no React/Vue/Angular dependencies
