use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{AxiomError, Loan, RepaymentStream, RepaymentStreamArgs};

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
    #[account(mut)]
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
}

pub fn handle_init_repayment_stream(ctx: Context<InitRepayStream>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
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
    )
}

pub fn handle_close_repayment_stream(ctx: Context<CloseStream>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    ctx.accounts
        .repayment_stream
        .close_stream(&mut ctx.accounts.loan, now)
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
