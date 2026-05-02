use anchor_lang::prelude::*;

use crate::{
    AxiomError, CollateralValuation, LendingPool, LiquidationState, Loan, ReputationAccount,
};

#[event]
pub struct LiquidationWarning {
    pub loan: Pubkey,
    pub borrower: Pubkey,
    pub collateral_value_usdt: u64,
    pub liquidation_threshold_usdt: u64,
    pub grace_period_ends_at: i64,
}

#[derive(Accounts)]
pub struct IssueLiquidationWarning<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    pub loan: Account<'info, Loan>,
    #[account(
        init,
        payer = authority,
        space = LiquidationState::LEN,
        seeds = [b"liquidation", loan.key().as_ref()],
        bump
    )]
    pub liquidation_state: Account<'info, LiquidationState>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteLiquidation<'info> {
    pub authority: Signer<'info>,
    #[account(mut)]
    pub loan: Account<'info, Loan>,
    #[account(
        mut,
        seeds = [b"liquidation", loan.key().as_ref()],
        bump = liquidation_state.bump
    )]
    pub liquidation_state: Account<'info, LiquidationState>,
    #[account(mut)]
    pub lending_pool: Account<'info, LendingPool>,
    #[account(
        mut,
        seeds = [b"reputation", loan.borrower.as_ref()],
        bump = reputation.bump
    )]
    pub reputation: Account<'info, ReputationAccount>,
}

pub fn handle_issue_liquidation_warning(
    ctx: Context<IssueLiquidationWarning>,
    collateral_value_usdt: u64,
    loan_value_usdt: u64,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let valuation = CollateralValuation {
        collateral_value_usdt,
        loan_value_usdt,
    };

    ctx.accounts.liquidation_state.initialize_warning(
        ctx.accounts.loan.key(),
        valuation,
        now,
        ctx.bumps.liquidation_state,
    )?;

    emit!(LiquidationWarning {
        loan: ctx.accounts.loan.key(),
        borrower: ctx.accounts.loan.borrower,
        collateral_value_usdt,
        liquidation_threshold_usdt: ctx.accounts.liquidation_state.liquidation_threshold_usdt,
        grace_period_ends_at: ctx.accounts.liquidation_state.grace_period_ends_at()?,
    });

    Ok(())
}

pub fn handle_execute_liquidation(
    ctx: Context<ExecuteLiquidation>,
    recovered_usdt: u64,
) -> Result<()> {
    require!(
        ctx.accounts.reputation.wallet == ctx.accounts.loan.borrower,
        AxiomError::Unauthorized
    );

    let now = Clock::get()?.unix_timestamp;
    let outstanding =
        ctx.accounts
            .liquidation_state
            .execute(&mut ctx.accounts.loan, recovered_usdt, now)?;
    ctx.accounts
        .lending_pool
        .recover_liquidation(recovered_usdt, outstanding)?;
    ctx.accounts
        .reputation
        .slash_for_default(&ctx.accounts.loan, now)
}
