import { Keypair, Connection, Commitment, PublicKey } from "@solana/web3.js";
import { createMint } from '@solana/spl-token';
import wallet from "../turbin3-wallet.json"

// Import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

//Create a Solana devnet connection
const commitment: Commitment = "confirmed";
const connection = new Connection("https://api.devnet.solana.com", commitment);

(async () => {
    try {
        const mintAuth = new PublicKey('9ARoNxwJa2x8KQrcH4Cut2V89cz8nhsMkcegNvUFq9wy');
        const freezeAuth = null;
        const decimals = 6;

        const mint = await createMint(
            connection,
            keypair,
            mintAuth,
            freezeAuth,
            decimals
        );

        console.log(mint.toBase58());

        return mint;

        //spl-Aa7xXKHYSRhvuGK94kaCqamVoTybs44qokg17sw4nDRw
    } catch (error) {
        console.log(`Oops, something went wrong: ${error}`)
    }
})()
