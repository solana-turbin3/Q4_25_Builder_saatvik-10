import { Commitment, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js"
import wallet from "../turbin3-wallet.json"
import { getOrCreateAssociatedTokenAccount, transfer } from "@solana/spl-token";
import { token_decimals } from "./spl_mint";

// We're going to import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

//Create a Solana devnet connection
const commitment: Commitment = "confirmed";
const connection = new Connection("https://api.devnet.solana.com", commitment);

// Mint address
const mint = new PublicKey("Aa7xXKHYSRhvuGK94kaCqamVoTybs44qokg17sw4nDRw");

// Recipient address
const to = new PublicKey("G7MTCM2S1W6ufPhYLjodUyRZLBFbPz91CXd5C63aWoqV");

(async () => {
    try {
        const ata = await getOrCreateAssociatedTokenAccount(
            connection,
            keypair,
            mint,
            keypair.publicKey
        )
        console.log(`ATA: ${ata.address.toBase58()}`);

        const toAta = await getOrCreateAssociatedTokenAccount(
            connection,
            keypair,
            mint,
            to
        )
        console.log(`To ATA: ${toAta.address.toBase58()}`);

        const transferTx = await transfer(
            connection,
            keypair,
            ata.address,
            toAta.address,
            keypair,
            50n * token_decimals
        )
        console.log(`To ATA: ${transferTx}`);

    } catch (e) {
        console.error(`Oops, something went wrong: ${e}`)
    }
})();