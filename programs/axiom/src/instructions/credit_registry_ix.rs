use anchor_lang::prelude::*;
use solana_keccak_hasher::hash;

use crate::{AxiomError, CreditProof, CreditTier, Loan, LoanRequestArgs};

#[derive(Accounts)]
pub struct RegisterCreditProof<'info> {
    #[account(mut)]
    pub borrower: Signer<'info>,
    #[account(
        init,
        payer = borrower,
        space = CreditProof::LEN,
        seeds = [b"credit_proof", borrower.key().as_ref()],
        bump
    )]
    pub credit_proof: Account<'info, CreditProof>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RequestLoan<'info> {
    #[account(mut)]
    pub borrower: Signer<'info>,
    #[account(
        seeds = [b"credit_proof", borrower.key().as_ref()],
        bump = credit_proof.bump
    )]
    pub credit_proof: Account<'info, CreditProof>,
    /// CHECK: Stored as the collateral asset identifier. Valuation is added in the liquidation feature.
    pub collateral_mint: UncheckedAccount<'info>,
    #[account(
        init,
        payer = borrower,
        space = Loan::LEN,
        seeds = [b"loan", borrower.key().as_ref(), credit_proof.key().as_ref()],
        bump
    )]
    pub loan: Account<'info, Loan>,
    pub system_program: Program<'info, System>,
}

pub fn handle_register_credit_proof(
    ctx: Context<RegisterCreditProof>,
    tier: CreditTier,
    max_loan: u64,
    zk_proof: Vec<u8>,
    expiry: i64,
) -> Result<()> {
    require!(max_loan > 0, AxiomError::InvalidAmount);

    let now = Clock::get()?.unix_timestamp;
    require!(expiry > now, AxiomError::CreditProofExpired);
    tier.validate_max_loan(max_loan)?;

    let proof = &mut ctx.accounts.credit_proof;
    proof.wallet = ctx.accounts.borrower.key();
    proof.tier = tier;
    proof.zk_proof_hash = hash(&zk_proof).to_bytes();
    proof.issued_at = now;
    proof.expires_at = expiry;
    proof.max_loan_usdt = max_loan;
    proof.bump = ctx.bumps.credit_proof;

    Ok(())
}

pub fn handle_request_loan(
    ctx: Context<RequestLoan>,
    amount: u64,
    duration_days: u64,
    collateral_amount: u64,
    ika_dwallet: Pubkey,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let proof = &ctx.accounts.credit_proof;

    proof.validate_for_loan(ctx.accounts.borrower.key(), amount, now)?;
    proof.tier.validate_collateral(amount, collateral_amount)?;

    ctx.accounts.loan.initialize_request(
        LoanRequestArgs {
            borrower: ctx.accounts.borrower.key(),
            principal: amount,
            collateral_mint: ctx.accounts.collateral_mint.key(),
            collateral_amount,
            ika_dwallet,
            credit_tier: proof.tier,
            duration_days,
        },
        now,
        ctx.bumps.loan,
    )
}
