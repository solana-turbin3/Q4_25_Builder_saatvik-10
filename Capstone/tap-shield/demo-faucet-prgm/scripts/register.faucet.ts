import { TapShield } from "@tapshield/sdk";
import { Keypair } from '@solana/web3.js'
import * as dotenv from "dotenv"
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, "../.env") })

const SECRET_KEY = process.env.FAUCET_PVT_KEY
const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com"

if (!SECRET_KEY) {
    throw new Error("FAUCET_PVT_KEY is missing from env")
}

const faucetKeyPair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(SECRET_KEY))
)

async function main() {
    const tapShield = new TapShield(faucetKeyPair, RPC_URL)

    try {
        await tapShield.registerFaucet("Tapshield Demo Faucet")

        console.log("\nFaucet Details!");
        const stats = await tapShield.getFaucetStats();
        console.log(stats.name)
        console.log(stats.totalClaims)
    } catch (err: any) {
        if (err.message?.includes("FaucetAlreadyExists") || err.logs?.some((log: string) => log.includes("FaucetAlreadyExists"))) {
            console.log("\nFaucet already registered!");
            try {
                const stats = await tapShield.getFaucetStats()
                console.log(stats.name)
                console.log(stats.totalClaims)
            } catch (err: any) {
                console.error(err, "Could not fetch Faucet Stats")
            }
        } else {
            if (err.logs) {
                console.error("Program Logs: ", err.logs)
            }
            throw err
        }
    }
}

main().then(() => {
    console.log("Faucet Registration Script completed!")
    process.exit(0)
}).catch((err) => {
    console.log("Faucet Registration Script failed!", err)
    process.exit(1)
})