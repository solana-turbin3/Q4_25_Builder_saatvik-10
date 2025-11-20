'use client';

import React from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import axios from 'axios';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

const FaucetPage = () => {
  const { publicKey } = useWallet();
  const [status, setStatus] = React.useState<string>('');
  const [loading, setLoading] = React.useState<boolean>(false);

  const handleSolClaim = async () => {
    if (!publicKey) {
      setStatus('Please connect ur wallet first!');
      return;
    }

    setLoading(true);
    setStatus('Processing your claim...');

    try {
      const res = await axios.post(
        '/api/claim',
        {
          wallet: publicKey?.toString(),
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = res.data;

      if (data.success) {
        const explorerUrl = `https://explorer.solana.com/tx/${data.signature}?cluster=devnet`;
        setStatus(
          `Success! Claimed ${data.amount / LAMPORTS_PER_SOL} SOL. \n<a href="${explorerUrl}" target="_blank" rel="noopener noreferrer" class="underline hover:text-blue-300">View Transaction</a>`
        );
      } else {
        setStatus(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setStatus(
        `Failed: ${err.response?.data?.error || err.message || 'Unknown Error'}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex flex-col items-center justify-center p-4 '>
      <div className='max-w-md w-full bg-white backdrop-blur-lg rounded-2xl p-8 shadow-2xl'>
        <h1 className='text-4xl font-bold text-black mb-2 text-center'>
          TapShield Faucet
        </h1>
        <p className='text-gray-700 text-center mb-8'>
          Claim devnet SOL tokens
        </p>

        <div className='mb-6 flex items-center justify-center'>
          <WalletMultiButton className='w-full bg-linear-to-r! from-purple-500! to-pink-500! hover:from-purple-600! hover:to-pink-600!' />
        </div>

        <button
          onClick={handleSolClaim}
          disabled={!publicKey || loading}
          className='w-full bg-linear-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 disabled:scale-100 shadow-lg'
        >
          {loading ? '⏳ Processing...' : 'Claim 0.1 SOL'}
        </button>

        {status && (
          <div
            className={`mt-6 p-4 rounded-lg text-center ${
              status.includes('Success')
                ? 'bg-green-500/50'
                : status.includes('Error') || status.includes('Failed')
                  ? 'bg-red-500/50'
                  : 'bg-blue-500/50'
            }`}
          >
            <p className='text-sm wrap-break-words text-white'>{status}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FaucetPage;
