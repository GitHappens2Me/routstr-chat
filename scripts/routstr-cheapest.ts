import type { Message } from "@/types/chat";
import { ModelManager, MintDiscovery, RoutstrClient } from "@/sdk";
import { createSdkStore, createMemoryDriver } from "@/sdk/storage";
import {
  createDiscoveryAdapterFromStore,
  createProviderRegistryFromStore,
  createStorageAdapterFromStore,
} from "@/sdk/storage/store";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

function parseArgs(argv: string[]): {
  modelId: string | null;
  text: string;
  provider: string | null;
} {
  const providerFlagIndex = argv.findIndex(
    (arg) => arg === "--provider" || arg === "-p"
  );
  let provider: string | null = null;
  const cleanedArgs = [...argv];

  if (providerFlagIndex !== -1) {
    provider = argv[providerFlagIndex + 1]?.trim() || null;
    cleanedArgs.splice(providerFlagIndex, 2);
  }

  const modelId = cleanedArgs[2]?.trim() || null;
  const text = cleanedArgs.slice(3).join(" ").trim();

  return { modelId, text, provider };
}

const { modelId, text, provider } = parseArgs(process.argv);

if (!modelId || !text) {
  console.error(
    "Usage: npx tsx scripts/routstr-cheapest.ts <model-id> <text> [--provider <base-url>]"
  );
  process.exit(1);
}

const resolvedModelId = modelId || "";
const resolvedText = text;
const forcedProvider = provider;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const walletCliPath = join(
  __dirname,
  "..",
  "sdk",
  "cashu-skill",
  "cli",
  "wallet.mjs"
);
const mintToAdd = "https://mint.cubabitcoin.org";

async function runWalletCommand(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [walletCliPath, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code && code !== 0) {
        reject(
          new Error(stderr.trim() || stdout.trim() || "Wallet CLI failed")
        );
        return;
      }
      resolve(stdout.trim());
    });
  });
}

function parseMints(output: string): Array<{ url: string; trusted: boolean }> {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("http"))
    .map((line) => {
      const match = line.match(/^(\S+)\s+\(trusted:\s*(true|false)\)/i);
      if (!match) return null;
      return { url: match[1], trusted: match[2] === "true" };
    })
    .filter((entry): entry is { url: string; trusted: boolean } =>
      Boolean(entry)
    );
}

function parseBalances(output: string): Record<string, number> {
  const balances: Record<string, number> = {};
  output
    .split("\n")
    .map((line) => line.trim())
    .forEach((line) => {
      const match = line.match(/^(\S+):\s+(\d+)\s+s$/);
      if (match) {
        balances[match[1]] = Number.parseInt(match[2], 10);
      }
    });
  return balances;
}

function pickTokenLine(output: string): string {
  const lines = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines[lines.length - 1] || "";
}

async function main(): Promise<void> {
  const store = createSdkStore({ driver: createMemoryDriver() });
  const discoveryAdapter = createDiscoveryAdapterFromStore(store);
  const providerRegistry = createProviderRegistryFromStore(store);
  const storageAdapter = createStorageAdapterFromStore(store);

  const modelManager = new ModelManager(discoveryAdapter);
  const providers = await modelManager.bootstrapProviders(false);
  await modelManager.fetchModels(providers);

  const mintDiscovery = new MintDiscovery(discoveryAdapter);
  await mintDiscovery.discoverMints(providers);

  let baseUrl = "";
  let selectedModel = null as
    | (typeof modelManager extends { getProviderPriceRankingForModel: any }
        ? ReturnType<
            typeof modelManager.getProviderPriceRankingForModel
          >[number]["model"]
        : any)
    | null;

  if (forcedProvider) {
    const normalizedProvider = forcedProvider.endsWith("/")
      ? forcedProvider
      : `${forcedProvider}/`;
    const cachedModels = modelManager.getAllCachedModels();
    const models = cachedModels[normalizedProvider] || [];
    const match = models.find((model) => model.id === resolvedModelId);
    if (!match) {
      console.error(
        `Provider ${normalizedProvider} does not offer model: ${resolvedModelId}`
      );
      process.exit(1);
    }
    baseUrl = normalizedProvider;
    selectedModel = match;
    console.error(`Using provider (forced): ${baseUrl}`);
  } else {
    const ranking =
      modelManager.getProviderPriceRankingForModel(resolvedModelId);
    if (ranking.length === 0) {
      console.error(`No providers found for model: ${resolvedModelId}`);
      process.exit(1);
    }

    const cheapest = ranking[0];
    baseUrl = cheapest.baseUrl;
    selectedModel = cheapest.model;

    console.error(`Using provider: ${baseUrl}`);
    console.error(
      `Pricing sats/M prompt=${cheapest.promptPerMillion.toFixed(2)} completion=${cheapest.completionPerMillion.toFixed(2)} total=${cheapest.totalPerMillion.toFixed(2)}`
    );
  }

  if (!selectedModel) {
    console.error(`No model resolved for: ${resolvedModelId}`);
    process.exit(1);
  }

  let activeMintUrl: string | null = null;
  let mintUnits: Record<string, string> = {};

  const walletAdapter = {
    async getBalances(): Promise<Record<string, number>> {
      const output = await runWalletCommand(["balance"]);
      const balances = parseBalances(output);
      mintUnits = Object.fromEntries(
        Object.keys(balances).map((mintUrl) => [mintUrl, "sat"])
      );
      if (!activeMintUrl) {
        activeMintUrl = Object.keys(balances)[0] || null;
      }
      return balances;
    },
    getMintUnits(): Record<string, string> {
      return mintUnits;
    },
    getActiveMintUrl(): string | null {
      return activeMintUrl;
    },
    async sendToken(mintUrl: string, amount: number): Promise<string> {
      const output = await runWalletCommand(["send", String(amount), mintUrl]);
      const token = pickTokenLine(output);
      if (!token) {
        throw new Error("Wallet CLI did not return a token.");
      }
      return token;
    },
    async receiveToken(token: string): Promise<any[]> {
      await runWalletCommand(["receive", token]);
      return [];
    },
    isUsingNip60(): boolean {
      return false;
    },
  };

  const mintsOutput = await runWalletCommand(["mints"]);
  const mints = parseMints(mintsOutput);
  const hasMint = mints.some((mint) => mint.url === mintToAdd);
  if (!hasMint) {
    await runWalletCommand(["add-mint", mintToAdd]);
  }
  activeMintUrl =
    mints.find((mint) => mint.trusted)?.url || mints[0]?.url || null;

  try {
    const balances: Record<string, number> = await walletAdapter.getBalances();
    const totalBalance = (Object.values(balances) as number[]).reduce(
      (sum, value) => sum + value,
      0
    );

    if (totalBalance <= 0) {
      console.error(
        "Wallet balance is empty. Add a mint and fund it before running this script."
      );
      process.exit(1);
    }

    const providerMints = providerRegistry.getProviderMints(baseUrl);
    const mintUrl =
      walletAdapter.getActiveMintUrl() ||
      providerMints[0] ||
      Object.keys(balances)[0];

    if (!mintUrl) {
      console.error(
        "No mint configured in wallet. Add a mint with the cashu wallet CLI."
      );
      process.exit(1);
    }

    const client = new RoutstrClient(
      walletAdapter,
      storageAdapter,
      providerRegistry
    );

    const messageHistory: Message[] = [{ role: "user", content: resolvedText }];
    let finalMessage = "";
    let errorMessage = "";

    await client.fetchAIResponse(
      {
        messageHistory,
        selectedModel,
        baseUrl,
        mintUrl,
        balance: totalBalance,
        transactionHistory: [],
      },
      {
        onStreamingUpdate: () => {},
        onThinkingUpdate: () => {},
        onMessageAppend: (message) => {
          if (message.role === "assistant") {
            finalMessage =
              typeof message.content === "string"
                ? message.content
                : JSON.stringify(message.content);
          }
          if (message.role === "system") {
            errorMessage =
              typeof message.content === "string"
                ? message.content
                : JSON.stringify(message.content);
          }
        },
        onBalanceUpdate: () => {},
        onTransactionUpdate: () => {},
        onTokenCreated: () => {},
        onPaymentProcessing: (isProcessing) => {
          if (isProcessing) {
            console.error("Processing payment...");
          }
        },
        onLastMessageSatsUpdate: (satsSpent) => {
          if (typeof satsSpent === "number") {
            console.error(`Sats spent: ${satsSpent.toFixed(0)}`);
          }
        },
      }
    );

    if (finalMessage) {
      console.log(finalMessage);
      return;
    }

    if (errorMessage) {
      console.error(errorMessage);
      process.exit(1);
    }

    console.log("No response content received.");
  } finally {
    // Wallet CLI manages its own cleanup per command.
  }
}

main().catch((error) => {
  console.error("Failed to run cheapest-provider request:", error);
  process.exit(1);
});
