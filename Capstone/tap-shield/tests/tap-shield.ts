import * as anchor from "@coral-xyz/anchor"
import { Program } from "@coral-xyz/anchor"
import { TapShield } from "../target/types/tap_shield"
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js"

describe("tap-shield", () => {
  const conn = anchor.AnchorProvider.env()
  anchor.setProvider(conn)

  const program = anchor.workspace.tapShield as Program<TapShield>;

  let operator: anchor.web3.Keypair
  let claimer: anchor.web3.Keypair
  let faucetRegistryPda: PublicKey
  let claimRecordPda: anchor.web3.Keypair

  const TEST_FAUCET_NAME = "TEST FAUCET"
  const CLAIM_AMOUNT = new anchor.BN(4000000)
  const COOLDOWN_SECONDS = new anchor.BN(60)

  async function airdrop(pubKey: PublicKey, sol = 2) {
    const sig = await conn.connection.requestAirdrop(pubKey, sol * LAMPORTS_PER_SOL)
    await conn.connection.confirmTransaction(sig)
  }

  function getFaucetRegistryPda(pubKey: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("faucet"), pubKey.toBuffer()],
      program.programId
    )
    return pda
  }

  before(async () => {
    operator = anchor.web3.Keypair.generate()
    claimer = anchor.web3.Keypair.generate()

    await airdrop(operator.publicKey, 5)

    getFaucetRegistryPda(operator.publicKey)

    describe("Initialize Faucet", () => {
      it("Initializing the Faucet Registry", async () => {
        const txn = await program.methods.initializeFaucet(TEST_FAUCET_NAME).accounts({
          operator: operator.publicKey,
          faucetRegistry: faucetRegistryPda,
          systemProgram: anchor.web3.SystemProgram.programId
        })
          .signers([operator])
          .rpc()
      })
    })
  })
})
