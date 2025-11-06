use anchor_lang::prelude::*;

use crate::{errors::TapShieldErr, instructions::{faucet_registry, initialize_faucet}, states::FaucetRegistry};

#[derive(Accounts)]
pub struct InitializeFaucet<'info> {
    #[account(mut)]
    pub operator: Signer<'info>,

    #[account(
        init,
        payer = operator,
        space = FaucetRegistry::DISCRIMINATOR.len() + FaucetRegistry::INIT_SPACE,
        seeds = [b"faucet", operator.key().as_ref()],
        bump
    )]
    pub faucet_registry: Account<'info, FaucetRegistry>,

    pub system_program: Program<'info, System>,
}

impl<'info> InitializeFaucet<'info> {
    pub fn initialize_faucet(&mut self, name: String) -> Result<()> {
        require!(name.len() <= 32, TapShieldErr::FaucetNameTooLong);

        // let faucet_registry = self.faucet_registry.to_account_info();
        // let clock = Clock::get()?;

        // faucet_registry.operator

        // self.faucet_registry.set_inner(FaucetRegistry { operator: *self.operator.key, name, total_claims, created_at: () });

        Ok(())
    }
}
