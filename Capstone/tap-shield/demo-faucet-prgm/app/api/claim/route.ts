import { NextRequest, NextResponse } from 'next/server';
import { TapShield } from '@tapshield/sdk';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';

const COOLDOWN_SECONDS = 86400;
const CLAIM_AMOUNT = 2 * LAMPORTS_PER_SOL;

const SECRET_KEY = process.env.FAUCET_PVT_KEY;
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

if (!SECRET_KEY) throw new Error('Faucet private key is missing');

const faucetKeyPair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(SECRET_KEY))
);

const tapshield = new TapShield(faucetKeyPair, RPC_URL);

const connection = new Connection(RPC_URL, 'confirmed');

export async function POST(req: NextRequest) {
  const body = await req.json();
  const wallet = body.wallet;

  if (!wallet) {
    return NextResponse.json(
      { success: false, error: 'Wallet Address Required!' },
      {
        status: 400,
      }
    );
  }

  try {
    const claimerPubKey = new PublicKey(wallet);

    // const txn = new Transaction().add(
    //   SystemProgram.transfer({
    //     fromPubkey: faucetKeyPair.publicKey,
    //     toPubkey: claimerPubKey,
    //     lamports: CLAIM_AMOUNT,
    //   })
    // );

    // const sign = await sendAndConfirmTransaction(connection, txn, [
    //   faucetKeyPair,
    // ]);

    // await tapshield.recordClaim(claimerPubKey, CLAIM_AMOUNT, COOLDOWN_SECONDS);

    // return NextResponse.json({
    //   success: true,
    //   amount: CLAIM_AMOUNT,
    //   signature: sign,
    //   message: 'Claimed 0.1 SOL successfully!',
    // });

    try {
      await tapshield.recordClaim(claimerPubKey, CLAIM_AMOUNT, COOLDOWN_SECONDS)
    } catch (cooldownErr: any) {
      console.error('Cooldown check failed:', cooldownErr.message);

      if (
        cooldownErr.message?.includes('COOLDOWN_ACTIVE') ||
        cooldownErr.message?.includes('ClaimTooRecent') ||
        cooldownErr.message?.includes('6005')
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cooldown Active! You claimed too recently. Please wait 24 hours between claims.',
          },
          { status: 429 }
        );
      }
      throw cooldownErr;
    }

    const txn = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: faucetKeyPair.publicKey,
        toPubkey: claimerPubKey,
        lamports: CLAIM_AMOUNT
      })
    )

    const sig = await sendAndConfirmTransaction(connection, txn, [faucetKeyPair])

    return NextResponse.json({
      success: true,
      amount: CLAIM_AMOUNT,
      signature: sig,
      message: 'Claimed 2 SOL successfully!',
    });

  } catch (err: any) {
    console.log(err);

    if (
      err.message?.includes('COOLDOWN_ACTIVE') ||
      err.message?.includes('ClaimTooRecent')
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cooldown is still active. You claimed too recently',
        },
        {
          status: 429,
        }
      );
    }

    if (err.message?.includes('UnregisteredFaucet') || err.message?.includes('6002')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Faucet not registered. Please contact administrator.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to process claim',
      },
      {
        status: 500,
      }
    );
  }
}
