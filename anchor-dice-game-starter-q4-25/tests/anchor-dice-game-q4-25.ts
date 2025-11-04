import anchor, { Program } from "@coral-xyz/anchor";
import { AnchorDiceGameQ425 } from "../target/types/anchor_dice_game_q4_25";
import {
    Ed25519Program,
    Keypair,
    sendAndConfirmTransaction,
    Transaction,
    SystemProgram,
    SYSVAR_INSTRUCTIONS_PUBKEY
} from "@solana/web3.js"

describe("anchor-dice-game-q4-25", () => {
    const clusterProvider = anchor.AnchorProvider.env();
    anchor.setProvider(clusterProvider);

    const prgrm = anchor.workspace.DiceGame as Program<AnchorDiceGameQ425>

    const house = anchor.web3.Keypair.generate();
    const place = anchor.web3.Keypair.generate();

    let vaultPda: anchor.web3.PublicKey;

})