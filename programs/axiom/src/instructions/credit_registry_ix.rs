use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use solana_keccak_hasher::hash;

use crate::{
    verify_credit_proof, AxiomError, CollateralEscrow, CollateralEscrowed, CreditProof,
    CreditProofRegistered, CreditTier, Loan, LoanRequestArgs, LoanRequested,
};

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
    pub collateral_mint: Account<'info, Mint>,
    #[account(
        mut,
        constraint = borrower_collateral.owner == borrower.key() @ AxiomError::Unauthorized,
        constraint = borrower_collateral.mint == collateral_mint.key() @ AxiomError::InvalidCollateralVault
    )]
    pub borrower_collateral: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = borrower,
        space = Loan::LEN,
        seeds = [b"loan", borrower.key().as_ref(), credit_proof.key().as_ref()],
        bump
    )]
    pub loan: Account<'info, Loan>,
    #[account(
        init,
        payer = borrower,
        space = CollateralEscrow::LEN,
        seeds = [b"collateral_escrow", loan.key().as_ref()],
        bump
    )]
    pub collateral_escrow: Account<'info, CollateralEscrow>,
    #[account(
        init,
        payer = borrower,
        token::mint = collateral_mint,
        token::authority = collateral_escrow,
        seeds = [b"collateral_vault", loan.key().as_ref()],
        bump
    )]
    pub collateral_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handle_register_credit_proof(
    ctx: Context<RegisterCreditProof>,
    tier: CreditTier,
    max_loan: u64,
    zk_proof: Vec<u8>,
    public_inputs: Vec<[u8; 32]>,
    expiry: i64,
) -> Result<()> {
    require!(max_loan > 0, AxiomError::InvalidAmount);

    let now = Clock::get()?.unix_timestamp;
    require!(expiry > now, AxiomError::CreditProofExpired);
    tier.validate_max_loan(max_loan)?;
    verify_credit_proof(&zk_proof, public_inputs, tier)?;

    let proof = &mut ctx.accounts.credit_proof;
    proof.wallet = ctx.accounts.borrower.key();
    proof.tier = tier;
    proof.zk_proof_hash = hash(&zk_proof).to_bytes();
    proof.issued_at = now;
    proof.expires_at = expiry;
    proof.max_loan_usdt = max_loan;
    proof.bump = ctx.bumps.credit_proof;

    emit!(CreditProofRegistered {
        wallet: proof.wallet,
        tier,
        max_loan_usdt: max_loan,
        expires_at: expiry,
    });

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
    )?;

    ctx.accounts.collateral_escrow.initialize(
        ctx.accounts.loan.key(),
        ctx.accounts.borrower.key(),
        ctx.accounts.collateral_mint.key(),
        ctx.accounts.collateral_vault.key(),
        collateral_amount,
        ctx.bumps.collateral_escrow,
    )?;

    token::transfer(
        ctx.accounts.collateral_transfer_context(),
        collateral_amount,
    )?;

    emit!(LoanRequested {
        loan: ctx.accounts.loan.key(),
        borrower: ctx.accounts.borrower.key(),
        amount,
        tier: proof.tier,
        due_time: ctx.accounts.loan.due_time,
    });
    emit!(CollateralEscrowed {
        loan: ctx.accounts.loan.key(),
        borrower: ctx.accounts.borrower.key(),
        collateral_vault: ctx.accounts.collateral_vault.key(),
        amount: collateral_amount,
    });

    Ok(())
}

impl<'info> RequestLoan<'info> {
    fn collateral_transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.borrower_collateral.to_account_info(),
                to: self.collateral_vault.to_account_info(),
                authority: self.borrower.to_account_info(),
            },
        )
    }
}
