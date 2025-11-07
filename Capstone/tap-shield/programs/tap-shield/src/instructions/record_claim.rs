use anchor_lang::prelude::*;

use crate::{
    errors::TapShieldErr,
    states::{ClaimRecord, FaucetRegistry},
};

#[derive(Accounts)]
pub struct RecordClaim<'info> {
    #[account(mut)]
    pub operator: Signer<'info>,

    ///CHECK: this is safe
    pub claimer: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [b"faucet", operator.key().as_ref()],
        bump
    )]
    pub faucet_registry: Account<'info, FaucetRegistry>,

    #[account(
        init,
        payer = operator,
        space = ClaimRecord::DISCRIMINATOR.len() + ClaimRecord::INIT_SPACE,
        seeds = [b"claim", claimer.key().as_ref(), faucet_registry.key().as_ref(), &Clock::get()?.unix_timestamp.to_le_bytes()],
        bump
    )]
    pub claim_record: Account<'info, ClaimRecord>,

    pub system_program: Program<'info, System>,
}

impl<'info> RecordClaim<'info> {
    pub fn record_claim(&mut self, claimer_pubkey: Pubkey, amount: u64) -> Result<()> {
        let claim = &mut self.claim_record;
        let faucet_registry = &mut self.faucet_registry;
        let clock = Clock::get()?;

        require!(amount > 0, TapShieldErr::InvalidInput);

        claim.claimer = claimer_pubkey;
        claim.faucet_id = faucet_registry.key();
        claim.amount = amount;
        claim.timestamp = clock.unix_timestamp;

        faucet_registry.total_claims += 1;

        msg!(
            "Claim recorded from: {}, Claimed {} from {}",
            claimer_pubkey,
            amount,
            faucet_registry.name
        );

        Ok(())
    }
}
