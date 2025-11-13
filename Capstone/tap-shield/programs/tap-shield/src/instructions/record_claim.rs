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
        bump,
        constraint = faucet_registry.operator == operator.key() @ TapShieldErr::UnauthorizedFaucet
    )]
    pub faucet_registry: Account<'info, FaucetRegistry>,

    #[account(
        init,
        payer = operator,
        space = ClaimRecord::DISCRIMINATOR.len() + ClaimRecord::INIT_SPACE,
        seeds = [b"claim", claimer.key().as_ref(), faucet_registry.key().as_ref(), &faucet_registry.total_claims.to_le_bytes()],
        bump
    )]
    pub claim_record: Account<'info, ClaimRecord>,

    #[account(
        mut,
        seeds = [b"claim", claimer.key().as_ref(), faucet_registry.key().as_ref(), &faucet_registry.total_claims.saturating_sub(1).to_le_bytes()],
        bump
    )]
    pub last_claim_record: Option<Account<'info, ClaimRecord>>,

    pub system_program: Program<'info, System>,
}

impl<'info> RecordClaim<'info> {
    pub fn record_claim(
        &mut self,
        claimer_pubkey: Pubkey,
        amount: u64,
        cooldown_second: i64,
    ) -> Result<()> {
        let claim = &mut self.claim_record;
        let faucet_registry = &mut self.faucet_registry;
        let clock = Clock::get()?;
        let curr_time = clock.unix_timestamp;

        require!(amount > 0, TapShieldErr::InvalidInput);
        require!(cooldown_second > 0, TapShieldErr::InvalidCooldown);
        require!(
            claimer_pubkey == self.claimer.key(),
            TapShieldErr::InvalidClaimer
        );

        if let Some(last_claim) = &self.last_claim_record {
            let time_since_last_claim = curr_time - last_claim.timestamp;

            require!(
                time_since_last_claim >= cooldown_second,
                TapShieldErr::ClaimTooRecent
            );

            msg!(
                "Cooldown has been passed. {} seconds since last claim",
                time_since_last_claim
            );
        } else {
            msg!("First time claimer ? ELIGIBLE");
        }

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
