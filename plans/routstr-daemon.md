# Routstr Daemon Plan

## Goal

Create a simple localhost daemon that routes OpenAI-compatible `/v1/responses` requests to the cheapest provider for a given model. The daemon should always proxy to whichever provider offers the lowest price for that model, handling Cashu send/receive flows via the Routstr SDK. No implementation yet; this is a planning document only.

## Scope

- Provide a local HTTP service at `http://localhost:8008/`.
- Pass through all requests (e.g., `/v1/responses`, `/v1/chat/completions`, `/v1/models`, etc.) to the cheapest provider for the requested model.
- Determine cheapest provider per model using existing SDK discovery and pricing utilities.
- Route requests while preserving OpenAI-compatible semantics.
- Handle Cashu send/receive automatically, as the Routstr client does.
- Add a high-level SDK helper (`routeRequests`) to enable reuse by the daemon and other Node services.

## Non-Goals

- No production deployment, packaging, or build tooling in this phase.
- No auth, rate limiting, or multi-tenant support.
- No UI or CLI; just a local daemon and SDK function.

## Current References

- `scripts/routstr-cheapest.ts` shows end-to-end routing and Cashu wallet flow using `RoutstrClient`.
- `scripts/find-model-providers.ts` shows pricing-based provider ranking.

## Proposed Architecture

### 1. Daemon Entry Point

- Location: `scripts/routstr-daemon.ts` (or `packages/daemon` later).
- HTTP server (Node `http` or lightweight framework).
- Accept all requests and pass them through to the cheapest provider.
- Extract model ID from request body or query params to determine routing.
- Optional query or header to force provider (matches current `--provider` behavior).

### 2. Request Routing Flow

1. Parse request body to identify model ID.
2. Use `ModelManager` + `ProviderManager` to fetch providers and rank by price.
3. Select cheapest provider for the model.
4. Route request to the cheapest provider's base URL + `/v1/responses`.

### 3. Cashu Handling

- Mirror the wallet adapter logic from `scripts/routstr-cheapest.ts`.
- Use the Routstr SDK storage adapters in Node (sqlite driver).
- Maintain an active mint and ensure wallet has balances.
- Send and receive tokens via wallet CLI (`cocod`) or a pluggable wallet adapter.

### 4. SDK Addition: `routeRequests`

- New function in SDK to encapsulate the routing logic:

```ts
type RouteRequestOptions = {
  modelId: string;
  requestBody: unknown;
  forcedProvider?: string;
  walletAdapter: WalletAdapter;
  storageAdapter: StorageAdapter;
  providerRegistry: ProviderRegistry;
  discoveryAdapter: DiscoveryAdapter;
};

type RouteRequestResult = {
  baseUrl: string;
  selectedModel: Model;
  response: Response;
};

async function routeRequests(
  options: RouteRequestOptions
): Promise<RouteRequestResult>;
```

- Responsibilities:
  - Bootstrap providers, fetch models, discover mints.
  - Determine cheapest provider unless forced.
  - Use `RoutstrClient` to handle Cashu send/receive and token lifecycle.
  - Proxy the request and return the response.

### 5. Daemon Adapter Usage

- Daemon uses `routeRequests` with a Node wallet adapter that wraps the wallet CLI.
- Return upstream response as-is (headers/body), keeping streaming support in mind.

## API Behavior Details

- Request path: pass through any path (e.g., `/v1/responses`, `/v1/chat/completions`, `/v1/models`).
- Required: `model` in request body to determine cheapest provider. For endpoints without a model (like `/v1/models`), route to default/cheapest provider.
- Optional: `provider` override via query string or header (format TBD).
- Response: forward status, headers, and body from upstream.
- Errors: return 4xx/5xx with minimal transformation.

## Implementation Phases

### Phase 1: SDK Helper - `routeRequests`
**Goal**: Create the core routing function in the SDK.

**Steps**:
1. Create `sdk/src/routeRequests.ts` with the `RouteRequestOptions` and `RouteRequestResult` types.
2. Implement `routeRequests` function that:
   - Takes modelId, requestBody, forcedProvider, walletAdapter, storageAdapter, providerRegistry, discoveryAdapter
   - Uses ModelManager + ProviderManager to fetch and rank providers by price
   - Selects cheapest provider for the model (or forced provider)
   - Uses RoutstrClient for Cashu send/receive flow
   - Proxies request and returns response
3. Add unit tests for provider ranking logic.
4. Export from SDK index.

**Estimated effort**: 2-3 hours

---

### Phase 2: Daemon HTTP Server
**Goal**: Basic HTTP server that accepts requests and routes them.

**Steps**:
1. Create `scripts/routstr-daemon.ts` entry point.
2. Set up Node HTTP server on port 8008.
3. Implement request parser to extract model ID from body/query.
4. Integrate with `routeRequests` SDK helper.
5. Pass through request path (e.g., `/v1/responses`, `/v1/chat/completions`).
6. Handle error responses (4xx/5xx) with minimal transformation.
7. Add basic logging (request received, provider selected, response status).

**Estimated effort**: 2-3 hours

---

### Phase 3: Streaming Support
**Goal**: Enable streaming responses for real-time LLM output.

**Steps**:
1. Detect streaming request (check `Content-Type: text/event-stream` or `stream: true`).
2. Pass through `Transfer-Encoding: chunked` headers.
3. Use Node.js streams to proxy response body directly from upstream to client.
4. Handle Cashu token receive asynchronously while streaming.
5. Test with streaming-compatible providers.
6. Verify memory usage remains stable during long streams.

**Estimated effort**: 3-4 hours

---

### Phase 4: Configuration & Polish
**Goal**: Make the daemon usable and maintainable.

**Steps**:
1. Add configuration file (`daemon.config.json`) for:
   - Port (default 8008)
   - Default provider override
   - Price cache TTL (optional)
2. Implement provider override via query param (`?provider=`).
3. Add health check endpoint (`/health`).
4. Graceful shutdown handling.
5. Production-readiness: process management with pm2, logs to file.
6. Document usage: how to run, how to test, how to override provider.

**Estimated effort**: 2-3 hours

---

## Success Criteria

- [ ] Phase 1: SDK helper handles routing + Cashu flow
- [ ] Phase 2: Daemon accepts HTTP requests and routes to cheapest provider
- [ ] Phase 3: Streaming responses work without buffering
- [ ] Phase 4: Daemon is configurable and production-ready

## Open Questions

- How should provider override be passed: query param (`?provider=`) or header?
- Should the daemon support streaming responses immediately, or buffer?
- Should the wallet adapter be CLI-only or allow injectable wallet implementations?

## Streaming Support (Added v2.0.0)

- **Priority**: Implement streaming support early rather than buffering responses.
- **Rationale**: LLM responses are often streamed, and buffering defeats the latency benefit of routing to the cheapest provider.
- **Implementation approach**:
  - Pass through `Transfer-Encoding: chunked` and `Content-Type: text/event-stream` headers.
  - Stream the response body directly from the upstream provider to the client without buffering.
  - Handle Cashu token receive in the background while streaming response tokens.
  - Consider using Node.js streams for efficient memory usage.

## Caching (Optional Enhancement)

- **Consideration**: Cache provider prices briefly (e.g., 60 seconds) to avoid hitting the discovery API on every request.
- **Implementation**: Use an in-memory cache with TTL in the provider ranking logic.
- **Trade-off**: Balance freshness of pricing data vs. API call overhead.
