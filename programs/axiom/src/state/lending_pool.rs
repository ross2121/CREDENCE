use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct LendingPool {
    pub authority: Pubkey,
    pub usdt_vault: Pubkey,
    pub kamino_vault: Pubkey,
    pub total_deposits: u64,
    pub total_borrowed: u64,
    pub utilization_rate: u64,
    pub base_interest_rate: u64,
    pub kamino_allocation: u64,
    pub last_rebalance: i64,
    pub bump: u8,
}

impl LendingPool {
    pub const LEN: usize = 8 + Self::INIT_SPACE;
}
