use anchor_lang::prelude::*;

#[error_code]
pub enum AxiomError {
    #[msg("AXIOM protocol error")]
    ProtocolError,
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Arithmetic overflow")]
    MathOverflow,
    #[msg("Insufficient pool liquidity")]
    InsufficientLiquidity,
    #[msg("Vault balance is lower than requested amount")]
    InsufficientVaultBalance,
    #[msg("Token vault does not match the lending pool")]
    InvalidVault,
    #[msg("Only the pool authority can perform this action")]
    Unauthorized,
    #[msg("Loan is not active")]
    InvalidLoanStatus,
}
