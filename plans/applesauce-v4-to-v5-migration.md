# Applesauce v4 to v5 Migration Plan

## Overview

Migrate the Routstr Chat codebase from Applesauce v4 to v5. The main change is the introduction of `applesauce-common` package and import path changes.

## Current State

### Packages (package.json)

```
applesauce-accounts: ^4.1.0
applesauce-core: ^4.1.0
applesauce-factory: ^4.0.0     # Not directly imported - can remove
applesauce-loaders: ^4.0.0
applesauce-react: ^4.0.0
applesauce-relay: ^4.1.0
applesauce-signers: ^4.1.0
```

### Imports Used

| Import                        | Source File(s)                                                                                                                                                                                                                                                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EventStore`                  | `lib/applesauce-core.ts`                                                                                                                                                                                                                                                                                         |
| `RelayPool`                   | `lib/applesauce-core.ts`                                                                                                                                                                                                                                                                                         |
| `NostrConnectSigner`          | `lib/applesauce-core.ts`                                                                                                                                                                                                                                                                                         |
| `useObservableState`          | `hooks/useCashuWithXYZ.ts`, `hooks/useChatSync.ts`, `hooks/useInvoiceSync.ts`, `hooks/useAuthState.ts`, `hooks/useApiKeysSync.ts`, `features/wallet/hooks/useNutzaps.ts`, `features/wallet/hooks/useCashuWallet.ts`, `features/wallet/hooks/useCreateCashuWallet.ts`, `features/wallet/hooks/useCashuHistory.ts` |
| `onlyEvents`, `SyncDirection` | `hooks/sync/sync1080Pns.ts`, `hooks/useDeletionSync.ts`                                                                                                                                                                                                                                                          |

## Migration Steps

### Step 1: Update package.json

Update all applesauce packages to v5:

```json
{
  "applesauce-accounts": "^5.0.0",
  "applesauce-core": "^5.0.0",
  "applesauce-common": "^5.0.0",
  "applesauce-loaders": "^5.0.0",
  "applesauce-react": "^5.0.0",
  "applesauce-relay": "^5.0.0",
  "applesauce-signers": "^5.0.0"
}
```

Remove `applesauce-factory` - it's no longer needed as a direct dependency.

### Step 2: Install Dependencies

```bash
npm install
# or
pnpm install
# or
yarn install
```

### Step 3: Update Import Paths

Based on the migration guide, these are the changes needed:

#### 3.1 Keep in `applesauce-core` (no change needed)

- `EventStore` - stays in `applesauce-core`
- `RelayPool` - stays in `applesauce-relay` (not applesauce-core)
- `NostrConnectSigner` - stays in `applesauce-signers`
- `useObservableState` - stays in `applesauce-react/hooks`
- `onlyEvents`, `SyncDirection` - stay in `applesauce-relay`

**No import changes required** for any of these files:

- `lib/applesauce-core.ts` - `EventStore` import path unchanged
- `hooks/useCashuWithXYZ.ts`
- `hooks/useChatSync.ts`
- `hooks/useInvoiceSync.ts`
- `hooks/useAuthState.ts`
- `hooks/useApiKeysSync.ts`
- `hooks/sync/sync1080Pns.ts`
- `hooks/useDeletionSync.ts`
- `features/wallet/hooks/useNutzaps.ts`
- `features/wallet/hooks/useCashuWallet.ts`
- `features/wallet/hooks/useCreateCashuWallet.ts`
- `features/wallet/hooks/useCashuHistory.ts`

#### 3.2 Check for Additional Imports

Search the codebase for any additional applesauce imports that might need updating:

```bash
# Run this to find any remaining applesauce imports
rg "from ['\"]applesauce" --type ts
```

### Step 4: Build and Test

Run the build to check for any errors:

```bash
npm run build
# or
pnpm build
```

Fix any import errors that arise - they will likely be related to:

- Helpers that moved to `applesauce-common/helpers`
- Models that moved to `applesauce-common/models`
- Operations/blueprints that moved to `applesauce-common/operations` or `applesauce-common/blueprints`

### Step 5: Runtime Verification

Test key functionality:

- [ ] Relay connections work
- [ ] Event store loads/saves events
- [ ] Login/account system works
- [ ] Wallet sync works (Cashu)
- [ ] Chat messages sync

## Migration Notes

### What Stays the Same

According to the v4→v5 migration guide, the following imports used in this repo remain unchanged:

1. **`applesauce-core`**: `EventStore` is still imported from `applesauce-core`
2. **`applesauce-react/hooks`**: `useObservableState` stays the same
3. **`applesauce-relay`**: `RelayPool`, `onlyEvents`, `SyncDirection` stay the same
4. **`applesauce-signers`**: `NostrConnectSigner` stays the same
5. **`applesauce-accounts`**: imports unchanged

### Potential Issues

1. **Pointer Helpers Behavior Change**: If any code uses `decodeEventPointer`, `decodeAddressPointer`, or `decodeProfilePointer` with try/catch, update to check for null returns instead
2. **RelayPool Offline Behavior**: v5 ignores offline relays by default - may need to set `ignoreOffline: false` if offline relay handling is required

### Files That Likely Don't Need Changes

Based on the grep results, these files should work without modification:

- `lib/applesauce-core.ts`
- All hooks using `useObservableState`
- All hooks using `onlyEvents` or `SyncDirection`

## Verification Checklist

- [ ] All applesauce packages updated to v5
- [ ] `applesauce-common` installed
- [ ] `applesauce-factory` removed from dependencies
- [ ] Build succeeds without import errors
- [ ] App loads and connects to relays
- [ ] Login/account system functional
- [ ] Chat/message sync working
- [ ] Wallet sync (Cashu) working
