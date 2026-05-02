use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct ReputationAccount {
    pub wallet: Pubkey,
    pub nft_mint: Pubkey,
    pub score: u64,
    pub loans_taken: u32,
    pub loans_repaid_on_time: u32,
    pub loans_defaulted: u32,
    pub total_borrowed_usdt: u64,
    pub total_repaid_usdt: u64,
    pub stake: u64,
    pub last_updated: i64,
    pub bump: u8,
}

impl ReputationAccount {
    pub const LEN: usize = 8 + Self::INIT_SPACE;
}
