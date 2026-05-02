use anchor_lang::prelude::*;
use solana_keccak_hasher::hash;

use crate::{AxiomError, CreditTier, AXIOM_CREDIT_MODEL_HASH};

pub const CREDIT_PUBLIC_INPUT_COUNT: usize = 3;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct Groth16Proof {
    pub proof: Vec<u8>,
    pub public_inputs: Vec<[u8; 32]>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct CreditProofPublicInputs {
    pub tier_threshold: [u8; 32],
    pub wallet_hash: [u8; 32],
    pub model_hash: [u8; 32],
}

impl CreditProofPublicInputs {
    pub fn to_vec(self) -> Vec<[u8; 32]> {
        vec![self.tier_threshold, self.wallet_hash, self.model_hash]
    }
}

pub fn build_credit_public_inputs(tier: CreditTier, wallet: Pubkey) -> CreditProofPublicInputs {
    CreditProofPublicInputs {
        tier_threshold: tier.threshold_score().to_be_bytes_32(),
        wallet_hash: hash(wallet.as_ref()).to_bytes(),
        model_hash: AXIOM_CREDIT_MODEL_HASH,
    }
}

pub fn verify_credit_proof(proof: &[u8], tier: CreditTier, wallet: Pubkey) -> Result<()> {
    let public_inputs = build_credit_public_inputs(tier, wallet).to_vec();
    verify_groth16(Groth16Proof {
        proof: proof.to_vec(),
        public_inputs,
    })
}

pub fn verify_groth16(proof: Groth16Proof) -> Result<()> {
    require!(
        proof.public_inputs.len() == CREDIT_PUBLIC_INPUT_COUNT,
        AxiomError::InvalidPublicInputs
    );
    require!(!proof.proof.is_empty(), AxiomError::InvalidCreditProof);
    require!(
        proof.public_inputs[0] != [0; 32],
        AxiomError::InvalidPublicInputs
    );
    require!(
        proof.public_inputs[1] != [0; 32],
        AxiomError::InvalidPublicInputs
    );
    require!(
        proof.public_inputs[2] == AXIOM_CREDIT_MODEL_HASH,
        AxiomError::InvalidPublicInputs
    );

    mock_verify_groth16(&proof)
}

fn mock_verify_groth16(proof: &Groth16Proof) -> Result<()> {
    require!(proof.proof != b"reject", AxiomError::InvalidCreditProof);
    Ok(())
}

trait ToBytes32 {
    fn to_be_bytes_32(self) -> [u8; 32];
}

impl ToBytes32 for u16 {
    fn to_be_bytes_32(self) -> [u8; 32] {
        let mut bytes = [0; 32];
        bytes[30..].copy_from_slice(&self.to_be_bytes());
        bytes
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_expected_public_inputs() {
        let wallet = Pubkey::new_unique();
        let inputs = build_credit_public_inputs(CreditTier::Gold, wallet);

        assert_eq!(inputs.tier_threshold[30..], 750_u16.to_be_bytes());
        assert_eq!(inputs.wallet_hash, hash(wallet.as_ref()).to_bytes());
        assert_eq!(inputs.model_hash, AXIOM_CREDIT_MODEL_HASH);
    }

    #[test]
    fn accepts_mock_credit_proof() {
        verify_credit_proof(b"demo-proof", CreditTier::Silver, Pubkey::new_unique()).unwrap();
    }

    #[test]
    fn rejects_empty_mock_credit_proof() {
        let err = verify_credit_proof(&[], CreditTier::Silver, Pubkey::new_unique()).unwrap_err();

        assert_eq!(err, error!(AxiomError::InvalidCreditProof));
    }

    #[test]
    fn rejects_mock_rejection_marker() {
        let err =
            verify_credit_proof(b"reject", CreditTier::Silver, Pubkey::new_unique()).unwrap_err();

        assert_eq!(err, error!(AxiomError::InvalidCreditProof));
    }

    #[test]
    fn rejects_wrong_model_hash_public_input() {
        let wallet = Pubkey::new_unique();
        let mut public_inputs = build_credit_public_inputs(CreditTier::Silver, wallet).to_vec();
        public_inputs[2] = [9; 32];

        let err = verify_groth16(Groth16Proof {
            proof: b"demo-proof".to_vec(),
            public_inputs,
        })
        .unwrap_err();

        assert_eq!(err, error!(AxiomError::InvalidPublicInputs));
    }
}
