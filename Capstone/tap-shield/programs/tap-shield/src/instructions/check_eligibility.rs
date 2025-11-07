use anchor_lang::prelude::*;

use crate::errors::TapShieldErr;

#[derive(Accounts)]
pub struct CheckEligibility<'info> {
    ///CHECK: this is safe
    pub claimer: UncheckedAccount<'info>,

    pub clock: Sysvar<'info, Clock>,
}

impl<'info> CheckEligibility<'info> {
    pub fn check_eligibility(&mut self, cooldown_second: i64) -> Result<bool> {
        require!(cooldown_second > 0, TapShieldErr::ClaimTooRecent);

        Ok(true)
    }
}
