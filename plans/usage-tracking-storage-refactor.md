# Usage Tracking Storage Refactor Plan

## Summary

The current SDK storage design stores `usageTracking` as a single JSON array inside the generic `StorageDriver` key-value layer. That approach does not scale well for thousands of usage rows because every write rewrites the full array, every hydrate loads the full dataset into memory, and query/pagination support is poor.

This plan proposes separating usage tracking from the generic Zustand-backed SDK state and storing it in a backend appropriate for append-heavy event data:

- **Browser**: IndexedDB object store with indexes
- **Node**: SQLite table with indexes
- **Zustand / generic `StorageDriver`**: keep for lightweight SDK state only

---

## Current Problems

### 1. Monolithic array persistence

Today `setUsageTracking()` persists the entire usage array at once:

```ts
setUsageTracking: (value) => {
  void driver.setItem(SDK_STORAGE_KEYS.USAGE_TRACKING, value);
  set({ usageTracking: value });
},
```

Implications:

- appending one row rewrites the full array
- startup hydration loads all historical rows
- memory usage grows with total history
- increased risk of read-modify-write races
- no efficient pagination or filtering

### 2. Current drivers are key-value blob stores

All existing drivers implement:

```ts
getItem(key);
setItem(key, value);
removeItem(key);
```

Even the `indexedDB` and `sqlite` drivers are currently used only as JSON blob stores, so they do not provide row-level operations for usage tracking.

### 3. localStorage is a poor browser fit for usage logs

`localStorage` is synchronous, quota-limited, and not suitable for large append-heavy datasets.

---

## Proposed Design

## Separate storage responsibilities

### Keep in Zustand + generic `StorageDriver`

Continue storing lightweight state in the current SDK store:

- models cache
  n- last used model
- provider info cache
- base URLs list
- disabled providers
- cached tokens
- API keys
- child keys
- cached receive tokens
- client IDs

### Move out of Zustand state

Remove long-term `usageTracking` history from `SdkStorageState`.

Instead, introduce a dedicated usage tracking persistence API.

---

## New Types

Add a shared type for usage rows.

Suggested file:

- `sdk/storage/usageTracking/types.ts`

```ts
export interface UsageTrackingEntry {
  id: string;
  timestamp: number;
  modelId: string;
  baseUrl: string;
  requestId: string;
  cost: number;
  satsCost: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  client?: string;
  sessionId?: string;
  tags?: string[];
}
```

---

## New Driver Interface

Suggested file:

- `sdk/storage/usageTracking/interfaces.ts`

```ts
import type { UsageTrackingEntry } from "./types";

export interface ListUsageTrackingOptions {
  limit?: number;
  before?: number;
  after?: number;
  modelId?: string;
  baseUrl?: string;
  sessionId?: string;
  client?: string;
}

export interface UsageTrackingSummaryOptions {
  from?: number;
  to?: number;
  groupBy?: "day" | "modelId" | "baseUrl" | "client";
}

export interface UsageTrackingDriver {
  append(entry: UsageTrackingEntry): Promise<void>;
  appendMany(entries: UsageTrackingEntry[]): Promise<void>;
  list(options?: ListUsageTrackingOptions): Promise<UsageTrackingEntry[]>;
  count(options?: Omit<ListUsageTrackingOptions, "limit">): Promise<number>;
  deleteOlderThan(timestamp: number): Promise<number>;
  clear(): Promise<void>;
}
```

Optional later additions:

- `summarize()`
- `getById()`
- `deleteById()`
- `upsert()`

---

## Browser Implementation: IndexedDB

Suggested file:

- `sdk/storage/usageTracking/indexedDB.ts`

### Data model

Use a dedicated object store, not the existing key-value store.

Suggested IndexedDB setup:

- DB name: `routstr-sdk`
- object store: `usage_tracking`
- keyPath: `id`

Suggested indexes:

- `timestamp`
- `modelId`
- `baseUrl`
- `sessionId`
- `client`
- optionally compound indexes later if needed

### Notes

IndexedDB is a much better browser fit than localStorage because it is:

- async
- larger capacity
- better for many records
- indexable
- queryable without loading everything up front

### Query strategy

At minimum:

- support listing sorted by timestamp descending
- support limit
- support before/after timestamp range
- apply other filters in memory initially if needed

Later optimization:

- use dedicated indexes for common filters
- add compound indexes if query patterns justify them

---

## Node Implementation: SQLite

Suggested file:

- `sdk/storage/usageTracking/sqlite.ts`

### Suggested schema

```sql
CREATE TABLE IF NOT EXISTS usage_tracking (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  model_id TEXT NOT NULL,
  base_url TEXT NOT NULL,
  request_id TEXT NOT NULL,
  cost REAL NOT NULL,
  sats_cost REAL NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  client TEXT,
  session_id TEXT,
  tags TEXT
);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_timestamp
  ON usage_tracking(timestamp);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_model_id
  ON usage_tracking(model_id);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_base_url
  ON usage_tracking(base_url);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_session_id
  ON usage_tracking(session_id);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_client
  ON usage_tracking(client);
```

### Notes

- store `tags` as JSON text initially
- append operations become cheap inserts
- listing can use `ORDER BY timestamp DESC LIMIT ?`
- filtering can be implemented with SQL predicates
- deletion/retention becomes straightforward

---

## SDK Store Changes

## Remove from `SdkStorageState`

From `sdk/storage/types.ts`, remove:

```ts
usageTracking: Array<...>
```

## Remove from `SdkStorageStore`

From `sdk/storage/store.ts`, remove:

- `setUsageTracking(...)`
- default `usageTracking: []`
- hydration of `rawUsageTracking`
- assignment of `usageTracking`

## Remove storage key

From `sdk/storage/keys.ts`, eventually remove:

```ts
USAGE_TRACKING: "usage_tracking";
```

This can happen after migration support is added.

---

## New High-Level API

Instead of:

```ts
setUsageTracking(entries);
```

Prefer APIs like:

```ts
usageTracking.append(entry);
usageTracking.appendMany(entries);
usageTracking.list({ limit: 100, before });
usageTracking.count({ modelId, sessionId });
usageTracking.deleteOlderThan(timestamp);
```

If the SDK exposes a public storage facade, add usage-specific methods there rather than routing them through Zustand state.

---

## Migration Strategy

## Goal

Migrate existing users from blob-based `USAGE_TRACKING` storage to the new dedicated usage-tracking backend without data loss.

### Browser migration

1. On first init of new usage tracking driver:
   - read legacy `SDK_STORAGE_KEYS.USAGE_TRACKING` from old generic driver
   - if rows exist, bulk insert them into IndexedDB usage store
   - after successful migration, remove legacy key or mark migration complete

### Node migration

1. On first init of SQLite usage tracking driver:
   - read legacy `SDK_STORAGE_KEYS.USAGE_TRACKING` from existing key-value driver
   - bulk insert into SQLite table
   - remove legacy key after success

### Safety

- migration should be idempotent
- duplicate IDs should not fail migration catastrophically
- prefer insert-ignore / upsert semantics where possible
- record a migration version marker

Suggested migration marker key:

- `usage_tracking_migration_v1`

---

## Suggested Rollout Plan

### Phase 1: Introduce new usage tracking module

Add:

- shared types
- usage tracking driver interface
- IndexedDB implementation
- SQLite implementation

Do not remove old storage yet.

### Phase 2: Add migration logic

On initialization, migrate legacy array data into new backend if present.

### Phase 3: Switch SDK call sites

Refactor all usage tracking writes from array replacement to append-style calls.

Search for code patterns like:

- `setUsageTracking(...)`
- `getState().usageTracking`
- read-modify-write on usage arrays

### Phase 4: Remove legacy usage state from Zustand store

Once all call sites are migrated:

- remove `usageTracking` from `SdkStorageState`
- remove `setUsageTracking`
- remove hydration logic
- remove storage key

---

## Driver Selection Recommendation

## Browser

Recommended priority:

1. usage tracking: IndexedDB
2. lightweight SDK state: IndexedDB or localStorage
3. localStorage only as a fallback for very small state

If simplicity is preferred, the existing generic SDK state could still use localStorage initially, while usage tracking uses IndexedDB separately.

If consistency is preferred, migrate all browser persistence to IndexedDB and reserve localStorage as fallback only.

## Node

Recommended priority:

1. usage tracking: SQLite
2. generic SDK state: SQLite key-value is acceptable, or keep current sqlite key-value driver
3. memory driver for tests / ephemeral runtime

---

## Why this is better

### Performance

- inserts do not rewrite all historical rows
- startup does not hydrate the full history into Zustand
- reads can be paginated

### Scalability

- thousands or tens of thousands of rows are reasonable
- retention policies become easy
- aggregation becomes possible later

### Correctness

- lower risk of race conditions from array-level read-modify-write
- cleaner separation between app state and event history

### Future flexibility

This design makes it easier to later add:

- usage summaries by day/model/provider
- analytics views
- export/import
- pruning and retention windows
- sync to remote telemetry backend

---

## Minimal First Refactor

If a full redesign is too much right now, the minimum useful change would be:

1. stop storing usage tracking in localStorage
2. add a dedicated IndexedDB usage tracking store in browser
3. add a dedicated SQLite usage tracking table in Node
4. keep Zustand for everything else

This gets most of the benefit without requiring a full storage rewrite.

---

## TODO

- [ ] Remove `USAGE_TRACKING` key from `sdk/storage/keys.ts` now that migration is implemented

---

## Final Recommendation

- Keep Zustand for lightweight in-memory SDK state
- Keep generic `StorageDriver` for small persisted key-value state
- Do not store `usageTracking` as a single array in that layer
- Use IndexedDB for browser usage tracking
- Use SQLite for Node usage tracking
- Migrate legacy `USAGE_TRACKING` blob data once and then remove it from the Zustand-backed store
