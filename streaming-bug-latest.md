Given that the `loggingTransform` captures the correct order, the problem is almost certainly **after** that, i.e. in:

- `createSSEParserTransform(...)`
- `Readable.toWeb(...)`
- `new Response(webStream, ...)`
- `Readable.fromWeb(...)`
- `nodeReadable.pipe(res)`

## Most likely root cause now

### `createSSEParserTransform` is re-emitting SSE by parsed event blocks, not by original stream chunks
File:
- `../routstr-chat/sdk/client/sse.ts`

It buffers text until it finds an SSE terminator:

```ts
buffer += chunk.toString();

while ((match = terminator.exec(buffer)) !== null) {
  const block = buffer.slice(lastIndex, match.index);
  ...
  self.push(eventBlock + "\n\n");
}
```

So even if `loggingTransform` sees correct raw order, the SSE parser is:

- consuming arbitrary upstream chunks
- reconstructing event blocks
- emitting *new* chunks downstream

That means after the logging stage, the output stream is no longer the original byte stream. It is a rewritten one.

If your client is sensitive to exact chunk timing/boundaries, this is the prime suspect.

---

## Why this can look like “order changed a bit”
Even if event order is technically preserved, downstream may observe:

- one later fragment arriving with an earlier event block
- multiple adjacent SSE events coalesced into one downstream chunk
- boundaries shifted compared to the original upstream stream

That often gets described as “chunks are a bit out of order,” even when the actual issue is:
**re-buffering + re-emission changes packetization**.

---

## Post-logging suspects ranked

### 1. `createSSEParserTransform`
Strongest suspect.

Reasons:
- it rewrites the stream
- it buffers
- it emits on event boundaries, not incoming chunk boundaries
- it uses string accumulation and parsing

### 2. `Readable.toWeb(...)` then `Readable.fromWeb(...)`
Second strongest suspect.

The SDK does:
- Node stream → Web stream
- later Web stream → Node stream again

Those adapters can:
- coalesce pushes
- alter flush timing
- change chunk granularity

Usually they shouldn’t reorder data semantically, but they can definitely alter when chunks become visible.

### 3. `nodeReadable.pipe(res)` after reconversion
Less likely as a root cause by itself, but if the stream has already been re-chunked, this is where the client sees it.

---

## One subtle bug in `createSSEParserTransform`
It uses plain `chunk.toString()` on arbitrary stream chunks:

```ts
buffer += chunk.toString();
```

This is unsafe for UTF-8 boundaries. If a multi-byte character is split across chunks, decoding each chunk independently can produce malformed text or replacement characters, and that can affect:

- SSE field parsing
- JSON parsing
- event boundary reconstruction

That’s not classic “reordering,” but it can absolutely create weird slight stream corruption after the logging stage.

And importantly:

- the logger records the original raw chunk strings *as seen before parsing*
- the parser then re-decodes / re-buffers them
- so the bug can appear after logging even though the log looks fine

---

## What I now think is happening
Most likely:

1. upstream stream order is correct
2. `loggingTransform` confirms that
3. `createSSEParserTransform` buffers/rebuilds the stream
4. this changes event/chunk emission enough that downstream sees slight ordering/boundary anomalies

If it’s not that, then the next likely culprit is the **Node→Web→Node conversion chain**.

---

## Best current diagnosis
**Primary suspect:** `../routstr-chat/sdk/client/sse.ts`  
**Secondary suspect:** the `Readable.toWeb(...)` / `Readable.fromWeb(...)` roundtrip in `RoutstrClient.ts`

If you want, I can next walk through the exact downstream path and identify the single narrowest point where bytes stop being identical to what logging saw.
