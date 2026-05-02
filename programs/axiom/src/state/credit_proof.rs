use anchor_lang::prelude::*;

use crate::{AxiomError, BPS_DENOMINATOR, USDT_UNIT};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, Eq, InitSpace, PartialEq)]
pub enum CreditTier {
    Bronze,
    Silver,
    Gold,
    Platinum,
}

impl CreditTier {
    pub const fn threshold_score(self) -> u16 {
        match self {
            Self::Bronze => 400,
            Self::Silver => 600,
            Self::Gold => 750,
            Self::Platinum => 900,
        }
    }

    pub const fn max_loan_usdt(self) -> u64 {
        match self {
            Self::Bronze => 500 * USDT_UNIT,
            Self::Silver => 2_000 * USDT_UNIT,
            Self::Gold => 10_000 * USDT_UNIT,
            Self::Platinum => 50_000 * USDT_UNIT,
        }
    }

    pub const fn collateral_bps(self) -> u64 {
        match self {
            Self::Bronze => 8_000,
            Self::Silver => 5_000,
            Self::Gold => 2_500,
            Self::Platinum => 1_000,
        }
    }

    pub const fn interest_rate_bps(self) -> u64 {
        match self {
            Self::Bronze => 1_800,
            Self::Silver => 1_200,
            Self::Gold => 800,
            Self::Platinum => 500,
        }
    }

    pub fn required_collateral(self, principal: u64) -> Result<u64> {
        let numerator = principal
            .checked_mul(self.collateral_bps())
            .and_then(|value| value.checked_add(BPS_DENOMINATOR - 1))
            .ok_or(error!(AxiomError::MathOverflow))?;

        numerator
            .checked_div(BPS_DENOMINATOR)
            .ok_or(error!(AxiomError::MathOverflow))
    }

    pub fn validate_max_loan(self, amount: u64) -> Result<()> {
        require!(
            amount <= self.max_loan_usdt(),
            AxiomError::LoanExceedsTierLimit
        );
        Ok(())
    }

    pub fn validate_collateral(self, principal: u64, collateral_amount: u64) -> Result<()> {
        require!(
            collateral_amount >= self.required_collateral(principal)?,
            AxiomError::InsufficientCollateral
        );
        Ok(())
    }
}

#[account]
#[derive(InitSpace)]
pub struct CreditProof {
    pub wallet: Pubkey,
    pub tier: CreditTier,
    pub zk_proof_hash: [u8; 32],
    pub issued_at: i64,
    pub expires_at: i64,
    pub max_loan_usdt: u64,
    pub bump: u8,
}

impl CreditProof {
    pub const LEN: usize = 8 + Self::INIT_SPACE;

    pub fn validate_for_loan(&self, borrower: Pubkey, amount: u64, now: i64) -> Result<()> {
        require!(self.wallet == borrower, AxiomError::InvalidCreditProofOwner);
        require!(self.expires_at > now, AxiomError::CreditProofExpired);
        require!(
            amount <= self.max_loan_usdt,
            AxiomError::LoanExceedsTierLimit
        );
        self.tier.validate_max_loan(amount)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tier_limits_match_protocol_table() {
        assert_eq!(CreditTier::Bronze.max_loan_usdt(), 500 * USDT_UNIT);
        assert_eq!(CreditTier::Silver.max_loan_usdt(), 2_000 * USDT_UNIT);
        assert_eq!(CreditTier::Gold.max_loan_usdt(), 10_000 * USDT_UNIT);
        assert_eq!(CreditTier::Platinum.max_loan_usdt(), 50_000 * USDT_UNIT);

        assert_eq!(CreditTier::Bronze.collateral_bps(), 8_000);
        assert_eq!(CreditTier::Silver.collateral_bps(), 5_000);
        assert_eq!(CreditTier::Gold.collateral_bps(), 2_500);
        assert_eq!(CreditTier::Platinum.collateral_bps(), 1_000);

        assert_eq!(CreditTier::Bronze.interest_rate_bps(), 1_800);
        assert_eq!(CreditTier::Silver.interest_rate_bps(), 1_200);
        assert_eq!(CreditTier::Gold.interest_rate_bps(), 800);
        assert_eq!(CreditTier::Platinum.interest_rate_bps(), 500);
    }

    #[test]
    fn rejects_loan_above_tier_limit() {
        let err = CreditTier::Bronze
            .validate_max_loan(501 * USDT_UNIT)
            .unwrap_err();

        assert_eq!(err, error!(AxiomError::LoanExceedsTierLimit));
    }

    #[test]
    fn computes_required_collateral_with_rounding_up() {
        assert_eq!(CreditTier::Gold.required_collateral(10_000).unwrap(), 2_500);
        assert_eq!(CreditTier::Platinum.required_collateral(1).unwrap(), 1);
    }

    #[test]
    fn rejects_insufficient_collateral() {
        let principal = 2_000 * USDT_UNIT;
        let collateral = (1_000 * USDT_UNIT) - 1;
        let err = CreditTier::Silver
            .validate_collateral(principal, collateral)
            .unwrap_err();

        assert_eq!(err, error!(AxiomError::InsufficientCollateral));
    }

    #[test]
    fn validates_live_credit_proof_for_borrower() {
        let borrower = Pubkey::new_unique();
        let proof = CreditProof {
            wallet: borrower,
            tier: CreditTier::Gold,
            zk_proof_hash: [7; 32],
            issued_at: 100,
            expires_at: 200,
            max_loan_usdt: 5_000 * USDT_UNIT,
            bump: 255,
        };

        proof
            .validate_for_loan(borrower, 5_000 * USDT_UNIT, 150)
            .unwrap();
    }

    #[test]
    fn rejects_expired_credit_proof() {
        let borrower = Pubkey::new_unique();
        let proof = CreditProof {
            wallet: borrower,
            tier: CreditTier::Gold,
            zk_proof_hash: [7; 32],
            issued_at: 100,
            expires_at: 200,
            max_loan_usdt: 5_000 * USDT_UNIT,
            bump: 255,
        };

        let err = proof
            .validate_for_loan(borrower, 1_000 * USDT_UNIT, 200)
            .unwrap_err();

        assert_eq!(err, error!(AxiomError::CreditProofExpired));
    }
}
