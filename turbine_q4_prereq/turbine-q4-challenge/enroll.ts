import {
  address,
  appendTransactionMessageInstructions,
  assertIsTransactionWithinSizeLimit,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  devnet,
  getSignatureFromTransaction,
  pipe,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  getProgramDerivedAddress,
  generateKeyPairSigner,
  getAddressEncoder,
} from '@solana/kit';
import {
  getInitializeInstruction,
  getSubmitTsInstruction,
} from './clients/js/src/generated/instructions/index';
import wallet from './wallet.json';

const MPL_CORE_PROGRAM = address(
  'CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d'
);
const PROGRAM_ADDRESS = address('TRBZyQHB3m68FGeVsqTK39Wm4xejadjVhP5MAZaKWDM');
const SYSTEM_PROGRAM = address('11111111111111111111111111111111');
const COLLECTION = address('5ebsp5RChCGK7ssRZMVMufgVZhd2kFbNaotcZ5UvytN2');

const keypair = await createKeyPairSignerFromBytes(new Uint8Array(wallet));
const rpc = createSolanaRpc(devnet('https://api.devnet.solana.com'));
const rpcSubscriptions = createSolanaRpcSubscriptions(
  devnet('wss://api.devnet.solana.com')
);

console.log('Your wallet address:', keypair.address);

const addressEncoder = getAddressEncoder();
const accountSeeds = [
  Buffer.from('prereqs'),
  addressEncoder.encode(keypair.address),
];
const [account, _bump] = await getProgramDerivedAddress({
  programAddress: PROGRAM_ADDRESS,
  seeds: accountSeeds,
});
console.log('Account PDA:', account);

const authoritySeeds = [
  Buffer.from('collection'),
  addressEncoder.encode(COLLECTION),
];
const [authority] = await getProgramDerivedAddress({
  programAddress: PROGRAM_ADDRESS,
  seeds: authoritySeeds,
});

console.log('Authority PDA:', authority);

const mintKeyPair = await generateKeyPairSigner();
console.log('Mint address:', mintKeyPair.address);

// console.log('\n🚀 Executing Initialize transaction...');

// const { value: latestBlockhash1 } = await rpc.getLatestBlockhash().send();

// const initializeIx = getInitializeInstruction({
//   github: 'saatvik-10',
//   user: keypair,
//   account,
//   systemProgram: SYSTEM_PROGRAM,
// });

// const initTransactionMessage = pipe(
//   createTransactionMessage({ version: 0 }),
//   (tx) => setTransactionMessageFeePayerSigner(keypair, tx),
//   (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash1, tx),
//   (tx) => appendTransactionMessageInstructions([initializeIx], tx)
// );

// const signedInitTransaction = await signTransactionMessageWithSigners(
//   initTransactionMessage
// );
// assertIsTransactionWithinSizeLimit(signedInitTransaction);

// const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
//   rpc,
//   rpcSubscriptions,
// });

// try {
//   await sendAndConfirmTransaction(signedInitTransaction, {
//     commitment: 'confirmed',
//   });
//   const initSignature = getSignatureFromTransaction(signedInitTransaction);
//   console.log(
//     `✅ Initialize Success! https://explorer.solana.com/tx/${initSignature}?cluster=devnet`
//   );
// } catch (e) {
//   console.error('❌ Initialize failed:', e);
//   process.exit(1);
// }
const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
  rpc,
  rpcSubscriptions,
});

console.log('\n🚀 Executing SubmitTs transaction...');

const { value: latestBlockhash2 } = await rpc.getLatestBlockhash().send();

const submitIx = getSubmitTsInstruction({
  user: keypair,
  account,
  mint: mintKeyPair,
  collection: COLLECTION,
  authority,
  mplCoreProgram: MPL_CORE_PROGRAM,
  systemProgram: SYSTEM_PROGRAM,
});

const submitTransactionMessage = pipe(
  createTransactionMessage({ version: 0 }),
  (tx) => setTransactionMessageFeePayerSigner(keypair, tx),
  (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash2, tx),
  (tx) => appendTransactionMessageInstructions([submitIx], tx)
);

const signedSubmitTransaction = await signTransactionMessageWithSigners(
  submitTransactionMessage
);
assertIsTransactionWithinSizeLimit(signedSubmitTransaction);

try {
  await sendAndConfirmTransaction(signedSubmitTransaction, {
    commitment: 'confirmed',
  });
  const submitSignature = getSignatureFromTransaction(signedSubmitTransaction);
  console.log(
    `✅ SubmitTs Success! https://explorer.solana.com/tx/${submitSignature}?cluster=devnet`
  );
  console.log(
    `\n🎉 Congratulations! You've completed the Turbin3 prerequisites!`
  );
} catch (e) {
  console.error('❌ SubmitTs failed:', e);
}
