use anchor_lang::prelude::*;

use crate::{CreditTier, DisputeRuling, IkaPolicyKind};

#[event]
pub struct LiquidityDeposited {
    pub pool: Pubkey,
    pub lender: Pubkey,
    pub amount: u64,
}

#[event]
pub struct LiquidityWithdrawn {
    pub pool: Pubkey,
    pub authority: Pubkey,
    pub amount: u64,
}

#[event]
pub struct LoanDisbursed {
    pub loan: Pubkey,
    pub borrower: Pubkey,
    pub amount: u64,
}

#[event]
pub struct CreditProofRegistered {
    pub wallet: Pubkey,
    pub tier: CreditTier,
    pub max_loan_usdt: u64,
    pub expires_at: i64,
}

#[event]
pub struct LoanRequested {
    pub loan: Pubkey,
    pub borrower: Pubkey,
    pub amount: u64,
    pub tier: CreditTier,
    pub due_time: i64,
}

#[event]
pub struct RepaymentClaimed {
    pub loan: Pubkey,
    pub claimant: Pubkey,
    pub amount: u64,
}

#[event]
pub struct KaminoRebalanced {
    pub pool: Pubkey,
    pub to_kamino: bool,
    pub amount: u64,
    pub kamino_allocation_bps: u64,
}

#[event]
pub struct IkaPolicyVerified {
    pub policy: Pubkey,
    pub dwallet: Pubkey,
    pub destination: Pubkey,
    pub amount: u64,
    pub kind: IkaPolicyKind,
}

#[event]
pub struct DisputeOpened {
    pub dispute: Pubkey,
    pub loan: Pubkey,
    pub opener: Pubkey,
    pub evidence_hash: [u8; 32],
}

#[event]
pub struct ArbitrationVoteSubmitted {
    pub dispute: Pubkey,
    pub arbitrator: Pubkey,
    pub ruling: DisputeRuling,
    pub vote_count: u8,
}

#[event]
pub struct DisputeFinalized {
    pub dispute: Pubkey,
    pub ruling: DisputeRuling,
    pub borrower_votes: u8,
    pub lender_votes: u8,
}
