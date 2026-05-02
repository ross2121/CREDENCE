pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;
pub mod zk;

use anchor_lang::prelude::*;

pub use constants::*;
pub use error::*;
pub use instructions::*;
pub use state::*;
pub use zk::*;

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

    pub fn register_credit_proof(
        ctx: Context<RegisterCreditProof>,
        tier: CreditTier,
        max_loan: u64,
        zk_proof: Vec<u8>,
        expiry: i64,
    ) -> Result<()> {
        instructions::credit_registry_ix::handle_register_credit_proof(
            ctx, tier, max_loan, zk_proof, expiry,
        )
    }

    pub fn request_loan(
        ctx: Context<RequestLoan>,
        amount: u64,
        duration_days: u64,
        collateral_amount: u64,
        ika_dwallet: Pubkey,
    ) -> Result<()> {
        instructions::credit_registry_ix::handle_request_loan(
            ctx,
            amount,
            duration_days,
            collateral_amount,
            ika_dwallet,
        )
    }
}
