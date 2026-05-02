use anchor_lang::prelude::*;

use crate::{AxiomError, ARBITRATOR_STAKE_REQUIREMENT, DISPUTE_MAX_VOTES, DISPUTE_QUORUM};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, Eq, InitSpace, PartialEq)]
pub enum DisputeStatus {
    Open,
    Finalized,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, Eq, InitSpace, PartialEq)]
pub enum DisputeRuling {
    Borrower,
    Lender,
}

#[account]
#[derive(InitSpace)]
pub struct Dispute {
    pub loan: Pubkey,
    pub opener: Pubkey,
    pub evidence_hash: [u8; 32],
    pub opened_at: i64,
    pub finalized_at: i64,
    pub status: DisputeStatus,
    pub final_ruling: DisputeRuling,
    pub arbitrators: [Pubkey; DISPUTE_MAX_VOTES],
    pub rulings: [DisputeRuling; DISPUTE_MAX_VOTES],
    pub vote_count: u8,
    pub borrower_votes: u8,
    pub lender_votes: u8,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Arbitrator {
    pub authority: Pubkey,
    pub stake: u64,
    pub disputes_voted: u32,
    pub active: bool,
    pub bump: u8,
}

impl Dispute {
    pub const LEN: usize = 8 + Self::INIT_SPACE;

    pub fn open(
        &mut self,
        loan: Pubkey,
        opener: Pubkey,
        evidence_hash: [u8; 32],
        now: i64,
        bump: u8,
    ) {
        self.loan = loan;
        self.opener = opener;
        self.evidence_hash = evidence_hash;
        self.opened_at = now;
        self.finalized_at = 0;
        self.status = DisputeStatus::Open;
        self.final_ruling = DisputeRuling::Borrower;
        self.arbitrators = [Pubkey::default(); DISPUTE_MAX_VOTES];
        self.rulings = [DisputeRuling::Borrower; DISPUTE_MAX_VOTES];
        self.vote_count = 0;
        self.borrower_votes = 0;
        self.lender_votes = 0;
        self.bump = bump;
    }

    pub fn submit_vote(&mut self, arbitrator: Pubkey, ruling: DisputeRuling) -> Result<()> {
        require!(
            self.status == DisputeStatus::Open,
            AxiomError::DisputeNotOpen
        );
        require!(
            !self.has_voted(arbitrator),
            AxiomError::DuplicateArbitrationVote
        );
        require!(
            (self.vote_count as usize) < DISPUTE_MAX_VOTES,
            AxiomError::DisputeVoteCapacityReached
        );

        let index = self.vote_count as usize;
        self.arbitrators[index] = arbitrator;
        self.rulings[index] = ruling;
        self.vote_count = self
            .vote_count
            .checked_add(1)
            .ok_or(error!(AxiomError::MathOverflow))?;

        match ruling {
            DisputeRuling::Borrower => {
                self.borrower_votes = self
                    .borrower_votes
                    .checked_add(1)
                    .ok_or(error!(AxiomError::MathOverflow))?;
            }
            DisputeRuling::Lender => {
                self.lender_votes = self
                    .lender_votes
                    .checked_add(1)
                    .ok_or(error!(AxiomError::MathOverflow))?;
            }
        }

        Ok(())
    }

    pub fn finalize(&mut self, now: i64) -> Result<DisputeRuling> {
        require!(
            self.status == DisputeStatus::Open,
            AxiomError::DisputeNotOpen
        );
        require!(
            self.vote_count >= DISPUTE_QUORUM,
            AxiomError::DisputeQuorumNotReached
        );

        self.final_ruling = if self.borrower_votes >= self.lender_votes {
            DisputeRuling::Borrower
        } else {
            DisputeRuling::Lender
        };
        self.status = DisputeStatus::Finalized;
        self.finalized_at = now;

        Ok(self.final_ruling)
    }

    pub fn has_voted(&self, arbitrator: Pubkey) -> bool {
        self.arbitrators
            .iter()
            .take(self.vote_count as usize)
            .any(|voter| *voter == arbitrator)
    }
}

impl Arbitrator {
    pub const LEN: usize = 8 + Self::INIT_SPACE;

    pub fn register(&mut self, authority: Pubkey, stake: u64, bump: u8) -> Result<()> {
        require!(
            stake >= ARBITRATOR_STAKE_REQUIREMENT,
            AxiomError::InsufficientArbitratorStake
        );

        self.authority = authority;
        self.stake = stake;
        self.disputes_voted = 0;
        self.active = true;
        self.bump = bump;

        Ok(())
    }

    pub fn record_vote(&mut self) -> Result<()> {
        require!(self.active, AxiomError::Unauthorized);
        require!(
            self.stake >= ARBITRATOR_STAKE_REQUIREMENT,
            AxiomError::InsufficientArbitratorStake
        );

        self.disputes_voted = self
            .disputes_voted
            .checked_add(1)
            .ok_or(error!(AxiomError::MathOverflow))?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn dispute() -> Dispute {
        let mut dispute = Dispute {
            loan: Pubkey::default(),
            opener: Pubkey::default(),
            evidence_hash: [0; 32],
            opened_at: 0,
            finalized_at: 0,
            status: DisputeStatus::Finalized,
            final_ruling: DisputeRuling::Borrower,
            arbitrators: [Pubkey::default(); DISPUTE_MAX_VOTES],
            rulings: [DisputeRuling::Borrower; DISPUTE_MAX_VOTES],
            vote_count: 0,
            borrower_votes: 0,
            lender_votes: 0,
            bump: 0,
        };
        dispute.open(
            Pubkey::new_unique(),
            Pubkey::new_unique(),
            [8; 32],
            100,
            255,
        );
        dispute
    }

    #[test]
    fn opens_dispute_with_evidence_hash() {
        let loan = Pubkey::new_unique();
        let opener = Pubkey::new_unique();
        let mut dispute = dispute();

        dispute.open(loan, opener, [3; 32], 123, 7);

        assert_eq!(dispute.loan, loan);
        assert_eq!(dispute.opener, opener);
        assert_eq!(dispute.evidence_hash, [3; 32]);
        assert_eq!(dispute.opened_at, 123);
        assert_eq!(dispute.status, DisputeStatus::Open);
        assert_eq!(dispute.vote_count, 0);
        assert_eq!(dispute.bump, 7);
    }

    #[test]
    fn arbitrator_registration_requires_stake() {
        let mut arbitrator = Arbitrator {
            authority: Pubkey::default(),
            stake: 0,
            disputes_voted: 0,
            active: false,
            bump: 0,
        };

        let err = arbitrator
            .register(Pubkey::new_unique(), ARBITRATOR_STAKE_REQUIREMENT - 1, 1)
            .unwrap_err();

        assert_eq!(err, error!(AxiomError::InsufficientArbitratorStake));
    }

    #[test]
    fn records_arbitration_votes_and_prevents_duplicates() {
        let mut dispute = dispute();
        let arbitrator = Pubkey::new_unique();

        dispute
            .submit_vote(arbitrator, DisputeRuling::Borrower)
            .unwrap();

        assert_eq!(dispute.vote_count, 1);
        assert_eq!(dispute.borrower_votes, 1);
        assert!(dispute.has_voted(arbitrator));

        let err = dispute
            .submit_vote(arbitrator, DisputeRuling::Lender)
            .unwrap_err();

        assert_eq!(err, error!(AxiomError::DuplicateArbitrationVote));
    }

    #[test]
    fn finalization_requires_quorum() {
        let mut dispute = dispute();
        dispute
            .submit_vote(Pubkey::new_unique(), DisputeRuling::Borrower)
            .unwrap();

        let err = dispute.finalize(200).unwrap_err();

        assert_eq!(err, error!(AxiomError::DisputeQuorumNotReached));
    }

    #[test]
    fn finalizes_after_three_votes_with_majority() {
        let mut dispute = dispute();
        dispute
            .submit_vote(Pubkey::new_unique(), DisputeRuling::Borrower)
            .unwrap();
        dispute
            .submit_vote(Pubkey::new_unique(), DisputeRuling::Lender)
            .unwrap();
        dispute
            .submit_vote(Pubkey::new_unique(), DisputeRuling::Lender)
            .unwrap();

        let ruling = dispute.finalize(250).unwrap();

        assert_eq!(ruling, DisputeRuling::Lender);
        assert_eq!(dispute.status, DisputeStatus::Finalized);
        assert_eq!(dispute.finalized_at, 250);
    }

    #[test]
    fn arbitrator_vote_counter_tracks_participation() {
        let mut arbitrator = Arbitrator {
            authority: Pubkey::default(),
            stake: 0,
            disputes_voted: 0,
            active: false,
            bump: 0,
        };
        arbitrator
            .register(Pubkey::new_unique(), ARBITRATOR_STAKE_REQUIREMENT, 9)
            .unwrap();

        arbitrator.record_vote().unwrap();

        assert_eq!(arbitrator.disputes_voted, 1);
        assert_eq!(arbitrator.stake, ARBITRATOR_STAKE_REQUIREMENT);
        assert!(arbitrator.active);
        assert_eq!(arbitrator.bump, 9);
    }
}
