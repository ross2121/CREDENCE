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

    pub fn kamino_allocated_amount(&self) -> Result<u64> {
        self.total_deposits
            .checked_mul(self.kamino_allocation)
            .ok_or(error!(AxiomError::MathOverflow))?
            .checked_div(BPS_DENOMINATOR)
            .ok_or(error!(AxiomError::MathOverflow))
    }

    pub fn pool_liquid_amount(&self) -> Result<u64> {
        self.available_liquidity()?
            .checked_sub(self.kamino_allocated_amount()?)
            .ok_or(error!(AxiomError::InsufficientLiquidity))
    }

    pub fn rebalance_to_kamino(&mut self, amount: u64, now: i64) -> Result<()> {
        require!(amount > 0, AxiomError::InvalidKaminoRebalance);
        require!(
            self.pool_liquid_amount()? >= amount,
            AxiomError::InsufficientLiquidity
        );

        let new_kamino_amount = self
            .kamino_allocated_amount()?
            .checked_add(amount)
            .ok_or(error!(AxiomError::MathOverflow))?;
        self.set_kamino_amount(new_kamino_amount)?;
        self.last_rebalance = now;

        Ok(())
    }

    pub fn rebalance_from_kamino(&mut self, amount: u64, now: i64) -> Result<()> {
        require!(amount > 0, AxiomError::InvalidKaminoRebalance);

        let current_kamino_amount = self.kamino_allocated_amount()?;
        require!(
            current_kamino_amount >= amount,
            AxiomError::KaminoAllocationExceeded
        );

        let new_kamino_amount = current_kamino_amount
            .checked_sub(amount)
            .ok_or(error!(AxiomError::MathOverflow))?;
        self.set_kamino_amount(new_kamino_amount)?;
        self.last_rebalance = now;

        Ok(())
    }

    pub fn recover_liquidation(
        &mut self,
        recovered_amount: u64,
        outstanding_debt: u64,
    ) -> Result<()> {
        require!(recovered_amount > 0, AxiomError::InvalidAmount);

        let borrowed_reduction = recovered_amount
            .min(outstanding_debt)
            .min(self.total_borrowed);
        self.total_borrowed = self
            .total_borrowed
            .checked_sub(borrowed_reduction)
            .ok_or(error!(AxiomError::MathOverflow))?;

        if recovered_amount > outstanding_debt {
            self.total_deposits = self
                .total_deposits
                .checked_add(recovered_amount - outstanding_debt)
                .ok_or(error!(AxiomError::MathOverflow))?;
        }

        self.refresh_utilization()
    }

    fn set_kamino_amount(&mut self, amount: u64) -> Result<()> {
        require!(
            amount <= self.total_deposits,
            AxiomError::KaminoAllocationExceeded
        );

        self.kamino_allocation = if self.total_deposits == 0 {
            0
        } else {
            amount
                .checked_mul(BPS_DENOMINATOR)
                .ok_or(error!(AxiomError::MathOverflow))?
                .checked_div(self.total_deposits)
                .ok_or(error!(AxiomError::MathOverflow))?
        };

        Ok(())
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

    #[test]
    fn rebalance_to_kamino_tracks_allocation() {
        let mut pool = pool();
        pool.deposit(10_000).unwrap();

        pool.rebalance_to_kamino(2_000, 123).unwrap();

        assert_eq!(pool.kamino_allocation, 2_000);
        assert_eq!(pool.kamino_allocated_amount().unwrap(), 2_000);
        assert_eq!(pool.pool_liquid_amount().unwrap(), 8_000);
        assert_eq!(pool.last_rebalance, 123);
    }

    #[test]
    fn rebalance_to_kamino_respects_liquid_buffer() {
        let mut pool = pool();
        pool.deposit(10_000).unwrap();
        pool.borrow(7_000).unwrap();

        let err = pool.rebalance_to_kamino(3_001, 123).unwrap_err();

        assert_eq!(err, error!(AxiomError::InsufficientLiquidity));
    }

    #[test]
    fn rebalance_from_kamino_reduces_allocation() {
        let mut pool = pool();
        pool.deposit(10_000).unwrap();
        pool.rebalance_to_kamino(5_000, 123).unwrap();

        pool.rebalance_from_kamino(2_000, 456).unwrap();

        assert_eq!(pool.kamino_allocation, 3_000);
        assert_eq!(pool.kamino_allocated_amount().unwrap(), 3_000);
        assert_eq!(pool.pool_liquid_amount().unwrap(), 7_000);
        assert_eq!(pool.last_rebalance, 456);
    }

    #[test]
    fn rebalance_from_kamino_rejects_excess_amount() {
        let mut pool = pool();
        pool.deposit(10_000).unwrap();
        pool.rebalance_to_kamino(1_000, 123).unwrap();

        let err = pool.rebalance_from_kamino(1_001, 456).unwrap_err();

        assert_eq!(err, error!(AxiomError::KaminoAllocationExceeded));
    }

    #[test]
    fn liquidation_recovery_reduces_borrowed_amount() {
        let mut pool = pool();
        pool.deposit(10_000).unwrap();
        pool.borrow(4_000).unwrap();

        pool.recover_liquidation(3_000, 4_000).unwrap();

        assert_eq!(pool.total_borrowed, 1_000);
        assert_eq!(pool.total_deposits, 10_000);
        assert_eq!(pool.utilization_rate, 1_000);
    }

    #[test]
    fn liquidation_recovery_adds_surplus_to_deposits() {
        let mut pool = pool();
        pool.deposit(10_000).unwrap();
        pool.borrow(4_000).unwrap();

        pool.recover_liquidation(4_250, 4_000).unwrap();

        assert_eq!(pool.total_borrowed, 0);
        assert_eq!(pool.total_deposits, 10_250);
        assert_eq!(pool.utilization_rate, 0);
    }
}
