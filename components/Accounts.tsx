import { AccountManager } from "applesauce-accounts";
import {
  PrivateKeyAccount,
} from "applesauce-accounts/accounts";
import { useObservableState } from "applesauce-react/hooks";
import { useCallback, useState } from "react";
import { AccountMetadata } from "./ClientProviders";

function AccountCard({
  account,
  manager,
  onSave,
}: {
  account: PrivateKeyAccount<AccountMetadata>;
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

  const createNewAccount = useCallback(() => {
    const account = PrivateKeyAccount.generateNew<AccountMetadata>();
    account.metadata = { name: `Account ${accounts.length + 1}` };
    manager.addAccount(account);
  }, [accounts.length, manager]);

  return (
    <div className="container mx-auto p-2 h-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Account Manager</h1>
        <button className="btn btn-primary" onClick={createNewAccount}>
          Create New Account
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account as PrivateKeyAccount<AccountMetadata>}
            manager={manager}
            onSave={onSave}
          />
        ))}
      </div>

      {accounts.length === 0 && (
        <div className="text-center py-12 text-base-content/70">
          No accounts yet. Create one to get started!
        </div>
      )}
    </div>
  );
}

