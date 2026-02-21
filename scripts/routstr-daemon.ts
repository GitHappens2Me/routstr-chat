import { createServer, IncomingMessage, ServerResponse } from "http";
import {
  routeRequests,
  createSdkStore,
  createSqliteDriver,
  ModelManager,
  InsufficientBalanceError,
} from "@/sdk";
import {
  createDiscoveryAdapterFromStore,
  createProviderRegistryFromStore,
  createStorageAdapterFromStore,
} from "@/sdk/storage/store";
import { spawn } from "child_process";
import { getDecodedToken } from "@cashu/cashu-ts";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const REQUESTS_DIR = join(__dirname, "requests");

async function ensureRequestsDir(): Promise<void> {
  try {
    await mkdir(REQUESTS_DIR, { recursive: true });
  } catch (error) {
    // Directory may already exist
  }
}

function parseArgs(argv: string[]): {
  port: number;
  provider: string | null;
} {
  const portFlagIndex = argv.findIndex((arg) => arg === "--port");
  const providerFlagIndex = argv.findIndex(
    (arg) => arg === "--provider" || arg === "-p"
  );

  const port =
    portFlagIndex !== -1
      ? Number.parseInt(argv[portFlagIndex + 1] || "8008", 10)
      : 8008;
  const provider =
    providerFlagIndex !== -1 ? argv[providerFlagIndex + 1]?.trim() : null;

  return { port, provider };
}

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk.toString();
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

async function runWalletCommand(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("cocod", args, {
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

function parseBalances(output: string): Record<string, number> {
  const trimmed = output.trim();
  if (!trimmed) return {};

  try {
    const parsed = JSON.parse(trimmed) as Record<
      string,
      { sats?: number } | number
    >;
    if (parsed && typeof parsed === "object") {
      return Object.fromEntries(
        Object.entries(parsed).map(([mintUrl, value]) => {
          if (typeof value === "number") {
            return [mintUrl, value];
          }
          if (value && typeof value === "object" && "sats" in value) {
            return [mintUrl, Number(value.sats ?? 0)];
          }
          return [mintUrl, 0];
        })
      );
    }
  } catch {
    // Fall back to line parsing.
  }

  const balances: Record<string, number> = {};
  trimmed
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

function parseMints(output: string): Array<{ url: string; trusted: boolean }> {
  return output
    .split("\n")
    .map((line) => line.trim())
    .map((line) => {
      const urlMatch = line.match(/https?:\/\/\S+/i);
      if (!urlMatch) return null;
      const trustedMatch = line.match(/trusted:\s*(true|false)/i);
      return {
        url: urlMatch[0],
        trusted: trustedMatch
          ? trustedMatch[1].toLowerCase() === "true"
          : false,
      };
    })
    .filter((entry): entry is { url: string; trusted: boolean } =>
      Boolean(entry)
    );
}

function pickTokenLine(output: string): string {
  const lines = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines[lines.length - 1] || "";
}

async function saveRequestBody(body: unknown): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `req-${timestamp}.json`;
  const filepath = join(REQUESTS_DIR, filename);
  await writeFile(filepath, JSON.stringify(body, null, 2));
  return filename;
}

async function main(): Promise<void> {
  const { port, provider } = parseArgs(process.argv);

  const store = createSdkStore({ driver: createSqliteDriver() });
  const discoveryAdapter = createDiscoveryAdapterFromStore(store);
  const providerRegistry = createProviderRegistryFromStore(store);
  const storageAdapter = createStorageAdapterFromStore(store);

  console.log("Bootstrapping providers...");
  const modelManager = new ModelManager(discoveryAdapter);
  const providers = await modelManager.bootstrapProviders(false);
  console.log(`Bootstrapped ${providers.length} providers`);
  await modelManager.fetchModels(providers);
  console.log("Provider bootstrap complete.");

  let activeMintUrl: string | null = null;
  let mintUnits: Record<string, "sat" | "msat"> = {};

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
    getMintUnits(): Record<string, "sat" | "msat"> {
      return mintUnits;
    },
    getActiveMintUrl(): string | null {
      return activeMintUrl;
    },
    async sendToken(mintUrl: string, amount: number): Promise<string> {
      const output = await runWalletCommand([
        "send",
        "cashu",
        String(amount),
        "--mint-url",
        mintUrl,
      ]);
      const token = pickTokenLine(output);
      if (!token) {
        throw new Error("Wallet CLI did not return a token.");
      }
      return token;
    },
    async receiveToken(
      token: string
    ): Promise<{ success: boolean; amount: number; unit: "sat" | "msat" }> {
      await runWalletCommand(["receive", "cashu", token]);
      const decoded = getDecodedToken(token);
      const amount = decoded?.proofs?.reduce(
        (sum, proof) => sum + proof.amount,
        0
      );
      const unit = decoded?.unit === "msat" ? "msat" : "sat";
      return { success: true, amount: amount ?? 0, unit };
    },
    isUsingNip60(): boolean {
      return false;
    },
  };

  try {
    const mintsOutput = await runWalletCommand(["mints", "list"]);
    const mints = parseMints(mintsOutput);
    activeMintUrl =
      mints.find((mint) => mint.trusted)?.url || mints[0]?.url || null;
  } catch (error) {
    console.error("Failed to read mints from wallet:", error);
  }

  const server = createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
      const host = req.headers.host || "localhost";
      const url = new URL(req.url || "/", `http://${host}`);

      console.log(`[daemon] ${req.method} ${url.pathname} - Request received`);

      if (req.method === "GET" && url.pathname === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      if (req.method !== "POST") {
        res.writeHead(405, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Only POST is supported." }));
        return;
      }

      let requestBody: unknown = {};
      try {
        const bodyText = await readBody(req);
        requestBody = bodyText ? JSON.parse(bodyText) : {};
      } catch (error) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "Invalid JSON body.",
            details: error instanceof Error ? error.message : String(error),
          })
        );
        return;
      }

      // const savedFilename = await saveRequestBody(requestBody);
      // console.log(`[daemon] Request body saved to: ${savedFilename}`);

      const bodyObj = requestBody as Record<string, unknown>;
      const modelId = typeof bodyObj.model === "string" ? bodyObj.model : "";
      console.log(`[daemon] Model: ${modelId}, Stream: ${bodyObj.stream}`);

      if (!modelId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing required 'model' field." }));
        return;
      }

      const forcedProvider =
        url.searchParams.get("provider") ||
        (req.headers["x-routstr-provider"] as string | undefined) ||
        provider ||
        undefined;

      console.log(`[daemon] Forced provider: ${forcedProvider || "none"}`);

      try {
        const result = await routeRequests({
          modelId,
          requestBody,
          forcedProvider,
          walletAdapter,
          storageAdapter,
          providerRegistry,
          discoveryAdapter,
          modelManager,
        });

        console.log(`[daemon] Request successful, provider: ${result.baseUrl}`);
        console.log(result.response.body);

        const isStream = bodyObj.stream === true;
        const responseHeaders = result.response.headers;

        if (isStream && result.response.body instanceof ReadableStream) {
          console.log(`[daemon] Streaming response to client`);
          res.writeHead(result.response.status, {
            "Content-Type":
              responseHeaders["content-type"] || "text/event-stream",
            "Transfer-Encoding": "chunked",
          });

          const reader = result.response.body.getReader();
          const decoder = new TextDecoder();

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(decoder.decode(value, { stream: true }));
            }
          } finally {
            reader.releaseLock();
          }
          res.end();
          return;
        }

        res.writeHead(result.response.status, {
          "Content-Type": "application/json",
        });
        res.end(JSON.stringify(result.response.body));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[daemon] Error: ${message}`);

        if (error instanceof InsufficientBalanceError) {
          res.writeHead(402, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              error: message,
              error_type: "insufficient_balance",
              required: error.required,
              available: error.available,
              maxMintBalance: error.maxMintBalance,
              maxMintUrl: error.maxMintUrl,
            })
          );
          return;
        }

        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: message }));
      }
    }
  );

  server.listen(port, async () => {
    await ensureRequestsDir();
    console.log(`Routstr daemon listening on http://localhost:${port}`);
  });
}

main().catch((error) => {
  console.error("Failed to start Routstr daemon:", error);
  process.exit(1);
});
