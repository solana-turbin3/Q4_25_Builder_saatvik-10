// import bs58 from 'bs58';
// import prompt from 'prompt-sync';

// const input = prompt();

// function base58ToWallet() {
//   console.log('Enter your base58 private key:');
//   const base58 = '';

//   try {
//     const wallet = bs58.decode(base58);
//     console.log('Wallet array format:', Array.from(wallet));
//     return Array.from(wallet);
//   } catch (error) {
//     console.error('Invalid base58 string:', error);
//     return null;
//   }
// }

// function walletToBase58() {
//   const wallet = ;

//   const base58 = bs58.encode(new Uint8Array(wallet));
//   console.log('Base58 format:', base58);
//   return base58;
// }

// console.log('Choose conversion:');
// console.log('1. Base58 to Wallet Array');
// console.log('2. Wallet Array to Base58');

// base58ToWallet();
// walletToBase58();
import bs58 from 'bs58';
import fs from 'fs';

const base58Key = '';

try {
  // Decode base58 string to bytes
  const wallet = bs58.decode(base58Key);

  // Convert to regular array
  const walletArray = Array.from(wallet);

  // Save to wallet.json
  fs.writeFileSync('./wallet.json', JSON.stringify(walletArray));

  console.log('✅ Wallet saved to wallet.json');
  console.log('\nArray format:');
  console.log(JSON.stringify(walletArray));
  console.log('\nLength:', walletArray.length, 'bytes');
} catch (error) {
  console.error('❌ Error:', error);
}
