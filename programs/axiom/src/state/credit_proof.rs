use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, Eq, InitSpace, PartialEq)]
pub enum CreditTier {
    Bronze,
    Silver,
    Gold,
    Platinum,
}

#[account]
#[derive(InitSpace)]
pub struct CreditProof {
    pub wallet: Pubkey,
    pub tier: CreditTier,
    pub zk_proof_hash: [u8; 32],
    pub issued_at: i64,
    pub expires_at: i64,
    pub max_loan_usdt: u64,
    pub bump: u8,
}

impl CreditProof {
    pub const LEN: usize = 8 + Self::INIT_SPACE;
}
