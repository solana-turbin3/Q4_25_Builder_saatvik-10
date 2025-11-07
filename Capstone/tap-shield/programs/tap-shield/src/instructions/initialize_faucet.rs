use anchor_lang::prelude::*;

use crate::{errors::TapShieldErr, states::FaucetRegistry};

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
        require!(!name.is_empty(), TapShieldErr::InvalidInput);

        let faucet_registry = &mut self.faucet_registry;
        let clock = Clock::get()?;

        faucet_registry.operator = self.operator.key();
        faucet_registry.name = name.clone();
        faucet_registry.total_claims = 0;
        faucet_registry.created_at = clock.unix_timestamp;

        msg!(
            "FAUCET: {} REGISTERED SUCCESSFULLY BY {} !",
            name,
            self.operator.key()
        );

        Ok(())
    }
}
