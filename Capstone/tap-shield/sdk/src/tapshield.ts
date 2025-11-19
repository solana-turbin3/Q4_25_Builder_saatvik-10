import { Connection, PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, BN } from '@coral-xyz/anchor';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';
import TapShieldIDL from './idl/tapshield.json';
import { ClaimRecordInfo, FaucetRegistryStats } from './types';

export class TapShield {
  private program: Program;
  private provider: AnchorProvider;
  private faucetKeypair: Keypair;

  constructor(faucetKeypair: Keypair, rpcUrl: string, programId?: PublicKey) {
    this.faucetKeypair = faucetKeypair;

    const connection = new Connection(rpcUrl, 'confirmed');
    const wallet = new NodeWallet(faucetKeypair);

    this.provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });

    // const pId = programId || new PublicKey(TapShieldIDL.address);

    this.program = new Program(TapShieldIDL as any, this.provider);

    if (programId) {
      this.program = new Program(TapShieldIDL as any, this.provider);
      (this.program as any).programId = programId;
    }
  }

  /**
   * Register a new faucet in the TapShield Network
   * @param name - Name of the faucet should be of at max 32 chars
   * @returns PDA address of the created FaucetRegistry
   */

  async registerFaucet(name: string): Promise<string> {
    const [faucetRegistry] = PublicKey.findProgramAddressSync(
      [Buffer.from('faucet'), this.faucetKeypair.publicKey.toBuffer()],
      this.program.programId
    );

    await this.program.methods
      .initializeFaucet(name)
      .accounts({
        operator: this.faucetKeypair.publicKey,
        faucetRegistry,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log(`Faucet ${name} registered: ${faucetRegistry.toBase58()}`);

    return faucetRegistry.toBase58();
  }

  /**
   * Record a claim including on-chain cooldown check
   * @param claimerPubkey - Wallet of the claiming user
   * @param amount - Amount in lamports
   * @param cooldownSeconds - Cooldown period in seconds
   * @returns PDA address of the created ClaimRecord
   */

  async recordClaim(
    claimerPubkey: PublicKey,
    amount: number,
    cooldownSeconds: number
  ): Promise<string> {
    const [faucetRegistry] = PublicKey.findProgramAddressSync(
      [Buffer.from('faucet'), this.faucetKeypair.publicKey.toBuffer()],
      this.program.programId
    );

    const faucetAccount = await (this.program.account as any).faucetRegistry.fetch(faucetRegistry);
    const claimIndex = faucetAccount.totalClaims;

    const [claimRecord] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('claim'),
        claimerPubkey.toBuffer(),
        faucetRegistry.toBuffer(),
        claimIndex.toArrayLike(Buffer, 'le', 8),
      ],
      this.program.programId
    );

    let lastClaimRecord: PublicKey | null = null;
    if (claimIndex.toNumber() > 0) {
      const previousIndex = claimIndex.sub(new BN(1));
      const [lastClaim] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('claim'),
          claimerPubkey.toBuffer(),
          faucetRegistry.toBuffer(),
          previousIndex.toArrayLike(Buffer, 'le', 8),
        ],
        this.program.programId
      );
      lastClaimRecord = lastClaim;
    }

    try {
      await this.program.methods
        .recordClaim(claimerPubkey, new BN(amount), new BN(cooldownSeconds))
        .accounts({
          operator: this.faucetKeypair.publicKey,
          claimer: claimerPubkey,
          faucetRegistry,
          claimRecord,
          lastClaimRecord: lastClaimRecord,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();

      console.log(`Claim recorded: ${claimRecord.toBase58()}`);

      return claimRecord.toBase58();
    } catch (err: any) {
      if (
        err.message?.includes('ClaimTooRecent') ||
        err.logs?.some((log: string) => log.includes('ClaimTooRecent'))
      ) {
        throw new Error('COOLDOWN_ACTIVE: User claimed too recently!');
      }
      throw err;
    }
  }

  /**
   * get claim history for a wallet
   * @param claimerPubkey - Wallet to query
   * @returns Array of claims
   */

  async getClaimHistory(claimerPubkey: PublicKey): Promise<ClaimRecordInfo[]> {
    const claimRecords = await (this.program.account as any).claimRecord.all([
      {
        memcmp: {
          offset: 8,
          bytes: claimerPubkey.toBase58(),
        },
      },
    ]);

    return claimRecords.map((record: any) => ({
      claimer: record.account.claimer.toBase58(),
      faucetId: record.account.faucetId.toBase58(),
      timestamp: record.account.timeStamp.toNumber(),
      amount: record.account.amount.toNumber(),
    }));
  }

  /**
   * Getting faucet stats
   * @returns faucet stats including total claims
   */

  async getFaucetStats(): Promise<FaucetRegistryStats> {
    const [faucetRegistry] = PublicKey.findProgramAddressSync(
      [Buffer.from('faucet'), this.faucetKeypair.publicKey.toBuffer()],
      this.program.programId
    );

    const faucet = await (this.program.account as any).faucetRegistry.fetch(
      faucetRegistry
    );

    return {
      operator: faucet.operator.toBase58(),
      name: faucet.name,
      totalClaims: faucet.totalClaims.toNumber(),
      createdAt: faucet.createdAt.toNumber(),
    };
  }

  /**
   * getting program instance
   */
  getProgram(): Program {
    return this.program;
  }

  /**
   * getting faucet registry PDA
   */
  getFaucetRegistryPDA(): PublicKey {
    const [faucetRegistry] = PublicKey.findProgramAddressSync(
      [Buffer.from('faucet'), this.faucetKeypair.publicKey.toBuffer()],
      // SystemProgram.programId
      this.program.programId
    );
    return faucetRegistry;
  }
}
