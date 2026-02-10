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
  const start = Date.now();
  const logStep = (label: string): void => {
    const elapsedSeconds = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`[${new Date().toISOString()}] +${elapsedSeconds}s ${label}`);
  };

  logStep(`Starting lookup for model: ${modelId}`);
  const store = createSdkStore({ driver: createSqliteDriver() });
  const adapter = createDiscoveryAdapterFromStore(store);
  const modelManager = new ModelManager(adapter);

  logStep("Bootstrapping providers...");
  const providers = await modelManager.bootstrapProviders(false);
  logStep(`Bootstrapped ${providers.length} providers.`);

  logStep("Fetching models for providers...");
  await modelManager.fetchModels(providers);
  logStep("Fetched models for providers.");

  logStep("Reading cached models...");
  const allModels = adapter.getCachedModels();
  logStep(
    `Loaded cached models for ${Object.keys(allModels).length} providers.`
  );
  const matches = new Set<string>();

  logStep("Filtering providers by model...");
  for (const [baseUrl, models] of Object.entries(allModels)) {
    if (models.some((model) => normalizeModelId(model.id) === modelId)) {
      matches.add(baseUrl);
    }
  }
  logStep(`Filtered to ${matches.size} matching providers.`);

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
