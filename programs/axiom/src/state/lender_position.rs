use anchor_lang::prelude::*;

use crate::AxiomError;

#[account]
#[derive(InitSpace)]
pub struct LenderPosition {
    pub lender: Pubkey,
    pub lending_pool: Pubkey,
    pub deposited_amount: u64,
    pub withdrawn_amount: u64,
    pub last_updated: i64,
    pub bump: u8,
}

impl LenderPosition {
    pub const LEN: usize = 8 + Self::INIT_SPACE;

    pub fn initialize(&mut self, lender: Pubkey, lending_pool: Pubkey, now: i64, bump: u8) {
        self.lender = lender;
        self.lending_pool = lending_pool;
        self.deposited_amount = 0;
        self.withdrawn_amount = 0;
        self.last_updated = now;
        self.bump = bump;
    }

    pub fn available_principal(&self) -> Result<u64> {
        self.deposited_amount
            .checked_sub(self.withdrawn_amount)
            .ok_or(error!(AxiomError::MathOverflow))
    }

    pub fn deposit(&mut self, amount: u64, now: i64) -> Result<()> {
        require!(amount > 0, AxiomError::InvalidAmount);
        self.deposited_amount = self
            .deposited_amount
            .checked_add(amount)
            .ok_or(error!(AxiomError::MathOverflow))?;
        self.last_updated = now;
        Ok(())
    }

    pub fn withdraw(&mut self, amount: u64, now: i64) -> Result<()> {
        require!(amount > 0, AxiomError::InvalidAmount);
        require!(
            self.available_principal()? >= amount,
            AxiomError::InsufficientLenderPosition
        );
        self.withdrawn_amount = self
            .withdrawn_amount
            .checked_add(amount)
            .ok_or(error!(AxiomError::MathOverflow))?;
        self.last_updated = now;
        Ok(())
    }
}
