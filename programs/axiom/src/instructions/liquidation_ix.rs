use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{
    AxiomError, CollateralEscrow, CollateralLiquidated, CollateralValuation, LendingPool,
    LiquidationState, Loan, ReputationAccount,
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
    #[account(
        mut,
        has_one = usdt_vault @ AxiomError::InvalidVault,
    )]
    pub lending_pool: Account<'info, LendingPool>,
    #[account(mut)]
    pub usdt_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"collateral_escrow", loan.key().as_ref()],
        bump = collateral_escrow.bump,
        has_one = loan,
        has_one = collateral_vault @ AxiomError::InvalidCollateralVault
    )]
    pub collateral_escrow: Account<'info, CollateralEscrow>,
    #[account(
        mut,
        constraint = collateral_vault.mint == usdt_vault.mint @ AxiomError::InvalidCollateralVault
    )]
    pub collateral_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"reputation", loan.borrower.as_ref()],
        bump = reputation.bump
    )]
    pub reputation: Account<'info, ReputationAccount>,
    pub token_program: Program<'info, Token>,
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
    _recovered_usdt: u64,
) -> Result<()> {
    require!(
        ctx.accounts.reputation.wallet == ctx.accounts.loan.borrower,
        AxiomError::Unauthorized
    );

    let now = Clock::get()?.unix_timestamp;
    let recovered_usdt = ctx.accounts.collateral_escrow.liquidate()?;
    let outstanding =
        ctx.accounts
            .liquidation_state
            .execute(&mut ctx.accounts.loan, recovered_usdt, now)?;

    let loan_key = ctx.accounts.loan.key();
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"collateral_escrow",
        loan_key.as_ref(),
        &[ctx.accounts.collateral_escrow.bump],
    ]];
    token::transfer(
        ctx.accounts
            .liquidate_collateral_context()
            .with_signer(signer_seeds),
        recovered_usdt,
    )?;

    ctx.accounts
        .lending_pool
        .recover_liquidation(recovered_usdt, outstanding)?;
    emit!(CollateralLiquidated {
        loan: ctx.accounts.loan.key(),
        borrower: ctx.accounts.loan.borrower,
        amount: recovered_usdt,
    });
    ctx.accounts
        .reputation
        .slash_for_default(&ctx.accounts.loan, now)
}

impl<'info> ExecuteLiquidation<'info> {
    fn liquidate_collateral_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.collateral_vault.to_account_info(),
                to: self.usdt_vault.to_account_info(),
                authority: self.collateral_escrow.to_account_info(),
            },
        )
    }
}
