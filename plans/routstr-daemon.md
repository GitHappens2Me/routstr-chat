# Routstr Daemon Plan

## Goal

Document the current SDK-based routing flow that a localhost daemon will reuse. The daemon routes OpenAI-compatible requests to the cheapest provider for a given model, using the existing SDK helpers and Cashu flow.

## Scope

- Provide a local HTTP service at `http://localhost:8008/`.
- Route OpenAI-compatible chat requests via the SDK `routeRequests` helper (currently targets `/v1/chat/completions`).
- Determine cheapest provider per model using `ModelManager` + `ProviderManager` ranking.
- Handle Cashu token spend/refund via `RoutstrClient.routeRequest`.
- Mirror error handling/fallback behavior used by `fetchAIResponse` (refunds, provider failover on network/4xx/5xx, and user-safe errors).

## Non-Goals

- No production deployment, packaging, or build tooling in this phase.
- No auth, rate limiting, or multi-tenant support.
- No UI or CLI; just a local daemon and SDK function.

## Current References

- `sdk/client/RoutstrClient.ts` implements request proxying, token spend/refund, and failover.
- `sdk/routeRequests.ts` selects cheapest provider and proxies the request.

## Current Architecture

### 1. Daemon Entry Point (Planned)

- Location: `scripts/routstr-daemon.ts` (or `packages/daemon` later).
- HTTP server (Node `http` or lightweight framework).
- Extract model ID from request body and optional provider override.

### 2. Routing Flow (Implemented in SDK)

1. `routeRequests` bootstraps providers and fetches models via `ModelManager`.
2. Cheapest provider is selected by `ProviderManager` (or forced provider).
3. Wallet balance and mint selection are resolved from adapters.
4. `RoutstrClient.routeRequest` proxies `/v1/chat/completions` with `stream: false`.
5. Response is normalized to a minimal `{ content }` body payload for daemon use.

### 3. Cashu Handling (Implemented)

- `RoutstrClient.routeRequest` spends a token before proxying.
- Refunds occur on non-OK responses.
- Uses wallet/storage adapters already wired in the SDK.

## API Behavior Details

- Request path: daemon should map to `/v1/chat/completions` for now (aligned with `routeRequests`).
- Required: `model` in request body to determine cheapest provider.
- Optional: `provider` override via query string or header (format TBD).
- Response: normalized JSON `{ content }` based on upstream `choices[0].message.content`.
- Errors: follow `fetchAIResponse`-style handling (refunds, provider failover, and user-safe error messages).

## Remaining Work

- Implement the daemon HTTP server wrapper around `routeRequests`.
- Add streaming proxy support (current SDK path forces `stream: false`).
- Add provider override wiring and health endpoint.
