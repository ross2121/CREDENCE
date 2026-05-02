use anchor_lang::prelude::*;

use crate::{
    AxiomError, Loan, LoanStatus, INITIAL_REPUTATION_SCORE, MAX_REPUTATION_SCORE,
    REPUTATION_DEFAULT_SLASH, REPUTATION_SUCCESS_BONUS,
};

#[account]
#[derive(InitSpace)]
pub struct ReputationAccount {
    pub wallet: Pubkey,
    pub nft_mint: Pubkey,
    pub score: u64,
    pub loans_taken: u32,
    pub loans_repaid_on_time: u32,
    pub loans_defaulted: u32,
    pub total_borrowed_usdt: u64,
    pub total_repaid_usdt: u64,
    pub stake: u64,
    pub last_updated: i64,
    pub bump: u8,
}

impl ReputationAccount {
    pub const LEN: usize = 8 + Self::INIT_SPACE;

    pub fn initialize(&mut self, wallet: Pubkey, nft_mint: Pubkey, now: i64, bump: u8) {
        self.wallet = wallet;
        self.nft_mint = nft_mint;
        self.score = INITIAL_REPUTATION_SCORE;
        self.loans_taken = 0;
        self.loans_repaid_on_time = 0;
        self.loans_defaulted = 0;
        self.total_borrowed_usdt = 0;
        self.total_repaid_usdt = 0;
        self.stake = 0;
        self.last_updated = now;
        self.bump = bump;
    }

    pub fn record_loan_taken(&mut self, loan: &Loan, now: i64) -> Result<()> {
        require!(loan.borrower == self.wallet, AxiomError::Unauthorized);

        self.loans_taken = self
            .loans_taken
            .checked_add(1)
            .ok_or(error!(AxiomError::MathOverflow))?;
        self.total_borrowed_usdt = self
            .total_borrowed_usdt
            .checked_add(loan.principal)
            .ok_or(error!(AxiomError::MathOverflow))?;
        self.last_updated = now;

        Ok(())
    }

    pub fn record_successful_repayment(&mut self, loan: &Loan, now: i64) -> Result<()> {
        require!(loan.borrower == self.wallet, AxiomError::Unauthorized);
        require!(
            loan.status == LoanStatus::Repaid,
            AxiomError::InvalidLoanStatus
        );

        self.score = self
            .score
            .checked_add(REPUTATION_SUCCESS_BONUS)
            .ok_or(error!(AxiomError::MathOverflow))?
            .min(MAX_REPUTATION_SCORE);
        self.loans_repaid_on_time = self
            .loans_repaid_on_time
            .checked_add(1)
            .ok_or(error!(AxiomError::MathOverflow))?;
        self.total_repaid_usdt = self
            .total_repaid_usdt
            .checked_add(loan.amount_repaid)
            .ok_or(error!(AxiomError::MathOverflow))?;
        self.last_updated = now;

        Ok(())
    }

    pub fn slash_for_default(&mut self, loan: &Loan, now: i64) -> Result<()> {
        require!(loan.borrower == self.wallet, AxiomError::Unauthorized);
        require!(
            loan.status == LoanStatus::Defaulted || loan.status == LoanStatus::Liquidated,
            AxiomError::InvalidLoanStatus
        );

        self.score = self.score.saturating_sub(REPUTATION_DEFAULT_SLASH);
        self.loans_defaulted = self
            .loans_defaulted
            .checked_add(1)
            .ok_or(error!(AxiomError::MathOverflow))?;
        self.stake = self.stake.saturating_sub(REPUTATION_DEFAULT_SLASH);
        self.last_updated = now;

        Ok(())
    }

    pub fn stake_bond(&mut self, amount: u64, now: i64) -> Result<()> {
        require!(amount > 0, AxiomError::InvalidAmount);

        self.stake = self
            .stake
            .checked_add(amount)
            .ok_or(error!(AxiomError::MathOverflow))?;
        self.last_updated = now;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{CreditTier, USDT_UNIT};

    fn reputation(wallet: Pubkey) -> ReputationAccount {
        let mut reputation = ReputationAccount {
            wallet: Pubkey::default(),
            nft_mint: Pubkey::default(),
            score: 0,
            loans_taken: 0,
            loans_repaid_on_time: 0,
            loans_defaulted: 0,
            total_borrowed_usdt: 0,
            total_repaid_usdt: 0,
            stake: 0,
            last_updated: 0,
            bump: 0,
        };
        reputation.initialize(wallet, Pubkey::new_unique(), 100, 255);
        reputation
    }

    fn loan(wallet: Pubkey, status: LoanStatus) -> Loan {
        Loan {
            borrower: wallet,
            principal: 1_000 * USDT_UNIT,
            interest_rate: CreditTier::Silver.interest_rate_bps(),
            collateral_mint: Pubkey::new_unique(),
            collateral_amount: 500 * USDT_UNIT,
            ika_dwallet: Pubkey::new_unique(),
            credit_tier: CreditTier::Silver,
            start_time: 100,
            due_time: 200,
            amount_repaid: 1_010 * USDT_UNIT,
            last_repay_time: 200,
            stream_rate: 0,
            status,
            bump: 254,
        }
    }

    #[test]
    fn initializes_reputation_account() {
        let wallet = Pubkey::new_unique();
        let nft_mint = Pubkey::new_unique();
        let mut reputation = reputation(wallet);
        reputation.initialize(wallet, nft_mint, 123, 7);

        assert_eq!(reputation.wallet, wallet);
        assert_eq!(reputation.nft_mint, nft_mint);
        assert_eq!(reputation.score, INITIAL_REPUTATION_SCORE);
        assert_eq!(reputation.loans_taken, 0);
        assert_eq!(reputation.stake, 0);
        assert_eq!(reputation.last_updated, 123);
        assert_eq!(reputation.bump, 7);
    }

    #[test]
    fn records_loan_taken() {
        let wallet = Pubkey::new_unique();
        let mut reputation = reputation(wallet);
        let loan = loan(wallet, LoanStatus::Active);

        reputation.record_loan_taken(&loan, 150).unwrap();

        assert_eq!(reputation.loans_taken, 1);
        assert_eq!(reputation.total_borrowed_usdt, loan.principal);
        assert_eq!(reputation.last_updated, 150);
    }

    #[test]
    fn successful_repayment_increases_score_and_counters() {
        let wallet = Pubkey::new_unique();
        let mut reputation = reputation(wallet);
        let loan = loan(wallet, LoanStatus::Repaid);

        reputation.record_successful_repayment(&loan, 250).unwrap();

        assert_eq!(
            reputation.score,
            INITIAL_REPUTATION_SCORE + REPUTATION_SUCCESS_BONUS
        );
        assert_eq!(reputation.loans_repaid_on_time, 1);
        assert_eq!(reputation.total_repaid_usdt, loan.amount_repaid);
        assert_eq!(reputation.last_updated, 250);
    }

    #[test]
    fn successful_repayment_score_caps_at_max() {
        let wallet = Pubkey::new_unique();
        let mut reputation = reputation(wallet);
        let loan = loan(wallet, LoanStatus::Repaid);
        reputation.score = MAX_REPUTATION_SCORE - 10;

        reputation.record_successful_repayment(&loan, 250).unwrap();

        assert_eq!(reputation.score, MAX_REPUTATION_SCORE);
    }

    #[test]
    fn slash_reduces_score_stake_and_counts_default() {
        let wallet = Pubkey::new_unique();
        let mut reputation = reputation(wallet);
        let loan = loan(wallet, LoanStatus::Defaulted);
        reputation.stake_bond(1_000, 125).unwrap();

        reputation.slash_for_default(&loan, 300).unwrap();

        assert_eq!(
            reputation.score,
            INITIAL_REPUTATION_SCORE - REPUTATION_DEFAULT_SLASH
        );
        assert_eq!(reputation.stake, 1_000 - REPUTATION_DEFAULT_SLASH);
        assert_eq!(reputation.loans_defaulted, 1);
        assert_eq!(reputation.last_updated, 300);
    }

    #[test]
    fn staking_updates_stake_accounting() {
        let wallet = Pubkey::new_unique();
        let mut reputation = reputation(wallet);

        reputation.stake_bond(250 * USDT_UNIT, 400).unwrap();

        assert_eq!(reputation.stake, 250 * USDT_UNIT);
        assert_eq!(reputation.last_updated, 400);
    }
}
