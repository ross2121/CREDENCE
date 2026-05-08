use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{
    AxiomError, LenderPosition, LenderPositionUpdated, LendingPool, LiquidityDeposited,
    LiquidityWithdrawn, Loan, LoanDisbursed, LoanStatus,
};

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    pub usdt_vault: Account<'info, TokenAccount>,
    /// CHECK: Stored for future Kamino CPI integration.
    pub kamino_vault: UncheckedAccount<'info>,
    #[account(
        init,
        payer = authority,
        space = LendingPool::LEN,
        seeds = [b"lending_pool", usdt_vault.key().as_ref()],
        bump
    )]
    pub lending_pool: Account<'info, LendingPool>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositLiquidity<'info> {
    #[account(mut)]
    pub lender: Signer<'info>,
    #[account(mut, constraint = lender_usdt.owner == lender.key() @ AxiomError::Unauthorized)]
    pub lender_usdt: Account<'info, TokenAccount>,
    #[account(mut, has_one = usdt_vault @ AxiomError::InvalidVault)]
    pub lending_pool: Account<'info, LendingPool>,
    #[account(mut)]
    pub usdt_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct InitializeLenderPosition<'info> {
    #[account(mut)]
    pub lender: Signer<'info>,
    pub lending_pool: Account<'info, LendingPool>,
    #[account(
        init,
        payer = lender,
        space = LenderPosition::LEN,
        seeds = [b"lender_position", lending_pool.key().as_ref(), lender.key().as_ref()],
        bump
    )]
    pub lender_position: Account<'info, LenderPosition>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositLenderLiquidity<'info> {
    #[account(mut)]
    pub lender: Signer<'info>,
    #[account(mut, constraint = lender_usdt.owner == lender.key() @ AxiomError::Unauthorized)]
    pub lender_usdt: Account<'info, TokenAccount>,
    #[account(mut, has_one = usdt_vault @ AxiomError::InvalidVault)]
    pub lending_pool: Account<'info, LendingPool>,
    #[account(mut)]
    pub usdt_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        has_one = lender @ AxiomError::Unauthorized,
        has_one = lending_pool @ AxiomError::InvalidVault,
        seeds = [b"lender_position", lending_pool.key().as_ref(), lender.key().as_ref()],
        bump = lender_position.bump
    )]
    pub lender_position: Account<'info, LenderPosition>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct WithdrawLiquidity<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut)]
    pub destination_usdt: Account<'info, TokenAccount>,
    #[account(
        mut,
        has_one = authority @ AxiomError::Unauthorized,
        has_one = usdt_vault @ AxiomError::InvalidVault,
        seeds = [b"lending_pool", usdt_vault.key().as_ref()],
        bump = lending_pool.bump
    )]
    pub lending_pool: Account<'info, LendingPool>,
    #[account(mut)]
    pub usdt_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct WithdrawLenderLiquidity<'info> {
    #[account(mut)]
    pub lender: Signer<'info>,
    #[account(mut, constraint = destination_usdt.owner == lender.key() @ AxiomError::Unauthorized)]
    pub destination_usdt: Account<'info, TokenAccount>,
    #[account(
        mut,
        has_one = usdt_vault @ AxiomError::InvalidVault,
        seeds = [b"lending_pool", usdt_vault.key().as_ref()],
        bump = lending_pool.bump
    )]
    pub lending_pool: Account<'info, LendingPool>,
    #[account(mut)]
    pub usdt_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        has_one = lender @ AxiomError::Unauthorized,
        has_one = lending_pool @ AxiomError::InvalidVault,
        seeds = [b"lender_position", lending_pool.key().as_ref(), lender.key().as_ref()],
        bump = lender_position.bump
    )]
    pub lender_position: Account<'info, LenderPosition>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct DisburseLoan<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut)]
    pub borrower_usdt: Account<'info, TokenAccount>,
    #[account(
        mut,
        has_one = authority @ AxiomError::Unauthorized,
        has_one = usdt_vault @ AxiomError::InvalidVault,
        seeds = [b"lending_pool", usdt_vault.key().as_ref()],
        bump = lending_pool.bump
    )]
    pub lending_pool: Account<'info, LendingPool>,
    #[account(mut)]
    pub usdt_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub loan: Account<'info, Loan>,
    pub token_program: Program<'info, Token>,
}

pub fn handle_initialize_pool(
    ctx: Context<InitializePool>,
    base_interest_rate: u64,
    kamino_vault: Pubkey,
) -> Result<()> {
    let pool = &mut ctx.accounts.lending_pool;

    pool.authority = ctx.accounts.authority.key();
    pool.usdt_vault = ctx.accounts.usdt_vault.key();
    pool.kamino_vault = kamino_vault;
    pool.total_deposits = 0;
    pool.total_borrowed = 0;
    pool.utilization_rate = 0;
    pool.base_interest_rate = base_interest_rate;
    pool.kamino_allocation = 0;
    pool.last_rebalance = Clock::get()?.unix_timestamp;
    pool.bump = ctx.bumps.lending_pool;

    Ok(())
}

pub fn handle_deposit_liquidity(ctx: Context<DepositLiquidity>, amount: u64) -> Result<()> {
    require!(amount > 0, AxiomError::InvalidAmount);

    token::transfer(ctx.accounts.deposit_transfer_context(), amount)?;

    ctx.accounts.lending_pool.deposit(amount)?;
    emit!(LiquidityDeposited {
        pool: ctx.accounts.lending_pool.key(),
        lender: ctx.accounts.lender.key(),
        amount,
    });
    Ok(())
}

pub fn handle_initialize_lender_position(ctx: Context<InitializeLenderPosition>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    ctx.accounts.lender_position.initialize(
        ctx.accounts.lender.key(),
        ctx.accounts.lending_pool.key(),
        now,
        ctx.bumps.lender_position,
    );
    Ok(())
}

pub fn handle_deposit_lender_liquidity(
    ctx: Context<DepositLenderLiquidity>,
    amount: u64,
) -> Result<()> {
    require!(amount > 0, AxiomError::InvalidAmount);
    let now = Clock::get()?.unix_timestamp;

    token::transfer(ctx.accounts.deposit_transfer_context(), amount)?;

    ctx.accounts.lending_pool.deposit(amount)?;
    ctx.accounts.lender_position.deposit(amount, now)?;
    emit!(LiquidityDeposited {
        pool: ctx.accounts.lending_pool.key(),
        lender: ctx.accounts.lender.key(),
        amount,
    });
    emit!(LenderPositionUpdated {
        pool: ctx.accounts.lending_pool.key(),
        lender: ctx.accounts.lender.key(),
        deposited_amount: ctx.accounts.lender_position.deposited_amount,
        withdrawn_amount: ctx.accounts.lender_position.withdrawn_amount,
    });
    Ok(())
}

pub fn handle_withdraw_liquidity(ctx: Context<WithdrawLiquidity>, amount: u64) -> Result<()> {
    require!(amount > 0, AxiomError::InvalidAmount);
    require!(
        ctx.accounts.usdt_vault.amount >= amount,
        AxiomError::InsufficientVaultBalance
    );

    ctx.accounts.lending_pool.withdraw(amount)?;

    let vault_key = ctx.accounts.usdt_vault.key();
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"lending_pool",
        vault_key.as_ref(),
        &[ctx.accounts.lending_pool.bump],
    ]];

    token::transfer(
        ctx.accounts
            .withdraw_transfer_context()
            .with_signer(signer_seeds),
        amount,
    )?;
    emit!(LiquidityWithdrawn {
        pool: ctx.accounts.lending_pool.key(),
        authority: ctx.accounts.authority.key(),
        amount,
    });
    Ok(())
}

pub fn handle_withdraw_lender_liquidity(
    ctx: Context<WithdrawLenderLiquidity>,
    amount: u64,
) -> Result<()> {
    require!(amount > 0, AxiomError::InvalidAmount);
    require!(
        ctx.accounts.usdt_vault.amount >= amount,
        AxiomError::InsufficientVaultBalance
    );

    let now = Clock::get()?.unix_timestamp;
    ctx.accounts.lender_position.withdraw(amount, now)?;
    ctx.accounts.lending_pool.withdraw(amount)?;

    let vault_key = ctx.accounts.usdt_vault.key();
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"lending_pool",
        vault_key.as_ref(),
        &[ctx.accounts.lending_pool.bump],
    ]];

    token::transfer(
        ctx.accounts
            .withdraw_transfer_context()
            .with_signer(signer_seeds),
        amount,
    )?;
    emit!(LiquidityWithdrawn {
        pool: ctx.accounts.lending_pool.key(),
        authority: ctx.accounts.lender.key(),
        amount,
    });
    emit!(LenderPositionUpdated {
        pool: ctx.accounts.lending_pool.key(),
        lender: ctx.accounts.lender.key(),
        deposited_amount: ctx.accounts.lender_position.deposited_amount,
        withdrawn_amount: ctx.accounts.lender_position.withdrawn_amount,
    });
    Ok(())
}

pub fn handle_disburse_loan(ctx: Context<DisburseLoan>) -> Result<()> {
    require!(
        ctx.accounts.loan.status == LoanStatus::Active,
        AxiomError::InvalidLoanStatus
    );
    require!(
        ctx.accounts.loan.stream_rate == 0,
        AxiomError::LoanAlreadyDisbursed
    );

    let amount = ctx.accounts.loan.principal;
    require!(amount > 0, AxiomError::InvalidAmount);
    require!(
        ctx.accounts.usdt_vault.amount >= amount,
        AxiomError::InsufficientVaultBalance
    );

    ctx.accounts.lending_pool.borrow(amount)?;
    ctx.accounts.loan.stream_rate = 1;

    let vault_key = ctx.accounts.usdt_vault.key();
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"lending_pool",
        vault_key.as_ref(),
        &[ctx.accounts.lending_pool.bump],
    ]];

    token::transfer(
        ctx.accounts
            .disburse_transfer_context()
            .with_signer(signer_seeds),
        amount,
    )?;
    emit!(LoanDisbursed {
        loan: ctx.accounts.loan.key(),
        borrower: ctx.accounts.loan.borrower,
        amount,
    });
    Ok(())
}

impl<'info> DepositLiquidity<'info> {
    fn deposit_transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.lender_usdt.to_account_info(),
                to: self.usdt_vault.to_account_info(),
                authority: self.lender.to_account_info(),
            },
        )
    }
}

impl<'info> DepositLenderLiquidity<'info> {
    fn deposit_transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.lender_usdt.to_account_info(),
                to: self.usdt_vault.to_account_info(),
                authority: self.lender.to_account_info(),
            },
        )
    }
}

impl<'info> WithdrawLiquidity<'info> {
    fn withdraw_transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.usdt_vault.to_account_info(),
                to: self.destination_usdt.to_account_info(),
                authority: self.lending_pool.to_account_info(),
            },
        )
    }
}

impl<'info> WithdrawLenderLiquidity<'info> {
    fn withdraw_transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.usdt_vault.to_account_info(),
                to: self.destination_usdt.to_account_info(),
                authority: self.lending_pool.to_account_info(),
            },
        )
    }
}

impl<'info> DisburseLoan<'info> {
    fn disburse_transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.usdt_vault.to_account_info(),
                to: self.borrower_usdt.to_account_info(),
                authority: self.lending_pool.to_account_info(),
            },
        )
    }
}
