# TapShield SDK

A TypeScript SDK for integrating TapShield's on-chain faucet abuse prevention system into your Solana faucet.

## What is TapShield?

TapShield is a decentralized anti-abuse protocol for Solana faucets. It stores claim records on-chain and enforces cooldown periods to prevent users from exploiting multiple faucets with the same wallet address. Faucet operators can use this SDK to:

- Register their faucet in the TapShield network
- Record claims with automatic cooldown enforcement
- Query claim history for any wallet
- Get faucet statistics

## Installation

```bash
npm install @tapshield/sdk
# or
pnpm add @tapshield/sdk
# or
yarn add @tapshield/sdk
```

## Quick Start

### 1. Import and Initialize

```typescript
import { TapShield } from '@tapshield/sdk';
import { Keypair } from '@solana/web3.js';

const faucetKeypair = Keypair.fromSecretKey(/* your secret key */);
const rpcUrl = 'https://api.devnet.solana.com';

const tapShield = new TapShield(faucetKeypair, rpcUrl);
```

### 2. Register Your Faucet (One-Time Setup)

Before recording claims, you must register your faucet:

```typescript
async function registerFaucet() {
  try {
    const registryAddress = await tapShield.registerFaucet('My Faucet Name');
    console.log('Faucet registered at:', registryAddress);
  } catch (error) {
    if (error.message?.includes('FaucetAlreadyExists')) {
      console.log('Faucet already registered!');
    } else {
      throw error;
    }
  }
}
```

**Important:** This only needs to be done once per faucet operator.

### 3. Record Claims with Cooldown

When a user claims from your faucet:

```typescript
async function handleClaim(userWallet: PublicKey) {
  const amount = 2 * LAMPORTS_PER_SOL; // 2 SOL
  const cooldownSeconds = 86400; // 24 hours

  try {
    const claimRecordAddress = await tapShield.recordClaim(
      userWallet,
      amount,
      cooldownSeconds
    );

    console.log('Claim recorded:', claimRecordAddress);
    // Now send SOL to user
  } catch (error) {
    if (error.message?.includes('COOLDOWN_ACTIVE')) {
      console.log('User must wait before claiming again!');
    } else {
      throw error;
    }
  }
}
```

## API Reference

### Constructor

```typescript
new TapShield(faucetKeypair: Keypair, rpcUrl: string, programId?: PublicKey)
```

**Parameters:**

- `faucetKeypair` - Your faucet operator keypair
- `rpcUrl` - Solana RPC endpoint URL
- `programId` - (Optional) Custom program ID (defaults to mainnet program)

---

### Methods

#### `registerFaucet(name: string): Promise<string>`

Registers your faucet in the TapShield network.

**Parameters:**

- `name` - Faucet name (max 32 characters)

**Returns:** Registry PDA address

**Throws:**

- `FaucetAlreadyExists` - If faucet is already registered

**Example:**

```typescript
const registryAddress = await tapShield.registerFaucet('DevNet Faucet');
```

---

#### `recordClaim(claimerPubkey: PublicKey, amount: number, cooldownSeconds: number): Promise<string>`

Records a claim and enforces cooldown period on-chain.

**Parameters:**

- `claimerPubkey` - User's wallet address
- `amount` - Amount claimed in lamports
- `cooldownSeconds` - Cooldown period (e.g., 86400 for 24 hours)

**Returns:** Claim record PDA address

**Throws:**

- `COOLDOWN_ACTIVE` - If user claimed too recently
- `ClaimTooRecent` - If cooldown period hasn't elapsed

**Example:**

```typescript
const claimAddress = await tapShield.recordClaim(
  userWallet,
  2000000000, // 2 SOL
  86400 // 24 hour cooldown
);
```

---

#### `getClaimHistory(claimerPubkey: PublicKey): Promise<ClaimRecordInfo[]>`

Fetches all claims made by a specific wallet across all faucets.

**Parameters:**

- `claimerPubkey` - User's wallet address

**Returns:** Array of claim records

**Example:**

```typescript
const history = await tapShield.getClaimHistory(userWallet);

history.forEach((claim) => {
  console.log('Faucet:', claim.faucetId);
  console.log('Amount:', claim.amount);
  console.log('Timestamp:', new Date(claim.timestamp * 1000));
});
```

**Response Type:**

```typescript
interface ClaimRecordInfo {
  claimer: string; // User's wallet address
  faucetId: string; // Faucet registry address
  timestamp: number; // Unix timestamp
  amount: number; // Amount in lamports
}
```

---

#### `getFaucetStats(): Promise<FaucetRegistryStats>`

Gets statistics about your faucet.

**Returns:** Faucet statistics

**Example:**

```typescript
const stats = await tapShield.getFaucetStats();

console.log('Name:', stats.name);
console.log('Total Claims:', stats.totalClaims);
console.log('Operator:', stats.operator);
console.log('Created:', new Date(stats.createdAt * 1000));
```

**Response Type:**

```typescript
interface FaucetRegistryStats {
  operator: string; // Operator's public key
  name: string; // Faucet name
  totalClaims: number; // Total number of claims
  createdAt: number; // Unix timestamp
}
```

---

#### `getProgram(): Program`

Returns the underlying Anchor Program instance for advanced usage.

**Example:**

```typescript
const program = tapShield.getProgram();
```

---

#### `getFaucetRegistryPDA(): PublicKey`

Gets your faucet's registry PDA address.

**Example:**

```typescript
const pda = tapShield.getFaucetRegistryPDA();
console.log('Registry PDA:', pda.toBase58());
```

---

## Complete Example: Faucet Integration

```typescript
import { TapShield } from '@tapshield/sdk';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';

// Initialize
const faucetKeypair = Keypair.fromSecretKey(/* your secret key */);
const rpcUrl = 'https://api.devnet.solana.com';
const connection = new Connection(rpcUrl, 'confirmed');

const tapShield = new TapShield(faucetKeypair, rpcUrl);

// Faucet claim handler
async function processClaim(userWallet: PublicKey) {
  const CLAIM_AMOUNT = 2 * LAMPORTS_PER_SOL;
  const COOLDOWN = 86400; // 24 hours

  try {
    // 1. Check cooldown and record claim
    await tapShield.recordClaim(userWallet, CLAIM_AMOUNT, COOLDOWN);
    console.log('✅ Cooldown check passed, claim recorded');

    // 2. Send SOL to user
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: faucetKeypair.publicKey,
        toPubkey: userWallet,
        lamports: CLAIM_AMOUNT,
      })
    );

    const signature = await sendAndConfirmTransaction(connection, tx, [
      faucetKeypair,
    ]);
    console.log('✅ SOL sent! Signature:', signature);

    return { success: true, signature };
  } catch (error: any) {
    if (error.message?.includes('COOLDOWN_ACTIVE')) {
      console.log('❌ User must wait 24 hours between claims');
      return { success: false, error: 'Cooldown active' };
    }
    throw error;
  }
}

// Usage
const userWallet = new PublicKey('User1Address...');
const result = await processClaim(userWallet);
```

---

## Environment Setup

Create a `.env` file:

```env
FAUCET_PVT_KEY=[1,2,3,...]  # Your faucet keypair as JSON array
RPC_URL=https://api.devnet.solana.com
```

Load in your application:

```typescript
import * as dotenv from 'dotenv';
dotenv.config();

const faucetKeypair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(process.env.FAUCET_PVT_KEY!))
);
```

---

## Registration Script Example

Create `scripts/register-faucet.ts`:

```typescript
import { TapShield } from '@tapshield/sdk';
import { Keypair } from '@solana/web3.js';
import * as dotenv from 'dotenv';

dotenv.config();

const faucetKeypair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(process.env.FAUCET_PVT_KEY!))
);

const tapShield = new TapShield(
  faucetKeypair,
  process.env.RPC_URL || 'https://api.devnet.solana.com'
);

async function main() {
  console.log('🚀 Registering faucet...');

  try {
    const address = await tapShield.registerFaucet('My Faucet');
    console.log('✅ Registered at:', address);

    const stats = await tapShield.getFaucetStats();
    console.log('\n📊 Faucet Stats:');
    console.log('  Name:', stats.name);
    console.log('  Total Claims:', stats.totalClaims);
  } catch (error: any) {
    if (error.message?.includes('FaucetAlreadyExists')) {
      console.log('✅ Faucet already registered!');
    } else {
      throw error;
    }
  }
}

main();
```

Run it:

```bash
ts-node scripts/register-faucet.ts
```

---

## Error Handling

Common errors and how to handle them:

```typescript
try {
  await tapShield.recordClaim(userWallet, amount, cooldown);
} catch (error: any) {
  if (error.message?.includes('COOLDOWN_ACTIVE')) {
    // User claimed too recently
    return 'Please wait before claiming again';
  }

  if (error.message?.includes('UnregisteredFaucet')) {
    // Faucet not registered
    return 'Faucet setup incomplete';
  }

  if (error.message?.includes('InvalidClaimer')) {
    // Invalid wallet address
    return 'Invalid wallet address';
  }

  // Other errors
  console.error('Unexpected error:', error);
  throw error;
}
```

---

## Network Configuration

### Devnet (Default)

```typescript
const tapShield = new TapShield(faucetKeypair, 'https://api.devnet.solana.com');
```

---

## TypeScript Support

The SDK is fully typed. Import types:

```typescript
import { ClaimRecordInfo, FaucetRegistryStats } from '@tapshield/sdk';
```

---

## Requirements

- Node.js 16+
- `@solana/web3.js` ^1.95.0
- `@coral-xyz/anchor` ^0.30.0

---

## Program Information

- **Program ID:** `EY3vvz2h9otDW1icM9tZefmaE6WCkGbNbif8wTC1TR4X`
- **Network:** Solana Devnet
- **Version:** 0.1.0

---

## Support

For issues or questions, please open an issue on GitHub.

## License

MIT
