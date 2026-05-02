use anchor_lang::prelude::*;

use crate::CreditTier;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, Eq, InitSpace, PartialEq)]
pub enum LoanStatus {
    Active,
    Repaid,
    Defaulted,
    Liquidated,
}

#[account]
#[derive(InitSpace)]
pub struct Loan {
    pub borrower: Pubkey,
    pub principal: u64,
    pub interest_rate: u64,
    pub collateral_mint: Pubkey,
    pub collateral_amount: u64,
    pub ika_dwallet: Pubkey,
    pub credit_tier: CreditTier,
    pub start_time: i64,
    pub due_time: i64,
    pub amount_repaid: u64,
    pub last_repay_time: i64,
    pub stream_rate: u64,
    pub status: LoanStatus,
    pub bump: u8,
}

impl Loan {
    pub const LEN: usize = 8 + Self::INIT_SPACE;
}
