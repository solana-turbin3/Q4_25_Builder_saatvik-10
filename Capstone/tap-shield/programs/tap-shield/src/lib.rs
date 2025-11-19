use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod states;

use crate::instructions::*;

declare_id!("EY3vvz2h9otDW1icM9tZefmaE6WCkGbNbif8wTC1TR4X");

#[program]
pub mod tap_shield {
    use super::*;

    pub fn initialize_faucet(ctx: Context<InitializeFaucet>, name: String) -> Result<()> {
        ctx.accounts.initialize_faucet(name)
    }

    pub fn record_claim(
        ctx: Context<RecordClaim>,
        claimer_pubkey: Pubkey,
        amount: u64,
        cooldown_seconds: i64,
    ) -> Result<()> {
        ctx.accounts
            .record_claim(claimer_pubkey, amount, cooldown_seconds)
    }
}
