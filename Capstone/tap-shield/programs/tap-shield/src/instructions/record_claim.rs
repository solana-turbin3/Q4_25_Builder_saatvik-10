use anchor_lang::prelude::*;

use crate::{
    errors::TapShieldErr,
    states::{ClaimRecord, FaucetRegistry, UserClaimRegistry},
};

#[derive(Accounts)]
#[instruction(claimer_pubkey: Pubkey)]

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
        init_if_needed,
        payer = operator,
        space = UserClaimRegistry::DISCRIMINATOR.len() + UserClaimRegistry::INIT_SPACE,
        seeds = [b"user_registry", claimer_pubkey.as_ref()],
        bump
    )]
    pub user_claim_registry: Account<'info, UserClaimRegistry>,

    // #[account(
    //     mut,
    //     seeds = [b"claim", claimer.key().as_ref(), faucet_registry.key().as_ref(), &faucet_registry.total_claims.saturating_sub(1).to_le_bytes()],
    //     bump
    // )]
    // pub last_claim_record: Option<Account<'info, ClaimRecord>>,

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
        let user_claim_registry = &mut self.user_claim_registry;
        let clock = Clock::get()?;
        let curr_time = clock.unix_timestamp;

        require!(amount > 0, TapShieldErr::InvalidInput);
        require!(cooldown_second > 0, TapShieldErr::InvalidCooldown);
        require!(
            claimer_pubkey == self.claimer.key(),
            TapShieldErr::InvalidClaimer
        );

        // if let Some(last_claim) = &self.last_claim_record {
        if user_claim_registry.user != Pubkey::default() {
            let time_since_last_claim = curr_time
                .checked_sub(user_claim_registry.last_claim_timestamp)
                .ok_or(TapShieldErr::InvalidTimestamp)?;

            require!(
                time_since_last_claim >= cooldown_second,
                TapShieldErr::ClaimTooRecent
            );

            msg!(
                "COOLDOWN HAS BEEN PASSED. {} SECONDS SINCE LAST CLAIM",
                time_since_last_claim
            );
        } else {
            msg!("FIRST TIME CLAIMER ? ELIGIBLE");
        }

        claim.claimer = claimer_pubkey;
        claim.faucet_id = faucet_registry.key();
        claim.amount = amount;
        claim.timestamp = curr_time;

        user_claim_registry.user = claimer_pubkey;
        user_claim_registry.last_claim_timestamp = curr_time;
        user_claim_registry.last_faucet = faucet_registry.key();

        user_claim_registry.total_claims_across_faucets += 1;

        faucet_registry.total_claims += 1;

        msg!(
            "CLAIM RECORD FROM: {}, CLAIMED {} FROM {}",
            claimer_pubkey,
            amount,
            faucet_registry.name
        );

        Ok(())
    }
}
