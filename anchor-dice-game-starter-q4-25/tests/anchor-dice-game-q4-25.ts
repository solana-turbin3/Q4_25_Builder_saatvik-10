import * as anchor from "@coral-xyz/anchor";
import { AnchorDiceGameQ425 } from "../target/types/anchor_dice_game_q4_25";
import { Program } from '@coral-xyz/anchor'
import {
    Ed25519Program,
    Keypair,
    sendAndConfirmTransaction,
    TransactionInstruction,
    Transaction,
    SystemProgram,
    PublicKey,
    LAMPORTS_PER_SOL,
    SYSVAR_INSTRUCTIONS_PUBKEY
} from "@solana/web3.js"
import { assert } from "chai";
import nacl from "tweetnacl";

describe("anchor-dice-game-q4-25", () => {
    const clusterProvider = anchor.AnchorProvider.env();
    anchor.setProvider(clusterProvider);

    const prgrm = anchor.workspace.AnchorDiceGameQ425 as Program<AnchorDiceGameQ425>

    const house = Keypair.generate();
    const player = Keypair.generate();

    let vaultPda: PublicKey;
    let vaultBump: number;

    async function airdrop(pubkey: PublicKey, sol = 2) {
        const sig = await clusterProvider.connection.requestAirdrop(pubkey, sol * LAMPORTS_PER_SOL);
        await clusterProvider.connection.confirmTransaction(sig);
    }

    function findVaultPda(housePubKey: PublicKey) {
        return PublicKey.findProgramAddressSync(
            [Buffer.from("vault"), housePubKey.toBuffer()],
            prgrm.programId
        );
    }

    function u128LeBytesBn(bn: anchor.BN): Buffer {
        return bn.toArrayLike(Buffer, "le", 16);
    }

    function findBetPda(vaultPubKey: PublicKey, seed: anchor.BN) {
        return PublicKey.findProgramAddressSync(
            [Buffer.from("bet"), vaultPubKey.toBuffer(), u128LeBytesBn(seed)],
            prgrm.programId
        )
    }

    function createEd25519Ix(msg: Buffer, signer: Keypair): { ix: TransactionInstruction, sig: Uint8Array } {
        const sig = nacl.sign.detached(msg, signer.secretKey)
        const ix = Ed25519Program.createInstructionWithPublicKey({
            publicKey: signer.publicKey.toBytes(),
            message: msg,
            signature: sig
        })

        return { ix, sig }
    }

    function betMsg(bet: any): Buffer {
        const seedBuffer = new anchor.BN(bet.seed).toArrayLike(Buffer, "le", 16);
        const slotBuffer = new anchor.BN(bet.slot).toArrayLike(Buffer, "le", 8);
        const amountBuffer = new anchor.BN(bet.amount).toArrayLike(Buffer, "le", 8);

        return Buffer.concat([
            bet.player.toBuffer(),
            seedBuffer,
            slotBuffer,
            amountBuffer,
            Buffer.from([bet.roll]),
            Buffer.from([bet.bump])
        ]);
    }


    before(async () => {
        await airdrop(house.publicKey, 4);
        await airdrop(player.publicKey, 4);

        const [pda, bump] = findVaultPda(house.publicKey);

        vaultPda = pda;
        vaultBump = bump;
    })

    it("initializing the vault with house funds", async () => {
        const beforeHouse = await clusterProvider.connection.getBalance(house.publicKey);
        const beforeVault = await clusterProvider.connection.getBalance(vaultPda);

        const deposit = new anchor.BN(1 * LAMPORTS_PER_SOL);

        await prgrm.methods.initialize(deposit).accounts({
            house: house.publicKey
        })
            .signers([house])
            .rpc()

        const afterHouse = await clusterProvider.connection.getBalance(house.publicKey);
        const afterVault = await clusterProvider.connection.getBalance(vaultPda);

        assert.ok(afterVault - beforeVault === deposit.toNumber(), "No deposits received!")
        assert.ok(beforeHouse > afterHouse, "House balance didn't increase")
    })

    it("placing a bet and bet pda creation", async () => {
        const seed = new anchor.BN(40);
        const roll = 60;
        const amount = new anchor.BN(0.2 * LAMPORTS_PER_SOL);

        const [betPda, betBump] = findBetPda(vaultPda, seed);

        const beforePlayer = await clusterProvider.connection.getBalance(player.publicKey);
        const beforeVault = await clusterProvider.connection.getBalance(vaultPda);

        await prgrm.methods.placeBet(seed, roll, amount).accounts({
            player: player.publicKey,
            house: house.publicKey
        })
            .signers([player])
            .rpc()

        const betAccount = await prgrm.account.bet.fetch(betPda);

        assert.equal(betAccount.player.toBase58(), player.publicKey.toBase58(), "Bet player mismatched")
        assert.equal(betAccount.roll, roll, "Bet roll mismatched")

        assert.ok(betAccount.amount.eq(amount), "Bet amount mismatched")

        const afterPlayer = await clusterProvider.connection.getBalance(player.publicKey)
        const afterVault = await clusterProvider.connection.getBalance(vaultPda)

        assert.ok(afterVault - beforeVault === amount.toNumber(), "Vault didn't receive the bet amount")
        assert.ok(beforePlayer > afterPlayer, "Player's balance didn't increase")
    })

    it("Resolving a bet successfully and paying the winner", async () => {
        const seed = new anchor.BN(90);
        const roll = 90;
        const amount = new anchor.BN(0.2 * LAMPORTS_PER_SOL);

        const [betPda, betBump] = findBetPda(vaultPda, seed);

        //placing the first bet
        await prgrm.methods.placeBet(seed, roll, amount)
            .accounts({
                player: player.publicKey,
                house: house.publicKey,
            })
            .signers([player])
            .rpc();

        const betAccount = await prgrm.account.bet.fetch(betPda);

        const msg = betMsg(betAccount);

        const { ix: ed25519Ix, sig } = createEd25519Ix(msg, house);

        const beforeBalance = await clusterProvider.connection.getBalance(player.publicKey);

        const tx = new anchor.web3.Transaction().add(ed25519Ix).add(
            await prgrm.methods.resolveBet(Buffer.from(sig))
                .accountsPartial({
                    house: house.publicKey,
                    player: player.publicKey,
                    bet: betPda,
                    vault: vaultPda,
                    instructionSysvar: SYSVAR_INSTRUCTIONS_PUBKEY
                })
                .instruction()
        )

        await clusterProvider.sendAndConfirm(tx, [house])

        const afterBalance = await clusterProvider.connection.getBalance(player.publicKey);

        assert.ok(afterBalance > beforeBalance, "Player did not receive payment!")
    })
})
