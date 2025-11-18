import React from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import axios from 'axios';

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
        setStatus(
          `Success! Claimed ${data.amount} lamports, Txn: ${data.signature}`
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

  return <div></div>;
};

export default FaucetPage;
