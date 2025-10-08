#[cfg(test)]
mod tests {

    use bs58;
    use solana_client::rpc_client::RpcClient;
    use solana_sdk::signature::{Keypair, Signer, read_keypair_file};
    use solana_sdk::{
        instruction::{AccountMeta, Instruction},
        message::Message,
        pubkey::Pubkey,
        transaction::Transaction,
    };
    use solana_system_interface::{instruction::transfer, program as system_program};
    use std::io::{self, BufRead};
    use std::str::FromStr;

    const RPC_URL: &str =
        "https://turbine-solanad-4cde.devnet.rpcpool.com/9a9da9cf-6db1-47dc-839a-55aca5c9c80a";

    #[test]
    fn keygen() {
        let kp = Keypair::new();
        println!("You've generated a new Solana wallet: {}\n", kp.pubkey());
        println!(
            "To save your wallet, copy and paste the following into a
        JSON file:"
        );
        println!("{:?}", kp.to_bytes());
    }

    #[test]
    fn base58_to_wallet() {
        println!("Input your private key as a base58 string:");
        let stdin = io::stdin();
        let base58 = stdin.lock().lines().next().unwrap().unwrap();
        println!("Your wallet file format is: ");
        let wallet = bs58::decode(base58).into_vec().unwrap();
        println!("{:?}", wallet);
    }

    #[test]
    fn wallet_to_base58() {
        println!(
            "Input your private key as a JSON byte array (e.g.
        [12,34,...]):"
        );
        let stdin = io::stdin();
        let wallet = stdin
            .lock()
            .lines()
            .next()
            .unwrap()
            .unwrap()
            .trim_start_matches('[')
            .trim_end_matches(']')
            .split(',')
            .map(|s| s.trim().parse::<u8>().unwrap())
            .collect::<Vec<u8>>();
        println!("Your Base58-encoded private key is:");
        let base58 = bs58::encode(wallet).into_string();
        println!("{:?}", base58);
    }

    #[test]
    fn claim_airdrop() {
        let keypair = read_keypair_file("dev-wallet.json").expect("Couldn't find wallet file");

        let client = RpcClient::new(RPC_URL);

        match client.request_airdrop(&keypair.pubkey(), 2000_000_000u64) {
            Ok(sig) => {
                println!("Success! Check your TX here: ");
                println!("https://explorer.solana.com/tx/{}?cluster=devnet", sig);
            }
            Err(err) => {
                println!("Airdrop failed: {}", err);
            }
        }
    }

    #[test]
    fn transfer_sol() {
        let keypair = read_keypair_file("dev-wallet.json").expect("Couldn't find wallet!");

        let to_pubkey = Pubkey::from_str("9ARoNxwJa2x8KQrcH4Cut2V89cz8nhsMkcegNvUFq9wy").unwrap();

        let rpc_client = RpcClient::new(RPC_URL);

        let recent_blockhash = rpc_client
            .get_latest_blockhash()
            .expect("Failed to get the blockhash");

        let txn = Transaction::new_signed_with_payer(
            &[transfer(&keypair.pubkey(), &to_pubkey, 100_000_000)],
            Some(&keypair.pubkey()),
            &vec![&keypair],
            recent_blockhash,
        );

        let sign = rpc_client
            .send_and_confirm_transaction(&txn)
            .expect("Error in sending the txn");

        println!(
            "Success! Check TX here: https://explorer.solana.com/tx/{}/?cluster=devnet",
            sign
        );
    }

    #[test]
    fn empty_wallet() {
        let keypair = read_keypair_file("dev-wallet.json").expect("Couldn't find wallet file");
        let to_pubkey = Pubkey::from_str("9ARoNxwJa2x8KQrcH4Cut2V89cz8nhsMkcegNvUFq9wy").unwrap();

        let rpc_client = RpcClient::new(RPC_URL);

        let recent_blockhash = rpc_client
            .get_latest_blockhash()
            .expect("Failed to fetch the blockhash");

        let balance = rpc_client
            .get_balance(&keypair.pubkey())
            .expect("Failed to fetch balance");

        let ix1 = &[transfer(&keypair.pubkey(), &to_pubkey, balance)];

        let msg = Message::new_with_blockhash(ix1, Some(&keypair.pubkey()), &recent_blockhash);

        let fee = rpc_client
            .get_fee_for_message(&msg)
            .expect("Failed to fetch the fee");

        let ix2 = &[transfer(&keypair.pubkey(), &to_pubkey, balance - fee)];

        let txn = Transaction::new_signed_with_payer(
            ix2,
            Some(&keypair.pubkey()),
            &vec![&keypair],
            recent_blockhash,
        );

        let sign = rpc_client
            .send_and_confirm_transaction(&txn)
            .expect("Error sending the txn");

        println!(
            "Success! Entire balance transferred: https://explorer.solana.com/tx/{}/?cluster=devnet",
            sign
        );
    }

    #[test]
    fn submit_rust_prereq() {
        let signer = read_keypair_file("turbin3-wallet.json").expect("Couldn't find wallet file");
        let rpc_client = RpcClient::new(RPC_URL);

        let mint = Keypair::new();
        let turbin3_prereq_program =
            Pubkey::from_str("TRBZyQHB3m68FGeVsqTK39Wm4xejadjVhP5MAZaKWDM").unwrap();
        let collection = Pubkey::from_str("5ebsp5RChCGK7ssRZMVMufgVZhd2kFbNaotcZ5UvytN2").unwrap();
        let mpl_core_program =
            Pubkey::from_str("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d").unwrap();
        let system_program = system_program::id();

        let signer_pubkey = signer.pubkey();
        let seeds = &[b"prereqs", signer_pubkey.as_ref()];
        let (prereq_pda, _bump) = Pubkey::find_program_address(seeds, &turbin3_prereq_program);

        let authority_seeds = &[b"collection", collection.as_ref()];
        let (authority, _auth_bump) =
            Pubkey::find_program_address(authority_seeds, &turbin3_prereq_program);

        let data = vec![77, 124, 82, 163, 21, 133, 181, 206];

        let accounts = vec![
            AccountMeta::new(signer.pubkey(), true),
            AccountMeta::new(prereq_pda, false),
            AccountMeta::new(mint.pubkey(), true),
            AccountMeta::new(collection, false),
            AccountMeta::new_readonly(authority, false),
            AccountMeta::new_readonly(mpl_core_program, false),
            AccountMeta::new_readonly(system_program, false),
        ];

        let blockhash = rpc_client
            .get_latest_blockhash()
            .expect("Failed to fetch blockhash");

        let ix = Instruction {
            program_id: turbin3_prereq_program,
            accounts,
            data,
        };

        let tx = Transaction::new_signed_with_payer(
            &[ix],
            Some(&signer.pubkey()),
            &[&signer, &mint],
            blockhash,
        );

        let sign = rpc_client
            .send_and_confirm_transaction(&tx)
            .expect("Error sending txn");

        println!(
            "Success! Check out your TX here:\nhttps://explorer.solana.com/tx/{}/?cluster=devnet",
            sign
        );
    }
}
