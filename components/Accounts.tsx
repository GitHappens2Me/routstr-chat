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
import { nip19 } from "nostr-tools";
import {
  Shield,
  Eye,
  EyeOff,
  Copy,
  Check,
  Link,
  QrCode,
  ClipboardPaste,
} from "lucide-react";
import { AccountMetadata } from "./ClientProviders";
import { toast } from "sonner";

// Create a relay pool to make relay connections
const pool = new RelayPool();

// Setup nostr connect signer
if (typeof window !== "undefined") {
  NostrConnectSigner.subscriptionMethod = pool.subscription.bind(pool);
  NostrConnectSigner.publishMethod = pool.publish.bind(pool);
}

interface AppleSauceLoginProps {
  manager: AccountManager<AccountMetadata>;
  onSave: () => void;
  onLogin?: () => void;
  onClose?: () => void;
  showWelcome?: boolean;
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

  const isActive = activeAccount?.id === account.id;

  return (
    <div
      className={`bg-muted/40 border border-border rounded-lg p-4 transition-colors ${
        isActive ? "border-foreground/40" : "hover:border-foreground/20"
      }`}
    >
      <div className="flex items-center gap-3">
        <img
          src={`https://robohash.org/${account.pubkey}.png`}
          alt="Account avatar"
          className="rounded-full w-12 h-12"
        />
        <div className="flex-1 min-w-0">
          <input
            type="text"
            className="w-full bg-transparent text-foreground text-sm font-medium focus:outline-none placeholder:text-muted-foreground"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Account name"
            onBlur={saveName}
          />
          <p className="text-xs font-mono text-muted-foreground truncate">
            {account.pubkey.slice(0, 8)}...{account.pubkey.slice(-8)}
            {account.type === "nostr-connect" && (
              <span className="ml-2 text-xs text-muted-foreground">
                (Bunker)
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
            isActive
              ? "bg-muted/70 text-muted-foreground cursor-not-allowed"
              : "bg-foreground text-background hover:opacity-90"
          }`}
          onClick={setActive}
          disabled={isActive}
        >
          {isActive ? "Active" : "Set Active"}
        </button>
        <button
          className="py-1.5 px-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-md text-xs font-medium hover:bg-destructive/20 transition-colors"
          onClick={removeAccount}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

export default function AppleSauceLogin({
  manager,
  onSave,
  onLogin,
  onClose,
  showWelcome = true,
}: AppleSauceLoginProps) {
  const accounts = useObservableState(manager.accounts$);
  
  // Signup state
  const [signupStep, setSignupStep] = useState<"initial" | "save-keys">("initial");
  const [generatedAccount, setGeneratedAccount] = useState<PrivateKeyAccount<AccountMetadata> | null>(null);
  const [nsecCopied, setNsecCopied] = useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [showNsec, setShowNsec] = useState(false);
  
  // Sign in state
  const [nsec, setNsec] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [extensionError, setExtensionError] = useState<string | null>(null);
  const [isConnectingExtension, setIsConnectingExtension] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // More options state
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showBunker, setShowBunker] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [bunkerUrl, setBunkerUrl] = useState("");
  const [isConnectingBunker, setIsConnectingBunker] = useState(false);
  const [bunkerError, setBunkerError] = useState<string | null>(null);
  const [nostrConnectUri, setNostrConnectUri] = useState<string | null>(null);
  const [isConnectingQR, setIsConnectingQR] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  const handlePasteNsec = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setNsec(text.trim());
    } catch {
      toast.error("Failed to read from clipboard");
    }
  }, []);

  const handlePasteBunkerUrl = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setBunkerUrl(text.trim());
    } catch {
      toast.error("Failed to read from clipboard");
    }
  }, []);

  // Generate new account
  const generateNewKeypair = useCallback(() => {
    const account = PrivateKeyAccount.generateNew<AccountMetadata>();
    account.metadata = { name: `Account ${accounts.length + 1}` };
    setGeneratedAccount(account);
    setNsecCopied(false);
    setShowSaveConfirmation(false);
    setShowNsec(false);
    setSignupStep("save-keys");
  }, [accounts.length]);

  // Get nsec from generated account
  const getGeneratedNsec = useCallback(() => {
    if (!generatedAccount) return null;
    try {
      // Access the secret key from the account
      const secretKey = (generatedAccount as any).key;
      if (secretKey) {
        return nip19.nsecEncode(secretKey);
      }
    } catch (e) {
      console.error("Error encoding nsec:", e);
    }
    return null;
  }, [generatedAccount]);

  const generatedNsec = getGeneratedNsec();

  // Copy to clipboard
  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNsecCopied(true);
      setTimeout(() => setNsecCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, []);

  // Complete signup with generated account
  const completeSignup = useCallback(() => {
    if (generatedAccount) {
      manager.addAccount(generatedAccount);
      manager.setActive(generatedAccount);
      onSave();
      setSignupStep("initial");
      setGeneratedAccount(null);
      onLogin?.();
      onClose?.();
    }
  }, [generatedAccount, manager, onSave, onLogin, onClose]);

  // Save later - skip confirmation
  const handleSaveLater = useCallback(() => {
    localStorage.setItem("nsec_storing_skipped", "true");
    completeSignup();
  }, [completeSignup]);

  // Extension login
  const handleExtensionLogin = useCallback(async () => {
    try {
      setExtensionError(null);
      setIsConnectingExtension(true);
      const account = await ExtensionAccount.fromExtension();
      manager.addAccount(account as unknown as IAccount<any, any, AccountMetadata>);
      manager.setActive(account as unknown as IAccount<any, any, AccountMetadata>);
      onSave();
      onLogin?.();
      onClose?.();
    } catch (err) {
      console.error("Extension login error:", err);
      setExtensionError(
        err instanceof Error ? err.message : "Failed to connect to extension"
      );
    } finally {
      setIsConnectingExtension(false);
    }
  }, [manager, onSave, onLogin, onClose]);

  // Private key login
  const handleKeyLogin = useCallback(() => {
    if (!nsec.trim()) return;
    setIsLoggingIn(true);
    setError(null);

    try {
      const account = PrivateKeyAccount.fromKey<AccountMetadata>(nsec.trim());
      account.metadata = { name: `Account ${accounts.length + 1}` };
      manager.addAccount(account);
      manager.setActive(account);
      onSave();
      setNsec("");
      onLogin?.();
      onClose?.();
    } catch (err) {
      console.error("Private key login error:", err);
      setError(err instanceof Error ? err.message : "Invalid private key");
    } finally {
      setIsLoggingIn(false);
    }
  }, [nsec, accounts.length, manager, onSave, onLogin, onClose]);

  // Bunker URL login
  const handleBunkerConnect = useCallback(async () => {
    if (!bunkerUrl) return;

    try {
      setIsConnectingBunker(true);
      setBunkerError(null);

      const signer = await NostrConnectSigner.fromBunkerURI(bunkerUrl);
      const pubkey = await signer.getPublicKey();
      const account = new NostrConnectAccount<AccountMetadata>(pubkey, signer);
      account.metadata = { name: `Bunker ${accounts.length + 1}` };
      manager.addAccount(account);
      manager.setActive(account);
      onSave();
      setBunkerUrl("");
      setShowBunker(false);
      onLogin?.();
      onClose?.();
    } catch (err) {
      console.error("Bunker connection error:", err);
      setBunkerError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setIsConnectingBunker(false);
    }
  }, [bunkerUrl, accounts.length, manager, onSave, onLogin, onClose]);

  // QR Code login
  const handleQrCodeLogin = useCallback(async () => {
    try {
      setQrError(null);
      setIsConnectingQR(true);

      const signer = new NostrConnectSigner({
        relays: ["wss://relay.nsec.app"],
      });

      const uri = signer.getNostrConnectURI({
        name: "Routstr Chat",
      });

      setNostrConnectUri(uri);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      try {
        await signer.waitForSigner(controller.signal);
        clearTimeout(timeoutId);

        const pubkey = await signer.getPublicKey();
        const account = new NostrConnectAccount<AccountMetadata>(pubkey, signer);
        account.metadata = { name: `Bunker ${accounts.length + 1}` };
        manager.addAccount(account);
        manager.setActive(account);
        onSave();
        setNostrConnectUri(null);
        setShowQR(false);
        onLogin?.();
        onClose?.();
      } catch (err) {
        console.error("Wait for signer error:", err);
        if (err instanceof Error && err.message === "Aborted") {
          setQrError("Connection timeout. Please try again.");
        } else {
          setQrError(err instanceof Error ? err.message : "Failed to connect");
        }
        setNostrConnectUri(null);
      }
    } catch (err) {
      console.error("QR code login error:", err);
      setQrError(err instanceof Error ? err.message : "QR code login failed");
      setNostrConnectUri(null);
    } finally {
      setIsConnectingQR(false);
    }
  }, [accounts.length, manager, onSave, onLogin, onClose]);

  const cancelQR = useCallback(() => {
    setNostrConnectUri(null);
    setShowQR(false);
    setIsConnectingQR(false);
  }, []);

  return (
    <div className="w-full">
      {/* Welcome Section */}
      {showWelcome && (
        <div className="text-center mb-6">
          <h2 className="text-lg md:text-xl font-semibold text-foreground mb-1">
            Welcome to Routstr Chat
          </h2>
          <p className="text-sm text-muted-foreground">
            Sign in or create your Nostr identity
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div className="p-4 bg-muted/40 border border-border rounded-xl">
          <div className="text-center mb-4">
            <h3 className="text-base font-semibold text-foreground mb-1">
              Sign In
            </h3>
          </div>

          <div className="space-y-3">
            {/* Extension Login */}
            <button
              onClick={handleExtensionLogin}
              disabled={isConnectingExtension}
              className="w-full py-2.5 bg-muted/50 border border-border text-foreground rounded-lg text-sm font-medium hover:bg-muted/70 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {isConnectingExtension ? (
                <div className="w-4 h-4 border-2 border-muted-foreground/40 border-t-foreground rounded-full animate-spin"></div>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Browser Extension
                </>
              )}
            </button>

            {extensionError && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-2">
                <p className="text-xs text-destructive text-center">
                  {extensionError}
                </p>
              </div>
            )}

            {/* Private Key Login */}
            <div>
              <label
                htmlFor="nsec"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Private Key (nsec)
              </label>
              <div className="relative">
                <input
                  id="nsec"
                  type="password"
                  value={nsec}
                  onChange={(e) => setNsec(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleKeyLogin();
                    }
                  }}
                  placeholder="nsec1..."
                  className="w-full px-3 py-2 pr-10 bg-background/60 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring transition-colors"
                />
                <button
                  onClick={handlePasteNsec}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-muted/60 hover:bg-muted border border-border text-foreground p-1.5 rounded-md transition-all cursor-pointer flex items-center justify-center"
                  type="button"
                  title="Paste"
                >
                  <ClipboardPaste className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <button
              onClick={handleKeyLogin}
              disabled={isLoggingIn || !nsec.trim()}
              className="w-full py-2.5 bg-foreground text-background rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {isLoggingIn ? "Signing In..." : "Sign In"}
            </button>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-2">
                <p className="text-xs text-destructive text-center">
                  {error}
                </p>
              </div>
            )}

            <button
              onClick={() => setShowMoreOptions(!showMoreOptions)}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {showMoreOptions ? "Hide other options" : "More sign-in options"}
            </button>

            {/* More Options */}
            {showMoreOptions && (
              <div className="space-y-2">
                {/* Bunker URL Toggle */}
                <button
                  onClick={() => {
                    setShowBunker(!showBunker);
                    setShowQR(false);
                  }}
                  className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer border ${
                    showBunker
                      ? "bg-foreground/10 text-foreground border-foreground/30"
                      : "bg-muted/50 border-border text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  }`}
                >
                  <Link className="w-4 h-4" />
                  Bunker URL
                </button>

                {/* Bunker URL Input */}
                {showBunker && (
                  <div className="p-3 bg-muted/40 border border-border rounded-lg space-y-2">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="bunker://..."
                        value={bunkerUrl}
                        onChange={(e) => setBunkerUrl(e.target.value)}
                        className="w-full px-3 py-2 pr-10 bg-background/60 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring transition-colors"
                      />
                      <button
                        onClick={handlePasteBunkerUrl}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-muted/60 hover:bg-muted border border-border text-foreground p-1.5 rounded-md transition-all cursor-pointer flex items-center justify-center"
                        type="button"
                        title="Paste"
                      >
                        <ClipboardPaste className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={handleBunkerConnect}
                      disabled={!bunkerUrl || isConnectingBunker}
                      className="w-full py-2 bg-foreground text-background rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      {isConnectingBunker ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-muted-foreground/40 border-t-foreground rounded-full animate-spin"></div>
                          Connecting...
                        </span>
                      ) : (
                        "Connect"
                      )}
                    </button>
                    {bunkerError && (
                      <p className="text-xs text-destructive text-center">
                        {bunkerError}
                      </p>
                    )}
                  </div>
                )}

                {/* QR Code Toggle */}
                <button
                  onClick={() => {
                    setShowQR(!showQR);
                    setShowBunker(false);
                    if (!showQR && !nostrConnectUri) {
                      handleQrCodeLogin();
                    }
                  }}
                  className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer border ${
                    showQR
                      ? "bg-foreground/10 text-foreground border-foreground/30"
                      : "bg-muted/50 border-border text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  QR Code
                </button>

                {/* QR Code Display */}
                {showQR && (
                  <div className="p-3 bg-muted/40 border border-border rounded-lg">
                    {nostrConnectUri ? (
                      <div className="flex flex-col items-center space-y-3">
                        <p className="text-xs text-muted-foreground text-center">
                          Scan with your Nostr mobile signer
                        </p>
                        <div className="bg-background p-3 rounded-lg">
                          <QRCodeSVG value={nostrConnectUri} size={160} />
                        </div>
                        <button
                          onClick={cancelQR}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : isConnectingQR ? (
                      <div className="flex flex-col items-center py-4">
                        <div className="w-6 h-6 border-2 border-muted-foreground/40 border-t-foreground rounded-full animate-spin mb-2"></div>
                        <p className="text-xs text-muted-foreground">
                          Generating QR code...
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-4">
                        <button
                          onClick={handleQrCodeLogin}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          Generate QR Code
                        </button>
                      </div>
                    )}
                    {qrError && (
                      <p className="text-xs text-destructive text-center mt-2">
                        {qrError}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {signupStep === "save-keys" && generatedNsec ? (
          <div className="p-4 bg-muted/40 border border-border rounded-xl">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-foreground font-medium mb-2 text-center">
                  Save your private key
                </p>

                {/* Private Key Display */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-destructive">
                      Private Key
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowNsec(!showNsec)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        {showNsec ? (
                          <EyeOff className="w-3 h-3" />
                        ) : (
                          <Eye className="w-3 h-3" />
                        )}
                      </button>
                      <button
                        onClick={() => copyToClipboard(generatedNsec)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {nsecCopied ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        {nsecCopied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>
                  <div className="px-2 py-1.5 bg-destructive/10 border border-destructive/30 rounded-lg text-xs text-muted-foreground break-all font-mono">
                    {showNsec
                      ? generatedNsec
                      : generatedNsec.substring(0, 8) +
                        "•".repeat(20) +
                        generatedNsec.substring(generatedNsec.length - 8)}
                  </div>
                </div>

                {/* Confirmation Checkbox */}
                <div className="flex items-start gap-2 p-2 bg-muted/40 border border-border rounded-lg mt-3">
                  <input
                    id="saved-confirmation"
                    type="checkbox"
                    checked={showSaveConfirmation}
                    onChange={(e) => setShowSaveConfirmation(e.target.checked)}
                    className="mt-0.5 h-3 w-3 rounded border-border bg-background text-foreground focus:ring-2 focus:ring-ring/20 cursor-pointer"
                  />
                  <label
                    htmlFor="saved-confirmation"
                    className="text-xs text-muted-foreground cursor-pointer"
                  >
                    I have saved my private key securely
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={completeSignup}
                  disabled={!showSaveConfirmation}
                  className="w-full py-3 md:py-2 bg-foreground text-background rounded-lg text-base md:text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Complete Setup
                </button>

                <button
                  onClick={handleSaveLater}
                  className="w-full py-2.5 md:py-1.5 bg-muted/40 border border-border text-foreground rounded-lg text-sm md:text-xs font-medium hover:bg-muted/60 transition-colors cursor-pointer"
                >
                  I'll Save It Later
                </button>

                <button
                  onClick={() => {
                    setSignupStep("initial");
                    setGeneratedAccount(null);
                  }}
                  className="w-full py-1.5 text-muted-foreground text-xs hover:text-foreground transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={generateNewKeypair}
            className="w-full py-2.5 bg-muted/40 border border-border text-foreground rounded-lg text-sm font-semibold hover:bg-muted/60 transition-colors cursor-pointer"
          >
            Create new identity
          </button>
        )}
      </div>

      {/* Accounts Section - shown only when multiple accounts */}
      {accounts.length > 1 && (
        <div className="mt-6 pt-6 border-t border-border">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            Your Accounts
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account as IAccount<any, any, AccountMetadata>}
                manager={manager}
                onSave={onSave}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
