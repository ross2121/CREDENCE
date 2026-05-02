use anchor_lang::prelude::*;

use crate::{AxiomError, CreditTier, SECONDS_PER_DAY};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, Eq, InitSpace, PartialEq)]
pub enum LoanStatus {
    Active,
    Repaid,
    Defaulted,
    Liquidated,
}

#[account]
#[derive(InitSpace)]
pub struct Loan {
    pub borrower: Pubkey,
    pub principal: u64,
    pub interest_rate: u64,
    pub collateral_mint: Pubkey,
    pub collateral_amount: u64,
    pub ika_dwallet: Pubkey,
    pub credit_tier: CreditTier,
    pub start_time: i64,
    pub due_time: i64,
    pub amount_repaid: u64,
    pub last_repay_time: i64,
    pub stream_rate: u64,
    pub status: LoanStatus,
    pub bump: u8,
}

impl Loan {
    pub const LEN: usize = 8 + Self::INIT_SPACE;

    pub fn initialize_request(&mut self, args: LoanRequestArgs, now: i64, bump: u8) -> Result<()> {
        require!(args.principal > 0, AxiomError::InvalidAmount);
        require!(args.duration_days > 0, AxiomError::InvalidLoanDuration);
        args.credit_tier.validate_max_loan(args.principal)?;
        args.credit_tier
            .validate_collateral(args.principal, args.collateral_amount)?;

        let duration_seconds = i64::try_from(args.duration_days)
            .map_err(|_| error!(AxiomError::MathOverflow))?
            .checked_mul(SECONDS_PER_DAY)
            .ok_or(error!(AxiomError::MathOverflow))?;

        self.borrower = args.borrower;
        self.principal = args.principal;
        self.interest_rate = args.credit_tier.interest_rate_bps();
        self.collateral_mint = args.collateral_mint;
        self.collateral_amount = args.collateral_amount;
        self.ika_dwallet = args.ika_dwallet;
        self.credit_tier = args.credit_tier;
        self.start_time = now;
        self.due_time = now
            .checked_add(duration_seconds)
            .ok_or(error!(AxiomError::MathOverflow))?;
        self.amount_repaid = 0;
        self.last_repay_time = now;
        self.stream_rate = 0;
        self.status = LoanStatus::Active;
        self.bump = bump;

        Ok(())
    }

    pub fn apply_repayment(&mut self, amount: u64, now: i64) -> Result<()> {
        require!(amount > 0, AxiomError::InvalidAmount);
        require!(
            self.status == LoanStatus::Active,
            AxiomError::InvalidLoanStatus
        );

        self.amount_repaid = self
            .amount_repaid
            .checked_add(amount)
            .ok_or(error!(AxiomError::MathOverflow))?;
        self.last_repay_time = now;

        Ok(())
    }

    pub fn mark_repaid(&mut self, now: i64) -> Result<()> {
        require!(
            self.status == LoanStatus::Active,
            AxiomError::InvalidLoanStatus
        );
        self.status = LoanStatus::Repaid;
        self.last_repay_time = now;
        Ok(())
    }

    pub fn outstanding_debt(&self) -> Result<u64> {
        self.principal
            .checked_sub(self.amount_repaid.min(self.principal))
            .ok_or(error!(AxiomError::MathOverflow))
    }

    pub fn mark_liquidated(&mut self, now: i64) -> Result<()> {
        require!(
            self.status == LoanStatus::Active,
            AxiomError::InvalidLoanStatus
        );
        self.status = LoanStatus::Liquidated;
        self.last_repay_time = now;
        Ok(())
    }
}

pub struct LoanRequestArgs {
    pub borrower: Pubkey,
    pub principal: u64,
    pub collateral_mint: Pubkey,
    pub collateral_amount: u64,
    pub ika_dwallet: Pubkey,
    pub credit_tier: CreditTier,
    pub duration_days: u64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::USDT_UNIT;

    fn args() -> LoanRequestArgs {
        LoanRequestArgs {
            borrower: Pubkey::new_unique(),
            principal: 1_000 * USDT_UNIT,
            collateral_mint: Pubkey::new_unique(),
            collateral_amount: 500 * USDT_UNIT,
            ika_dwallet: Pubkey::new_unique(),
            credit_tier: CreditTier::Silver,
            duration_days: 30,
        }
    }

    fn empty_loan() -> Loan {
        Loan {
            borrower: Pubkey::default(),
            principal: 0,
            interest_rate: 0,
            collateral_mint: Pubkey::default(),
            collateral_amount: 0,
            ika_dwallet: Pubkey::default(),
            credit_tier: CreditTier::Bronze,
            start_time: 0,
            due_time: 0,
            amount_repaid: 0,
            last_repay_time: 0,
            stream_rate: 0,
            status: LoanStatus::Defaulted,
            bump: 0,
        }
    }

    #[test]
    fn initializes_valid_loan_request() {
        let args = args();
        let borrower = args.borrower;
        let collateral_mint = args.collateral_mint;
        let ika_dwallet = args.ika_dwallet;
        let mut loan = empty_loan();

        loan.initialize_request(args, 1_000, 254).unwrap();

        assert_eq!(loan.borrower, borrower);
        assert_eq!(loan.principal, 1_000 * USDT_UNIT);
        assert_eq!(loan.interest_rate, CreditTier::Silver.interest_rate_bps());
        assert_eq!(loan.collateral_mint, collateral_mint);
        assert_eq!(loan.collateral_amount, 500 * USDT_UNIT);
        assert_eq!(loan.ika_dwallet, ika_dwallet);
        assert_eq!(loan.credit_tier, CreditTier::Silver);
        assert_eq!(loan.start_time, 1_000);
        assert_eq!(loan.due_time, 1_000 + (30 * SECONDS_PER_DAY));
        assert_eq!(loan.amount_repaid, 0);
        assert_eq!(loan.last_repay_time, 1_000);
        assert_eq!(loan.stream_rate, 0);
        assert_eq!(loan.status, LoanStatus::Active);
        assert_eq!(loan.bump, 254);
    }

    #[test]
    fn rejects_insufficient_collateral_for_loan_request() {
        let mut args = args();
        args.collateral_amount -= 1;
        let mut loan = empty_loan();

        let err = loan.initialize_request(args, 1_000, 254).unwrap_err();

        assert_eq!(err, error!(AxiomError::InsufficientCollateral));
    }
}
