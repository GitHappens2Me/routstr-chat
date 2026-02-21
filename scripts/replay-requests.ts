import { readFile, readdir } from "fs/promises";
import { join } from "path";
import http from "http";

const REQUESTS_DIR = join(__dirname, "requests");
const DAEMON_URL = "http://localhost:8008";

async function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk.toString();
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

async function sendRequest(body: object): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = new URL("/v1/chat/completions", DAEMON_URL);
    const bodyStr = JSON.stringify(body);

    const req = http.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(bodyStr),
        },
      },
      async (res) => {
        const responseBody = await readBody(res);
        console.log(`[response] Status: ${res.statusCode}`);
        console.log(`[response] Body: ${responseBody}`);
        resolve();
      }
    );

    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}

async function main(): Promise<void> {
  const files = await readdir(REQUESTS_DIR);
  const jsonFiles = files.filter((f) => f.endsWith(".json")).sort();

  console.log(`Found ${jsonFiles.length} request files`);

  for (const file of jsonFiles) {
    const filepath = join(REQUESTS_DIR, file);
    console.log(`\n[processing] ${file}`);

    const content = await readFile(filepath, "utf-8");
    const body = JSON.parse(content);

    console.log(`[sending] model: ${body.model}`);
    await sendRequest(body);
  }

  console.log("\nDone processing all requests.");
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
