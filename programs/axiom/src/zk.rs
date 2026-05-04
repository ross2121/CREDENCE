use anchor_lang::prelude::*;

use crate::{AxiomError, CreditTier};

pub const CREDIT_PUBLIC_INPUT_COUNT: usize = 3;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct Groth16Proof {
    pub proof: Vec<u8>,
    pub public_inputs: Vec<[u8; 32]>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct CreditProofPublicInputs {
    pub tier_threshold: [u8; 32],
    pub wallet_commitment: [u8; 32],
    pub model_commitment: [u8; 32],
}

impl CreditProofPublicInputs {
    pub fn to_vec(self) -> Vec<[u8; 32]> {
        vec![
            self.tier_threshold,
            self.wallet_commitment,
            self.model_commitment,
        ]
    }
}

pub fn credit_public_inputs_from_vec(
    public_inputs: Vec<[u8; 32]>,
) -> Result<CreditProofPublicInputs> {
    require!(
        public_inputs.len() == CREDIT_PUBLIC_INPUT_COUNT,
        AxiomError::InvalidPublicInputs
    );

    CreditProofPublicInputs {
        tier_threshold: public_inputs[0],
        wallet_commitment: public_inputs[1],
        model_commitment: public_inputs[2],
    }
    .validate()
}

impl CreditProofPublicInputs {
    pub fn validate(self) -> Result<Self> {
        require!(
            self.tier_threshold != [0; 32],
            AxiomError::InvalidPublicInputs
        );
        require!(
            self.wallet_commitment != [0; 32],
            AxiomError::InvalidPublicInputs
        );
        require!(
            self.model_commitment != [0; 32],
            AxiomError::InvalidPublicInputs
        );

        Ok(self)
    }
}

pub fn build_credit_public_inputs_for_test(tier: CreditTier) -> CreditProofPublicInputs {
    CreditProofPublicInputs {
        tier_threshold: tier.threshold_score().to_be_bytes_32(),
        wallet_commitment: [7; 32],
        model_commitment: [8; 32],
    }
}

pub fn verify_credit_proof(
    proof: &[u8],
    public_inputs: Vec<[u8; 32]>,
    tier: CreditTier,
) -> Result<()> {
    let inputs = credit_public_inputs_from_vec(public_inputs)?;
    require!(
        inputs.tier_threshold == tier.threshold_score().to_be_bytes_32(),
        AxiomError::InvalidPublicInputs
    );

    verify_groth16(Groth16Proof {
        proof: proof.to_vec(),
        public_inputs: inputs.to_vec(),
    })
}

pub fn verify_groth16(proof: Groth16Proof) -> Result<()> {
    require!(
        proof.public_inputs.len() == CREDIT_PUBLIC_INPUT_COUNT,
        AxiomError::InvalidPublicInputs
    );
    require!(!proof.proof.is_empty(), AxiomError::InvalidCreditProof);
    credit_public_inputs_from_vec(proof.public_inputs.clone())?;

    verify_groth16_backend(&proof)
}

#[cfg(feature = "mock-zk")]
fn verify_groth16_backend(proof: &Groth16Proof) -> Result<()> {
    require!(proof.proof != b"reject", AxiomError::InvalidCreditProof);
    Ok(())
}

#[cfg(not(feature = "mock-zk"))]
fn verify_groth16_backend(_proof: &Groth16Proof) -> Result<()> {
    err!(AxiomError::ProductionVerifierUnavailable)
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
    fn builds_expected_public_inputs_for_test() {
        let inputs = build_credit_public_inputs_for_test(CreditTier::Gold);

        assert_eq!(inputs.tier_threshold[30..], 750_u16.to_be_bytes());
        assert_eq!(inputs.wallet_commitment, [7; 32]);
        assert_eq!(inputs.model_commitment, [8; 32]);
    }

    #[test]
    fn accepts_mock_credit_proof() {
        verify_credit_proof(
            b"demo-proof",
            build_credit_public_inputs_for_test(CreditTier::Silver).to_vec(),
            CreditTier::Silver,
        )
        .unwrap();
    }

    #[test]
    fn rejects_empty_mock_credit_proof() {
        let err = verify_credit_proof(
            &[],
            build_credit_public_inputs_for_test(CreditTier::Silver).to_vec(),
            CreditTier::Silver,
        )
        .unwrap_err();

        assert_eq!(err, error!(AxiomError::InvalidCreditProof));
    }

    #[test]
    fn rejects_mock_rejection_marker() {
        let err = verify_credit_proof(
            b"reject",
            build_credit_public_inputs_for_test(CreditTier::Silver).to_vec(),
            CreditTier::Silver,
        )
        .unwrap_err();

        assert_eq!(err, error!(AxiomError::InvalidCreditProof));
    }

    #[test]
    fn rejects_wrong_tier_threshold_public_input() {
        let public_inputs = build_credit_public_inputs_for_test(CreditTier::Bronze).to_vec();

        let err =
            verify_credit_proof(b"demo-proof", public_inputs, CreditTier::Silver).unwrap_err();

        assert_eq!(err, error!(AxiomError::InvalidPublicInputs));
    }

    #[test]
    fn rejects_zero_commitment_public_input() {
        let mut public_inputs = build_credit_public_inputs_for_test(CreditTier::Silver).to_vec();
        public_inputs[1] = [0; 32];

        let err =
            verify_credit_proof(b"demo-proof", public_inputs, CreditTier::Silver).unwrap_err();

        assert_eq!(err, error!(AxiomError::InvalidPublicInputs));
    }

    #[test]
    fn rejects_wrong_public_input_count() {
        let err = verify_groth16(Groth16Proof {
            proof: b"demo-proof".to_vec(),
            public_inputs: vec![[1; 32], [2; 32]],
        })
        .unwrap_err();

        assert_eq!(err, error!(AxiomError::InvalidPublicInputs));
    }
}
