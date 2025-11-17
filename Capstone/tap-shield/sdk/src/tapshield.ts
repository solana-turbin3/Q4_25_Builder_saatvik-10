import { Connection, PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, BN } from '@coral-xyz/anchor';
import TapShieldIDL from './idl/tapshield.json';
import { ClaimRecordInfo, FaucetRegistryStats } from './types';
