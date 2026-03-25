# Usage Tracking for Streaming Responses in RoutstrClient

## Goal

Implement usage tracking for streaming responses in `RoutstrClient.routeRequest()` by reusing the same `createSSEParserTransform` pattern from the daemon (`routstrd/src/daemon/sse.ts`). Since `routeRequest` is only called in Node.js environments (daemon), we can use native Node.js streams directly.

---

## Background

### How the Daemon Does It

In `/home/debian/knightclaw/projects/routstrd/src/daemon/http/index.ts`:

```typescript
if (isStream) {
  const nodeReadable = Readable.fromWeb(body as unknown as WebReadableStream);
  const sseParser = createSSEParserTransform(
    (usage) => { capturedUsage = usage; },
    (responseId) => { capturedResponseId = responseId; },
  );
  nodeReadable.pipe(sseParser).pipe(res);
  
  res.on('finish', () => {
    if (capturedUsage) {
      usageTracker.append({...});
    }
  });
}
```

The `createSSEParserTransform` (in `routstrd/src/daemon/sse.ts`) is a Node.js `Transform` stream that:
- Buffers incoming SSE chunks
- Extracts `usage` from the final chunk (which contains `data.usage`)
- Captures `responseId` from `data.id`
- Forwards all data through via `self.push()`

### Current Problem in SDK

In `RoutstrClient._trackResponseUsage()`:

```typescript
if (contentType.includes("text/event-stream")) {
  this._log("DEBUG", "[_trackResponseUsage] Skipping - streaming response (text/event-stream)");
  return;  // <-- USAGE TRACKING SKIPPED!
}
```

---

## Approach

Since `routeRequest` is only used in Node.js (daemon), we can:
1. Reuse the existing `createSSEParserTransform` from `routstrd/src/daemon/sse.ts`
2. Or copy the implementation into the SDK for self-containment
3. Use Node.js `Readable.fromWeb()` to convert the web `Response.body` to a Node.js stream
4. Pipe through the SSE parser transform
5. Convert back to a web `ReadableStream` for the caller

---

## Implementation Steps

### Step 1: Copy SSE Parser to SDK

**File**: `sdk/client/sse.ts`

Copy the existing implementation from `routstrd/src/daemon/sse.ts` with minor adjustments:

```typescript
import { Transform } from "stream";
import type { UsageTrackingData } from "./usage";

export function createSSEParserTransform(
  onUsage: (usage: UsageTrackingData) => void,
  onResponseId?: (responseId: string) => void,
): Transform {
  let buffer = "";

  const maybeCaptureUsageFromJson = (jsonText: string): void => {
    try {
      const data = JSON.parse(jsonText) as any;
      const responseId = data.id;
      if (typeof responseId === "string" && responseId.trim().length > 0) {
        onResponseId?.(responseId.trim());
      }

      if (data.usage) {
        const usageCost = data.usage.cost;
        const cost =
          typeof usageCost === "number"
            ? usageCost
            : usageCost?.total_usd ??
              data.metadata?.routstr?.cost?.total_usd ??
              0;
        const msats =
          data.metadata?.routstr?.cost?.total_msats ??
          (typeof data.usage.cost_sats === "number"
            ? data.usage.cost_sats * 1000
            : 0);
        onUsage({
          promptTokens: data.usage.prompt_tokens ?? 0,
          completionTokens: data.usage.completion_tokens ?? 0,
          totalTokens: data.usage.total_tokens ?? 0,
          cost,
          satsCost: msats / 1000,
        });
      }
    } catch {
      // Ignore non-JSON lines/events.
    }
  };

  const processLine = (self: Transform, line: string): void => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }

    if (trimmed === "data: [DONE]" || trimmed === "[DONE]") {
      self.push("data: [DONE]\n\n");
      return;
    }

    if (trimmed.startsWith("data:")) {
      const dataStr = trimmed.startsWith("data: ")
        ? trimmed.slice(6)
        : trimmed.slice(5).trimStart();
      if (dataStr === "[DONE]") {
        self.push("data: [DONE]\n\n");
        return;
      }
      maybeCaptureUsageFromJson(dataStr);
      self.push(`data: ${dataStr}\n\n`);
      return;
    }

    if (trimmed.startsWith("{")) {
      maybeCaptureUsageFromJson(trimmed);
      self.push(`data: ${trimmed}\n\n`);
      return;
    }

    self.push(line + "\n");
  };

  return new Transform({
    transform(chunk, encoding, callback) {
      buffer += chunk.toString();

      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";

      for (const line of lines) {
        processLine(this, line);
      }

      callback();
    },
    flush(callback) {
      if (buffer.trim()) {
        processLine(this, buffer);
      }
      buffer = "";
      callback();
    },
  });
}
```

---

### Step 2: Create Web-to-Node Stream Wrapper

**File**: `sdk/client/streamUtils.ts`

A utility to convert Web `ReadableStream` to Node.js `Readable` and back:

```typescript
import { Readable, ReadableStream as NodeReadableStream } from "stream";
import { ReadableStream as WebReadableStream } from "stream/web";

/**
 * Convert a Web ReadableStream to a Node.js Readable stream.
 */
export function webToNodeReadable(
  webStream: ReadableStream<Uint8Array>,
): NodeReadableStream {
  return Readable.toWeb(
    Readable.fromWeb(webStream as unknown as NodeReadableStream),
  ) as unknown as NodeReadableStream;
}

/**
 * Convert a Node.js Readable stream to a Web ReadableStream.
 */
export function nodeToWebReadable(
  nodeStream: Readable,
): ReadableStream<Uint8Array> {
  return Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
}
```

Actually, there's a simpler approach - we can just use `Readable.fromWeb()` directly and pipe, then convert back:

```typescript
import { Readable } from "stream";
import { ReadableStream as WebReadableStream } from "stream/web";

/**
 * Process a streaming SSE response while extracting usage.
 * 
 * Takes a web Response.body, pipes it through an SSE parser transform,
 * and returns a new Response with the transformed body.
 */
export function processSSEStreamWithUsage(
  response: Response,
  onUsage: (usage: UsageTrackingData) => void,
  onResponseId?: (responseId: string) => void,
): { response: Response; sseParser: ReturnType<typeof createSSEParserTransform> } {
  if (!response.body) {
    return { response, sseParser: null as any };
  }

  const nodeReadable = Readable.fromWeb(
    response.body as unknown as NodeJS.ReadableStream,
  );
  
  const sseParser = createSSEParserTransform(onUsage, onResponseId);
  const transformed = nodeReadable.pipe(sseParser, { end: true });
  
  // Convert back to web ReadableStream
  const webStream = Readable.toWeb(transformed) as ReadableStream<Uint8Array>;
  
  const newResponse = new Response(webStream, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });

  return { response: newResponse, sseParser };
}
```

Wait, let me check the correct Node.js 18+ API for `Readable.fromWeb`:

```typescript
// Node.js 18+ - Readable.fromWeb converts web ReadableStream to Node Readable
const nodeReadable = Readable.fromWeb(webStream);

// To convert Node Readable back to web ReadableStream:
const webStream = Readable.toWeb(nodeReadable);
```

---

### Step 3: Update `RoutstrClient.routeRequest()`

**File**: `sdk/client/RoutstrClient.ts`

Import the SSE parser and update `routeRequest()`:

```typescript
import { createSSEParserTransform } from "./sse";
import { extractUsageFromSSEJson, type UsageTrackingData } from "./usage";
import { Readable } from "stream";
import { ReadableStream as WebReadableStream } from "stream/web";
```

Update `routeRequest()`:

```typescript
async routeRequest(params: RouteRequestParams): Promise<Response> {
  const {
    path,
    method,
    body,
    headers = {},
    baseUrl,
    mintUrl,
    modelId,
  } = params;

  await this._checkBalance();

  let requiredSats = 1;
  let selectedModel: Model | undefined;
  if (modelId) {
    const providerModel = await this.providerManager.getModelForProvider(
      baseUrl,
      modelId
    );
    selectedModel = providerModel ?? undefined;
    if (selectedModel) {
      requiredSats = this.providerManager.getRequiredSatsForModel(
        selectedModel,
        []
      );
    }
  }

  const { token, tokenBalance, tokenBalanceUnit } = await this._spendToken({
    mintUrl,
    amount: requiredSats,
    baseUrl,
  });
  this._log("DEBUG", token, baseUrl);

  let requestBody = body;
  if (body && typeof body === "object") {
    const bodyObj = body as Record<string, unknown>;
    if (!bodyObj.stream) {
      requestBody = { ...bodyObj, stream: false };
    }
  }

  const baseHeaders = this._buildBaseHeaders(headers);
  const requestHeaders = this._withAuthHeader(baseHeaders, token);

  const response = await this._makeRequest({
    path,
    method,
    body: method === "GET" ? undefined : requestBody,
    baseUrl,
    mintUrl,
    token,
    requiredSats,
    headers: requestHeaders,
    baseHeaders,
    selectedModel,
  });

  const tokenBalanceInSats =
    tokenBalanceUnit === "msat" ? tokenBalance / 1000 : tokenBalance;
  const baseUrlUsed = (response as any).baseUrl || baseUrl;
  const tokenUsed = (response as any).token || token;

  // Check if streaming response
  const contentType = response.headers.get("content-type") || "";
  let processedResponse = response;
  let capturedUsage: UsageTrackingData | undefined;
  let capturedResponseId: string | undefined;

  if (contentType.includes("text/event-stream") && response.body) {
    // Process SSE stream to extract usage while forwarding
    let usageResolve: (() => void) | null = null;
    const usagePromise = new Promise<void>((resolve) => {
      usageResolve = resolve;
    });

    const nodeReadable = Readable.fromWeb(
      response.body as unknown as NodeJS.ReadableStream,
    );
    
    const sseParser = createSSEParserTransform(
      (usage) => {
        capturedUsage = usage;
      },
      (responseId) => {
        capturedResponseId = responseId;
      },
    );

    const transformed = nodeReadable.pipe(sseParser, { end: true });
    const webStream = Readable.toWeb(transformed) as ReadableStream<Uint8Array>;

    processedResponse = new Response(webStream, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });

    // Store usage promise for caller to await
    (processedResponse as any)._usagePromise = usagePromise;
    (processedResponse as any)._usageResolve = usageResolve;
    
    // Resolve promise when stream finishes
    transformed.on("end", () => {
      usageResolve?.();
    });
    transformed.on("error", () => {
      usageResolve?.();
    });
  }

  const satsSpent = await this._handlePostResponseBalanceUpdate({
    token: tokenUsed,
    baseUrl: baseUrlUsed,
    initialTokenBalance: tokenBalanceInSats,
    response: processedResponse,
    modelId,
    usage: capturedUsage,
    requestId: capturedResponseId,
  });

  // Attach metadata to response for caller reference
  (processedResponse as any).satsSpent = satsSpent;
  (processedResponse as any).usage = capturedUsage;
  (processedResponse as any).requestId = capturedResponseId;

  return processedResponse;
}
```

---

### Step 4: Update `_trackResponseUsage()` to Handle Streaming

Remove the early return for streaming responses in `_trackResponseUsage()`:

```typescript
private async _trackResponseUsage(params: {
  token: string;
  baseUrl: string;
  response?: Response;
  modelId?: string;
  satsSpent: number;
  usage?: UsageTrackingData;
  requestId?: string;
}): Promise<void> {
  const {
    token,
    baseUrl,
    response,
    modelId,
    satsSpent,
    usage: providedUsage,
    requestId: providedRequestId,
  } = params;

  this._log("DEBUG", "[_trackResponseUsage] Starting", {
    hasResponse: !!response,
    modelId,
    satsSpent,
    hasProvidedUsage: !!providedUsage,
    hasProvidedRequestId: !!providedRequestId,
  });

  if (!response || !modelId) {
    this._log(
      "DEBUG",
      "[_trackResponseUsage] Early return: missing response or modelId",
      {
        hasResponse: !!response,
        modelId,
      }
    );
    return;
  }

  try {
    let usage = providedUsage;
    let requestId = providedRequestId;

    if (!usage || !requestId) {
      const contentType = response.headers.get("content-type") || "";
      
      // For streaming responses, usage is extracted by the SSE parser
      // and attached to the response. Check if it's available.
      if (contentType.includes("text/event-stream")) {
        // Usage should already be extracted via SSE parser in routeRequest()
        usage = (response as any).usage;
        requestId = (response as any).requestId;
        
        // If not yet available, try to wait for it
        const usagePromise = (response as any)._usagePromise;
        if (usagePromise && !usage) {
          this._log(
            "DEBUG",
            "[_trackResponseUsage] Waiting for SSE usage to be extracted..."
          );
          await Promise.race([
            usagePromise,
            new Promise<void>((resolve) => setTimeout(resolve, 5000)),
          ]);
          usage = (response as any).usage;
          requestId = (response as any).requestId;
        }
        
        if (!usage) {
          this._log(
            "DEBUG",
            "[_trackResponseUsage] No usage extracted from streaming response"
          );
          return;
        }
      } else {
        // Non-streaming: extract from response body
        const cloned = response.clone();
        const responseBody = await cloned.json();
        usage =
          usage ??
          extractUsageFromResponseBody(responseBody, satsSpent) ??
          undefined;
        requestId =
          requestId ??
          extractResponseId(responseBody) ??
          response.headers.get("x-routstr-request-id") ??
          undefined;
      }
    }

    if (!usage) {
      this._log(
        "DEBUG",
        "[_trackResponseUsage] No usage extracted, returning early"
      );
      return;
    }

    const finalRequestId = requestId || "unknown";
    this._log("DEBUG", "[_trackResponseUsage] Extracted usage", {
      usage,
      finalRequestId,
    });

    const store = await getDefaultSdkStore();
    const state = store.getState();
    const matchingClient = state.clientIds.find(
      (client) => client.apiKey === token
    );
    const entryId =
      finalRequestId === "unknown"
        ? `req-${Date.now()}-${modelId}`
        : finalRequestId;

    const usageTracking = getDefaultUsageTrackingDriver();
    const entry = {
      id: entryId,
      timestamp: Date.now(),
      modelId,
      baseUrl,
      requestId: finalRequestId,
      client: matchingClient?.clientId,
      ...usage,
    };
    this._log("DEBUG", "[_trackResponseUsage] Appending usage entry", entry);
    await usageTracking.append(entry);
    this._log(
      "DEBUG",
      "[_trackResponseUsage] Successfully appended usage entry"
    );
  } catch (error) {
    this._log(
      "WARN",
      "[_trackResponseUsage] Failed to track response usage:",
      error
    );
  }
}
```

---

### Step 5: Update Daemon to Use SDK-Extracted Usage

**File**: `/home/debian/knightclaw/projects/routstrd/src/daemon/http/index.ts`

Simplify by removing the custom SSE parsing and relying on SDK's extracted usage:

```typescript
if (isStream) {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const body = response.body;
  if (body) {
    // Use the usage extracted by the SDK's SSE parser
    const sdkUsage = (response as any).usage;
    const sdkRequestId = (response as any).requestId || requestId;
    
    // Pipe the stream through (already transformed by SDK)
    const nodeReadable = Readable.fromWeb(
      body as unknown as NodeJS.ReadableStream,
    );
    nodeReadable.pipe(res);

    res.on('finish', () => {
      if (sdkUsage) {
        usageTracker.append({
          id:
            sdkRequestId === "unknown"
              ? `req-${Date.now()}-${modelId}`
              : sdkRequestId,
          timestamp: Date.now(),
          modelId,
          baseUrl: usageBaseUrl,
          requestId: sdkRequestId,
          client: getClientIdFromRequest(req, deps.store),
          ...sdkUsage,
        });
        logger.log(
          "Streaming request usage:",
          JSON.stringify(sdkUsage),
        );
      }
    });
  } else {
    res.end();
  }
  return;
}
```

Actually, wait - the daemon currently does its own SSE parsing. We have two options:

1. **Keep daemon's own SSE parsing** - Remove the SSE parser from SDK and let daemon handle it (current state)
2. **Use SDK's SSE parsing** - Update daemon to rely on SDK's extracted usage (simpler daemon)

The plan recommends **Option 2** for consistency, but we can also do **both** - SDK extracts usage for its own internal tracking, and daemon also tracks for its own purposes.

---

### Step 6: Add Exports

**File**: `sdk/client/index.ts`

```typescript
export { createSSEParserTransform } from "./sse";
```

---

### Step 7: Add Tests

**File**: `sdk/client/__tests__/sse.test.ts`

```typescript
import { createSSEParserTransform } from "../sse";
import { Readable, Writable } from "stream";
import { promisify } from "util";

const pipeline = promisify(stream.pipeline);

describe("createSSEParserTransform", () => {
  it("should extract usage from SSE streaming response", async () => {
    let capturedUsage: any = null;
    let capturedResponseId: string | undefined;

    const sseParser = createSSEParserTransform(
      (usage) => { capturedUsage = usage; },
      (responseId) => { capturedResponseId = responseId; },
    );

    const chunks = [
      'data: {"id":"chatcmpl-123","choices":[{"delta":{"content":"Hello"}}]}',
      'data: {"id":"chatcmpl-123","choices":[{"delta":{"content":" world"}}]}',
      'data: {"id":"chatcmpl-123","choices":[{"finish_reason":"stop","delta":{}}],"usage":{"prompt_tokens":10,"completion_tokens":5,"total_tokens":15,"cost":0.001,"sats_cost":100}}',
      'data: [DONE]',
    ];

    const readable = Readable.from(chunks.map((c) => c + "\n"));
    const writable = new Writable({ write(chunk, encoding, callback) {
      callback();
    }});

    await pipeline(readable, sseParser, writable);

    expect(capturedResponseId).toBe("chatcmpl-123");
    expect(capturedUsage).toEqual({
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
      cost: 0.001,
      satsCost: 100,
    });
  });

  it("should forward SSE data through transform", async () => {
    const forwardedChunks: Buffer[] = [];

    const sseParser = createSSEParserTransform(
      () => {},
      () => {},
    );

    const readable = Readable.from([
      'data: {"id":"test","choices":[{"delta":{"content":"Test"}}]}\n',
    ]);
    const writable = new Writable({
      write(chunk, encoding, callback) {
        forwardedChunks.push(chunk);
        callback();
      },
    });

    await pipeline(readable, sseParser, writable);

    expect(forwardedChunks.length).toBeGreaterThan(0);
    const forwarded = Buffer.concat(forwardedChunks).toString();
    expect(forwarded).toContain('"content":"Test"');
  });
});
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `sdk/client/sse.ts` | Create - copy from `routstrd/src/daemon/sse.ts` |
| `sdk/client/RoutstrClient.ts` | Modify - use SSE parser in `routeRequest()` |
| `sdk/client/index.ts` | Modify - export `createSSEParserTransform` |
| `sdk/client/__tests__/sse.test.ts` | Create - tests |
| `/home/debian/knightclaw/projects/routstrd/src/daemon/http/index.ts` | Optional - simplify to use SDK usage |

---

## Node.js Version Requirements

- **Minimum**: Node.js 18+ (for `Readable.fromWeb()` and `Readable.toWeb()`)
- **Older Node**: Would need `stream/web` polyfill for Node 16

The SDK should document this requirement for the daemon.

---

## TODO

- [ ] Create `sdk/client/sse.ts` (copy from daemon)
- [ ] Update `sdk/client/RoutstrClient.ts` to use SSE parser in `routeRequest()`
- [ ] Update `_trackResponseUsage()` to handle streaming with promise
- [ ] Add exports to `sdk/client/index.ts`
- [ ] Add tests for `sse.ts`
- [ ] Update daemon HTTP handler to use SDK-extracted usage (optional)
- [ ] Test end-to-end with streaming provider

---

## Related

- Original plan: `plans/usage-tracking-storage-refactor.md`
- Daemon SSE parser: `/home/debian/knightclaw/projects/routstrd/src/daemon/sse.ts`
- Daemon HTTP handler: `/home/debian/knightclaw/projects/routstrd/src/daemon/http/index.ts`
