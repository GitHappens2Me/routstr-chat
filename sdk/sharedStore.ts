/**
 * Shared SDK store singleton.
 *
 * All hooks (useSdkClient, useDiscoveryAdapter, useSdkCachedBalance, etc.)
 * import from here so there is exactly ONE store, ONE hydrate cycle, and
 * ONE set of adapters across the entire app.
 */
import {
  createSdkStore,
  createDiscoveryAdapterFromStore,
  createStorageAdapterFromStore,
  createProviderRegistryFromStore,
  createIndexedDBDriver,
  createMemoryDriver,
} from "@routstr/sdk/storage";

import type { SdkStore } from "@routstr/sdk/storage";
import type { DiscoveryAdapter } from "@routstr/sdk/discovery";
import type { StorageAdapter, ProviderRegistry } from "@routstr/sdk/wallet";

// ---------------------------------------------------------------------------
// Driver selection
// ---------------------------------------------------------------------------
const isBrowser = typeof window !== "undefined";

/**
 * We use IndexedDB in the browser (handles larger payloads like provider
 * metadata) and an in-memory driver during SSR / edge rendering.
 */
const driver = isBrowser ? createIndexedDBDriver() : createMemoryDriver();

// ---------------------------------------------------------------------------
// Singleton store
// ---------------------------------------------------------------------------
const { store, hydrate } = createSdkStore({ driver });

// ---------------------------------------------------------------------------
// Pre-built adapters (derived from the one store)
// ---------------------------------------------------------------------------
const discoveryAdapter: DiscoveryAdapter =
  createDiscoveryAdapterFromStore(store);

const storageAdapter: StorageAdapter = createStorageAdapterFromStore(store);

const providerRegistry: ProviderRegistry =
  createProviderRegistryFromStore(store);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export { store, hydrate, discoveryAdapter, storageAdapter, providerRegistry };
export type { SdkStore, DiscoveryAdapter, StorageAdapter, ProviderRegistry };
