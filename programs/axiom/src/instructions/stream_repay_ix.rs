use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{
    AxiomError, CollateralEscrow, CollateralReleased, IkaPolicy, IkaPolicyKind, Loan,
    RepaymentClaimed, RepaymentStream, RepaymentStreamArgs,
};

#[derive(Accounts)]
pub struct InitRepayStream<'info> {
    #[account(mut)]
    pub borrower: Signer<'info>,
    #[account(has_one = borrower @ AxiomError::Unauthorized)]
    pub loan: Account<'info, Loan>,
    pub stream_vault: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = borrower,
        space = RepaymentStream::LEN,
        seeds = [b"repayment_stream", loan.key().as_ref()],
        bump
    )]
    pub repayment_stream: Account<'info, RepaymentStream>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FundStream<'info> {
    #[account(mut)]
    pub borrower: Signer<'info>,
    #[account(mut, constraint = borrower_usdt.owner == borrower.key() @ AxiomError::Unauthorized)]
    pub borrower_usdt: Account<'info, TokenAccount>,
    #[account(
        mut,
        has_one = borrower @ AxiomError::Unauthorized,
        has_one = stream_vault @ AxiomError::InvalidVault
    )]
    pub repayment_stream: Account<'info, RepaymentStream>,
    #[account(mut)]
    pub stream_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct FundStreamWithPolicy<'info> {
    #[account(mut)]
    pub agent_wallet: Signer<'info>,
    #[account(
        mut,
        constraint = agent_usdt.owner == agent_wallet.key() @ AxiomError::Unauthorized
    )]
    pub agent_usdt: Account<'info, TokenAccount>,
    pub loan: Account<'info, Loan>,
    #[account(
        mut,
        has_one = loan,
        has_one = stream_vault @ AxiomError::InvalidVault
    )]
    pub repayment_stream: Account<'info, RepaymentStream>,
    #[account(mut)]
    pub stream_vault: Account<'info, TokenAccount>,
    #[account(
        seeds = [b"ika_policy", loan.borrower.as_ref(), agent_wallet.key().as_ref()],
        bump = ika_policy.bump
    )]
    pub ika_policy: Account<'info, IkaPolicy>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimRepayments<'info> {
    #[account(mut)]
    pub claimant: Signer<'info>,
    #[account(mut)]
    pub destination_usdt: Account<'info, TokenAccount>,
    #[account(mut)]
    pub loan: Account<'info, Loan>,
    #[account(
        mut,
        has_one = loan,
        has_one = stream_vault @ AxiomError::InvalidVault,
        seeds = [b"repayment_stream", loan.key().as_ref()],
        bump = repayment_stream.bump
    )]
    pub repayment_stream: Account<'info, RepaymentStream>,
    #[account(mut)]
    pub stream_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CloseStream<'info> {
    #[account(mut)]
    pub borrower: Signer<'info>,
    #[account(mut, has_one = borrower @ AxiomError::Unauthorized)]
    pub loan: Account<'info, Loan>,
    #[account(
        mut,
        has_one = borrower @ AxiomError::Unauthorized,
        has_one = loan,
        seeds = [b"repayment_stream", loan.key().as_ref()],
        bump = repayment_stream.bump
    )]
    pub repayment_stream: Account<'info, RepaymentStream>,
    #[account(
        mut,
        seeds = [b"collateral_escrow", loan.key().as_ref()],
        bump = collateral_escrow.bump,
        has_one = loan,
        has_one = borrower @ AxiomError::Unauthorized,
        has_one = collateral_vault @ AxiomError::InvalidCollateralVault
    )]
    pub collateral_escrow: Account<'info, CollateralEscrow>,
    #[account(mut)]
    pub collateral_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = borrower_collateral.owner == borrower.key() @ AxiomError::Unauthorized,
        constraint = borrower_collateral.mint == collateral_vault.mint @ AxiomError::InvalidCollateralVault
    )]
    pub borrower_collateral: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

pub fn handle_init_repayment_stream(ctx: Context<InitRepayStream>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    require!(
        ctx.accounts.loan.stream_rate == 1,
        AxiomError::LoanNotDisbursed
    );
    ctx.accounts.repayment_stream.initialize(
        RepaymentStreamArgs {
            loan_key: ctx.accounts.loan.key(),
            loan: &ctx.accounts.loan,
            stream_vault: ctx.accounts.stream_vault.key(),
            now,
        },
        ctx.bumps.repayment_stream,
    )?;

    ctx.accounts.loan.stream_rate = ctx.accounts.repayment_stream.stream_rate;

    Ok(())
}

pub fn handle_fund_repayment_stream(ctx: Context<FundStream>, amount: u64) -> Result<()> {
    ctx.accounts.repayment_stream.fund(amount)?;
    token::transfer(ctx.accounts.fund_transfer_context(), amount)
}

pub fn handle_fund_repayment_stream_with_policy(
    ctx: Context<FundStreamWithPolicy>,
    amount: u64,
) -> Result<()> {
    require!(
        ctx.accounts.ika_policy.kind == IkaPolicyKind::Borrower,
        AxiomError::InvalidIkaPolicy
    );
    require!(
        ctx.accounts.ika_policy.owner == ctx.accounts.loan.borrower,
        AxiomError::Unauthorized
    );
    ctx.accounts.ika_policy.verify_action(
        ctx.accounts.agent_wallet.key(),
        ctx.accounts.stream_vault.key(),
        amount,
    )?;

    ctx.accounts.repayment_stream.fund(amount)?;
    token::transfer(ctx.accounts.fund_transfer_context(), amount)
}

pub fn handle_claim_repayments(ctx: Context<ClaimRepayments>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let amount = ctx
        .accounts
        .repayment_stream
        .claim(&mut ctx.accounts.loan, now)?;

    let loan_key = ctx.accounts.loan.key();
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"repayment_stream",
        loan_key.as_ref(),
        &[ctx.accounts.repayment_stream.bump],
    ]];

    token::transfer(
        ctx.accounts
            .claim_transfer_context()
            .with_signer(signer_seeds),
        amount,
    )?;
    emit!(RepaymentClaimed {
        loan: ctx.accounts.loan.key(),
        claimant: ctx.accounts.claimant.key(),
        amount,
    });
    Ok(())
}

pub fn handle_close_repayment_stream(ctx: Context<CloseStream>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    ctx.accounts
        .repayment_stream
        .close_stream(&mut ctx.accounts.loan, now)?;

    let amount = ctx.accounts.collateral_escrow.release()?;
    let loan_key = ctx.accounts.loan.key();
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"collateral_escrow",
        loan_key.as_ref(),
        &[ctx.accounts.collateral_escrow.bump],
    ]];

    token::transfer(
        ctx.accounts
            .release_collateral_context()
            .with_signer(signer_seeds),
        amount,
    )?;
    emit!(CollateralReleased {
        loan: ctx.accounts.loan.key(),
        borrower: ctx.accounts.borrower.key(),
        amount,
    });
    Ok(())
}

impl<'info> FundStream<'info> {
    fn fund_transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.borrower_usdt.to_account_info(),
                to: self.stream_vault.to_account_info(),
                authority: self.borrower.to_account_info(),
            },
        )
    }
}

impl<'info> FundStreamWithPolicy<'info> {
    fn fund_transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.agent_usdt.to_account_info(),
                to: self.stream_vault.to_account_info(),
                authority: self.agent_wallet.to_account_info(),
            },
        )
    }
}

impl<'info> ClaimRepayments<'info> {
    fn claim_transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.stream_vault.to_account_info(),
                to: self.destination_usdt.to_account_info(),
                authority: self.repayment_stream.to_account_info(),
            },
        )
    }
}

impl<'info> CloseStream<'info> {
    fn release_collateral_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.collateral_vault.to_account_info(),
                to: self.borrower_collateral.to_account_info(),
                authority: self.collateral_escrow.to_account_info(),
            },
        )
    }
}
