use anchor_lang::prelude::*;

use crate::AxiomError;

#[account]
#[derive(InitSpace)]
pub struct CollateralEscrow {
    pub loan: Pubkey,
    pub borrower: Pubkey,
    pub collateral_mint: Pubkey,
    pub collateral_vault: Pubkey,
    pub amount: u64,
    pub deposited: bool,
    pub released: bool,
    pub liquidated: bool,
    pub bump: u8,
}

impl CollateralEscrow {
    pub const LEN: usize = 8 + Self::INIT_SPACE;

    pub fn initialize(
        &mut self,
        loan: Pubkey,
        borrower: Pubkey,
        collateral_mint: Pubkey,
        collateral_vault: Pubkey,
        amount: u64,
        bump: u8,
    ) -> Result<()> {
        require!(amount > 0, AxiomError::InvalidAmount);

        self.loan = loan;
        self.borrower = borrower;
        self.collateral_mint = collateral_mint;
        self.collateral_vault = collateral_vault;
        self.amount = amount;
        self.deposited = true;
        self.released = false;
        self.liquidated = false;
        self.bump = bump;

        Ok(())
    }

    pub fn require_locked(&self) -> Result<()> {
        require!(self.deposited, AxiomError::CollateralNotEscrowed);
        require!(!self.released, AxiomError::CollateralAlreadyReleased);
        require!(!self.liquidated, AxiomError::CollateralAlreadyReleased);
        Ok(())
    }

    pub fn release(&mut self) -> Result<u64> {
        self.require_locked()?;
        self.released = true;
        Ok(self.amount)
    }

    pub fn liquidate(&mut self) -> Result<u64> {
        self.require_locked()?;
        self.liquidated = true;
        Ok(self.amount)
    }
}
