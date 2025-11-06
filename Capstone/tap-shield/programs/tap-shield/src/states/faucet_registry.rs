use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct FaucetRegistry {
    pub operator: Pubkey,
    #[max_len(32)]
    pub name: String,
    pub total_claims: u64,
    pub created_at: i64,
}
