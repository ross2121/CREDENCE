use anchor_lang::prelude::*;

use crate::{
    AxiomError, Loan, LoanStatus, BPS_DENOMINATOR, LIQUIDATION_GRACE_PERIOD_SECONDS,
    LIQUIDATION_THRESHOLD_BPS,
};

#[account]
#[derive(InitSpace)]
pub struct LiquidationState {
    pub loan: Pubkey,
    pub warning_issued_at: i64,
    pub grace_period_seconds: i64,
    pub collateral_value_usdt: u64,
    pub liquidation_threshold_usdt: u64,
    pub recovered_usdt: u64,
    pub warning_active: bool,
    pub bump: u8,
}

impl LiquidationState {
    pub const LEN: usize = 8 + Self::INIT_SPACE;

    pub fn initialize_warning(
        &mut self,
        loan_key: Pubkey,
        valuation: CollateralValuation,
        now: i64,
        bump: u8,
    ) -> Result<()> {
        let threshold = valuation.liquidation_threshold()?;
        require!(
            valuation.collateral_value_usdt < threshold,
            AxiomError::CollateralSafe
        );

        self.loan = loan_key;
        self.warning_issued_at = now;
        self.grace_period_seconds = LIQUIDATION_GRACE_PERIOD_SECONDS;
        self.collateral_value_usdt = valuation.collateral_value_usdt;
        self.liquidation_threshold_usdt = threshold;
        self.recovered_usdt = 0;
        self.warning_active = true;
        self.bump = bump;

        Ok(())
    }

    pub fn update_warning(&mut self, valuation: CollateralValuation, now: i64) -> Result<()> {
        let threshold = valuation.liquidation_threshold()?;
        require!(
            valuation.collateral_value_usdt < threshold,
            AxiomError::CollateralSafe
        );

        self.warning_issued_at = now;
        self.collateral_value_usdt = valuation.collateral_value_usdt;
        self.liquidation_threshold_usdt = threshold;
        self.warning_active = true;

        Ok(())
    }

    pub fn grace_period_ends_at(&self) -> Result<i64> {
        self.warning_issued_at
            .checked_add(self.grace_period_seconds)
            .ok_or(error!(AxiomError::MathOverflow))
    }

    pub fn execute(&mut self, loan: &mut Loan, recovered_usdt: u64, now: i64) -> Result<u64> {
        require!(self.warning_active, AxiomError::LiquidationNotWarned);
        require!(
            loan.status == LoanStatus::Active,
            AxiomError::InvalidLoanStatus
        );
        require!(
            now >= self.grace_period_ends_at()?,
            AxiomError::GracePeriodActive
        );
        require!(recovered_usdt > 0, AxiomError::InvalidAmount);

        let outstanding = loan.outstanding_debt()?;
        loan.mark_liquidated(now)?;
        self.recovered_usdt = recovered_usdt;
        self.warning_active = false;

        Ok(outstanding)
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub struct CollateralValuation {
    pub collateral_value_usdt: u64,
    pub loan_value_usdt: u64,
}

impl CollateralValuation {
    pub fn liquidation_threshold(self) -> Result<u64> {
        self.loan_value_usdt
            .checked_mul(LIQUIDATION_THRESHOLD_BPS)
            .ok_or(error!(AxiomError::MathOverflow))?
            .checked_div(BPS_DENOMINATOR)
            .ok_or(error!(AxiomError::MathOverflow))
    }

    pub fn is_safe(self) -> Result<bool> {
        Ok(self.collateral_value_usdt >= self.liquidation_threshold()?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{CreditTier, USDT_UNIT};

    fn loan() -> Loan {
        Loan {
            borrower: Pubkey::new_unique(),
            principal: 5_000 * USDT_UNIT,
            interest_rate: CreditTier::Gold.interest_rate_bps(),
            collateral_mint: Pubkey::new_unique(),
            collateral_amount: 2_500 * USDT_UNIT,
            ika_dwallet: Pubkey::new_unique(),
            credit_tier: CreditTier::Gold,
            start_time: 100,
            due_time: 200,
            amount_repaid: 1_000 * USDT_UNIT,
            last_repay_time: 150,
            stream_rate: 0,
            status: LoanStatus::Active,
            bump: 255,
        }
    }

    fn empty_state() -> LiquidationState {
        LiquidationState {
            loan: Pubkey::default(),
            warning_issued_at: 0,
            grace_period_seconds: 0,
            collateral_value_usdt: 0,
            liquidation_threshold_usdt: 0,
            recovered_usdt: 0,
            warning_active: false,
            bump: 0,
        }
    }

    #[test]
    fn safe_collateral_does_not_trigger_warning() {
        let mut state = empty_state();
        let valuation = CollateralValuation {
            collateral_value_usdt: 5_500 * USDT_UNIT,
            loan_value_usdt: 5_000 * USDT_UNIT,
        };

        assert!(valuation.is_safe().unwrap());
        let err = state
            .initialize_warning(Pubkey::new_unique(), valuation, 1_000, 255)
            .unwrap_err();

        assert_eq!(err, error!(AxiomError::CollateralSafe));
    }

    #[test]
    fn warning_records_grace_period_and_threshold() {
        let mut state = empty_state();
        let loan_key = Pubkey::new_unique();

        state
            .initialize_warning(
                loan_key,
                CollateralValuation {
                    collateral_value_usdt: 5_499 * USDT_UNIT,
                    loan_value_usdt: 5_000 * USDT_UNIT,
                },
                1_000,
                254,
            )
            .unwrap();

        assert_eq!(state.loan, loan_key);
        assert_eq!(state.warning_issued_at, 1_000);
        assert_eq!(state.grace_period_ends_at().unwrap(), 4_600);
        assert_eq!(state.liquidation_threshold_usdt, 5_500 * USDT_UNIT);
        assert!(state.warning_active);
        assert_eq!(state.bump, 254);
    }

    #[test]
    fn liquidation_rejects_before_grace_period_ends() {
        let mut loan = loan();
        let mut state = empty_state();
        state
            .initialize_warning(
                Pubkey::new_unique(),
                CollateralValuation {
                    collateral_value_usdt: 5_000 * USDT_UNIT,
                    loan_value_usdt: 5_000 * USDT_UNIT,
                },
                1_000,
                254,
            )
            .unwrap();

        let err = state
            .execute(&mut loan, 4_000 * USDT_UNIT, 4_599)
            .unwrap_err();

        assert_eq!(err, error!(AxiomError::GracePeriodActive));
    }

    #[test]
    fn liquidation_marks_loan_and_returns_outstanding_debt() {
        let mut loan = loan();
        let mut state = empty_state();
        state
            .initialize_warning(
                Pubkey::new_unique(),
                CollateralValuation {
                    collateral_value_usdt: 5_000 * USDT_UNIT,
                    loan_value_usdt: 5_000 * USDT_UNIT,
                },
                1_000,
                254,
            )
            .unwrap();

        let outstanding = state.execute(&mut loan, 4_250 * USDT_UNIT, 4_600).unwrap();

        assert_eq!(outstanding, 4_000 * USDT_UNIT);
        assert_eq!(loan.status, LoanStatus::Liquidated);
        assert_eq!(loan.last_repay_time, 4_600);
        assert_eq!(state.recovered_usdt, 4_250 * USDT_UNIT);
        assert!(!state.warning_active);
    }
}
