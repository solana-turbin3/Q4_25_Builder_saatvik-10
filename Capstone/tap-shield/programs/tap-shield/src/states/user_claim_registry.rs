use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct UserClaimRegistry {
    pub user: Pubkey,
    pub last_claim_timestamp: i64,
    pub last_faucet: Pubkey,
    pub total_claims_across_faucets: u64,
    pub bump: u8,
}
