import { NextRequest, NextResponse } from "next/server";
//@ts-ignore
import { TapShield } from '@tapshield/sdk';
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction } from "@solana/web3.js";

const COOLDOWN_SECONDS = 86400;
const CLAIM_AMOUNT = 0.1 * LAMPORTS_PER_SOL;

const SECRET_KEY = process.env.FAUCET_PVT_KEY;
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

if (!SECRET_KEY) throw new Error("Faucet private key is missing");

const faucetKeyPair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(SECRET_KEY))
);

const tapshield = new TapShield(
    faucetKeyPair,
    RPC_URL
);

const connection = new Connection(RPC_URL, 'confirmed');

export async function POST(req: NextRequest) {
    const body = await req.json();
    const wallet = body.wallet;

    if (!wallet) {
        return NextResponse.json({ success: false, error: "Wallet Address Required!" }, {
            status: 400
        })
    }

    try {
        const claimerPubKey = new PublicKey(wallet);

        const txn = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: faucetKeyPair.publicKey,
                toPubkey: claimerPubKey,
                lamports: CLAIM_AMOUNT,
            })
        );

        await sendAndConfirmTransaction(connection, txn, [faucetKeyPair]);

        await tapshield.recordClaim(
            claimerPubKey,
            CLAIM_AMOUNT,
            COOLDOWN_SECONDS,
        );

        return NextResponse.json({
            success: true,
            message: "Claimed 0.1 SOL successfully!"
        });
    } catch (err: any) {
        console.log(err)

        if (err.message?.includes("COOLDOWN_ACTIVE") || err.message?.includes("ClaimTooRecent")) {
            return NextResponse.json({
                success: false,
                error: "Cooldown is still active. You claimed too recently"
            }, {
                status: 429
            });
        }

        return NextResponse.json({
            success: false,
            error: err.message || "Failed to process claim"
        }, {
            status: 500
        });
    }
}