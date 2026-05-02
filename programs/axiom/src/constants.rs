use anchor_lang::prelude::*;

pub const USDT_DECIMALS: u8 = 6;
pub const BPS_DENOMINATOR: u64 = 10_000;
pub const SECONDS_PER_DAY: i64 = 86_400;
pub const SECONDS_PER_YEAR: u64 = 31_536_000;
pub const USDT_UNIT: u64 = 1_000_000;
pub const AXIOM_CREDIT_MODEL_HASH: [u8; 32] = [
    65, 88, 73, 79, 77, 95, 67, 82, 69, 68, 73, 84, 95, 77, 79, 68, 69, 76, 95, 86, 49, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0,
];

pub const USDT_MINT: Pubkey = pubkey!("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB");
