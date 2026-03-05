import { ModelManager } from "@/sdk";
import { createSdkStore, createSqliteDriver } from "@/sdk/storage";
import { createDiscoveryAdapterFromStore } from "@/sdk/storage/store";

async function main(): Promise<void> {
  const store = await createSdkStore({ driver: createSqliteDriver() });
  const adapter = createDiscoveryAdapterFromStore(store);
  const modelManager = new ModelManager(adapter);
  const providers = await modelManager.bootstrapProviders(false);
  await modelManager.fetchModels(providers);
  const uniqueProviders = Array.from(new Set(providers)).sort();

  for (const url of uniqueProviders) {
    console.log(url);
  }
}

main().catch((error) => {
  console.error("Failed to fetch Routstr providers:", error);
  process.exit(1);
});
