use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{AxiomError, Loan, ReputationAccount};

#[derive(Accounts)]
pub struct MintReputation<'info> {
    #[account(mut)]
    pub wallet: Signer<'info>,
    /// CHECK: Metaplex Core mint integration is stubbed for the hackathon demo.
    pub nft_mint: UncheckedAccount<'info>,
    #[account(
        init,
        payer = wallet,
        space = ReputationAccount::LEN,
        seeds = [b"reputation", wallet.key().as_ref()],
        bump
    )]
    pub reputation: Account<'info, ReputationAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateReputation<'info> {
    pub authority: Signer<'info>,
    pub loan: Account<'info, Loan>,
    #[account(
        mut,
        seeds = [b"reputation", reputation.wallet.as_ref()],
        bump = reputation.bump
    )]
    pub reputation: Account<'info, ReputationAccount>,
}

#[derive(Accounts)]
pub struct StakeBond<'info> {
    #[account(mut)]
    pub wallet: Signer<'info>,
    #[account(mut, constraint = wallet_usdt.owner == wallet.key() @ AxiomError::Unauthorized)]
    pub wallet_usdt: Account<'info, TokenAccount>,
    #[account(mut)]
    pub stake_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        has_one = wallet @ AxiomError::Unauthorized,
        seeds = [b"reputation", wallet.key().as_ref()],
        bump = reputation.bump
    )]
    pub reputation: Account<'info, ReputationAccount>,
    pub token_program: Program<'info, Token>,
}

pub fn handle_mint_reputation_nft(ctx: Context<MintReputation>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    ctx.accounts.reputation.initialize(
        ctx.accounts.wallet.key(),
        ctx.accounts.nft_mint.key(),
        now,
        ctx.bumps.reputation,
    );
    Ok(())
}

pub fn handle_update_reputation_success(ctx: Context<UpdateReputation>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    ctx.accounts
        .reputation
        .record_successful_repayment(&ctx.accounts.loan, now)
}

pub fn handle_slash_reputation(ctx: Context<UpdateReputation>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    ctx.accounts
        .reputation
        .slash_for_default(&ctx.accounts.loan, now)
}

pub fn handle_stake_reputation_bond(ctx: Context<StakeBond>, amount: u64) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    ctx.accounts.reputation.stake_bond(amount, now)?;
    token::transfer(ctx.accounts.stake_transfer_context(), amount)
}

impl<'info> StakeBond<'info> {
    fn stake_transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.wallet_usdt.to_account_info(),
                to: self.stake_vault.to_account_info(),
                authority: self.wallet.to_account_info(),
            },
        )
    }
}
