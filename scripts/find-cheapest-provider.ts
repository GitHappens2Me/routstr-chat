import { createSdkStore, createSqliteDriver } from "@/sdk/storage";
import {
  createDiscoveryAdapterFromStore,
  createStorageAdapterFromStore,
} from "@/sdk/storage/store";
import { ModelManager } from "@/sdk/discovery/ModelManager";

const MODEL_ID = "minimax-m2.5";

async function findCheapestProvider(): Promise<{
  baseUrl: string;
  price: number;
} | null> {
  const { store, hydrate } = createSdkStore({ driver: createSqliteDriver() });
  await hydrate;
  const discoveryAdapter = createDiscoveryAdapterFromStore(store);

  const modelManager = new ModelManager(discoveryAdapter);
  const providers = await modelManager.bootstrapProviders(false);
  await modelManager.fetchModels(providers);

  const allModels = modelManager.getAllCachedModels();

  let cheapestProvider: string | null = null;
  let lowestPrice = Infinity;

  for (const [baseUrl, models] of Object.entries(allModels)) {
    const model = models.find((m) => m.id === MODEL_ID);
    if (model?.sats_pricing?.completion !== undefined) {
      const price = model.sats_pricing.completion;
      console.log(`${baseUrl}: ${MODEL_ID} @ ${price} sats/completion`);
      if (price < lowestPrice) {
        lowestPrice = price;
        cheapestProvider = baseUrl;
      }
    }
  }

  if (cheapestProvider) {
    return { baseUrl: cheapestProvider, price: lowestPrice };
  }
  return null;
}

findCheapestProvider()
  .then((result) => {
    if (result) {
      console.log(
        `\nCheapest provider for ${MODEL_ID}: ${result.baseUrl} at ${result.price} sats/completion`
      );
    } else {
      console.log(`\nNo provider found for ${MODEL_ID}`);
    }
  })
  .catch(console.error);
