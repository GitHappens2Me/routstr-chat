# Streaming Bug Fix 2.1 — Tee + `routeRequests` in daemon

## Goal

Make the streaming path as close to "pass upstream bytes straight through to the client" as possible, while still reading `usage` / `responseId` out of SSE for accounting.

Two changes:

1. Inside the SDK's `_prepareRoutedRequest(...)`, stop doing the Web→Node→Transform→Web roundtrip. Instead, **tee** the upstream Web `ReadableStream` and inspect one branch for usage while the other branch is handed to the client unchanged.
2. In `routstrd/src/daemon/http/index.ts`, use `routeRequests(...)` like `scripts/routstr-daemon.ts` already does: daemon owns `status` / headers / pipe.

## Why

### Current problem

Diagnosed in `streaming-bug-latest.md`:

- The SSE path in `_prepareRoutedRequest(...)` does:
  - `Readable.fromWeb(response.body)`
  - `.pipe(loggingTransform)`
  - `.pipe(sseParser)` (a Node `Transform`)
  - `Readable.toWeb(transformed)`
  - `new Response(webStream, ...)`
- Even after commit `53265be7` made the SSE parser forward chunks unchanged, the Web→Node→Web roundtrip itself can still alter chunk timing/boundaries.
- On top of that, the old Node-response wrapper path did `Readable.fromWeb(body).pipe(res)` again — another conversion layer.

### Desired shape

- SDK does not put any Node `Transform` in the body path.
- SDK does not do a Node→Web roundtrip.
- Body delivered to the client = exact bytes from upstream.
- Daemon is a thin bridge: `Response` → `ServerResponse` (status + headers + body pipe). No transforms.

## Design

### Tee in `_prepareRoutedRequest`

For SSE responses (`content-type: text/event-stream`):

1. Take `response.body` (a Web `ReadableStream<Uint8Array>`).
2. Call `body.tee()` → two Web streams: `clientStream`, `inspectStream`.
3. Build the returned `Response` with `clientStream` as its body. Status, statusText, and headers are copied verbatim from upstream.
4. Start an async inspector that reads `inspectStream` with a `ReadableStreamDefaultReader`:
   - Decode chunks with a streaming `TextDecoder` (UTF-8 safe across chunk boundaries).
   - Buffer text, split on SSE event terminators (`\r?\n\r?\n`).
   - For each complete event block, parse `data:` lines, `JSON.parse(...)`, and:
     - capture `data.id` once → `capturedResponseId`
     - run `extractUsageFromSSEJson(data)` → merge into `capturedUsage`
   - On stream end, flush remaining buffered text as a final event.
5. The inspector runs detached. It **must not** block returning the `Response`. But `_handlePostResponseBalanceUpdate` still needs the captured usage, so we need to either:
   - (a) wire the inspector's completion into the accounting flow, or
   - (b) keep today's "accounting uses whatever was captured by the time we finalize" semantics.

   See "Accounting timing" below.

### Daemon uses `routeRequests(...)`

`../routstrd/src/daemon/http/index.ts` should use the same pattern as `scripts/routstr-daemon.ts`:

```ts
const response = await routeRequests({ ... });

res.statusCode = response.status;
response.headers.forEach((value, key) => {
  res.setHeader(key, value);
});

if (!response.body) {
  res.end();
  return;
}

const nodeReadable = Readable.fromWeb(response.body as any);
await new Promise<void>((resolve, reject) => {
  let settled = false;
  const finish = () => { if (!settled) { settled = true; resolve(); } };
  const fail = (err: unknown) => { if (!settled) { settled = true; reject(err); } };
  res.once("finish", finish);
  res.once("close", finish);
  res.once("error", fail);
  nodeReadable.once("error", fail);
  nodeReadable.pipe(res);
});
```

Daemon keeps its existing error handling (`InsufficientBalanceError` → 402, generic → 500).

## Accounting timing

This is the one real behavior decision.

- The removed Node-response wrapper finalized `_handlePostResponseBalanceUpdate(...)` **after** `res` emitted `finish`/`close`, so accounting ran after the client got the whole stream.
- `routeRequests(...)` returns after `_prepareRoutedRequest(...)` resolves. With tee inspection running detached, usage may not be captured yet when `routeRequests(...)` returns.

Options:

- **A. Keep "finalize after client finish" semantics.** Expose the inspector's completion promise on the returned `Response` (e.g. `(response as any).usagePromise`) and have the daemon `await` it after pipe finishes, then call whatever currently runs in `_handlePostResponseBalanceUpdate`. This preserves current semantics but leaks a bit of internal coordination into the daemon.
- **B. Move accounting inside the SDK but trigger it when the inspector completes.** `_prepareRoutedRequest` schedules: "when inspector resolves, call `_handlePostResponseBalanceUpdate` with whatever was captured." Daemon doesn't need to know. Downside: accounting happens independently of whether the client actually consumed the stream, which can matter if the client disconnects mid-stream.
- **C. Hybrid.** SDK schedules accounting to run when **both** inspector completes **and** the client side has finished reading (detect via the client `ReadableStream` closing — possible but fiddly).

Proposed default: **A** for now. It's the smallest behavior change vs today and keeps the daemon explicit. We can revisit after the streaming bug is confirmed fixed.

## Removal / deprecation

After this lands and is verified:

- `createSSEParserTransform(...)` (Node `Transform` version) can be removed once nothing else uses it (check `scripts/test-sse-parser.ts` and `sdk/__tests__/sse.test.ts`).
- The `loggingTransform` + `.routstrd/stream-response/*.jsonl` logging currently sits in `_prepareRoutedRequest`. Decide whether to keep it. If kept, implement it in the inspector (log raw chunks as they are decoded) — but logging raw upstream bytes is fine to move into the tee'd inspection branch since the client branch is already untouched.

## Files to touch

- `sdk/client/RoutstrClient.ts` — replace the SSE block in `_prepareRoutedRequest(...)` with tee-based inspection. Remove the Web→Node→Transform→Web pipeline.
- `sdk/client/sse.ts` — add a Web-stream-based inspector (e.g. `inspectSSEWebStream(stream, onUsage, onResponseId): Promise<void>`). Keep the old Node `Transform` version only if still needed elsewhere; otherwise delete.
- `../routstrd/src/daemon/http/index.ts` — use `routeRequests` + manual status/headers/pipe, matching `scripts/routstr-daemon.ts`.
- `sdk/__tests__/sse.test.ts` — update tests to exercise the new Web-stream inspector.
- `scripts/test-sse-parser.ts` — update or remove depending on outcome.

## Non-goals

- No change to JSON (non-streaming) responses.
- No change to pricing / provider selection / wallet logic.
- No new features in the SSE parser — it keeps extracting only `responseId` and `usage`.

## Validation

1. Unit test: feed a Web `ReadableStream` of canned SSE chunks (including multi-line events, split UTF-8, final usage chunk) through the new inspector and assert captured `responseId` + merged `usage`.
2. Integration: run `scripts/routstr-daemon.ts` and `routstrd` daemon side by side against the same upstream; compare byte-for-byte stream output to the client. After the fix, both should produce output identical to upstream.
3. Manual: run the chat client against `routstrd` with streaming on, confirm the originally reported streaming glitch is gone and usage is still recorded in the usage DB.

## Summary

- SDK: tee the upstream Web stream; one branch → client untouched, one branch → async SSE inspector for usage/responseId.
- Daemon: use `routeRequests(...)`; copy status + headers; pipe body to `res`. No transforms in the daemon.
- The old Node-response wrapper API has been removed from `sdk/`.
- Net effect: bytes delivered to the client are identical to bytes received from upstream. The only remaining adaptation is the unavoidable `Response` → `ServerResponse` bridge.
