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
fn verify_groth16_backend(proof: &Groth16Proof) -> Result<()> {
    use groth16_solana::groth16::Groth16Verifier;

    use crate::verifying_key::VERIFYINGKEY;

    const PROOF_LEN: usize = 256;

    require!(
        proof.proof.len() == PROOF_LEN,
        AxiomError::InvalidCreditProof
    );

    let proof_a: [u8; 64] = proof.proof[0..64]
        .try_into()
        .map_err(|_| error!(AxiomError::InvalidCreditProof))?;
    let proof_b: [u8; 128] = proof.proof[64..192]
        .try_into()
        .map_err(|_| error!(AxiomError::InvalidCreditProof))?;
    let proof_c: [u8; 64] = proof.proof[192..256]
        .try_into()
        .map_err(|_| error!(AxiomError::InvalidCreditProof))?;
    let public_inputs: [[u8; 32]; CREDIT_PUBLIC_INPUT_COUNT] = proof
        .public_inputs
        .clone()
        .try_into()
        .map_err(|_| error!(AxiomError::InvalidPublicInputs))?;

    let mut verifier =
        Groth16Verifier::new(&proof_a, &proof_b, &proof_c, &public_inputs, &VERIFYINGKEY)
            .map_err(|_| error!(AxiomError::InvalidCreditProof))?;

    verifier
        .verify()
        .map_err(|_| error!(AxiomError::InvalidCreditProof))
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

#[cfg(all(test, not(feature = "mock-zk")))]
mod production_tests {
    use super::*;

    #[test]
    fn verifies_generated_silver_fixture() {
        let proof = include_bytes!("../../../tests/fixtures/zk/silver.proof.bin");
        let public_inputs = vec![
            [
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 2, 88,
            ],
            [
                1, 42, 221, 160, 51, 197, 19, 238, 4, 153, 82, 85, 128, 32, 27, 119, 62, 6,
                123, 127, 208, 209, 205, 170, 236, 119, 19, 76, 201, 127, 18, 204,
            ],
            [
                37, 26, 33, 17, 3, 148, 9, 63, 119, 183, 225, 110, 137, 211, 172, 201, 203, 19,
                204, 231, 85, 221, 159, 94, 59, 170, 87, 203, 236, 2, 9, 225,
            ],
        ];

        verify_credit_proof(proof, public_inputs, CreditTier::Silver).unwrap();
    }
}
