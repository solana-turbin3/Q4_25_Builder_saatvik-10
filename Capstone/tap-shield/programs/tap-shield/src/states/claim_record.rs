use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct ClaimRecord {
    pub claimer: Pubkey,
    pub faucet_id: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}
