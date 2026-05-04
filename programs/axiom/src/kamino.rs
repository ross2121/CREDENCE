use anchor_lang::prelude::*;

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
pub fn cpi_kamino_withdraw(_kamino_program: AccountInfo, amount: u64) -> Result<()> {
    msg!("Kamino withdraw stub executed for {} USDT units", amount);
    Ok(())
}

#[cfg(not(feature = "mock-kamino"))]
pub fn cpi_kamino_withdraw(_kamino_program: AccountInfo, _amount: u64) -> Result<()> {
    err!(crate::AxiomError::ProductionCpiUnavailable)
}
