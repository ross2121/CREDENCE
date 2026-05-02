# AXIOM — Solana Program Design

## Program Overview

AXIOM consists of one core Anchor program with multiple instruction namespaces, plus integrations with Kamino, Ika, and Torque as CPIs.

```
axiom_protocol/
├── programs/
│   └── axiom/
│       ├── src/
│       │   ├── lib.rs
│       │   ├── instructions/
│       │   │   ├── lending_pool.rs     (deposit, withdraw, disburse)
│       │   │   ├── credit_registry.rs  (register ZK proof, tiers)
│       │   │   ├── stream_repay.rs     (streaming repayments)
│       │   │   ├── reputation.rs       (mint/slash NFT scores)
│       │   │   ├── dispute.rs          (arbitration logic)
│       │   │   └── ika_policy.rs       (policy definition)
│       │   ├── state/
│       │   │   ├── lending_pool.rs
│       │   │   ├── loan.rs
│       │   │   ├── credit_proof.rs
│       │   │   └── reputation.rs
│       │   └── errors.rs
```

---

## Account Structures

### LendingPool
```rust
#[account]
pub struct LendingPool {
    pub authority: Pubkey,          // protocol multisig
    pub usdt_vault: Pubkey,         // USDT token account
    pub kamino_vault: Pubkey,       // Kamino position
    pub total_deposits: u64,        // total USDT deposited
    pub total_borrowed: u64,        // total USDT in active loans
    pub utilization_rate: u64,      // bps: borrowed/total
    pub base_interest_rate: u64,    // bps per year
    pub kamino_allocation: u64,     // bps: how much is in Kamino
    pub last_rebalance: i64,        // unix timestamp
    pub bump: u8,
}
```

### Loan
```rust
#[account]
pub struct Loan {
    pub borrower: Pubkey,
    pub principal: u64,             // USDT borrowed
    pub interest_rate: u64,         // bps per year (from credit tier)
    pub collateral_mint: Pubkey,    // collateral token
    pub collateral_amount: u64,
    pub ika_dwallet: Pubkey,        // borrower's dWallet address
    pub credit_tier: CreditTier,    // Bronze/Silver/Gold/Platinum
    pub start_time: i64,
    pub due_time: i64,
    pub amount_repaid: u64,
    pub last_repay_time: i64,
    pub stream_rate: u64,           // USDT lamports per second
    pub status: LoanStatus,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum LoanStatus {
    Active,
    Repaid,
    Defaulted,
    Liquidated,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum CreditTier {
    Bronze,   // score 400-599
    Silver,   // score 600-749
    Gold,     // score 750-899
    Platinum, // score 900-1000
}
```

### CreditProof
```rust
#[account]
pub struct CreditProof {
    pub wallet: Pubkey,
    pub tier: CreditTier,
    pub zk_proof_hash: [u8; 32],    // hash of ZK proof
    pub issued_at: i64,
    pub expires_at: i64,            // proofs valid for 30 days
    pub max_loan_usdt: u64,
    pub bump: u8,
}
```

### ReputationNFT
```rust
#[account]
pub struct ReputationAccount {
    pub wallet: Pubkey,
    pub nft_mint: Pubkey,           // Metaplex NFT
    pub score: u64,                 // 0-1000, on-chain
    pub loans_taken: u32,
    pub loans_repaid_on_time: u32,
    pub loans_defaulted: u32,
    pub total_borrowed_usdt: u64,
    pub total_repaid_usdt: u64,
    pub stake: u64,                 // USDT staked as reputation bond
    pub last_updated: i64,
    pub bump: u8,
}
```

---

## Instructions

### Lending Pool Instructions

```rust
// Lender deposits USDT
pub fn deposit_liquidity(ctx: Context<DepositLiquidity>, amount: u64) -> Result<()>

// Lender withdraws (must respect utilization — can't withdraw lent USDT)
pub fn withdraw_liquidity(ctx: Context<WithdrawLiquidity>, amount: u64) -> Result<()>

// QVAC yield agent rebalances pool ↔ Kamino
pub fn rebalance_to_kamino(ctx: Context<RebalanceKamino>, amount: u64) -> Result<()>
pub fn rebalance_from_kamino(ctx: Context<RebalanceKamino>, amount: u64) -> Result<()>

// Disburse approved loan
pub fn disburse_loan(ctx: Context<DisburseLoan>, loan_id: Pubkey) -> Result<()>
```

### Credit Registry Instructions

```rust
// Borrower submits ZK proof to unlock credit tier
pub fn register_credit_proof(
    ctx: Context<RegisterCreditProof>,
    tier: CreditTier,
    max_loan: u64,
    zk_proof: Vec<u8>,     // verified on-chain
    expiry: i64,
) -> Result<()>

// Protocol verifies proof on-chain (calls ZK verifier program)
pub fn verify_credit_proof(ctx: Context<VerifyCreditProof>) -> Result<()>

// Request a loan (requires valid credit proof)
pub fn request_loan(
    ctx: Context<RequestLoan>,
    amount: u64,
    duration_days: u64,
    collateral_amount: u64,
    ika_dwallet: Pubkey,
) -> Result<()>
```

### Stream Repay Instructions

```rust
// Initialize repayment stream
pub fn init_repayment_stream(ctx: Context<InitRepayStream>) -> Result<()>

// Borrower tops up the stream buffer (called by QVAC agent)
pub fn fund_repayment_stream(ctx: Context<FundStream>, amount: u64) -> Result<()>

// Claim accrued repayments (called by lender or settlement)
pub fn claim_repayments(ctx: Context<ClaimRepayments>) -> Result<()>

// Close stream when fully repaid
pub fn close_repayment_stream(ctx: Context<CloseStream>) -> Result<()>
```

### Reputation Instructions

```rust
// Mint reputation NFT for new borrower (first loan)
pub fn mint_reputation_nft(ctx: Context<MintReputation>) -> Result<()>

// Update score after successful repayment (+50 points)
pub fn update_reputation_success(ctx: Context<UpdateReputation>) -> Result<()>

// Slash score after default (-150 points) + slash staked USDT
pub fn slash_reputation(ctx: Context<SlashReputation>) -> Result<()>

// Stake USDT as reputation bond (boosts credit tier)
pub fn stake_reputation_bond(ctx: Context<StakeBond>, amount: u64) -> Result<()>
```

### Dispute Instructions

```rust
// Open dispute (borrower or lender)
pub fn open_dispute(
    ctx: Context<OpenDispute>,
    loan_id: Pubkey,
    evidence_hash: [u8; 32],
) -> Result<()>

// Register as arbitrator (must stake 1000 USDT)
pub fn register_arbitrator(ctx: Context<RegisterArbitrator>) -> Result<()>

// Submit arbitration vote
pub fn submit_arbitration_vote(
    ctx: Context<ArbitrationVote>,
    dispute_id: Pubkey,
    ruling: DisputeRuling,
) -> Result<()>

// Finalize dispute (after 3/5 arbitrators vote)
pub fn finalize_dispute(ctx: Context<FinalizeDispute>, dispute_id: Pubkey) -> Result<()>
```

---

## CPI Integrations

### Kamino CPI
```rust
// Cross-Program Invocation to Kamino lending vaults
pub fn cpi_kamino_deposit(
    ctx: Context<KaminoCPI>,
    amount: u64,
) -> Result<()> {
    let cpi_accounts = kamino::cpi::accounts::DepositReserveLiquidity {
        lending_market: ctx.accounts.kamino_market.to_account_info(),
        reserve: ctx.accounts.kamino_reserve.to_account_info(),
        // ...
    };
    kamino::cpi::deposit_reserve_liquidity(
        CpiContext::new(ctx.accounts.kamino_program.to_account_info(), cpi_accounts),
        amount,
    )
}
```

### Ika Policy Verification CPI
```rust
// Before executing any agent-initiated instruction, verify Ika policy
pub fn verify_ika_policy(
    ctx: Context<IkaVerify>,
    dwallet: Pubkey,
    destination: Pubkey,
    amount: u64,
) -> Result<()> {
    // CPI to Ika verifier program
    // Returns error if destination is not in dWallet policy
    ika::cpi::verify_policy(
        CpiContext::new(ctx.accounts.ika_program.to_account_info(), ...),
        dwallet,
        destination,
        amount,
    )
}
```

---

## ZK Proof Verification

AXIOM uses a Groth16 ZK proof to verify credit score tier without revealing the score:

```rust
// ZK circuit statement:
// "I know a credit_score such that:
//   1. credit_score > threshold_for_tier
//   2. credit_score was computed from on-chain data by the QVAC model
//   3. The on-chain data corresponds to wallet W"
//
// Verifier checks the proof without learning the score.

pub fn verify_zk_credit_proof(
    ctx: Context<VerifyZKProof>,
    proof: Groth16Proof,
    public_inputs: Vec<[u8; 32]>,  // [tier_threshold, wallet_hash, model_hash]
) -> Result<()> {
    let vk = load_verification_key(ctx.accounts.tier.into())?;
    
    require!(
        verify_groth16(proof, vk, public_inputs),
        AxiomError::InvalidCreditProof
    );
    
    Ok(())
}
```

---

## Error Codes

```rust
#[error_code]
pub enum AxiomError {
    #[msg("Credit proof has expired — must re-score with QVAC agent")]
    CreditProofExpired,
    
    #[msg("Loan amount exceeds tier maximum")]
    LoanExceedsTierLimit,
    
    #[msg("Insufficient collateral for this credit tier")]
    InsufficientCollateral,
    
    #[msg("Pool utilization too high — insufficient liquidity")]
    InsufficientLiquidity,
    
    #[msg("Invalid ZK proof")]
    InvalidCreditProof,
    
    #[msg("Ika policy violation — destination not authorized")]
    IkaPolicyViolation,
    
    #[msg("Repayment stream underfunded — top up required")]
    StreamUnderfunded,
    
    #[msg("Collateral below liquidation threshold")]
    LiquidationThresholdBreached,
    
    #[msg("Reputation score too low for requested tier")]
    ReputationTooLow,
}
```
