use anchor_lang::prelude::*;

#[error_code]
pub enum TapShieldErr {
    #[msg("Unauthorized Signer")]
    UnauthorizedSigner,

    #[msg("Unauthorized Faucet")]
    UnauthorizedFaucet,

    #[msg("Unregistered Faucet")]
    UnregisteredFaucet,

    #[msg("Claim already exists")]
    ClaimAlreadyExists,

    #[msg("Faucet Already Exists")]
    FaucetAlreadyExists,

    #[msg("Claim too recent")]
    ClaimTooRecent,

    #[msg("Invalid Claimer")]
    InvalidClaimer,

    #[msg("Invalied Timestamp")]
    InvaliedTimestamp,

    #[msg("Invalid Cooldown")]
    InvalidCooldown,

    #[msg("Faucet name exceed 32 characters")]
    FaucetNameTooLong,
}
