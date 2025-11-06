use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod states;

declare_id!("BnCc1CZRBNnc2yn1fy2sPvAaZz7QrDcZpvLqyA6MgSwB");

#[program]
pub mod tap_shield {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
