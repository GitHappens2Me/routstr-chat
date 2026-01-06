import { http, HttpResponse, delay } from "msw";

function getScenario(request: Request): string | null {
  const header = request.headers.get("X-Mock-Scenario");
  return header ? header.toLowerCase() : null;
}

export const handlers = [
  http.post("*/v1/chat/completions", async ({ request }) => {
    const scenario = getScenario(request);

    if (scenario && (scenario === "401" || scenario === "unauthorized")) {
      const latency = request.headers.get("X-Mock-Latency");
      if (latency) {
        const ms = Number.isNaN(Number(latency))
          ? latency === "slow"
            ? 1500
            : latency === "timeout"
              ? 10000
              : 0
          : Number(latency);
        if (ms > 0) await delay(ms);
      }

      return HttpResponse.json(
        {
          error: {
            message: "Unauthorized - Invalid or expired token",
            code: "UNAUTHORIZED",
            status: 401,
          },
        },
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "x-routstr-request-id": "7ee5gg8b-9d41-5cbe-c2aa-50d0555eg07d",
          },
        }
      );
    }

    if (scenario && (scenario === "403" || scenario === "forbidden")) {
      const latency = request.headers.get("X-Mock-Latency");
      if (latency) {
        const ms = Number.isNaN(Number(latency))
          ? latency === "slow"
            ? 1500
            : latency === "timeout"
              ? 10000
              : 0
          : Number(latency);
        if (ms > 0) await delay(ms);
      }

      return HttpResponse.json(
        {
          error: {
            message: "Forbidden - Insufficient permissions",
            code: "FORBIDDEN",
            status: 403,
          },
        },
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            "x-routstr-request-id": "8ff6hh9c-0e52-6dcf-d3bb-61e1666fh18e",
          },
        }
      );
    }

    if (scenario && (scenario === "402" || scenario === "payment-required")) {
      const latency = request.headers.get("X-Mock-Latency");
      if (latency) {
        const ms = Number.isNaN(Number(latency))
          ? latency === "slow"
            ? 1500
            : latency === "timeout"
              ? 10000
              : 0
          : Number(latency);
        if (ms > 0) await delay(ms);
      }

      return HttpResponse.json(
        {
          error: {
            message: "Payment Required - Insufficient balance",
            code: "PAYMENT_REQUIRED",
            status: 402,
          },
        },
        {
          status: 402,
          headers: {
            "Content-Type": "application/json",
            "x-routstr-request-id": "9gg7ii0d-1f63-7edg-e4cc-72f2777gi29f",
          },
        }
      );
    }

    if (
      scenario &&
      (scenario === "400" ||
        scenario === "bad-request" ||
        scenario === "invalid-model")
    ) {
      const latency = request.headers.get("X-Mock-Latency");
      if (latency) {
        const ms = Number.isNaN(Number(latency))
          ? latency === "slow"
            ? 1500
            : latency === "timeout"
              ? 10000
              : 0
          : Number(latency);
        if (ms > 0) await delay(ms);
      }

      return HttpResponse.text("model-xyz is not a valid model ID", {
        status: 400,
        headers: {
          "Content-Type": "text/plain",
          "x-routstr-request-id": "a00b11c-4i96-0hjj-h7ff-05i5000jl52i",
        },
      });
    }

    if (scenario && scenario === "400-model-not-found") {
      const latency = request.headers.get("X-Mock-Latency");
      if (latency) {
        const ms = Number.isNaN(Number(latency))
          ? latency === "slow"
            ? 1500
            : latency === "timeout"
              ? 10000
              : 0
          : Number(latency);
        if (ms > 0) await delay(ms);
      }

      return HttpResponse.json(
        {
          error: {
            message: "Model 'gpt-oss-20b' not found",
            type: "invalid_model",
            code: 400,
          },
          request_id: "17f6608b-f8af-454e-9e97-8d71cdc849e3",
        },
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (scenario && (scenario === "413" || scenario === "payload-too-large")) {
      const latency = request.headers.get("X-Mock-Latency");
      if (latency) {
        const ms = Number.isNaN(Number(latency))
          ? latency === "slow"
            ? 1500
            : latency === "timeout"
              ? 10000
              : 0
          : Number(latency);
        if (ms > 0) await delay(ms);
      }

      return HttpResponse.json(
        {
          error: {
            message: "Payload Too Large",
            code: "PAYLOAD_TOO_LARGE",
            status: 413,
          },
        },
        {
          status: 413,
          headers: {
            "Content-Type": "application/json",
            "x-routstr-request-id": "6dd4ff7a-8c30-4bad-b199-49c9444df96c",
          },
        }
      );
    }

    if (
      scenario &&
      (scenario === "500" || scenario === "internal-server-error")
    ) {
      const latency = request.headers.get("X-Mock-Latency");
      if (latency) {
        const ms = Number.isNaN(Number(latency))
          ? latency === "slow"
            ? 1500
            : latency === "timeout"
              ? 10000
              : 0
          : Number(latency);
        if (ms > 0) await delay(ms);
      }

      return HttpResponse.json(
        {
          error: {
            message:
              "Internal Server Error - Something went wrong on the server",
            code: "INTERNAL_SERVER_ERROR",
            status: 500,
          },
        },
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "x-routstr-request-id": "0hh8jj1e-2g74-8feh-f5dd-83g3888hj30g",
          },
        }
      );
    }

    if (scenario && (scenario === "502" || scenario === "bad-gateway")) {
      const latency = request.headers.get("X-Mock-Latency");
      if (latency) {
        const ms = Number.isNaN(Number(latency))
          ? latency === "slow"
            ? 1500
            : latency === "timeout"
              ? 10000
              : 0
          : Number(latency);
        if (ms > 0) await delay(ms);
      }

      return HttpResponse.json(
        {
          error: {
            message: "Bad Gateway - Server received an invalid response",
            code: "BAD_GATEWAY",
            status: 502,
          },
        },
        {
          status: 502,
          headers: {
            "Content-Type": "application/json",
            "x-routstr-request-id": "1ii9kk2f-3h85-9gfi-g6ee-94h4999ik41h",
          },
        }
      );
    }

    return;
  }),

  http.get(
    "https://mint.minibits.cash/Bitcoin/v1/keysets",
    async ({ request }) => {
      const scenario = getScenario(request);

      if (
        scenario &&
        (scenario === "failed-to-fetch" || scenario === "network-error")
      ) {
        // Simulate a network failure that causes "Failed to fetch"
        // This simulates a blocked request (e.g., CORS failure) that doesn't return any response
        throw new Error("Failed to fetch");
      }

      // Default response when no scenario is set
      return HttpResponse.json({
        keysets: [
          {
            id: "00827d7d75aa8fcb",
            unit: "sat",
            active: false,
            input_fee_ppk: 0,
          },
          { id: "9mlfd5vCzgGl", unit: "sat", active: false, input_fee_ppk: 0 },
          { id: "ctv28hTYzQwr", unit: "sat", active: false, input_fee_ppk: 0 },
          {
            id: "00500550f0494146",
            unit: "sat",
            active: false,
            input_fee_ppk: 0,
          },
          {
            id: "00107937db0cc865",
            unit: "sat",
            active: true,
            input_fee_ppk: 0,
          },
        ],
      });
    }
  ),

  http.get(
    "https://mint.minibits.cash/Bitcoin/v1/info",
    async ({ request }) => {
      const scenario = getScenario(request);

      if (
        scenario &&
        (scenario === "failed-to-fetch" || scenario === "network-error")
      ) {
        // Simulate a network failure that causes "Failed to fetch"
        throw new Error("Failed to fetch");
      }

      // Default response when no scenario is set
      return HttpResponse.json({
        name: "Minibits mint",
        pubkey:
          "023cf092fb60e21e8c367817c2c9d7471d796f6b75dc259e1a3320d5e53d489554",
        version: "Nutshell/0.18.0",
        description:
          "Minibits wallet mint. Minibits is an active research project in BETA, use at your own risk.",
        description_long:
          "Do not use with large amounts of ecash. Minibits mint is operated on a best-effort basis and without any guarantees.",
        contact: [
          { method: "email", info: "support@minibits.cash" },
          { method: "twitter", info: "@MinibitsCash" },
          {
            method: "nostr",
            info: "npub1kvaln6tm0re4d99q9e4ma788wpvnw0jzkz595cljtfgwhldd75xsj9tkzv",
          },
        ],
        motd: "Message to users",
        icon_url:
          "https://play-lh.googleusercontent.com/raLGxOOzbxOsEx25gr-rISzJOdbgVPG11JHuI2yV57TxqPD_fYBof9TRh-vUE-XyhgmN=w240-h480-rw",
        time: 1762312502,
        nuts: {
          "4": {
            methods: [
              {
                method: "bolt11",
                unit: "sat",
                min_amount: 0,
                max_amount: 1000000,
                options: { description: true },
              },
            ],
            disabled: false,
          },
          "5": {
            methods: [
              {
                method: "bolt11",
                unit: "sat",
                min_amount: 0,
                max_amount: 1000000,
              },
            ],
            disabled: false,
          },
          "7": { supported: true },
          "8": { supported: true },
          "9": { supported: true },
          "10": { supported: true },
          "11": { supported: true },
          "12": { supported: true },
          "14": { supported: true },
          "20": { supported: true },
          "15": {
            methods: [{ method: "bolt11", unit: "sat" }],
          },
          "17": {
            supported: [
              {
                method: "bolt11",
                unit: "sat",
                commands: [
                  "bolt11_melt_quote",
                  "proof_state",
                  "bolt11_mint_quote",
                ],
              },
            ],
          },
          "19": {
            cached_endpoints: [
              { method: "POST", path: "/v1/mint/bolt11" },
              { method: "POST", path: "/v1/melt/bolt11" },
              { method: "POST", path: "/v1/swap" },
            ],
            ttl: 604800,
          },
        },
      });
    }
  ),
  http.get(
    "https://mint.minibits.cash/Bitcoin/v1/keys/00500550f0494146",
    async ({ request }) => {
      const scenario = getScenario(request);

      if (
        scenario &&
        (scenario === "failed-to-fetch" || scenario === "network-error")
      ) {
        // Simulate a network failure that causes "Failed to fetch"
        throw new Error("Failed to fetch");
      }

      // Default response when no scenario is set
      return HttpResponse.json({
        keysets: [
          {
            id: "00500550f0494146",
            unit: "sat",
            keys: {
              "1": "0321687c0cb918cf996dce31bc30451f8545741abb284eb5f6b882c4fc81249323",
              "2": "0267ce6049bc2c74546d7c1b06ba403d9fbfb7e43c14b1cc03edf4f784fa0e1d81",
              "4": "022a785df2cf2ea3fb46a116a87c05b2982da0ae885bc4d7bd7af5de628123cf96",
              "8": "025c97833e4777a87fb7986f5433c22da2082f7105dd683f5d8fb3e440dea7299f",
              "16": "02c7daaf5f14f9dba1ddc9f244e2e6c1e92428915034b62654c7862f75c8121dd3",
              "32": "038c462da9dce2391ec3b4a343dba8b7b5925aafaea54ee9836b34b77ea36acaa7",
              "64": "03875f0ce4bafc8b5df82ba47302a42f5a3293b876e368aae7c35c1a5bd57eb0e2",
              "128":
                "02d4e95bcfd4241bfa19d1d952412f1b51d0375a3ed3489a519a695d0121c16413",
              "256":
                "025be9deee55214111f2f79912932fc42e448a8f73ea5895f3cf1d77ea25524d2f",
              "512":
                "03d49e84dd18ca4a0f3afcb0582aa712a67669f925060a040584af3ef8a74954a7",
              "1024":
                "02a0efb0095ab375e72362c2fdd1b24847227b4494585735d8cf440a3a9c742b07",
              "2048":
                "03fd7489ba63795bca8757cd36edb08df3d7c999e5d96827c7362fa5eed19f118f",
              "4096":
                "03e01beeb2903c2848c7ea36a40fe2493a8e996e336054dc8dfd57e7934379ecc7",
              "8192":
                "03ffb60322211cac6fee5f19d61fd5aaa38dabca71ee04aa3056120c02bf7a808f",
              "16384":
                "025e268384922f467be366c7ced0c92f250a0b9da0e1de4b10ff708b36dea741bb",
              "32768":
                "02d998b64b91d1002527b64298f460cc3626cefc827c549d930f17280db930c6ca",
              "65536":
                "03dc807665127bf8472d13de4b25fe248b71b2bf6e423fc6e150574a394c927d75",
              "131072":
                "024232c1028ab9ee45d394c65ccf04b158004a978858d5af29d413eb62c270ec20",
              "262144":
                "023ca28651f8f2ad7789b3875bd0af9c462a1c794231f9beaaeecf0389f22d4c08",
              "524288":
                "020aebbbd33b4af6e9b1f4f29d216564a794f23c7741ccd97f27f328ff8fc2a843",
              "1048576":
                "029eeb9a6b4a92a9f2dfd64dc4c9c8464a977a7e3658ef55172cc296683550c365",
              "2097152":
                "0320212e5bedc5ccc88f090f3f95e253b52a53391e1307ecc6fced18f732eb4fb8",
              "4194304":
                "02faa595d2e95cce5cc74395f1b2df4ebbfdff34542cf91804cc480574e278f4b4",
              "8388608":
                "02b0d3128e347276de25582364709c4cfd15082ac7b8474e9f27242199294e3855",
              "16777216":
                "030f6dbc1c9aa0989d70acc727d75b3bc3cb5feb97a1b94f853b239865c3f06623",
              "33554432":
                "03a3a52ebed62890e4508586a906c233d3bd369e159e63279af8af895a46040e7b",
              "67108864":
                "0380c7273a263515f16a2424c3f89900f871b01a436213444ea7c631daa6144254",
              "134217728":
                "03faf2f16d7f7dbffdb03fd336478b9d8f08217fe08411df8fd342018bac10ae0e",
              "268435456":
                "024fd2feca5dafd9c1c33bcfa90fe3fc592c0c66f6bc4f8040cdabf8bb028177c6",
              "536870912":
                "0255aa3c9db98b7de8e3a2b271ddf7ae70a955296fe40c7aeaa7a87b71cb58f08d",
              "1073741824":
                "023343a0defc28ce08e0c658f660172da793abb8575fa5d526d5e06aaf8caa871c",
              "2147483648":
                "03f1663c4b0c88fe39026845a134e4c7f54060ecf4f57bf813a38307b8202ddf75",
              "4294967296":
                "02750ed0f993a99cd1b23521c68784e5481daaaa79659214f9da6468a10421b348",
              "8589934592":
                "02a2ae324ac2858ebc820bc0744f5361597de7392b770955c2e838ef8e30a4e27c",
              "17179869184":
                "0269ac028b1dff95ae60472cc536f98c391def179cd92b969673cc53a6610194f2",
              "34359738368":
                "036b13f1f4e507bc02d02f79b275ee99570d7767dff8bc23c99c4d2b7d27542835",
              "68719476736":
                "03f078c300c542e1a5a77fea1bff22a15501fe0c6b6d74de50933a3b227acfb1af",
              "137438953472":
                "029b8f2969ad777f9f2a8f2af396f2c25ecd60ed2b91997407a7237ebdf0e001e5",
              "274877906944":
                "038fef892409d4c71180b9361c3265545b94b4cb4a20f6c79a89147c2d2fde7540",
              "549755813888":
                "029147f7335fec14cba047ef1ad0fd5fe86c1e038f37ba10d08e1e58ae56d32f64",
              "1099511627776":
                "039326719785bace4b51743d8cf144000767a05763d89477a426b1217973637971",
              "2199023255552":
                "03ce9d0ddad19d0e26c7577af61095365ced4c987371652a49abf9a24bc5df6539",
              "4398046511104":
                "027b412e06bc9b1a0ea5816bee1da715c6e0e04a3f6ccb07b4061bb9beb28cb384",
              "8796093022208":
                "02bce8417b1da85a1ae6d363915f0ffc88dca2bcc218c0e44fdafe593b8e57e896",
              "17592186044416":
                "0244675e3389d074e161336f44c307009435ec1ba13ba5b904d286f5fe45b55a09",
              "35184372088832":
                "03cdd6b165f2e91228ec62c651968e244074665711fb3224c1e2d3f05b3d9fedbf",
              "70368744177664":
                "022891fcdb4c19adec153c5b40dd89d52a6832bc83d82911a3e7a0ac599863870d",
              "140737488355328":
                "03b004d916738c2bd0e14d6ef2d185e9ac13f9ee802d2542d6081bb51ea663d4b4",
              "281474976710656":
                "025d695b8f72779283b134d2b27037ba2fcedd7b63917116f01fe2dd590de4d549",
              "562949953421312":
                "031563d935e7ded7a890d1687e439cd490b7f9880cb2e5c71ec7745d56db05ab29",
              "1125899906842624":
                "0233ebee5a1c8473d69ecef520ead6d4f50166c243e73a76fd8d4dc13508e40181",
              "2251799813685248":
                "0295935f4067726d5b2318a8218656d8e3bda961091711cdc9a30aa32f46bea90e",
              "4503599627370496":
                "03d074bfde1cca405ec22fcada91220125c1bb7ea55688cc09c9b29f4c5488c076",
              "9007199254740992":
                "02749e6de14e0aea7103b61984a92d77fb27b59d9cc1339f771072dc85bd011757",
              "18014398509481984":
                "03314e2727b5a89ad40ddb6bda5714ee8c35c3945b52ffb4cbd2974597975af2c0",
              "36028797018963968":
                "037e8aee5e6e638049cf5771fca9e1dfc9a8dda6f80f49252173653288dbd06d52",
              "72057594037927936":
                "02393335234d80993ecf2322db9dc83009e7da829ed15b87a3cf9051a98fd48684",
              "144115188075855872":
                "03bb338f95bc949995f1878fd35a1ebe7281b80de3aeaf905339d35d711c3a146f",
              "288230376151711744":
                "0321f44454b39dfaf18b291c8670b69c71fe8506475c3f1e1bd4ee459768e7a126",
              "576460752303423488":
                "03e3f21699332ff2e5b55ad7aeebc2446e191c3b9f688443834da5fc676817bf4c",
              "1152921504606846976":
                "02dd4a1d8bc4ecbd625f148b2aa0222e3fdc5f7fd2d3129811ab17021bc6568615",
              "2305843009213693952":
                "02bc229c45dac098426e984fb2f5434732f9a82d9ab32841c195c5a1edb9ed8607",
              "4611686018427387904":
                "033ccefdcd77462cd266297f26418a9c7dc0f7866ab61528c6e987948bd18fe035",
              "9223372036854775808":
                "031ae5e403d8ba3cca84ed5bccaee7ed0cfa39a8aed4b382dd660529e4dbdc5817",
            },
          },
        ],
      });
    }
  ),
  http.get(
    "https://mint.minibits.cash/Bitcoin/v1/keys",
    async ({ request }) => {
      const scenario = getScenario(request);

      if (
        scenario &&
        (scenario === "failed-to-fetch" || scenario === "network-error")
      ) {
        // Simulate a network failure that causes "Failed to fetch"
        throw new Error("Failed to fetch");
      }

      // Default response when no scenario is set
      return HttpResponse.json({
        keysets: [
          {
            id: "00500550f0494146",
            unit: "sat",
            keys: {
              "1": "0321687c0cb918cf996dce31bc30451f8545741abb284eb5f6b882c4fc81249323",
              "2": "0267ce6049bc2c74546d7c1b06ba403d9fbfb7e43c14b1cc03edf4f784fa0e1d81",
              "4": "022a785df2cf2ea3fb46a116a87c05b2982da0ae885bc4d7bd7af5de628123cf96",
              "8": "025c97833e4777a87fb7986f5433c22da2082f7105dd683f5d8fb3e440dea7299f",
              "16": "02c7daaf5f14f9dba1ddc9f244e2e6c1e92428915034b62654c7862f75c8121dd3",
              "32": "038c462da9dce2391ec3b4a343dba8b7b5925aafaea54ee9836b34b77ea36acaa7",
              "64": "03875f0ce4bafc8b5df82ba47302a42f5a3293b876e368aae7c35c1a5bd57eb0e2",
              "128":
                "02d4e95bcfd4241bfa19d1d952412f1b51d0375a3ed3489a519a695d0121c16413",
              "256":
                "025be9deee55214111f2f79912932fc42e448a8f73ea5895f3cf1d77ea25524d2f",
              "512":
                "03d49e84dd18ca4a0f3afcb0582aa712a67669f925060a040584af3ef8a74954a7",
              "1024":
                "02a0efb0095ab375e72362c2fdd1b24847227b4494585735d8cf440a3a9c742b07",
              "2048":
                "03fd7489ba63795bca8757cd36edb08df3d7c999e5d96827c7362fa5eed19f118f",
              "4096":
                "03e01beeb2903c2848c7ea36a40fe2493a8e996e336054dc8dfd57e7934379ecc7",
              "8192":
                "03ffb60322211cac6fee5f19d61fd5aaa38dabca71ee04aa3056120c02bf7a808f",
              "16384":
                "025e268384922f467be366c7ced0c92f250a0b9da0e1de4b10ff708b36dea741bb",
              "32768":
                "02d998b64b91d1002527b64298f460cc3626cefc827c549d930f17280db930c6ca",
              "65536":
                "03dc807665127bf8472d13de4b25fe248b71b2bf6e423fc6e150574a394c927d75",
              "131072":
                "024232c1028ab9ee45d394c65ccf04b158004a978858d5af29d413eb62c270ec20",
              "262144":
                "023ca28651f8f2ad7789b3875bd0af9c462a1c794231f9beaaeecf0389f22d4c08",
              "524288":
                "020aebbbd33b4af6e9b1f4f29d216564a794f23c7741ccd97f27f328ff8fc2a843",
              "1048576":
                "029eeb9a6b4a92a9f2dfd64dc4c9c8464a977a7e3658ef55172cc296683550c365",
              "2097152":
                "0320212e5bedc5ccc88f090f3f95e253b52a53391e1307ecc6fced18f732eb4fb8",
              "4194304":
                "02faa595d2e95cce5cc74395f1b2df4ebbfdff34542cf91804cc480574e278f4b4",
              "8388608":
                "02b0d3128e347276de25582364709c4cfd15082ac7b8474e9f27242199294e3855",
              "16777216":
                "030f6dbc1c9aa0989d70acc727d75b3bc3cb5feb97a1b94f853b239865c3f06623",
              "33554432":
                "03a3a52ebed62890e4508586a906c233d3bd369e159e63279af8af895a46040e7b",
              "67108864":
                "0380c7273a263515f16a2424c3f89900f871b01a436213444ea7c631daa6144254",
              "134217728":
                "03faf2f16d7f7dbffdb03fd336478b9d8f08217fe08411df8fd342018bac10ae0e",
              "268435456":
                "024fd2feca5dafd9c1c33bcfa90fe3fc592c0c66f6bc4f8040cdabf8bb028177c6",
              "536870912":
                "0255aa3c9db98b7de8e3a2b271ddf7ae70a955296fe40c7aeaa7a87b71cb58f08d",
              "1073741824":
                "023343a0defc28ce08e0c658f660172da793abb8575fa5d526d5e06aaf8caa871c",
              "2147483648":
                "03f1663c4b0c88fe39026845a134e4c7f54060ecf4f57bf813a38307b8202ddf75",
              "4294967296":
                "02750ed0f993a99cd1b23521c68784e5481daaaa79659214f9da6468a10421b348",
              "8589934592":
                "02a2ae324ac2858ebc820bc0744f5361597de7392b770955c2e838ef8e30a4e27c",
              "17179869184":
                "0269ac028b1dff95ae60472cc536f98c391def179cd92b969673cc53a6610194f2",
              "34359738368":
                "036b13f1f4e507bc02d02f79b275ee99570d7767dff8bc23c99c4d2b7d27542835",
              "68719476736":
                "03f078c300c542e1a5a77fea1bff22a15501fe0c6b6d74de50933a3b227acfb1af",
              "137438953472":
                "029b8f2969ad777f9f2a8f2af396f2c25ecd60ed2b91997407a7237ebdf0e001e5",
              "274877906944":
                "038fef892409d4c71180b9361c3265545b94b4cb4a20f6c79a89147c2d2fde7540",
              "549755813888":
                "029147f7335fec14cba047ef1ad0fd5fe86c1e038f37ba10d08e1e58ae56d32f64",
              "1099511627776":
                "039326719785bace4b51743d8cf144000767a05763d89477a426b1217973637971",
              "2199023255552":
                "03ce9d0ddad19d0e26c7577af61095365ced4c987371652a49abf9a24bc5df6539",
              "4398046511104":
                "027b412e06bc9b1a0ea5816bee1da715c6e0e04a3f6ccb07b4061bb9beb28cb384",
              "8796093022208":
                "02bce8417b1da85a1ae6d363915f0ffc88dca2bcc218c0e44fdafe593b8e57e896",
              "17592186044416":
                "0244675e3389d074e161336f44c307009435ec1ba13ba5b904d286f5fe45b55a09",
              "35184372088832":
                "03cdd6b165f2e91228ec62c651968e244074665711fb3224c1e2d3f05b3d9fedbf",
              "70368744177664":
                "022891fcdb4c19adec153c5b40dd89d52a6832bc83d82911a3e7a0ac599863870d",
              "140737488355328":
                "03b004d916738c2bd0e14d6ef2d185e9ac13f9ee802d2542d6081bb51ea663d4b4",
              "281474976710656":
                "025d695b8f72779283b134d2b27037ba2fcedd7b63917116f01fe2dd590de4d549",
              "562949953421312":
                "031563d935e7ded7a890d1687e439cd490b7f9880cb2e5c71ec7745d56db05ab29",
              "1125899906842624":
                "0233ebee5a1c8473d69ecef520ead6d4f50166c243e73a76fd8d4dc13508e40181",
              "2251799813685248":
                "0295935f4067726d5b2318a8218656d8e3bda961091711cdc9a30aa32f46bea90e",
              "4503599627370496":
                "03d074bfde1cca405ec22fcada91220125c1bb7ea55688cc09c9b29f4c5488c076",
              "9007199254740992":
                "02749e6de14e0aea7103b61984a92d77fb27b59d9cc1339f771072dc85bd011757",
              "18014398509481984":
                "03314e2727b5a89ad40ddb6bda5714ee8c35c3945b52ffb4cbd2974597975af2c0",
              "36028797018963968":
                "037e8aee5e6e638049cf5771fca9e1dfc9a8dda6f80f49252173653288dbd06d52",
              "72057594037927936":
                "02393335234d80993ecf2322db9dc83009e7da829ed15b87a3cf9051a98fd48684",
              "144115188075855872":
                "03bb338f95bc949995f1878fd35a1ebe7281b80de3aeaf905339d35d711c3a146f",
              "288230376151711744":
                "0321f44454b39dfaf18b291c8670b69c71fe8506475c3f1e1bd4ee459768e7a126",
              "576460752303423488":
                "03e3f21699332ff2e5b55ad7aeebc2446e191c3b9f688443834da5fc676817bf4c",
              "1152921504606846976":
                "02dd4a1d8bc4ecbd625f148b2aa0222e3fdc5f7fd2d3129811ab17021bc6568615",
              "2305843009213693952":
                "02bc229c45dac098426e984fb2f5434732f9a82d9ab32841c195c5a1edb9ed8607",
              "4611686018427387904":
                "033ccefdcd77462cd266297f26418a9c7dc0f7866ab61528c6e987948bd18fe035",
              "9223372036854775808":
                "031ae5e403d8ba3cca84ed5bccaee7ed0cfa39a8aed4b382dd660529e4dbdc5817",
            },
          },
          {
            id: "00107937db0cc865",
            unit: "sat",
            keys: {
              "1": "03be63a0f422f8db6297fb3018bc3e626751010434c19c9c8c990e1c4e438f03dc",
              "2": "028bf1f4ecd2168a8ebeac129abc846b7cd4a2e2f983756f289f4ca771ab659f88",
              "4": "024b1f30138fef7a4c77b87648dee8471f2c68e9fbfec4b9b0c5468e52b72d807a",
              "8": "03eafb8d789f0053bdbdc8458e7945ceb0857ddf77609ceec072758223eff7300e",
              "16": "02aae58ba4639afe38b4b56b0d42f1ba7e99d8f623b1195f1748802ed13d912995",
              "32": "03784f32b5b808ebbacc0a7c6239522d46cef4c3a89852393f4eceb0c9fb19fcdf",
              "64": "03f752cfb5d0844bd56611591b3a2d87c675d0a0a7351b911df7e7d81ad920d020",
              "128":
                "02c970a1b4596b325103a1b4e291236dbb47854f3a68804f15b8d68c097ec65430",
              "256":
                "035eebf315005204fcaf67b7214e6f5484e781156bd2b67d8b153a1094d8303b97",
              "512":
                "02350c34a948800106d5ae274bc38a02210dbe8ba9d43e7e99c3e4f8942b4a5a4d",
              "1024":
                "02294740456288a35e3947e446103439802fc557141df4b1a9bd38046c1cd8f5b1",
              "2048":
                "028ac35cbce1432841c75606d84566c46f34a6f325989d0d2c7f3b8eadf8578e3e",
              "4096":
                "02e19c379e0ba27a840e3a88ba2154381847241a817a8f602fff590b36b8ceab45",
              "8192":
                "022f4670d6833a0af95470ca2207b5bfe6b9a8ac984d7a6accbd246e728f0f4ddc",
              "16384":
                "03004b561fd7b7b1621265c31d7cc9298501c381f48fe3e0f5bcc478889625e638",
              "32768":
                "03da04292b572770c83880692c243702114e0c9d94178b55aa663220e4d90d402b",
              "65536":
                "02b079070fa7f29ba71c41dabd1e8591a89a84caf7f5d52d83457f3be99c9b6409",
              "131072":
                "03e8a4250eb0033baaa4606064b7ce6ede420af54dbe9974a09da73feebed9ead8",
              "262144":
                "03b11cbfe87a627647a22b09c9262e9409a657b37f95c8b98b33ea1522caca9034",
              "524288":
                "03726306ec4f3be201ee1d05cd9db683a14b2b270f99aeab308eccfa9b5fa70025",
              "1048576":
                "03cd73e621e0adca3fbd5639fd60d4561c5e361fe7f114f64115ad7df0f14f8ae9",
              "2097152":
                "03625b83f577de017a72dfbddb11be3e55ab7c39370fc7af532bb0fb6695a30a0d",
              "4194304":
                "035f5b1b313f824daf8ca1b4592e63e9b68e6bf8605b25c651c7d430632f7db3da",
              "8388608":
                "02f776f8e4b0f94f3cb5525729e815b07ec63318426a571de2c019cef5ac125f6e",
              "16777216":
                "029afd0f21d0d06770816fbfcd1daec44081495f8bdaf4d021bc58bf80a293b5c3",
              "33554432":
                "0308f431fa509093e28945f31e2ace57c9b66b943937735cd1add3a9a66f84efac",
              "67108864":
                "03ddd0132d71d7d7f6f2a4de56a9a4a952788371cf2a944ad02e49b7b215be8ab3",
              "134217728":
                "03f3762314cd83949e6741757144bcff6d89f0e9de4f62b656c8a1b52c494027b0",
              "268435456":
                "02d8309f3359e85dba92f35ae2fd873f6751332cd01c5cdcc4ac0e0b95827b31da",
              "536870912":
                "02c48f4bdd0bffbc520e957c13fdee8eb55c3ac4fd57ca57555c7427efb536e968",
              "1073741824":
                "03859429c65c7e143944097a35bff8f7c881ef06537c8883da846c18df6d1bfca7",
              "2147483648":
                "03ae29d7a3d86917dd9064a789a5be04772721c1ed23d5c144d4ce18a6601af974",
              "4294967296":
                "03b351f62afae86d173b3fc9bf17ff83438b82a44595827b3d20dec6de0b776c85",
              "8589934592":
                "02e2e920a0c94c8e5e43f426e94cfbced537506e40d6eca7c9904d4223b1ce28dc",
              "17179869184":
                "03156a7738d67d65b46817769376b4d21078c6aa50c33aa88432a59f65edd176cb",
              "34359738368":
                "032c8bdc6ce468c06bb4ce4813ee95abb150877fb37245cee91a644539e9ea416c",
              "68719476736":
                "02245f7169134ef4045e270a87d6fcc16d53e97d2095cfaeed24b38450d19bc1d6",
              "137438953472":
                "03be52fe86f0b4434f486cdd5d765a01578a1dcc72533b4b0141bc0e3627a0c8c4",
              "274877906944":
                "020f06be30d6196dbf2a93144dc9a97c26741f7b5f756c89b90a27d1bdec890c97",
              "549755813888":
                "02f2d716803381d1e857207a1442c7b42e0cb01025ea72f32bf606668b1c7a20ed",
              "1099511627776":
                "02f0da5a810847e2c203843b6bc3c3660adcfc703ede0737536c13d1a639674d42",
              "2199023255552":
                "0384222e8c3a7e60ac8addb28e3acc7b5bd48a4aaa0dc1cbf58f22cfe9ff64415a",
              "4398046511104":
                "03bea2ad050964092086728093de5b892d300dea3e641b0902b3bd25ca3a8fb325",
              "8796093022208":
                "0233cde770cb3c4544bbc0264dc3714513ae137e77d55455719e15e48be276dd8e",
              "17592186044416":
                "027ab88a90e4ea3b085f8dfa033308d381030f07d6bba74b7ac74518fb5e06b0c4",
              "35184372088832":
                "03a52a65268850f8eea00c2a7cff9e6c89484e2f9b3a3c3cd3c338fa0ae798e523",
              "70368744177664":
                "03a875a06a80d3b80fd79cc05cf49e1aa0530396cf0c9063455a754950e6ab84f3",
              "140737488355328":
                "03e51fff2f327031a58535b07a3704f41a70d01bc7ee0177de40822f168bca5aef",
              "281474976710656":
                "02c944ad0a2c36bdc18fa34b697249938312c252034c918223de724cdea1b946e5",
              "562949953421312":
                "024637ca7230bcf00b4aead87f8d18a9440e9ca2213f0de6acca1e780bfa40e712",
              "1125899906842624":
                "02c23163380038f144e48dde1266efbbc7d844377114da129a8aff6b881462ee0b",
              "2251799813685248":
                "036f321605bf930e7e9154a2473763947780852b1cd769bea7b88d0cda496d09ca",
              "4503599627370496":
                "03bf8292f57e43247bcfdb9d121b73ba138f7b042da33cb2ecbe96535f84e8babf",
              "9007199254740992":
                "0321338816b55490f25875cb7adc2e71d31d7a97c14f5b81a7fc73ee64c3941944",
              "18014398509481984":
                "031b45026ed8745756bdf0caa0ee27197cc076eee90f3a0cbd7fa18ad397813efc",
              "36028797018963968":
                "036f0e9566f9d0634b33eba576a654a10ef85501e86f44bf68d80fa2e5e92a8835",
              "72057594037927936":
                "031622970808123d2eef419b444aec919167671f5317543b63e9026720a1b111aa",
              "144115188075855872":
                "03d9e6870a11f91bd2ec2ed5dd45c83e9520498aba7c597aea58530eb8e33f8922",
              "288230376151711744":
                "039eba1b4a3006bbdcc1a42c7c231f1790eb064e133ba1a2ef6a9eb59347cdde03",
              "576460752303423488":
                "02c69ce7e459caa65fbd676cf56fea2b5d9b81f4abc8e81ba474b5193fdb2785ed",
              "1152921504606846976":
                "0331b5ac06cb00293a06c97b04d1d2953cf0dcdefe46629a5226ce26e8a5ce9860",
              "2305843009213693952":
                "03705d75fcf62edc8b66523158cde677bcf60fefc011b9672ab85a65b86e40388f",
              "4611686018427387904":
                "03d5a68d14bb6a37ad7eac5d33c89128802cfdbf2ddd4833b6923145a9661c5ec6",
              "9223372036854775808":
                "02d900df693b1505cc5cbdef13a7ee793b89ebfedb628f4dc5fbbe49a7ef8cd07a",
            },
          },
          {
            id: "00827d7d75aa8fcb",
            unit: "sat",
            keys: {
              "1": "037de920102afb5f25c26dc48a152a73159c6b7202f08b4c603c29714f4d01b543",
              "2": "026a1d80a1ccbff4b8db701c507b8b47e50039a795f7846de57d45926689a14a0b",
              "4": "03e5700269c327ab1ce7d07a353b245345a6fca05ebe7eee9906f0d2017d5890c8",
              "8": "03294a57af75fdf601369d9bcc1dde4e95f32b9fb03658f2e52d952c374407e31b",
              "16": "02aec3e9ec63ca66d275c399e1d6c92cc65fcccc68e8add9c458dfba97da4c9c04",
              "32": "037f768ec409af30e7c61ac64348582f25007b7965a407aba3b3855a35323a246f",
              "64": "035c8392ed5aa93e46373940f2fbf114904f2bd173376d8b90f786f23e93f2ea84",
              "128":
                "02036837713ba7be203e70ef344f2487b60e75b9869c652e7c283e80a1d54794df",
              "256":
                "03d6f059d9e1592b7892b29e2e71aa0a49e959deb00163bccfcc205100fbf32633",
              "512":
                "02bf1021a830bd4c0ae0a1523464c96e142973661070f1de428da4122aa6f69493",
              "1024":
                "02381a31b2de8b948d4ff78926c55d8979923f8f9bf2468651034f5c9b7f475821",
              "2048":
                "03f5b5ee9f4163abf9268fe2c0da03876edde13ac3811c36b615fc991acc0eebbc",
              "4096":
                "022e578fb6d291c19957861b15891b49657f51a81efddf81084bab738d8a56f14b",
              "8192":
                "0337a766afcedfc3ef727ec445d43748540b51370f501cfcfccfecc6f238590267",
              "16384":
                "02828f0d67d469b668496fbd86f26d9f9a844b27a20e447f78470600747aa2b00e",
              "32768":
                "02ed1a744615151144e59ee14e7ba38406097144e14f6e764ac0f0bb0acf515564",
              "65536":
                "025b95bf15abb982ed543ab0b6942271fe2d223d2494aceb6bf7377afc4aa27ea6",
              "131072":
                "03fd2d6012632f5e130b0233205e80a1caeb02ccc41718bc895b8c99a265ea3dbf",
              "262144":
                "024660de13c4090cfa9d7a17e4d874ae15a29e3bfda53eeadb3e534d7c1a74eafa",
              "524288":
                "035c291c286bb5f24caa3ff739e619938a5b788d1090824c3b8e6baca8f13e4da1",
              "1048576":
                "0380ba32670b40f013b2bfacb5a37e7a6bbae2f2efb62dff741f02af311fbdb3ff",
              "2097152":
                "03dd0bfe20cdeccfa37c1f26ce312d1b1c539bcb1d12ab451d80370d274a3641b6",
              "4194304":
                "03de35c81c6ca87a49c9bcff121f2509263220686578b1fca47f20c574fa150b39",
              "8388608":
                "02e0c794288db2d1e9af61503ed830c7e5055b643724815d528d4c3021ea1559bb",
              "16777216":
                "035125f7a7c72f10ec61fb47f8178ca5e0aec47de7cf75612bd250a56c7ad37ead",
              "33554432":
                "03c7001d3af9ea3b6e20f36ec48edd91e966abba65ee3bd9a281eddfb53a521a53",
              "67108864":
                "02a64da5b912a21a7e2c3300c2648325c53ca778bf4d0b9622a1c7780d4dc0cffb",
              "134217728":
                "03950615088289af7ad9ad4aa426147417f05ab7ce6804227d351b24edae9832b1",
              "268435456":
                "0354f09d1f4a3606a31646201d6f313f7b531e1cf957b8ce90ca73e32799388204",
              "536870912":
                "02d2a5f0b70548aeeaf971c4da7bcf208b601a30152ae2450caedcea27bb1d8e21",
              "1073741824":
                "035f306eea76978d0270168bd6b8497cce8aef13bcc144fc36c2fb48a8aab66b06",
              "2147483648":
                "037a7f635fc3256de40c5fb8a2f1879ca449df0f4bd95852eea1169a83922c7788",
              "4294967296":
                "03f0dda240e992ff12b4b3de9e483280d53be0c85d02738e85f9b6b0ef085f8f10",
              "8589934592":
                "020cfe88a9fa3f40c1cffb951f58b2281e5a7926e2c8aa6341b24ab8fcf331cc3b",
              "17179869184":
                "02ba136d0643cb72af7120e769b8667870ad759cf5cfe4ca6a1f90ace342492a74",
              "34359738368":
                "03b73e27456513de3aa6f6eca6db70f1c91cfb5121647780fc6e4a9a8be42b7b87",
              "68719476736":
                "030ed205b00155ccf5e957761d04d01eb2491020e6dd7e512acb05914aaff8a5d1",
              "137438953472":
                "0392ba4f30272282bb82bb3ffe4f46b6d509212105eb16da909c10ab6eee960a9c",
              "274877906944":
                "031f3062051ee54583104bf7655952d8b5996ae0733b82a579fb97be7cd9be60c4",
              "549755813888":
                "0365aa156544baee813dd6f3cd679e2e64e7789a650d2228d17c2e4040d8824571",
              "1099511627776":
                "0366482f5a25e7b628131a7f39283e0309dca82658357b5b6ea7c03518710c3e68",
              "2199023255552":
                "02b59efb3b9431a7e121bee18648885d66100b86f280984182d4da442d2e751da7",
              "4398046511104":
                "03d23cc53c1f5aca508914725679ccefa34e3a028e6637005937052359e3f39cbe",
              "8796093022208":
                "03806f5967e95336a60a51199757c503d8423ac9c97600d2c33c284b83e60a8ca3",
              "17592186044416":
                "02a64c86d630e5eb23dc6af8788afc37685e781542b0e68d2b3681c5f97e26cdae",
              "35184372088832":
                "0343c8f9757870807de2dc0f1fe811d1d1f5654ce459ca98be4ae9d146aeaedf28",
              "70368744177664":
                "022d6b80f5fef273eee4fdc2532bf3e7cd7640aba1aeee7f6824a76e94fb1932ad",
              "140737488355328":
                "028c80cd39e11bdf228d2f8fc27272823eda3ba6934ffdce5b41515891241f035b",
              "281474976710656":
                "02580b0ab8340815ed61ee0d351e19fe6268253d3742a17338be3ff005daec52e2",
              "562949953421312":
                "02cc4c2a32983df4cc7d154698bd3dfe1f9813a70c451b6af5ee5a252c57457d1e",
              "1125899906842624":
                "0236d3f7716e5157ddd419991ef3b7d43926547971214a81896be0c0be34548396",
              "2251799813685248":
                "02b63068aaf6668958fcb284c9ca5ef852fd55d276a9e89343c72361c5fe513b24",
              "4503599627370496":
                "0271354593bf8c5590ed51e625d0f009628857ce6bd31522049ee6e6bc8586d9c8",
              "9007199254740992":
                "03472e10b746819b2c604a8b9f2a7ecc1989b6ee65ef06d2487d8032311bf729e6",
              "18014398509481984":
                "02832e9ea5c26326d3498635b808329b00fd9985ca6f6332579fd4a1a560633b76",
              "36028797018963968":
                "03d87a088c7321942c389cfd39aabb008be421dad28cf5d4e009ba438276642e13",
              "72057594037927936":
                "03f6471bf910ef2b025cbcb36b402df0332255527774def41d5d27c262bffbe1be",
              "144115188075855872":
                "031de9127b8296c4b9d7e898d6f444953771f0c311880fab50bf02e3230eaed3a0",
              "288230376151711744":
                "02e4292ddc507bfd918d9c4faac74136f64bcf155ddce12f75b387ff53b848dec9",
              "576460752303423488":
                "02eb6c1ed989b7e56b5722a312dd2a7e86b9fa2bba1146b2ebc9d12f24076a2d5e",
              "1152921504606846976":
                "03a5e4c8216c73454444dbfccd6c01ba9708440de00a3f5faf8cfb7e95cc4f4054",
              "2305843009213693952":
                "033486861c85458521c0fd1ac129e84a174e10118d559ee3185062f8f432eb622e",
              "4611686018427387904":
                "02217ec885b5d75100a20b4337498afefd4ef76e4082cf361d32ae869c695e34a5",
              "9223372036854775808":
                "039f14f18f3ceaca7dcf18cd212eaf2656e65c337fc4a98cd4e7c119982338e57a",
            },
          },
          {
            id: "9mlfd5vCzgGl",
            unit: "sat",
            keys: {
              "1": "037de920102afb5f25c26dc48a152a73159c6b7202f08b4c603c29714f4d01b543",
              "2": "026a1d80a1ccbff4b8db701c507b8b47e50039a795f7846de57d45926689a14a0b",
              "4": "03e5700269c327ab1ce7d07a353b245345a6fca05ebe7eee9906f0d2017d5890c8",
              "8": "03294a57af75fdf601369d9bcc1dde4e95f32b9fb03658f2e52d952c374407e31b",
              "16": "02aec3e9ec63ca66d275c399e1d6c92cc65fcccc68e8add9c458dfba97da4c9c04",
              "32": "037f768ec409af30e7c61ac64348582f25007b7965a407aba3b3855a35323a246f",
              "64": "035c8392ed5aa93e46373940f2fbf114904f2bd173376d8b90f786f23e93f2ea84",
              "128":
                "02036837713ba7be203e70ef344f2487b60e75b9869c652e7c283e80a1d54794df",
              "256":
                "03d6f059d9e1592b7892b29e2e71aa0a49e959deb00163bccfcc205100fbf32633",
              "512":
                "02bf1021a830bd4c0ae0a1523464c96e142973661070f1de428da4122aa6f69493",
              "1024":
                "02381a31b2de8b948d4ff78926c55d8979923f8f9bf2468651034f5c9b7f475821",
              "2048":
                "03f5b5ee9f4163abf9268fe2c0da03876edde13ac3811c36b615fc991acc0eebbc",
              "4096":
                "022e578fb6d291c19957861b15891b49657f51a81efddf81084bab738d8a56f14b",
              "8192":
                "0337a766afcedfc3ef727ec445d43748540b51370f501cfcfccfecc6f238590267",
              "16384":
                "02828f0d67d469b668496fbd86f26d9f9a844b27a20e447f78470600747aa2b00e",
              "32768":
                "02ed1a744615151144e59ee14e7ba38406097144e14f6e764ac0f0bb0acf515564",
              "65536":
                "025b95bf15abb982ed543ab0b6942271fe2d223d2494aceb6bf7377afc4aa27ea6",
              "131072":
                "03fd2d6012632f5e130b0233205e80a1caeb02ccc41718bc895b8c99a265ea3dbf",
              "262144":
                "024660de13c4090cfa9d7a17e4d874ae15a29e3bfda53eeadb3e534d7c1a74eafa",
              "524288":
                "035c291c286bb5f24caa3ff739e619938a5b788d1090824c3b8e6baca8f13e4da1",
              "1048576":
                "0380ba32670b40f013b2bfacb5a37e7a6bbae2f2efb62dff741f02af311fbdb3ff",
              "2097152":
                "03dd0bfe20cdeccfa37c1f26ce312d1b1c539bcb1d12ab451d80370d274a3641b6",
              "4194304":
                "03de35c81c6ca87a49c9bcff121f2509263220686578b1fca47f20c574fa150b39",
              "8388608":
                "02e0c794288db2d1e9af61503ed830c7e5055b643724815d528d4c3021ea1559bb",
              "16777216":
                "035125f7a7c72f10ec61fb47f8178ca5e0aec47de7cf75612bd250a56c7ad37ead",
              "33554432":
                "03c7001d3af9ea3b6e20f36ec48edd91e966abba65ee3bd9a281eddfb53a521a53",
              "67108864":
                "02a64da5b912a21a7e2c3300c2648325c53ca778bf4d0b9622a1c7780d4dc0cffb",
              "134217728":
                "03950615088289af7ad9ad4aa426147417f05ab7ce6804227d351b24edae9832b1",
              "268435456":
                "0354f09d1f4a3606a31646201d6f313f7b531e1cf957b8ce90ca73e32799388204",
              "536870912":
                "02d2a5f0b70548aeeaf971c4da7bcf208b601a30152ae2450caedcea27bb1d8e21",
              "1073741824":
                "035f306eea76978d0270168bd6b8497cce8aef13bcc144fc36c2fb48a8aab66b06",
              "2147483648":
                "037a7f635fc3256de40c5fb8a2f1879ca449df0f4bd95852eea1169a83922c7788",
              "4294967296":
                "03f0dda240e992ff12b4b3de9e483280d53be0c85d02738e85f9b6b0ef085f8f10",
              "8589934592":
                "020cfe88a9fa3f40c1cffb951f58b2281e5a7926e2c8aa6341b24ab8fcf331cc3b",
              "17179869184":
                "02ba136d0643cb72af7120e769b8667870ad759cf5cfe4ca6a1f90ace342492a74",
              "34359738368":
                "03b73e27456513de3aa6f6eca6db70f1c91cfb5121647780fc6e4a9a8be42b7b87",
              "68719476736":
                "030ed205b00155ccf5e957761d04d01eb2491020e6dd7e512acb05914aaff8a5d1",
              "137438953472":
                "0392ba4f30272282bb82bb3ffe4f46b6d509212105eb16da909c10ab6eee960a9c",
              "274877906944":
                "031f3062051ee54583104bf7655952d8b5996ae0733b82a579fb97be7cd9be60c4",
              "549755813888":
                "0365aa156544baee813dd6f3cd679e2e64e7789a650d2228d17c2e4040d8824571",
              "1099511627776":
                "0366482f5a25e7b628131a7f39283e0309dca82658357b5b6ea7c03518710c3e68",
              "2199023255552":
                "02b59efb3b9431a7e121bee18648885d66100b86f280984182d4da442d2e751da7",
              "4398046511104":
                "03d23cc53c1f5aca508914725679ccefa34e3a028e6637005937052359e3f39cbe",
              "8796093022208":
                "03806f5967e95336a60a51199757c503d8423ac9c97600d2c33c284b83e60a8ca3",
              "17592186044416":
                "02a64c86d630e5eb23dc6af8788afc37685e781542b0e68d2b3681c5f97e26cdae",
              "35184372088832":
                "0343c8f9757870807de2dc0f1fe811d1d1f5654ce459ca98be4ae9d146aeaedf28",
              "70368744177664":
                "022d6b80f5fef273eee4fdc2532bf3e7cd7640aba1aeee7f6824a76e94fb1932ad",
              "140737488355328":
                "028c80cd39e11bdf228d2f8fc27272823eda3ba6934ffdce5b41515891241f035b",
              "281474976710656":
                "02580b0ab8340815ed61ee0d351e19fe6268253d3742a17338be3ff005daec52e2",
              "562949953421312":
                "02cc4c2a32983df4cc7d154698bd3dfe1f9813a70c451b6af5ee5a252c57457d1e",
              "1125899906842624":
                "0236d3f7716e5157ddd419991ef3b7d43926547971214a81896be0c0be34548396",
              "2251799813685248":
                "02b63068aaf6668958fcb284c9ca5ef852fd55d276a9e89343c72361c5fe513b24",
              "4503599627370496":
                "0271354593bf8c5590ed51e625d0f009628857ce6bd31522049ee6e6bc8586d9c8",
              "9007199254740992":
                "03472e10b746819b2c604a8b9f2a7ecc1989b6ee65ef06d2487d8032311bf729e6",
              "18014398509481984":
                "02832e9ea5c26326d3498635b808329b00fd9985ca6f6332579fd4a1a560633b76",
              "36028797018963968":
                "03d87a088c7321942c389cfd39aabb008be421dad28cf5d4e009ba438276642e13",
              "72057594037927936":
                "03f6471bf910ef2b025cbcb36b402df0332255527774def41d5d27c262bffbe1be",
              "144115188075855872":
                "031de9127b8296c4b9d7e898d6f444953771f0c311880fab50bf02e3230eaed3a0",
              "288230376151711744":
                "02e4292ddc507bfd918d9c4faac74136f64bcf155ddce12f75b387ff53b848dec9",
              "576460752303423488":
                "02eb6c1ed989b7e56b5722a312dd2a7e86b9fa2bba1146b2ebc9d12f24076a2d5e",
              "1152921504606846976":
                "03a5e4c8216c73454444dbfccd6c01ba9708440de00a3f5faf8cfb7e95cc4f4054",
              "2305843009213693952":
                "033486861c85458521c0fd1ac129e84a174e10118d559ee3185062f8f432eb622e",
              "4611686018427387904":
                "02217ec885b5d75100a20b4337498afefd4ef76e4082cf361d32ae869c695e34a5",
              "9223372036854775808":
                "039f14f18f3ceaca7dcf18cd212eaf2656e65c337fc4a98cd4e7c119982338e57a",
            },
          },
          {
            id: "ctv28hTYzQwr",
            unit: "sat",
            keys: {
              "1": "0321687c0cb918cf996dce31bc30451f8545741abb284eb5f6b882c4fc81249323",
              "2": "0267ce6049bc2c74546d7c1b06ba403d9fbfb7e43c14b1cc03edf4f784fa0e1d81",
              "4": "022a785df2cf2ea3fb46a116a87c05b2982da0ae885bc4d7bd7af5de628123cf96",
              "8": "025c97833e4777a87fb7986f5433c22da2082f7105dd683f5d8fb3e440dea7299f",
              "16": "02c7daaf5f14f9dba1ddc9f244e2e6c1e92428915034b62654c7862f75c8121dd3",
              "32": "038c462da9dce2391ec3b4a343dba8b7b5925aafaea54ee9836b34b77ea36acaa7",
              "64": "03875f0ce4bafc8b5df82ba47302a42f5a3293b876e368aae7c35c1a5bd57eb0e2",
              "128":
                "02d4e95bcfd4241bfa19d1d952412f1b51d0375a3ed3489a519a695d0121c16413",
              "256":
                "025be9deee55214111f2f79912932fc42e448a8f73ea5895f3cf1d77ea25524d2f",
              "512":
                "03d49e84dd18ca4a0f3afcb0582aa712a67669f925060a040584af3ef8a74954a7",
              "1024":
                "02a0efb0095ab375e72362c2fdd1b24847227b4494585735d8cf440a3a9c742b07",
              "2048":
                "03fd7489ba63795bca8757cd36edb08df3d7c999e5d96827c7362fa5eed19f118f",
              "4096":
                "03e01beeb2903c2848c7ea36a40fe2493a8e996e336054dc8dfd57e7934379ecc7",
              "8192":
                "03ffb60322211cac6fee5f19d61fd5aaa38dabca71ee04aa3056120c02bf7a808f",
              "16384":
                "025e268384922f467be366c7ced0c92f250a0b9da0e1de4b10ff708b36dea741bb",
              "32768":
                "02d998b64b91d1002527b64298f460cc3626cefc827c549d930f17280db930c6ca",
              "65536":
                "03dc807665127bf8472d13de4b25fe248b71b2bf6e423fc6e150574a394c927d75",
              "131072":
                "024232c1028ab9ee45d394c65ccf04b158004a978858d5af29d413eb62c270ec20",
              "262144":
                "023ca28651f8f2ad7789b3875bd0af9c462a1c794231f9beaaeecf0389f22d4c08",
              "524288":
                "020aebbbd33b4af6e9b1f4f29d216564a794f23c7741ccd97f27f328ff8fc2a843",
              "1048576":
                "029eeb9a6b4a92a9f2dfd64dc4c9c8464a977a7e3658ef55172cc296683550c365",
              "2097152":
                "0320212e5bedc5ccc88f090f3f95e253b52a53391e1307ecc6fced18f732eb4fb8",
              "4194304":
                "02faa595d2e95cce5cc74395f1b2df4ebbfdff34542cf91804cc480574e278f4b4",
              "8388608":
                "02b0d3128e347276de25582364709c4cfd15082ac7b8474e9f27242199294e3855",
              "16777216":
                "030f6dbc1c9aa0989d70acc727d75b3bc3cb5feb97a1b94f853b239865c3f06623",
              "33554432":
                "03a3a52ebed62890e4508586a906c233d3bd369e159e63279af8af895a46040e7b",
              "67108864":
                "0380c7273a263515f16a2424c3f89900f871b01a436213444ea7c631daa6144254",
              "134217728":
                "03faf2f16d7f7dbffdb03fd336478b9d8f08217fe08411df8fd342018bac10ae0e",
              "268435456":
                "024fd2feca5dafd9c1c33bcfa90fe3fc592c0c66f6bc4f8040cdabf8bb028177c6",
              "536870912":
                "0255aa3c9db98b7de8e3a2b271ddf7ae70a955296fe40c7aeaa7a87b71cb58f08d",
              "1073741824":
                "023343a0defc28ce08e0c658f660172da793abb8575fa5d526d5e06aaf8caa871c",
              "2147483648":
                "03f1663c4b0c88fe39026845a134e4c7f54060ecf4f57bf813a38307b8202ddf75",
              "4294967296":
                "02750ed0f993a99cd1b23521c68784e5481daaaa79659214f9da6468a10421b348",
              "8589934592":
                "02a2ae324ac2858ebc820bc0744f5361597de7392b770955c2e838ef8e30a4e27c",
              "17179869184":
                "0269ac028b1dff95ae60472cc536f98c391def179cd92b969673cc53a6610194f2",
              "34359738368":
                "036b13f1f4e507bc02d02f79b275ee99570d7767dff8bc23c99c4d2b7d27542835",
              "68719476736":
                "03f078c300c542e1a5a77fea1bff22a15501fe0c6b6d74de50933a3b227acfb1af",
              "137438953472":
                "029b8f2969ad777f9f2a8f2af396f2c25ecd60ed2b91997407a7237ebdf0e001e5",
              "274877906944":
                "038fef892409d4c71180b9361c3265545b94b4cb4a20f6c79a89147c2d2fde7540",
              "549755813888":
                "029147f7335fec14cba047ef1ad0fd5fe86c1e038f37ba10d08e1e58ae56d32f64",
              "1099511627776":
                "039326719785bace4b51743d8cf144000767a05763d89477a426b1217973637971",
              "2199023255552":
                "03ce9d0ddad19d0e26c7577af61095365ced4c987371652a49abf9a24bc5df6539",
              "4398046511104":
                "027b412e06bc9b1a0ea5816bee1da715c6e0e04a3f6ccb07b4061bb9beb28cb384",
              "8796093022208":
                "02bce8417b1da85a1ae6d363915f0ffc88dca2bcc218c0e44fdafe593b8e57e896",
              "17592186044416":
                "0244675e3389d074e161336f44c307009435ec1ba13ba5b904d286f5fe45b55a09",
              "35184372088832":
                "03cdd6b165f2e91228ec62c651968e244074665711fb3224c1e2d3f05b3d9fedbf",
              "70368744177664":
                "022891fcdb4c19adec153c5b40dd89d52a6832bc83d82911a3e7a0ac599863870d",
              "140737488355328":
                "03b004d916738c2bd0e14d6ef2d185e9ac13f9ee802d2542d6081bb51ea663d4b4",
              "281474976710656":
                "025d695b8f72779283b134d2b27037ba2fcedd7b63917116f01fe2dd590de4d549",
              "562949953421312":
                "031563d935e7ded7a890d1687e439cd490b7f9880cb2e5c71ec7745d56db05ab29",
              "1125899906842624":
                "0233ebee5a1c8473d69ecef520ead6d4f50166c243e73a76fd8d4dc13508e40181",
              "2251799813685248":
                "0295935f4067726d5b2318a8218656d8e3bda961091711cdc9a30aa32f46bea90e",
              "4503599627370496":
                "03d074bfde1cca405ec22fcada91220125c1bb7ea55688cc09c9b29f4c5488c076",
              "9007199254740992":
                "02749e6de14e0aea7103b61984a92d77fb27b59d9cc1339f771072dc85bd011757",
              "18014398509481984":
                "03314e2727b5a89ad40ddb6bda5714ee8c35c3945b52ffb4cbd2974597975af2c0",
              "36028797018963968":
                "037e8aee5e6e638049cf5771fca9e1dfc9a8dda6f80f49252173653288dbd06d52",
              "72057594037927936":
                "02393335234d80993ecf2322db9dc83009e7da829ed15b87a3cf9051a98fd48684",
              "144115188075855872":
                "03bb338f95bc949995f1878fd35a1ebe7281b80de3aeaf905339d35d711c3a146f",
              "288230376151711744":
                "0321f44454b39dfaf18b291c8670b69c71fe8506475c3f1e1bd4ee459768e7a126",
              "576460752303423488":
                "03e3f21699332ff2e5b55ad7aeebc2446e191c3b9f688443834da5fc676817bf4c",
              "1152921504606846976":
                "02dd4a1d8bc4ecbd625f148b2aa0222e3fdc5f7fd2d3129811ab17021bc6568615",
              "2305843009213693952":
                "02bc229c45dac098426e984fb2f5434732f9a82d9ab32841c195c5a1edb9ed8607",
              "4611686018427387904":
                "033ccefdcd77462cd266297f26418a9c7dc0f7866ab61528c6e987948bd18fe035",
              "9223372036854775808":
                "031ae5e403d8ba3cca84ed5bccaee7ed0cfa39a8aed4b382dd660529e4dbdc5817",
            },
          },
        ],
      });
    }
  ),
];
