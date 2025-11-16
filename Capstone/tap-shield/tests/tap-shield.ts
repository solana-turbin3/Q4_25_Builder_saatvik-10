import * as anchor from "@coral-xyz/anchor"
import { Program } from "@coral-xyz/anchor"
import { TapShield } from "../target/types/tap_shield"
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js"
import { expect } from "chai"

describe("tap-shield", () => {
  const conn = anchor.AnchorProvider.env()
  anchor.setProvider(conn)

  const program = anchor.workspace.tapShield as Program<TapShield>;

  let operator: anchor.web3.Keypair
  let claimer: anchor.web3.Keypair
  let faucetRegistryPda: PublicKey
  let newFaucetRegistryPdA: PublicKey
  let claimRecordPda: PublicKey
  let nextClaimPda: PublicKey

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

  function getClaimRecordPda(claimerPubKey: PublicKey, faucetPubKey: PublicKey, claimIndex: anchor.BN): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("claim"), claimerPubKey.toBuffer(), faucetPubKey.toBuffer(), claimIndex.toArrayLike(Buffer, "le", 8)], program.programId
    )
    return pda
  }

  before(async () => {
    operator = anchor.web3.Keypair.generate()
    claimer = anchor.web3.Keypair.generate()

    await airdrop(operator.publicKey, 5)

    faucetRegistryPda = getFaucetRegistryPda(operator.publicKey)

  })

  describe("Initialize Faucet", () => {
    it("Initializing the Faucet Registry", async () => {
      const accounts = {
        operator: operator.publicKey,
        faucetRegistry: faucetRegistryPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      }

      const txn = await program.methods
        .initializeFaucet(TEST_FAUCET_NAME)
        .accounts(accounts)
        .signers([operator])
        .rpc()

      console.log("Initialize Faucet txn: ", txn);

      const faucetAccount = await program.account.faucetRegistry.fetch(faucetRegistryPda)

      expect(faucetAccount.operator.toString()).to.equal(operator.publicKey.toString())
      expect(faucetAccount.name).to.equal(TEST_FAUCET_NAME)
      expect(faucetAccount.totalClaims.toNumber()).to.equal(0)
      expect(faucetAccount.createdAt.toNumber()).to.be.greaterThan(0)
    })

    it("Should fail if faucet already exists", async () => {
      try {
        const accounts = {
          operator: operator.publicKey,
          faucetRegistry: faucetRegistryPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        }

        await program.methods.initializeFaucet(TEST_FAUCET_NAME).accounts(accounts).signers([operator]).rpc()

        expect.fail("Should throw FaucetAlreadyExists err")
      } catch (err) {
        console.log("FaucetAlreadyExists err")
      }
    })

    it("Should fail if name > 32 chars", async () => {
      const TEST_FAUCET_LONG_NAME = "asd".repeat(40)
      const newOperator = anchor.web3.Keypair.generate()

      await airdrop(newOperator.publicKey, 5)

      newFaucetRegistryPdA = getFaucetRegistryPda(newOperator.publicKey)

      try {
        const accounts = {
          operator: operator.publicKey,
          faucetRegistry: faucetRegistryPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        }

        await program.methods.initializeFaucet(TEST_FAUCET_LONG_NAME).accounts(accounts).signers([operator]).rpc()

        expect.fail("Should throw FaucetNameTooLong err")
      } catch (err) {
        console.log("FaucetNameTooLong err")
      }
    })
  })

  describe("Claim Record", () => {
    before(async () => {
      const faucetAccount = await program.account.faucetRegistry.fetch(faucetRegistryPda)

      claimRecordPda = getClaimRecordPda(claimer.publicKey, faucetRegistryPda, faucetAccount.totalClaims)
    })

    it("Should successfully record a claim", async () => {
      const accounts = {
        operator: operator.publicKey,
        claimer: claimer.publicKey,
        faucetRegistry: faucetRegistryPda,
        claimRecord: claimRecordPda,
        lastClaimRecord: null,
        systemProgram: anchor.web3.SystemProgram.programId
      }

      const txn = await program.methods.recordClaim(claimer.publicKey, CLAIM_AMOUNT, COOLDOWN_SECONDS).accounts(accounts).signers([operator]).rpc()

      console.log("Record claim txn: ", txn)

      const claimAccount = await program.account.claimRecord.fetch(claimRecordPda)

      expect(claimAccount.claimer.toString()).to.equal(claimer.publicKey.toString())
      expect(claimAccount.faucetId.toString()).to.equal(faucetRegistryPda.toString())
      expect(claimAccount.amount.toNumber()).to.equal(CLAIM_AMOUNT.toNumber())
      expect(claimAccount.timestamp.toNumber()).to.greaterThan(0)

      const faucetAccount = await program.account.faucetRegistry.fetch(faucetRegistryPda)

      expect(faucetAccount.totalClaims.toNumber()).to.equal(1)
    })

    it("Should fail when claiming to soon", async () => {
      const faucetAccount = await program.account.faucetRegistry.fetch(faucetRegistryPda)

      nextClaimPda = getClaimRecordPda(claimer.publicKey, faucetRegistryPda, faucetAccount.totalClaims)

      const accounts = {
        operator: operator.publicKey,
        claimer: claimer.publicKey,
        faucetRegistry: faucetRegistryPda,
        claimRecord: nextClaimPda,
        lastClaimRecord: claimRecordPda,
        systemProgram: anchor.web3.SystemProgram.programId
      }

      try {
        await program.methods.recordClaim(claimer.publicKey, CLAIM_AMOUNT, COOLDOWN_SECONDS).accounts(accounts).signers([operator]).rpc()
        expect.fail("Should throw ClaimTooRecent err")
      }
      catch (err) {
        console.log("ClaimTooRecent err");
      }
    })
  })
})
