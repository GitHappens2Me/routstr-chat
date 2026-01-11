import { AccountManager, IAccount } from "applesauce-accounts";
import {
  ExtensionAccount,
  NostrConnectAccount,
  PrivateKeyAccount,
} from "applesauce-accounts/accounts";
import { useObservableState } from "applesauce-react/hooks";
import { RelayPool } from "applesauce-relay";
import { NostrConnectSigner } from "applesauce-signers";
import { useCallback, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { AccountMetadata } from "./ClientProviders";

// Create a relay pool to make relay connections
const pool = new RelayPool();

// Setup nostr connect signer
if (typeof window !== "undefined") {
  NostrConnectSigner.subscriptionMethod = pool.subscription.bind(pool);
  NostrConnectSigner.publishMethod = pool.publish.bind(pool);
}

function BunkerUrlLogin({
  onSignerCreated,
}: {
  onSignerCreated: (signer: NostrConnectSigner) => void;
}) {
  const [bunkerUrl, setBunkerUrl] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!bunkerUrl) return;

    try {
      setIsConnecting(true);
      setError(null);

      // Create signer from bunker URL
      const newSigner = await NostrConnectSigner.fromBunkerURI(bunkerUrl);

      onSignerCreated(newSigner);
    } catch (err) {
      console.error("Connection error:", err);
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="card bg-base-200 shadow-md mb-6">
      <div className="card-body">
        <h2 className="card-title mb-4 text-sm">Login with Bunker URL</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="bunker://..."
            className="input input-bordered flex-1"
            value={bunkerUrl}
            onChange={(e) => setBunkerUrl(e.target.value)}
          />
          <button
            className="btn btn-primary"
            onClick={handleConnect}
            disabled={!bunkerUrl || isConnecting}
          >
            {isConnecting ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              "Connect"
            )}
          </button>
        </div>

        {error && (
          <div className="alert alert-error mt-4 py-2 text-xs">
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function PrivateKeyLogin({
  onAccountCreated,
}: {
  onAccountCreated: (account: PrivateKeyAccount<AccountMetadata>) => void;
}) {
  const [privateKey, setPrivateKey] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleLogin = () => {
    if (!privateKey) return;

    try {
      setError(null);
      const account = PrivateKeyAccount.fromKey<AccountMetadata>(
        privateKey.trim()
      );
      onAccountCreated(account);
      setPrivateKey("");
    } catch (err) {
      console.error("Private key login error:", err);
      setError(err instanceof Error ? err.message : "Invalid private key");
    }
  };

  return (
    <div className="card bg-base-200 shadow-md mb-6">
      <div className="card-body">
        <h2 className="card-title mb-4 text-sm">Login with Private Key</h2>
        <div className="flex gap-2">
          <input
            type="password"
            placeholder="nsec1... or hex private key"
            className="input input-bordered flex-1"
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
          <button
            className="btn btn-primary"
            onClick={handleLogin}
            disabled={!privateKey}
          >
            Login
          </button>
        </div>

        {error && (
          <div className="alert alert-error mt-4 py-2 text-xs">
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function QRCodeLogin({
  onSignerCreated,
}: {
  onSignerCreated: (signer: NostrConnectSigner) => void;
}) {
  const [nostrConnectUri, setNostrConnectUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleQrCodeLogin = async () => {
    try {
      setError(null);
      setIsConnecting(true);

      // Create a new signer for QR code login
      const newSigner = new NostrConnectSigner({
        relays: ["wss://relay.nsec.app"],
      });

      // Generate QR code URI with metadata
      const uri = newSigner.getNostrConnectURI({
        name: "Routstr Chat",
      });

      setNostrConnectUri(uri);

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 minute timeout

      try {
        // Wait for signer to connect
        await newSigner.waitForSigner(controller.signal);
        clearTimeout(timeoutId);

        onSignerCreated(newSigner);
        setNostrConnectUri(null);
      } catch (err) {
        console.error("Wait for signer error:", err);
        if (err instanceof Error && err.message === "Aborted") {
          setError("Connection timeout. Please try again.");
        } else {
          setError(err instanceof Error ? err.message : "Failed to connect");
        }
        setNostrConnectUri(null);
      }
    } catch (err) {
      console.error("QR code login error:", err);
      setError(err instanceof Error ? err.message : "QR code login failed");
      setNostrConnectUri(null);
    } finally {
      setIsConnecting(false);
    }
  };

  if (nostrConnectUri) {
    return (
      <div className="card bg-base-200 shadow-md mb-6">
        <div className="card-body items-center text-center">
          <p className="mb-4 text-sm">
            Scan this QR code with your Nostr mobile signer
          </p>
          <div className="bg-white p-4 rounded-lg">
            <QRCodeSVG value={nostrConnectUri} size={200} />
          </div>
          <button
            className="btn btn-outline btn-sm mt-4"
            onClick={() => setNostrConnectUri(null)}
          >
            Cancel
          </button>

          {error && (
            <div className="alert alert-error mt-4 py-2 text-xs">
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-200 shadow-md mb-6">
      <div className="card-body">
        <h2 className="card-title mb-4 text-sm">Login with QR Code</h2>
        <button
          className="btn btn-accent btn-sm w-full"
          onClick={handleQrCodeLogin}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            "Generate QR Code"
          )}
        </button>

        {error && (
          <div className="alert alert-error mt-4 py-2 text-xs">
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function AccountCard({
  account,
  manager,
  onSave,
}: {
  account: IAccount<any, any, AccountMetadata>;
  manager: AccountManager<AccountMetadata>;
  onSave: () => void;
}) {
  const activeAccount = useObservableState(manager.active$);
  const [name, setName] = useState(account.metadata?.name || "");

  const saveName = useCallback(() => {
    manager.setAccountMetadata(account, { name });
    onSave();
  }, [name, account, manager, onSave]);

  const removeAccount = useCallback(() => {
    manager.removeAccount(account);
  }, [account, manager]);

  const setActive = useCallback(() => {
    manager.setActive(account);
  }, [account, manager]);

  return (
    <div
      className={`card bg-base-100 shadow-md ${activeAccount?.id === account.id ? "border-primary border-2" : ""}`}
    >
      <figure className="px-4 pt-4">
        <img
          src={`https://robohash.org/${account.pubkey}.png`}
          alt="Account avatar"
          className="rounded-full w-24 h-24"
        />
      </figure>
      <div className="card-body">
        <input
          type="text"
          className="input input-bordered w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Account name"
          onBlur={saveName}
        />

        <p className="text-sm font-mono text-base-content/70">
          {account.pubkey.slice(0, 8)}...{account.pubkey.slice(-8)}
          {account.type === "nostr-connect" && (
            <span className="badge badge-ghost badge-sm ml-2">Bunker</span>
          )}
        </p>

        <div className="card-actions justify-end">
          <button
            className="btn btn-primary"
            onClick={setActive}
            disabled={activeAccount?.id === account.id}
          >
            Set Active
          </button>
          <button className="btn btn-error" onClick={removeAccount}>
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppleSauceLogin({
  manager,
  onSave,
}: {
  manager: AccountManager<AccountMetadata>;
  onSave: () => void;
}) {
  const accounts = useObservableState(manager.accounts$);
  const [loginMethod, setLoginMethod] = useState<
    "none" | "bunker" | "qr" | "privatekey" | "extension"
  >("none");
  const [extensionError, setExtensionError] = useState<string | null>(null);
  const [isConnectingExtension, setIsConnectingExtension] = useState(false);

  const handleSignerCreated = useCallback(
    async (signer: NostrConnectSigner) => {
      const pubkey = await signer.getPublicKey();
      const account = new NostrConnectAccount<AccountMetadata>(pubkey, signer);
      account.metadata = { name: `Bunker ${accounts.length + 1}` };
      manager.addAccount(account);
      manager.setActive(account);
      setLoginMethod("none");
    },
    [accounts.length, manager]
  );

  const createNewAccount = useCallback(() => {
    const account = PrivateKeyAccount.generateNew<AccountMetadata>();
    account.metadata = { name: `Account ${accounts.length + 1}` };
    manager.addAccount(account);
    manager.setActive(account);
  }, [accounts.length, manager]);

  const handleExtensionLogin = useCallback(async () => {
    try {
      setExtensionError(null);
      setIsConnectingExtension(true);
      const account = await ExtensionAccount.fromExtension();
      manager.addAccount(account as unknown as IAccount<any, any, AccountMetadata>);
      manager.setActive(account as unknown as IAccount<any, any, AccountMetadata>);
      setLoginMethod("none");
    } catch (err) {
      console.error("Extension login error:", err);
      setExtensionError(
        err instanceof Error ? err.message : "Failed to connect to extension"
      );
    } finally {
      setIsConnectingExtension(false);
    }
  }, [manager]);

  const handlePrivateKeyAccountCreated = useCallback(
    (account: PrivateKeyAccount<AccountMetadata>) => {
      account.metadata = { name: `Account ${accounts.length + 1}` };
      manager.addAccount(account);
      manager.setActive(account);
      setLoginMethod("none");
    },
    [accounts.length, manager]
  );

  return (
    <div className="container mx-auto p-2 h-full">
      <div className="flex flex-wrap gap-2 justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Account Manager</h1>
        <div className="flex gap-2">
          <button className="btn btn-primary btn-sm" onClick={createNewAccount}>
            New Private Key
          </button>
          <button
            className={`btn btn-info btn-sm ${loginMethod === "privatekey" ? "btn-outline" : ""}`}
            onClick={() =>
              setLoginMethod(
                loginMethod === "privatekey" ? "none" : "privatekey"
              )
            }
          >
            Import Key
          </button>
          <button
            className={`btn btn-secondary btn-sm ${loginMethod === "bunker" ? "btn-outline" : ""}`}
            onClick={() =>
              setLoginMethod(loginMethod === "bunker" ? "none" : "bunker")
            }
          >
            Bunker URL
          </button>
          <button
            className={`btn btn-accent btn-sm ${loginMethod === "qr" ? "btn-outline" : ""}`}
            onClick={() => setLoginMethod(loginMethod === "qr" ? "none" : "qr")}
          >
            QR Code
          </button>
          <button
            className={`btn btn-warning btn-sm ${loginMethod === "extension" ? "btn-outline" : ""}`}
            onClick={() =>
              setLoginMethod(loginMethod === "extension" ? "none" : "extension")
            }
          >
            Connect Extension
          </button>
        </div>
      </div>

      {loginMethod === "extension" && (
        <div className="card bg-base-200 shadow-md mb-6">
          <div className="card-body">
            <h2 className="card-title mb-4 text-sm">Login with NIP-07 Extension</h2>
            <p className="text-sm text-base-content/70 mb-4">
              Connect using a browser extension like nos2x, Alby, or other NIP-07 compatible signers.
            </p>
            <button
              className="btn btn-warning btn-sm w-full"
              onClick={handleExtensionLogin}
              disabled={isConnectingExtension}
            >
              {isConnectingExtension ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                "Connect Extension"
              )}
            </button>

            {extensionError && (
              <div className="alert alert-error mt-4 py-2 text-xs">
                <span>{extensionError}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {loginMethod === "privatekey" && (
        <PrivateKeyLogin onAccountCreated={handlePrivateKeyAccountCreated} />
      )}
      {loginMethod === "bunker" && (
        <BunkerUrlLogin onSignerCreated={handleSignerCreated} />
      )}
      {loginMethod === "qr" && (
        <QRCodeLogin onSignerCreated={handleSignerCreated} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account as IAccount<any, any, AccountMetadata>}
            manager={manager}
            onSave={onSave}
          />
        ))}
      </div>

      {accounts.length === 0 && loginMethod === "none" && (
        <div className="text-center py-12 text-base-content/70">
          No accounts yet. Create one to get started!
        </div>
      )}
    </div>
  );
}
