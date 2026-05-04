use anchor_lang::prelude::*;

#[cfg(not(feature = "mock-kamino"))]
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::invoke_signed,
};

pub const KVAULT_PROGRAM_ID: Pubkey = pubkey!("devkRngFnfp4gBc5a3LsadgbQKdPo8MSZ4prFiNSVmY");
pub const KLEND_PROGRAM_ID: Pubkey = pubkey!("KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD");
pub const KVAULT_WITHDRAW_DISCRIMINATOR: [u8; 8] = [183, 18, 70, 156, 148, 109, 161, 34];

pub struct KaminoWithdrawCpiAccounts<'info> {
    pub authority: AccountInfo<'info>,
    pub vault_state: AccountInfo<'info>,
    pub global_config: AccountInfo<'info>,
    pub token_vault: AccountInfo<'info>,
    pub base_vault_authority: AccountInfo<'info>,
    pub user_token_ata: AccountInfo<'info>,
    pub token_mint: AccountInfo<'info>,
    pub user_shares_ata: AccountInfo<'info>,
    pub shares_mint: AccountInfo<'info>,
    pub token_program: AccountInfo<'info>,
    pub shares_token_program: AccountInfo<'info>,
    pub klend_program: AccountInfo<'info>,
    pub event_authority: AccountInfo<'info>,
    pub kvault_program: AccountInfo<'info>,
    pub reserve: AccountInfo<'info>,
    pub ctoken_vault: AccountInfo<'info>,
    pub lending_market: AccountInfo<'info>,
    pub lending_market_authority: AccountInfo<'info>,
    pub reserve_liquidity_supply: AccountInfo<'info>,
    pub reserve_collateral_mint: AccountInfo<'info>,
    pub reserve_collateral_token_program: AccountInfo<'info>,
    pub instruction_sysvar_account: AccountInfo<'info>,
}

#[cfg(feature = "mock-kamino")]
pub fn cpi_kamino_deposit(_kamino_program: AccountInfo, amount: u64) -> Result<()> {
    msg!("Kamino deposit stub executed for {} USDT units", amount);
    Ok(())
}

#[cfg(not(feature = "mock-kamino"))]
pub fn cpi_kamino_deposit(_kamino_program: AccountInfo, _amount: u64) -> Result<()> {
    err!(crate::AxiomError::ProductionCpiUnavailable)
}

#[cfg(feature = "mock-kamino")]
pub fn cpi_kamino_withdraw<'info>(
    _accounts: KaminoWithdrawCpiAccounts<'info>,
    amount: u64,
    _signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    msg!("Kamino withdraw stub executed for {} USDT units", amount);
    Ok(())
}

#[cfg(not(feature = "mock-kamino"))]
pub fn cpi_kamino_withdraw<'info>(
    accounts: KaminoWithdrawCpiAccounts<'info>,
    shares_amount: u64,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    let mut data = Vec::with_capacity(16);
    data.extend_from_slice(&KVAULT_WITHDRAW_DISCRIMINATOR);
    data.extend_from_slice(&shares_amount.to_le_bytes());

    let metas = vec![
        AccountMeta::new(accounts.authority.key(), true),
        AccountMeta::new(accounts.vault_state.key(), false),
        AccountMeta::new_readonly(accounts.global_config.key(), false),
        AccountMeta::new(accounts.token_vault.key(), false),
        AccountMeta::new_readonly(accounts.base_vault_authority.key(), false),
        AccountMeta::new(accounts.user_token_ata.key(), false),
        AccountMeta::new(accounts.token_mint.key(), false),
        AccountMeta::new(accounts.user_shares_ata.key(), false),
        AccountMeta::new(accounts.shares_mint.key(), false),
        AccountMeta::new_readonly(accounts.token_program.key(), false),
        AccountMeta::new_readonly(accounts.shares_token_program.key(), false),
        AccountMeta::new_readonly(accounts.klend_program.key(), false),
        AccountMeta::new_readonly(accounts.event_authority.key(), false),
        AccountMeta::new_readonly(accounts.kvault_program.key(), false),
        AccountMeta::new(accounts.vault_state.key(), false),
        AccountMeta::new(accounts.reserve.key(), false),
        AccountMeta::new(accounts.ctoken_vault.key(), false),
        AccountMeta::new_readonly(accounts.lending_market.key(), false),
        AccountMeta::new_readonly(accounts.lending_market_authority.key(), false),
        AccountMeta::new(accounts.reserve_liquidity_supply.key(), false),
        AccountMeta::new(accounts.reserve_collateral_mint.key(), false),
        AccountMeta::new_readonly(accounts.reserve_collateral_token_program.key(), false),
        AccountMeta::new_readonly(accounts.instruction_sysvar_account.key(), false),
        AccountMeta::new_readonly(accounts.event_authority.key(), false),
        AccountMeta::new_readonly(accounts.kvault_program.key(), false),
    ];

    let ix = Instruction {
        program_id: KVAULT_PROGRAM_ID,
        accounts: metas,
        data,
    };

    let account_infos = vec![
        accounts.authority,
        accounts.vault_state.clone(),
        accounts.global_config,
        accounts.token_vault,
        accounts.base_vault_authority,
        accounts.user_token_ata,
        accounts.token_mint,
        accounts.user_shares_ata,
        accounts.shares_mint,
        accounts.token_program,
        accounts.shares_token_program,
        accounts.klend_program,
        accounts.event_authority.clone(),
        accounts.kvault_program.clone(),
        accounts.vault_state,
        accounts.reserve,
        accounts.ctoken_vault,
        accounts.lending_market,
        accounts.lending_market_authority,
        accounts.reserve_liquidity_supply,
        accounts.reserve_collateral_mint,
        accounts.reserve_collateral_token_program,
        accounts.instruction_sysvar_account,
        accounts.event_authority,
        accounts.kvault_program,
    ];

    invoke_signed(&ix, &account_infos, signer_seeds)?;
    Ok(())
}
