# SDK Chat Integration Plan

## Goal

Fully replace app-side AI inference/discovery implementations with SDK implementations:

- `hooks/useApiState.ts` → SDK `ModelManager` + `MintDiscovery`
- `utils/apiUtils.ts` / chat callsites → SDK `RoutstrClient`

Preserve current UX/behavior while removing duplicate legacy logic.

---
I want to show the How it Works slide much better. 1. Node discovery. Routstr node publish a nostr event to announce themselves. Users query nostr to file Routstr nodes. 2. Nodes offer mdoels priced in sats. You find teh best node for a mdoel you're looking for and you send a cashu token to them to use that model. 3. They require a min cost higher than what it costs because output is unknown. So you get a refund after a request. 4. If one node is slow or is overcharging you, you tell you friends on Nostr and switch to the next one. No credit/ no lock in effects. 
## 0) Guardrails

- Keep public behavior unchanged (model picker, streaming UI, tx/balance updates).
- Preserve existing hook signatures unless explicitly noted.
- Migrate in small steps (adapters → discovery → inference → cleanup).

---

## 1) SDK Bridge Layer (new)

### `hooks/useWalletAdapter.ts` (new)

Implement:

- Return `WalletAdapter | null`.
- Adapt from `useCashuWithXYZ`:
  - `getBalances()`
  - `getMintUnits()`
  - `getActiveMintUrl()`
  - `sendToken(...)`
  - `receiveToken(...)` (normalized to SDK shape)

Acceptance:

- Compiles against `sdk/wallet/interfaces.ts`.
- Balances/units reflect current wallet state.
- `receiveToken` maps success/failure correctly.

### `hooks/useSdkClient.ts` (new)

Implement:

- Async-load SDK deps:
  - `getDefaultStorageAdapter()`
  - `getDefaultProviderRegistry()`
- Instantiate `RoutstrClient(walletAdapter, storageAdapter, providerRegistry, "min", mode)`
- Expose `{ client, isReady, error }`.

Acceptance:

- No per-render recreation loops.
- `isReady` only true after dependencies loaded.
- Type-safe exports (no `any` leakage).

---

## 2) Discovery Cutover

### `hooks/useApiState.ts`

Implement:

- Replace manual providers bootstrap with `ModelManager.bootstrapProviders`.
- Replace manual model fetch/cache/best-price mapping with `ModelManager.fetchModels`.
- Replace manual mint info fetch with `MintDiscovery.discoverMints`.
- Keep existing `UseApiStateReturn` API.
- Preserve URL model override + last-used model behavior.
- Keep Tor filtering + disabled providers behavior.

Acceptance:

- No direct fetch to `/v1/providers`, `/v1/models`, `/v1/info` from this hook.
- Cached model/provider state reused across refresh.
- Model selection still updates provider/baseUrl correctly.
- UI loading/model list behavior unchanged.

### `hooks/useDiscoveryAdapter.ts`

Implement:

- Keep SDK default adapter loader lifecycle-safe.
- Keep cancellation guard to avoid setState-after-unmount.

Acceptance:

- No unmount warnings.
- Adapter readiness aligns with discovery timing.

---

## 3) Inference Cutover

### `hooks/useChatActions.ts`

Implement:

- Remove `fetchAIResponse` import from `@/utils/apiUtils`.
- Use SDK client: `client.fetchAIResponse(fetchOptions, streamingCallbacks)`.
- Map callbacks 1:1:
  - streaming/thinking updates
  - message append
  - payment processing
  - balance + transaction updates
  - last-message sats update
- Preserve `_prevId`, `_createdAt`, `_modelId` enrichment in `onMessageAppend` path.

Acceptance:

- Send/retry/edit flows unchanged.
- Streaming remains scoped to active conversation.
- Balance and transaction history update correctly.
- No `@/utils/apiUtils` inference import remains.

### `utils/apiUtils.ts`

Implement:

- Deprecate as source of truth.
- Option A: thin compatibility shim delegating to SDK.
- Option B: remove once no app callsites remain.

Acceptance:

- Legacy inference logic is no longer primary path.

---

## 4) Image/Attachment Parity Gap

Current gap: app legacy path includes image persistence + Blossom upload handling.

Choose one:

1. Extend SDK callback surface for image post-processing and implement in SDK message creation.
2. Keep SDK output simple and do app-side post-processing before append.

Acceptance:

- Image responses keep storage + optional Blossom behavior.
- No loss of thinking/citations/annotations metadata.

---

## 5) Cleanup

Likely files:

- `hooks/useApiState.ts` imports cleanup
- `utils/apiUtils.ts` dead legacy branches
- stale helper paths in `utils/modelUtils.ts` / `utils/storageUtils.ts` (if no longer used)

Acceptance:

- No dead imports/branches in migrated files.
- Typecheck + lint clean.

---

## 6) Verification Checklist

Automated:

- `npm run typecheck`
- `npm run lint`
- `npm run test:sdk`

Manual smoke:

- App loads models.
- Model/provider selection updates baseUrl correctly.
- Prompt streams in real-time.
- Provider failover works in dev.
- Assistant messages and metadata persist as expected.
- Balance + transaction history update correctly.

---

## 7) Done Definition

Migration is complete when:

- `useApiState.ts` uses SDK discovery only.
- Chat inference uses `RoutstrClient.fetchAIResponse`.
- `useChatActions.ts` has no dependency on legacy `apiUtils` inference flow.
- Legacy duplicate inference/discovery logic removed or reduced to shims.
- UX parity maintained.
