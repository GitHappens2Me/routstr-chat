import { ModelManager } from "@/sdk";
import { createSdkStore, createSqliteDriver } from "@/sdk/storage";
import { createDiscoveryAdapterFromStore } from "@/sdk/storage/store";

const normalizeModelId = (modelId: string): string =>
  modelId.includes("/") ? modelId.split("/").pop() || modelId : modelId;

async function main(): Promise<void> {
  const rawModelId = process.argv[2]?.trim();
  if (!rawModelId) {
    console.error("Usage: npx tsx scripts/find-model-providers.ts <model-id>");
    process.exit(1);
  }

  const modelId = normalizeModelId(rawModelId);
  const store = createSdkStore({ driver: createSqliteDriver() });
  const adapter = createDiscoveryAdapterFromStore(store);
  const modelManager = new ModelManager(adapter);

  const providers = await modelManager.bootstrapProviders(false);
  await modelManager.fetchModels(providers);

  const allModels = adapter.getCachedModels();
  const matches = new Set<string>();

  for (const [baseUrl, models] of Object.entries(allModels)) {
    if (models.some((model) => normalizeModelId(model.id) === modelId)) {
      matches.add(baseUrl);
    }
  }

  const list = Array.from(matches).sort();
  if (list.length === 0) {
    console.log(`No providers found for model: ${modelId}`);
    return;
  }

  for (const url of list) {
    console.log(url);
  }
}

main().catch((error) => {
  console.error("Failed to find providers for model:", error);
  process.exit(1);
});
