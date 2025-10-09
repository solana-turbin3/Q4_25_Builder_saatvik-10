import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { createSignerFromKeypair, signerIdentity, generateSigner, percentAmount } from "@metaplex-foundation/umi"
import { createNft, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";

import wallet from "../turbin3-wallet.json"
import base58 from "bs58";

const RPC_ENDPOINT = "https://api.devnet.solana.com";
const umi = createUmi(RPC_ENDPOINT);

let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const myKeypairSigner = createSignerFromKeypair(umi, keypair);
umi.use(signerIdentity(myKeypairSigner));
umi.use(mplTokenMetadata())

//https://devnet.irys.xyz/GFW4to922fvivnN1u2N7XZz3sju86X41VQiVwzXjtipa

const mint = generateSigner(umi);

(async () => {
    let tx = await createNft(umi, {
        mint,
        name: "coolBerg",
        symbol: "TCTB",
        uri: "https://devnet.irys.xyz/GFW4to922fvivnN1u2N7XZz3sju86X41VQiVwzXjtipa",
        sellerFeeBasisPoints: percentAmount(5)
    })

    let result = await tx.sendAndConfirm(umi);
    const signature = base58.encode(result.signature);

    console.log(`Succesfully Minted! Check out your TX here:\nhttps://explorer.solana.com/tx/${signature}?cluster=devnet`)

    console.log("Mint Address: ", mint.publicKey);
})();