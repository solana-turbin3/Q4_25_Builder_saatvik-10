use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod states;

use crate::instructions::*;

declare_id!("7tR74HdzD8y5LuSaRXBn3bm11d9EdXdsoEiqkifJ2xW9");

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
    ) -> Result<()> {
        ctx.accounts.record_claim(claimer_pubkey, amount)
    }

    pub fn check_eligibility(
        ctx: Context<CheckEligibility>,
        cooldown_seconds: i64,
    ) -> Result<bool> {
        ctx.accounts.check_eligibility(cooldown_seconds)
    }
}
