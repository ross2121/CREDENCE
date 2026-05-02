pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use error::*;
pub use instructions::*;
pub use state::*;

declare_id!("HWZyoS2jthQHXuV9EDYfUz9iZBS6dbmWQyPKw1HB4dLb");

#[program]
pub mod axiom {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize::handler(ctx)
    }

    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        base_interest_rate: u64,
        kamino_vault: Pubkey,
    ) -> Result<()> {
        instructions::lending_pool_ix::handle_initialize_pool(ctx, base_interest_rate, kamino_vault)
    }

    pub fn deposit_liquidity(ctx: Context<DepositLiquidity>, amount: u64) -> Result<()> {
        instructions::lending_pool_ix::handle_deposit_liquidity(ctx, amount)
    }

    pub fn withdraw_liquidity(ctx: Context<WithdrawLiquidity>, amount: u64) -> Result<()> {
        instructions::lending_pool_ix::handle_withdraw_liquidity(ctx, amount)
    }

    pub fn disburse_loan(ctx: Context<DisburseLoan>) -> Result<()> {
        instructions::lending_pool_ix::handle_disburse_loan(ctx)
    }
}
