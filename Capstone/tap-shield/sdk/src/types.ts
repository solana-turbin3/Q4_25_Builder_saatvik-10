import { PublicKey } from '@solana/web3.js';

export interface ClaimInfo {
  claimer: string;
  faucerId: string;
  amount: number;
  timestamp: number;
}

export interface FaucetStats {
  operator: string;
  name: string;
  totalClaims: number;
  createdAt: number;
}

export interface TapShieldConfig {
  programId?: string;
  rpcUrl?: string;
}
