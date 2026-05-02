use anchor_lang::prelude::*;

use crate::{AxiomError, BPS_DENOMINATOR};

#[account]
#[derive(InitSpace)]
pub struct LendingPool {
    pub authority: Pubkey,
    pub usdt_vault: Pubkey,
    pub kamino_vault: Pubkey,
    pub total_deposits: u64,
    pub total_borrowed: u64,
    pub utilization_rate: u64,
    pub base_interest_rate: u64,
    pub kamino_allocation: u64,
    pub last_rebalance: i64,
    pub bump: u8,
}

impl LendingPool {
    pub const LEN: usize = 8 + Self::INIT_SPACE;

    pub fn available_liquidity(&self) -> Result<u64> {
        self.total_deposits
            .checked_sub(self.total_borrowed)
            .ok_or(error!(AxiomError::MathOverflow))
    }

    pub fn deposit(&mut self, amount: u64) -> Result<()> {
        self.total_deposits = self
            .total_deposits
            .checked_add(amount)
            .ok_or(error!(AxiomError::MathOverflow))?;
        self.refresh_utilization()
    }

    pub fn withdraw(&mut self, amount: u64) -> Result<()> {
        require!(
            self.available_liquidity()? >= amount,
            AxiomError::InsufficientLiquidity
        );

        self.total_deposits = self
            .total_deposits
            .checked_sub(amount)
            .ok_or(error!(AxiomError::MathOverflow))?;
        self.refresh_utilization()
    }

    pub fn borrow(&mut self, amount: u64) -> Result<()> {
        require!(
            self.available_liquidity()? >= amount,
            AxiomError::InsufficientLiquidity
        );

        self.total_borrowed = self
            .total_borrowed
            .checked_add(amount)
            .ok_or(error!(AxiomError::MathOverflow))?;
        self.refresh_utilization()
    }

    fn refresh_utilization(&mut self) -> Result<()> {
        self.utilization_rate = if self.total_deposits == 0 {
            0
        } else {
            self.total_borrowed
                .checked_mul(BPS_DENOMINATOR)
                .ok_or(error!(AxiomError::MathOverflow))?
                .checked_div(self.total_deposits)
                .ok_or(error!(AxiomError::MathOverflow))?
        };

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn pool() -> LendingPool {
        LendingPool {
            authority: Pubkey::new_unique(),
            usdt_vault: Pubkey::new_unique(),
            kamino_vault: Pubkey::new_unique(),
            total_deposits: 0,
            total_borrowed: 0,
            utilization_rate: 0,
            base_interest_rate: 1_000,
            kamino_allocation: 0,
            last_rebalance: 0,
            bump: 255,
        }
    }

    #[test]
    fn deposit_tracks_total_deposits() {
        let mut pool = pool();

        pool.deposit(1_000).unwrap();

        assert_eq!(pool.total_deposits, 1_000);
        assert_eq!(pool.total_borrowed, 0);
        assert_eq!(pool.utilization_rate, 0);
        assert_eq!(pool.available_liquidity().unwrap(), 1_000);
    }

    #[test]
    fn withdraw_respects_available_liquidity() {
        let mut pool = pool();
        pool.deposit(1_000).unwrap();
        pool.borrow(400).unwrap();

        pool.withdraw(600).unwrap();

        assert_eq!(pool.total_deposits, 400);
        assert_eq!(pool.total_borrowed, 400);
        assert_eq!(pool.utilization_rate, BPS_DENOMINATOR);
        assert_eq!(pool.available_liquidity().unwrap(), 0);
    }

    #[test]
    fn withdraw_rejects_insufficient_liquidity() {
        let mut pool = pool();
        pool.deposit(1_000).unwrap();
        pool.borrow(700).unwrap();

        let err = pool.withdraw(301).unwrap_err();

        assert_eq!(err, error!(AxiomError::InsufficientLiquidity));
    }

    #[test]
    fn borrow_tracks_utilization() {
        let mut pool = pool();
        pool.deposit(1_000).unwrap();

        pool.borrow(250).unwrap();

        assert_eq!(pool.total_borrowed, 250);
        assert_eq!(pool.available_liquidity().unwrap(), 750);
        assert_eq!(pool.utilization_rate, 2_500);
    }
}
