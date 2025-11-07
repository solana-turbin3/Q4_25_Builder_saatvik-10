use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod states;

declare_id!("BnCc1CZRBNnc2yn1fy2sPvAaZz7QrDcZpvLqyA6MgSwB");

#[program]
pub mod tap_shield {
    use super::*;

    pub fn initialize_faucet(ctx: Context<InitializeFaucet>, name: String) -> Result<()> {
        ctx.accounts.initialize_faucet(name)
    }

    pub fn record_claim(ctx: Context<RecordClaim>, claimer_pubkey: Pubkey, amount: u64) -> Result<()> {
        ctx.accounts.record_claim(claimer_pubkey, amount)
    }

    pub fn check_eligibility(ctx: Context<CheckEligibility>) -> Result<()> {
        ctx.accounts.initialize_faucet(name)
    }
}
