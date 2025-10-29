use anchor_lang::prelude::*;
use mpl_core::{
    instructions::{RemovePluginV1CpiBuilder, UpdatePluginV1CpiBuilder},
    types::{FreezeDelegate, Plugin, PluginType},
    ID as CORE_PROGRAM_ID,
};

use crate::{
    errors::StakeError,
    state::{StakeAccount, StakeConfig, UserAccount},
};

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    ///CHECK: NFT
    pub asset: UncheckedAccount<'info>,

    #[account(
        mut,
        constraint = collection.owner == &CORE_PROGRAM_ID @ StakeError::InvalidCollection,
        constraint = !collection.data_is_empty() @ StakeError::CollectionNotInitialized
    )]
    ///CHECK: Collection the NFT belongs to
    pub collection: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [b"user".as_ref(), user.key().as_ref()],
        bump = user_account.bump,   
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(
        mut,
        close = user,
        seeds = [b"stake".as_ref(), config.key().as_ref(), asset.key().as_ref()],
        bump = stake_account.bump,
        // constraint = stake_account.owner == user.key() @ StakeError::NotOwner
    )]
    pub stake_account: Account<'info, StakeAccount>,

    #[account(
        mut,
        seeds = [b"config".as_ref()],
        bump = config.bump
    )]
    pub config: Account<'info, StakeConfig>,

    #[account(address = CORE_PROGRAM_ID)]
    ///CHECK: Only address required for verification
    pub core_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> Unstake<'info> {
    pub fn unstake(&mut self) -> Result<()> {
        require_keys_eq!(self.stake_account.owner, self.user.key(), StakeError::NotOwner);

        let curr_time = Clock::get()?.unix_timestamp;
        let staked_at = self.stake_account.staked_at;
        let time_elapsed = curr_time - staked_at; //seconds here

        require!(
            time_elapsed >= self.config.freeze_period as i64,
            StakeError::FreezePeriodNotPassed
        );

        let points_earned = (time_elapsed as u32) * (self.config.points_per_stake as u32);

        self.user_account.points += points_earned;

        let signer_seeds: &[&[&[u8]]] = &[&[
            b"stake",
            &self.config.key().to_bytes(),
            &self.asset.key.to_bytes(),
            &[self.stake_account.bump]
        ]];

        UpdatePluginV1CpiBuilder::new(&self.core_program.to_account_info())
            .asset(&self.asset.to_account_info())
            .collection(Some(&self.collection.to_account_info()))
            .payer(&self.user.to_account_info())
            .authority(Some(&self.stake_account.to_account_info()))
            .system_program(&self.system_program.to_account_info())
            .plugin(Plugin::FreezeDelegate(FreezeDelegate { frozen: false }))
            .invoke_signed(signer_seeds)?;

        RemovePluginV1CpiBuilder::new(&self.core_program.to_account_info())
            .asset(&self.asset.to_account_info())
            .collection(Some(&self.collection.to_account_info()))
            .payer(&self.user.to_account_info())
            .authority(None)
            .system_program(&self.system_program.to_account_info())
            .plugin_type(PluginType::FreezeDelegate)
            .invoke()?;

        self.user_account.amount_staked -= 1;

        Ok(())
    }
}
