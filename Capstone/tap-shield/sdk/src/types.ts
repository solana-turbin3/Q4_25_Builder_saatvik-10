import { PublicKey } from '@solana/web3.js';

export interface ClaimInfo {
  claimer: PublicKey;
  faucerId: PublicKey;
  amount: number;
  timestamp: number;
}

export interface FaucetStats {
  operator: PublicKey;
  name: string;
  totalClaims: number;
  createdAt: number;
}

export interface TapShieldConfig {
  programId?: PublicKey;
  rpcUrl?: string;
}
