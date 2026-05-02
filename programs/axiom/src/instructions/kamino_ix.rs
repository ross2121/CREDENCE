use anchor_lang::prelude::*;

use crate::{cpi_kamino_deposit, cpi_kamino_withdraw, AxiomError, LendingPool};

#[derive(Accounts)]
pub struct RebalanceKamino<'info> {
    pub authority: Signer<'info>,
    #[account(
        mut,
        has_one = authority @ AxiomError::Unauthorized,
        has_one = kamino_vault @ AxiomError::InvalidVault,
        seeds = [b"lending_pool", lending_pool.usdt_vault.as_ref()],
        bump = lending_pool.bump
    )]
    pub lending_pool: Account<'info, LendingPool>,
    /// CHECK: Stored Kamino position/vault identifier for demo CPI stubs.
    pub kamino_vault: UncheckedAccount<'info>,
    /// CHECK: Stubbed until real Kamino CPI accounts are wired.
    pub kamino_program: UncheckedAccount<'info>,
}

pub fn handle_rebalance_to_kamino(ctx: Context<RebalanceKamino>, amount: u64) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    ctx.accounts.lending_pool.rebalance_to_kamino(amount, now)?;
    cpi_kamino_deposit(ctx.accounts.kamino_program.to_account_info(), amount)
}

pub fn handle_rebalance_from_kamino(ctx: Context<RebalanceKamino>, amount: u64) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    ctx.accounts
        .lending_pool
        .rebalance_from_kamino(amount, now)?;
    cpi_kamino_withdraw(ctx.accounts.kamino_program.to_account_info(), amount)
}
