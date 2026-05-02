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
    #[msg("Credit proof has expired; must re-score with QVAC agent")]
    CreditProofExpired,
    #[msg("Loan amount exceeds tier maximum")]
    LoanExceedsTierLimit,
    #[msg("Insufficient collateral for this credit tier")]
    InsufficientCollateral,
    #[msg("Credit proof does not belong to this borrower")]
    InvalidCreditProofOwner,
    #[msg("Loan duration must be greater than zero")]
    InvalidLoanDuration,
    #[msg("Invalid credit ZK proof")]
    InvalidCreditProof,
    #[msg("Invalid ZK public inputs")]
    InvalidPublicInputs,
}
