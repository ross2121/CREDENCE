use anchor_lang::prelude::*;

use anchor_spl::token::Token;

use crate::{
    cpi_kamino_deposit, cpi_kamino_withdraw, AxiomError, KaminoDepositCpiAccounts,
    KaminoRebalanced, KaminoWithdrawCpiAccounts, LendingPool, KLEND_PROGRAM_ID, KVAULT_PROGRAM_ID,
};

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
    /// CHECK: Kamino Earn vault state stored on the lending pool.
    #[account(mut)]
    pub kamino_vault: UncheckedAccount<'info>,
    /// CHECK: Token vault owned by the Kamino vault program.
    #[account(mut)]
    pub token_vault: UncheckedAccount<'info>,
    /// CHECK: Underlying token mint.
    pub token_mint: UncheckedAccount<'info>,
    /// CHECK: Kamino base vault authority PDA.
    pub base_vault_authority: UncheckedAccount<'info>,
    /// CHECK: Kamino shares mint.
    #[account(mut)]
    pub shares_mint: UncheckedAccount<'info>,
    /// CHECK: AXIOM pool token account owned by the lending pool PDA.
    #[account(mut)]
    pub user_token_ata: UncheckedAccount<'info>,
    /// CHECK: AXIOM pool shares token account owned by the lending pool PDA.
    #[account(mut)]
    pub user_shares_ata: UncheckedAccount<'info>,
    /// CHECK: Kamino event authority PDA.
    pub event_authority: UncheckedAccount<'info>,
    /// CHECK: Kamino vault devnet program.
    #[account(address = KVAULT_PROGRAM_ID)]
    pub kvault_program: UncheckedAccount<'info>,
    /// CHECK: Kamino lending program.
    #[account(address = KLEND_PROGRAM_ID)]
    pub klend_program: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub shares_token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RebalanceFromKamino<'info> {
    pub authority: Signer<'info>,
    #[account(
        mut,
        has_one = authority @ AxiomError::Unauthorized,
        has_one = kamino_vault @ AxiomError::InvalidVault,
        seeds = [b"lending_pool", lending_pool.usdt_vault.as_ref()],
        bump = lending_pool.bump
    )]
    pub lending_pool: Account<'info, LendingPool>,
    /// CHECK: Kamino Earn vault state stored on the lending pool.
    #[account(mut)]
    pub kamino_vault: UncheckedAccount<'info>,
    /// CHECK: Kamino global config account.
    pub global_config: UncheckedAccount<'info>,
    /// CHECK: Token vault owned by the Kamino vault program.
    #[account(mut)]
    pub token_vault: UncheckedAccount<'info>,
    /// CHECK: Kamino base vault authority PDA.
    pub base_vault_authority: UncheckedAccount<'info>,
    /// CHECK: Underlying token mint.
    #[account(mut)]
    pub token_mint: UncheckedAccount<'info>,
    /// CHECK: AXIOM pool token account owned by the lending pool PDA.
    #[account(mut)]
    pub user_token_ata: UncheckedAccount<'info>,
    /// CHECK: AXIOM pool shares token account owned by the lending pool PDA.
    #[account(mut)]
    pub user_shares_ata: UncheckedAccount<'info>,
    /// CHECK: Kamino shares mint.
    #[account(mut)]
    pub shares_mint: UncheckedAccount<'info>,
    /// CHECK: Kamino event authority PDA.
    pub event_authority: UncheckedAccount<'info>,
    /// CHECK: Kamino reserve account.
    #[account(mut)]
    pub reserve: UncheckedAccount<'info>,
    /// CHECK: cToken vault owned by the Kamino vault program.
    #[account(mut)]
    pub ctoken_vault: UncheckedAccount<'info>,
    /// CHECK: Kamino lending market.
    pub lending_market: UncheckedAccount<'info>,
    /// CHECK: Kamino lending market authority PDA.
    pub lending_market_authority: UncheckedAccount<'info>,
    /// CHECK: Reserve underlying liquidity supply vault.
    #[account(mut)]
    pub reserve_liquidity_supply: UncheckedAccount<'info>,
    /// CHECK: Reserve collateral mint.
    #[account(mut)]
    pub reserve_collateral_mint: UncheckedAccount<'info>,
    /// CHECK: Reserve collateral token program.
    pub reserve_collateral_token_program: UncheckedAccount<'info>,
    /// CHECK: Solana instructions sysvar.
    #[account(address = pubkey!("Sysvar1nstructions1111111111111111111111111"))]
    pub instruction_sysvar_account: UncheckedAccount<'info>,
    /// CHECK: Kamino vault devnet program.
    #[account(address = KVAULT_PROGRAM_ID)]
    pub kvault_program: UncheckedAccount<'info>,
    /// CHECK: Kamino lending program.
    #[account(address = KLEND_PROGRAM_ID)]
    pub klend_program: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub shares_token_program: Program<'info, Token>,
}

pub fn handle_rebalance_to_kamino<'info>(
    ctx: Context<'_, '_, '_, 'info, RebalanceKamino<'info>>,
    amount: u64,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    ctx.accounts.lending_pool.rebalance_to_kamino(amount, now)?;
    let usdt_vault = ctx.accounts.lending_pool.usdt_vault;
    let bump = ctx.accounts.lending_pool.bump;
    let signer_seeds: &[&[&[u8]]] = &[&[b"lending_pool", usdt_vault.as_ref(), &[bump]]];
    cpi_kamino_deposit(
        KaminoDepositCpiAccounts {
            user: ctx.accounts.lending_pool.to_account_info(),
            vault_state: ctx.accounts.kamino_vault.to_account_info(),
            token_vault: ctx.accounts.token_vault.to_account_info(),
            token_mint: ctx.accounts.token_mint.to_account_info(),
            base_vault_authority: ctx.accounts.base_vault_authority.to_account_info(),
            shares_mint: ctx.accounts.shares_mint.to_account_info(),
            user_token_ata: ctx.accounts.user_token_ata.to_account_info(),
            user_shares_ata: ctx.accounts.user_shares_ata.to_account_info(),
            klend_program: ctx.accounts.klend_program.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
            shares_token_program: ctx.accounts.shares_token_program.to_account_info(),
            event_authority: ctx.accounts.event_authority.to_account_info(),
            kvault_program: ctx.accounts.kvault_program.to_account_info(),
        },
        amount,
        ctx.remaining_accounts,
        signer_seeds,
    )?;
    emit!(KaminoRebalanced {
        pool: ctx.accounts.lending_pool.key(),
        to_kamino: true,
        amount,
        kamino_allocation_bps: ctx.accounts.lending_pool.kamino_allocation,
    });
    Ok(())
}

pub fn handle_rebalance_from_kamino(ctx: Context<RebalanceFromKamino>, amount: u64) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    ctx.accounts
        .lending_pool
        .rebalance_from_kamino(amount, now)?;
    let usdt_vault = ctx.accounts.lending_pool.usdt_vault;
    let bump = ctx.accounts.lending_pool.bump;
    let signer_seeds: &[&[&[u8]]] = &[&[b"lending_pool", usdt_vault.as_ref(), &[bump]]];
    cpi_kamino_withdraw(
        KaminoWithdrawCpiAccounts {
            authority: ctx.accounts.lending_pool.to_account_info(),
            vault_state: ctx.accounts.kamino_vault.to_account_info(),
            global_config: ctx.accounts.global_config.to_account_info(),
            token_vault: ctx.accounts.token_vault.to_account_info(),
            base_vault_authority: ctx.accounts.base_vault_authority.to_account_info(),
            user_token_ata: ctx.accounts.user_token_ata.to_account_info(),
            token_mint: ctx.accounts.token_mint.to_account_info(),
            user_shares_ata: ctx.accounts.user_shares_ata.to_account_info(),
            shares_mint: ctx.accounts.shares_mint.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
            shares_token_program: ctx.accounts.shares_token_program.to_account_info(),
            klend_program: ctx.accounts.klend_program.to_account_info(),
            event_authority: ctx.accounts.event_authority.to_account_info(),
            kvault_program: ctx.accounts.kvault_program.to_account_info(),
            reserve: ctx.accounts.reserve.to_account_info(),
            ctoken_vault: ctx.accounts.ctoken_vault.to_account_info(),
            lending_market: ctx.accounts.lending_market.to_account_info(),
            lending_market_authority: ctx.accounts.lending_market_authority.to_account_info(),
            reserve_liquidity_supply: ctx.accounts.reserve_liquidity_supply.to_account_info(),
            reserve_collateral_mint: ctx.accounts.reserve_collateral_mint.to_account_info(),
            reserve_collateral_token_program: ctx
                .accounts
                .reserve_collateral_token_program
                .to_account_info(),
            instruction_sysvar_account: ctx.accounts.instruction_sysvar_account.to_account_info(),
        },
        amount,
        signer_seeds,
    )?;
    emit!(KaminoRebalanced {
        pool: ctx.accounts.lending_pool.key(),
        to_kamino: false,
        amount,
        kamino_allocation_bps: ctx.accounts.lending_pool.kamino_allocation,
    });
    Ok(())
}
