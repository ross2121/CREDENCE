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
    #[msg("Nothing is available to claim")]
    NothingToClaim,
    #[msg("Repayment stream is already fully repaid")]
    StreamAlreadyRepaid,
    #[msg("Repayment stream is not fully repaid")]
    StreamNotRepaid,
    #[msg("Ika policy violation; destination not authorized")]
    IkaPolicyViolation,
    #[msg("Ika policy violation; amount exceeds maximum")]
    IkaAmountExceeded,
    #[msg("Invalid Ika policy configuration")]
    InvalidIkaPolicy,
    #[msg("Invalid Kamino rebalance amount")]
    InvalidKaminoRebalance,
    #[msg("Kamino allocation would exceed pool deposits")]
    KaminoAllocationExceeded,
    #[msg("Collateral is above liquidation threshold")]
    CollateralSafe,
    #[msg("Collateral below liquidation threshold")]
    LiquidationThresholdBreached,
    #[msg("Liquidation grace period is still active")]
    GracePeriodActive,
    #[msg("Liquidation warning has not been issued")]
    LiquidationNotWarned,
    #[msg("Arbitrator stake is below requirement")]
    InsufficientArbitratorStake,
    #[msg("Arbitrator has already voted on this dispute")]
    DuplicateArbitrationVote,
    #[msg("Dispute voting capacity reached")]
    DisputeVoteCapacityReached,
    #[msg("Dispute does not have enough votes to finalize")]
    DisputeQuorumNotReached,
    #[msg("Dispute is not open")]
    DisputeNotOpen,
    #[msg("Repayment stream underfunded; top up required")]
    StreamUnderfunded,
    #[msg("Reputation score too low for requested tier")]
    ReputationTooLow,
    #[msg("Invalid loan account")]
    InvalidLoanAccount,
    #[msg("Lender position does not have enough withdrawable principal")]
    InsufficientLenderPosition,
    #[msg("Production verifier is not wired; rebuild with a real verifier integration")]
    ProductionVerifierUnavailable,
    #[msg("Production CPI integration is not wired; rebuild with the real protocol CPI")]
    ProductionCpiUnavailable,
}
