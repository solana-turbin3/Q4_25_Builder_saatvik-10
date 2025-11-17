import { PublicKey } from '@solana/web3.js';

export interface ClaimRecordInfo {
  claimer: string;
  faucerId: string;
  amount: number;
  timestamp: number;
}

export interface FaucetRegistryStats {
  operator: string;
  name: string;
  totalClaims: number;
  createdAt: number;
}

export interface TapShieldConfig {
  programId?: string;
  rpcUrl?: string;
}
