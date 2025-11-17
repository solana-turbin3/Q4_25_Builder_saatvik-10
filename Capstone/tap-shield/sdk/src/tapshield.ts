import { Connection, PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, BN } from '@coral-xyz/anchor';
import TapShieldIDL from './idl/tapshield.json';
import { ClaimRecordInfo, FaucetRegistryStats } from './types';

export class TapShield {
  private program: Program;
  private provider: AnchorProvider;
  private faucetKeypair: Keypair;

  constructor(faucetKeypair: Keypair, rpcUrl: string, programId?: PublicKey) {
    this.faucetKeypair = faucetKeypair;

    const connection = new Connection(rpcUrl, 'confirmed');
    const wallet = new Wallet(faucetKeypair);

    this.provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });

    const pId = programId || new PublicKey(TapShieldIDL.address);

    this.program = new Program(TapShieldIDL as any, pId, this.provider);
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
        systemProgram: SystemProgram,
      })
      .rpc();

    console.log(`Faucet ${name} registered: ${faucetRegistry.toBase58()}`);

    return faucetRegistry.toBase58();
  }
}
