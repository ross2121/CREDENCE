use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{
    ArbitrationVoteSubmitted, Arbitrator, AxiomError, Dispute, DisputeFinalized, DisputeOpened,
    DisputeRuling, Loan, ARBITRATOR_STAKE_REQUIREMENT,
};

#[derive(Accounts)]
pub struct OpenDispute<'info> {
    #[account(mut)]
    pub opener: Signer<'info>,
    pub loan: Account<'info, Loan>,
    #[account(
        init,
        payer = opener,
        space = Dispute::LEN,
        seeds = [b"dispute", loan.key().as_ref()],
        bump
    )]
    pub dispute: Account<'info, Dispute>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterArbitrator<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut, constraint = authority_usdt.owner == authority.key() @ AxiomError::Unauthorized)]
    pub authority_usdt: Account<'info, TokenAccount>,
    #[account(mut)]
    pub stake_vault: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = authority,
        space = Arbitrator::LEN,
        seeds = [b"arbitrator", authority.key().as_ref()],
        bump
    )]
    pub arbitrator: Account<'info, Arbitrator>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ArbitrationVote<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        has_one = authority @ AxiomError::Unauthorized,
        seeds = [b"arbitrator", authority.key().as_ref()],
        bump = arbitrator.bump
    )]
    pub arbitrator: Account<'info, Arbitrator>,
    #[account(mut)]
    pub dispute: Account<'info, Dispute>,
}

#[derive(Accounts)]
pub struct FinalizeDispute<'info> {
    pub authority: Signer<'info>,
    #[account(mut)]
    pub dispute: Account<'info, Dispute>,
}

pub fn handle_open_dispute(
    ctx: Context<OpenDispute>,
    _loan_id: Pubkey,
    evidence_hash: [u8; 32],
) -> Result<()> {
    require!(
        ctx.accounts.loan.key() == _loan_id,
        AxiomError::InvalidLoanAccount
    );
    let now = Clock::get()?.unix_timestamp;
    ctx.accounts.dispute.open(
        ctx.accounts.loan.key(),
        ctx.accounts.opener.key(),
        evidence_hash,
        now,
        ctx.bumps.dispute,
    );
    emit!(DisputeOpened {
        dispute: ctx.accounts.dispute.key(),
        loan: ctx.accounts.loan.key(),
        opener: ctx.accounts.opener.key(),
        evidence_hash,
    });
    Ok(())
}

pub fn handle_register_arbitrator(ctx: Context<RegisterArbitrator>) -> Result<()> {
    ctx.accounts.arbitrator.register(
        ctx.accounts.authority.key(),
        ARBITRATOR_STAKE_REQUIREMENT,
        ctx.bumps.arbitrator,
    )?;
    token::transfer(
        ctx.accounts.stake_transfer_context(),
        ARBITRATOR_STAKE_REQUIREMENT,
    )
}

pub fn handle_submit_arbitration_vote(
    ctx: Context<ArbitrationVote>,
    _dispute_id: Pubkey,
    ruling: DisputeRuling,
) -> Result<()> {
    ctx.accounts
        .dispute
        .submit_vote(ctx.accounts.authority.key(), ruling)?;
    ctx.accounts.arbitrator.record_vote()?;
    emit!(ArbitrationVoteSubmitted {
        dispute: ctx.accounts.dispute.key(),
        arbitrator: ctx.accounts.authority.key(),
        ruling,
        vote_count: ctx.accounts.dispute.vote_count,
    });
    Ok(())
}

pub fn handle_finalize_dispute(ctx: Context<FinalizeDispute>, _dispute_id: Pubkey) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let ruling = ctx.accounts.dispute.finalize(now)?;
    emit!(DisputeFinalized {
        dispute: ctx.accounts.dispute.key(),
        ruling,
        borrower_votes: ctx.accounts.dispute.borrower_votes,
        lender_votes: ctx.accounts.dispute.lender_votes,
    });
    Ok(())
}

impl<'info> RegisterArbitrator<'info> {
    fn stake_transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.authority_usdt.to_account_info(),
                to: self.stake_vault.to_account_info(),
                authority: self.authority.to_account_info(),
            },
        )
    }
}
