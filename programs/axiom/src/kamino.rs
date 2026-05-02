use anchor_lang::prelude::*;

pub fn cpi_kamino_deposit(_kamino_program: AccountInfo, amount: u64) -> Result<()> {
    msg!("Kamino deposit stub executed for {} USDT units", amount);
    Ok(())
}

pub fn cpi_kamino_withdraw(_kamino_program: AccountInfo, amount: u64) -> Result<()> {
    msg!("Kamino withdraw stub executed for {} USDT units", amount);
    Ok(())
}
