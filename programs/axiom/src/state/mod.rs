pub mod collateral_escrow;
pub mod credit_proof;
pub mod dispute;
pub mod ika_policy;
pub mod lender_position;
pub mod lending_pool;
pub mod liquidation;
pub mod loan;
pub mod repayment_stream;
pub mod reputation;

pub use collateral_escrow::*;
pub use credit_proof::*;
pub use dispute::*;
pub use ika_policy::*;
pub use lender_position::*;
pub use lending_pool::*;
pub use liquidation::*;
pub use loan::*;
pub use repayment_stream::*;
pub use reputation::*;

#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::{AnchorDeserialize, AnchorSerialize};

    #[test]
    fn account_space_constants_include_discriminator() {
        assert_eq!(LendingPool::LEN, 153);
        assert_eq!(Loan::LEN, 171);
        assert_eq!(CollateralEscrow::LEN, 148);
        assert_eq!(CreditProof::LEN, 98);
        assert_eq!(Dispute::LEN, 291);
        assert_eq!(Arbitrator::LEN, 54);
        assert_eq!(IkaPolicy::LEN, 197);
        assert_eq!(LenderPosition::LEN, 97);
        assert_eq!(LiquidationState::LEN, 82);
        assert_eq!(ReputationAccount::LEN, 125);
        assert_eq!(RepaymentStream::LEN, 161);
    }

    #[test]
    fn serializes_credit_tiers() {
        let mut data = Vec::new();
        CreditTier::Gold.serialize(&mut data).unwrap();

        assert_eq!(CreditTier::try_from_slice(&data).unwrap(), CreditTier::Gold);
        assert_eq!(data.len(), 1);
    }

    #[test]
    fn serializes_loan_statuses() {
        let mut data = Vec::new();
        LoanStatus::Liquidated.serialize(&mut data).unwrap();

        assert_eq!(
            LoanStatus::try_from_slice(&data).unwrap(),
            LoanStatus::Liquidated
        );
        assert_eq!(data.len(), 1);
    }
}
