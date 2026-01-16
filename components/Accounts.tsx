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
import { Shield, Eye, EyeOff, Copy, Check, Link, QrCode, Key, X } from "lucide-react";
import { AccountMetadata } from "./ClientProviders";

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
      className={`bg-white/5 border rounded-lg p-4 transition-colors ${
        isActive ? "border-white/40" : "border-white/10 hover:border-white/20"
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
            className="w-full bg-transparent text-white text-sm font-medium focus:outline-none placeholder-white/50"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Account name"
            onBlur={saveName}
          />
          <p className="text-xs font-mono text-white/50 truncate">
            {account.pubkey.slice(0, 8)}...{account.pubkey.slice(-8)}
            {account.type === "nostr-connect" && (
              <span className="ml-2 text-xs text-white/40">(Bunker)</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
            isActive
              ? "bg-white/20 text-white/50 cursor-not-allowed"
              : "bg-white text-black hover:bg-gray-100"
          }`}
          onClick={setActive}
          disabled={isActive}
        >
          {isActive ? "Active" : "Set Active"}
        </button>
        <button
          className="py-1.5 px-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-md text-xs font-medium hover:bg-red-500/20 transition-colors"
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
}: AppleSauceLoginProps) {
  const accounts = useObservableState(manager.accounts$);
  
  // Mobile tab state
  const [activeTab, setActiveTab] = useState<"create" | "signin">("signin");
  
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
      <div className="text-center mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
          Welcome to Routstr Chat
        </h2>
        <p className="text-sm text-gray-400">
          A decentralized LLM routing marketplace
        </p>
      </div>

      {/* Mobile Tabs */}
      <div className="md:hidden mb-4">
        <div className="flex bg-white/5 rounded-lg p-1">
          <button
            onClick={() => setActiveTab("create")}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === "create"
                ? "bg-white text-black"
                : "text-white/70 hover:text-white"
            }`}
          >
            Create Account
          </button>
          <button
            onClick={() => setActiveTab("signin")}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === "signin"
                ? "bg-white text-black"
                : "text-white/70 hover:text-white"
            }`}
          >
            Sign In
          </button>
        </div>
      </div>

      {/* Two-panel Layout */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        {/* Create Account Panel */}
        <div
          className={`w-full md:w-1/2 order-2 md:order-1 ${
            activeTab === "create" ? "block" : "hidden md:block"
          }`}
        >
          <div className="p-3 md:p-4 bg-white/5 border border-white/10 rounded-xl flex flex-col min-h-[400px]">
            <div className="hidden md:block text-center pb-3 border-b border-white/10 mb-4">
              <h3 className="text-base font-semibold text-white mb-1">
                Create Account
              </h3>
              <p className="text-xs text-gray-400">New to Nostr?</p>
            </div>

            {signupStep === "initial" && (
              <div className="flex flex-col flex-1">
                <div className="mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      <span className="text-xs text-gray-300">
                        Multiple AI models, always the best price
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      <span className="text-xs text-gray-300">
                        Pay with Bitcoin (Lightning or on-chain)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      <span className="text-xs text-gray-300">
                        Private, permissionless, open source
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      <span className="text-xs text-gray-300">
                        Powered by Nostr + Cashu tokens
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1"></div>

                <button
                  onClick={generateNewKeypair}
                  className="w-full py-3 md:py-2.5 bg-white text-black rounded-lg text-base md:text-sm font-semibold hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Generate New Identity
                </button>
              </div>
            )}

            {signupStep === "save-keys" && generatedNsec && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-white font-medium mb-2 text-center">
                    Save your private key!
                  </p>

                  {/* Private Key Display */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-red-400">
                        Private Key
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowNsec(!showNsec)}
                          className="text-xs text-white/70 hover:text-white transition-colors cursor-pointer"
                        >
                          {showNsec ? (
                            <EyeOff className="w-3 h-3" />
                          ) : (
                            <Eye className="w-3 h-3" />
                          )}
                        </button>
                        <button
                          onClick={() => copyToClipboard(generatedNsec)}
                          className="text-xs text-white/70 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
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
                    <div className="px-2 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-gray-300 break-all font-mono">
                      {showNsec
                        ? generatedNsec
                        : generatedNsec.substring(0, 8) +
                          "•".repeat(20) +
                          generatedNsec.substring(generatedNsec.length - 8)}
                    </div>
                  </div>

                  {/* Confirmation Checkbox */}
                  <div className="flex items-start gap-2 p-2 bg-white/5 border border-white/10 rounded-lg mt-3">
                    <input
                      id="saved-confirmation"
                      type="checkbox"
                      checked={showSaveConfirmation}
                      onChange={(e) => setShowSaveConfirmation(e.target.checked)}
                      className="mt-0.5 h-3 w-3 bg-transparent border border-white/30 rounded focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <label
                      htmlFor="saved-confirmation"
                      className="text-xs text-gray-300 cursor-pointer"
                    >
                      I have saved my private key securely
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={completeSignup}
                    disabled={!showSaveConfirmation}
                    className="w-full py-3 md:py-2 bg-white text-black rounded-lg text-base md:text-sm font-semibold hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    Complete Setup
                  </button>

                  <button
                    onClick={handleSaveLater}
                    className="w-full py-2.5 md:py-1.5 bg-white/5 border border-white/10 text-white rounded-lg text-sm md:text-xs font-medium hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    I'll Save It Later
                  </button>

                  <button
                    onClick={() => {
                      setSignupStep("initial");
                      setGeneratedAccount(null);
                    }}
                    className="w-full py-1.5 text-white/50 text-xs hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sign In Panel */}
        <div
          className={`w-full md:w-1/2 order-1 md:order-2 ${
            activeTab === "signin" ? "block" : "hidden md:block"
          }`}
        >
          <div className="p-3 md:p-4 bg-white/5 border border-white/10 rounded-xl">
            <div className="hidden md:block text-center pb-3 border-b border-white/10 mb-4">
              <h3 className="text-base font-semibold text-white mb-1">
                Sign In
              </h3>
              <p className="text-xs text-gray-400">Already have an account?</p>
            </div>

            <div className="space-y-3">
              {/* Extension Login */}
              <button
                onClick={handleExtensionLogin}
                disabled={isConnectingExtension}
                className="w-full py-2.5 bg-white/10 border border-white/20 text-white rounded-lg text-sm font-medium hover:bg-white/20 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isConnectingExtension ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Browser Extension
                  </>
                )}
              </button>

              {extensionError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                  <p className="text-xs text-red-400 text-center">{extensionError}</p>
                </div>
              )}

              {/* OR Separator */}
              <div className="relative flex items-center justify-center">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink mx-3 text-white/50 text-xs font-medium">
                  OR
                </span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>

              {/* Private Key Login */}
              <div>
                <label
                  htmlFor="nsec"
                  className="block text-sm font-medium text-white mb-2"
                >
                  Private Key (nsec)
                </label>
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
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/30 transition-colors"
                />
              </div>

              <button
                onClick={handleKeyLogin}
                disabled={isLoggingIn || !nsec.trim()}
                className="w-full py-2.5 bg-white text-black rounded-lg text-sm font-semibold hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {isLoggingIn ? "Signing In..." : "Sign In"}
              </button>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                  <p className="text-xs text-red-400 text-center">{error}</p>
                </div>
              )}

              {/* MORE OPTIONS Separator */}
              <div className="relative flex items-center justify-center pt-2">
                <div className="flex-grow border-t border-white/10"></div>
                <button
                  onClick={() => setShowMoreOptions(!showMoreOptions)}
                  className="flex-shrink mx-3 text-white/50 text-xs font-medium hover:text-white transition-colors cursor-pointer"
                >
                  {showMoreOptions ? "LESS OPTIONS" : "MORE OPTIONS"}
                </button>
                <div className="flex-grow border-t border-white/10"></div>
              </div>

              {/* More Options */}
              {showMoreOptions && (
                <div className="space-y-2">
                  {/* Bunker URL Toggle */}
                  <button
                    onClick={() => {
                      setShowBunker(!showBunker);
                      setShowQR(false);
                    }}
                    className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                      showBunker
                        ? "bg-white/20 text-white border border-white/30"
                        : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Link className="w-4 h-4" />
                    Bunker URL
                  </button>

                  {/* Bunker URL Input */}
                  {showBunker && (
                    <div className="p-3 bg-white/5 border border-white/10 rounded-lg space-y-2">
                      <input
                        type="text"
                        placeholder="bunker://..."
                        value={bunkerUrl}
                        onChange={(e) => setBunkerUrl(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/30 transition-colors"
                      />
                      <button
                        onClick={handleBunkerConnect}
                        disabled={!bunkerUrl || isConnectingBunker}
                        className="w-full py-2 bg-white text-black rounded-lg text-sm font-semibold hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        {isConnectingBunker ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                            Connecting...
                          </span>
                        ) : (
                          "Connect"
                        )}
                      </button>
                      {bunkerError && (
                        <p className="text-xs text-red-400 text-center">{bunkerError}</p>
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
                    className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                      showQR
                        ? "bg-white/20 text-white border border-white/30"
                        : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    QR Code
                  </button>

                  {/* QR Code Display */}
                  {showQR && (
                    <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                      {nostrConnectUri ? (
                        <div className="flex flex-col items-center space-y-3">
                          <p className="text-xs text-gray-400 text-center">
                            Scan with your Nostr mobile signer
                          </p>
                          <div className="bg-white p-3 rounded-lg">
                            <QRCodeSVG value={nostrConnectUri} size={160} />
                          </div>
                          <button
                            onClick={cancelQR}
                            className="text-xs text-white/50 hover:text-white transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : isConnectingQR ? (
                        <div className="flex flex-col items-center py-4">
                          <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mb-2"></div>
                          <p className="text-xs text-gray-400">Generating QR code...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center py-4">
                          <button
                            onClick={handleQrCodeLogin}
                            className="text-xs text-white/70 hover:text-white transition-colors cursor-pointer"
                          >
                            Generate QR Code
                          </button>
                        </div>
                      )}
                      {qrError && (
                        <p className="text-xs text-red-400 text-center mt-2">{qrError}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Accounts Section - shown only when multiple accounts */}
      {accounts.length > 1 && (
        <div className="mt-6 pt-6 border-t border-white/10">
          <h3 className="text-sm font-medium text-white/70 mb-4">Your Accounts</h3>
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