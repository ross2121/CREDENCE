use anchor_lang::prelude::*;

use crate::{AxiomError, Loan, LoanStatus, BPS_DENOMINATOR, SECONDS_PER_YEAR};

#[account]
#[derive(InitSpace)]
pub struct RepaymentStream {
    pub loan: Pubkey,
    pub borrower: Pubkey,
    pub stream_vault: Pubkey,
    pub total_due: u64,
    pub funded_amount: u64,
    pub claimed_amount: u64,
    pub stream_rate: u64,
    pub start_time: i64,
    pub end_time: i64,
    pub last_claim_time: i64,
    pub bump: u8,
}

impl RepaymentStream {
    pub const LEN: usize = 8 + Self::INIT_SPACE;

    pub fn initialize(&mut self, args: RepaymentStreamArgs, bump: u8) -> Result<()> {
        require!(
            args.loan.status == LoanStatus::Active,
            AxiomError::InvalidLoanStatus
        );
        require!(
            args.loan.due_time > args.now,
            AxiomError::InvalidLoanDuration
        );

        let duration_seconds = args
            .loan
            .due_time
            .checked_sub(args.now)
            .ok_or(error!(AxiomError::MathOverflow))?;
        let duration_u64 =
            u64::try_from(duration_seconds).map_err(|_| error!(AxiomError::MathOverflow))?;
        let total_due = total_due(args.loan.principal, args.loan.interest_rate, duration_u64)?;
        let stream_rate = ceil_div(total_due, duration_u64)?;

        self.loan = args.loan_key;
        self.borrower = args.loan.borrower;
        self.stream_vault = args.stream_vault;
        self.total_due = total_due;
        self.funded_amount = 0;
        self.claimed_amount = 0;
        self.stream_rate = stream_rate;
        self.start_time = args.now;
        self.end_time = args.loan.due_time;
        self.last_claim_time = args.now;
        self.bump = bump;

        Ok(())
    }

    pub fn fund(&mut self, amount: u64) -> Result<()> {
        require!(amount > 0, AxiomError::InvalidAmount);
        require!(
            self.claimed_amount < self.total_due,
            AxiomError::StreamAlreadyRepaid
        );

        self.funded_amount = self
            .funded_amount
            .checked_add(amount)
            .ok_or(error!(AxiomError::MathOverflow))?;

        Ok(())
    }

    pub fn accrued_amount(&self, now: i64) -> Result<u64> {
        if now <= self.start_time {
            return Ok(0);
        }

        let capped_now = now.min(self.end_time);
        let elapsed = capped_now
            .checked_sub(self.start_time)
            .ok_or(error!(AxiomError::MathOverflow))?;
        let elapsed_u64 = u64::try_from(elapsed).map_err(|_| error!(AxiomError::MathOverflow))?;

        let accrued = self
            .stream_rate
            .checked_mul(elapsed_u64)
            .ok_or(error!(AxiomError::MathOverflow))?;

        Ok(accrued.min(self.total_due))
    }

    pub fn claimable_amount(&self, now: i64) -> Result<u64> {
        let accrued_unclaimed = self
            .accrued_amount(now)?
            .checked_sub(self.claimed_amount)
            .ok_or(error!(AxiomError::MathOverflow))?;
        let funded_unclaimed = self
            .funded_amount
            .checked_sub(self.claimed_amount)
            .ok_or(error!(AxiomError::MathOverflow))?;

        Ok(accrued_unclaimed.min(funded_unclaimed))
    }

    pub fn claim(&mut self, loan: &mut Loan, now: i64) -> Result<u64> {
        let amount = self.claimable_amount(now)?;
        require!(amount > 0, AxiomError::NothingToClaim);

        self.claimed_amount = self
            .claimed_amount
            .checked_add(amount)
            .ok_or(error!(AxiomError::MathOverflow))?;
        self.last_claim_time = now;
        loan.apply_repayment(amount, now)?;

        Ok(amount)
    }

    pub fn close_stream(&self, loan: &mut Loan, now: i64) -> Result<()> {
        require!(
            self.claimed_amount >= self.total_due,
            AxiomError::StreamNotRepaid
        );
        loan.mark_repaid(now)
    }
}

pub struct RepaymentStreamArgs<'a> {
    pub loan_key: Pubkey,
    pub loan: &'a Loan,
    pub stream_vault: Pubkey,
    pub now: i64,
}

pub fn total_due(principal: u64, interest_rate_bps: u64, duration_seconds: u64) -> Result<u64> {
    let interest = principal
        .checked_mul(interest_rate_bps)
        .and_then(|value| value.checked_mul(duration_seconds))
        .ok_or(error!(AxiomError::MathOverflow))?;
    let denominator = BPS_DENOMINATOR
        .checked_mul(SECONDS_PER_YEAR)
        .ok_or(error!(AxiomError::MathOverflow))?;

    principal
        .checked_add(ceil_div(interest, denominator)?)
        .ok_or(error!(AxiomError::MathOverflow))
}

pub fn ceil_div(numerator: u64, denominator: u64) -> Result<u64> {
    require!(denominator > 0, AxiomError::MathOverflow);
    numerator
        .checked_add(denominator - 1)
        .ok_or(error!(AxiomError::MathOverflow))?
        .checked_div(denominator)
        .ok_or(error!(AxiomError::MathOverflow))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{CreditTier, USDT_UNIT};

    fn loan() -> Loan {
        Loan {
            borrower: Pubkey::new_unique(),
            principal: 1_000 * USDT_UNIT,
            interest_rate: CreditTier::Silver.interest_rate_bps(),
            collateral_mint: Pubkey::new_unique(),
            collateral_amount: 500 * USDT_UNIT,
            ika_dwallet: Pubkey::new_unique(),
            credit_tier: CreditTier::Silver,
            start_time: 1_000,
            due_time: 1_000 + (30 * crate::SECONDS_PER_DAY),
            amount_repaid: 0,
            last_repay_time: 1_000,
            stream_rate: 0,
            status: LoanStatus::Active,
            bump: 255,
        }
    }

    fn stream_for(loan: &Loan) -> RepaymentStream {
        let mut stream = RepaymentStream {
            loan: Pubkey::default(),
            borrower: Pubkey::default(),
            stream_vault: Pubkey::default(),
            total_due: 0,
            funded_amount: 0,
            claimed_amount: 0,
            stream_rate: 0,
            start_time: 0,
            end_time: 0,
            last_claim_time: 0,
            bump: 0,
        };
        stream
            .initialize(
                RepaymentStreamArgs {
                    loan_key: Pubkey::new_unique(),
                    loan,
                    stream_vault: Pubkey::new_unique(),
                    now: 1_000,
                },
                254,
            )
            .unwrap();
        stream
    }

    #[test]
    fn computes_total_due_with_interest() {
        let due = total_due(1_000 * USDT_UNIT, 1_200, 30 * 86_400).unwrap();

        assert!(due > 1_000 * USDT_UNIT);
        assert_eq!(due, 1_009_863_014);
    }

    #[test]
    fn initializes_stream_rate_from_loan_terms() {
        let loan = loan();
        let stream = stream_for(&loan);

        assert_eq!(stream.borrower, loan.borrower);
        assert_eq!(stream.total_due, 1_009_863_014);
        assert_eq!(stream.stream_rate, 390);
        assert_eq!(stream.start_time, 1_000);
        assert_eq!(stream.end_time, loan.due_time);
    }

    #[test]
    fn accrues_over_time_and_caps_at_total_due() {
        let loan = loan();
        let stream = stream_for(&loan);

        assert_eq!(stream.accrued_amount(1_000).unwrap(), 0);
        assert_eq!(stream.accrued_amount(1_100).unwrap(), 39_000);
        assert_eq!(
            stream.accrued_amount(loan.due_time + 10).unwrap(),
            stream.total_due
        );
    }

    #[test]
    fn underfunded_stream_claims_only_funded_amount() {
        let loan = loan();
        let mut stream = stream_for(&loan);
        stream.fund(100).unwrap();

        assert_eq!(stream.claimable_amount(loan.due_time).unwrap(), 100);
    }

    #[test]
    fn claim_updates_stream_and_loan_repayment() {
        let mut loan = loan();
        let mut stream = stream_for(&loan);
        stream.fund(stream.total_due).unwrap();

        let claimed = stream.claim(&mut loan, 1_100).unwrap();

        assert_eq!(claimed, 39_000);
        assert_eq!(stream.claimed_amount, 39_000);
        assert_eq!(stream.last_claim_time, 1_100);
        assert_eq!(loan.amount_repaid, 39_000);
        assert_eq!(loan.last_repay_time, 1_100);
        assert_eq!(loan.status, LoanStatus::Active);
    }

    #[test]
    fn close_requires_full_repayment() {
        let mut loan = loan();
        let stream = stream_for(&loan);

        let due_time = loan.due_time;
        let err = stream.close_stream(&mut loan, due_time).unwrap_err();

        assert_eq!(err, error!(AxiomError::StreamNotRepaid));
    }

    #[test]
    fn close_marks_loan_repaid_after_full_claim() {
        let mut loan = loan();
        let due_time = loan.due_time;
        let mut stream = stream_for(&loan);
        stream.fund(stream.total_due).unwrap();
        stream.claim(&mut loan, due_time).unwrap();

        stream.close_stream(&mut loan, due_time + 1).unwrap();

        assert_eq!(loan.status, LoanStatus::Repaid);
        assert_eq!(loan.last_repay_time, due_time + 1);
    }
}
