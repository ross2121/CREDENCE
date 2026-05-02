use anchor_lang::prelude::*;

use crate::IkaPolicy;

pub fn mock_ika_verify_policy(
    policy: &IkaPolicy,
    dwallet: Pubkey,
    destination: Pubkey,
    amount: u64,
) -> Result<()> {
    policy.verify_action(dwallet, destination, amount)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{IkaPolicyArgs, IkaPolicyKind, MAX_IKA_DESTINATIONS, ORIGIN_CHAIN_BYTES};

    #[test]
    fn mock_verifier_delegates_to_policy_checks() {
        let owner = Pubkey::new_unique();
        let dwallet = Pubkey::new_unique();
        let destination = Pubkey::new_unique();
        let mut destinations = [Pubkey::default(); MAX_IKA_DESTINATIONS];
        destinations[0] = destination;
        let mut policy = IkaPolicy {
            owner: Pubkey::default(),
            dwallet: Pubkey::default(),
            kind: IkaPolicyKind::Lender,
            allowed_destinations: [Pubkey::default(); MAX_IKA_DESTINATIONS],
            allowed_count: 0,
            max_transaction_amount: 0,
            cross_chain: false,
            origin_chain: [0; ORIGIN_CHAIN_BYTES],
            active: false,
            bump: 0,
        };
        policy
            .initialize(
                IkaPolicyArgs {
                    owner,
                    dwallet,
                    kind: IkaPolicyKind::Lender,
                    allowed_destinations: destinations,
                    allowed_count: 1,
                    max_transaction_amount: 1_000,
                    cross_chain: false,
                    origin_chain: [0; ORIGIN_CHAIN_BYTES],
                },
                1,
            )
            .unwrap();

        mock_ika_verify_policy(&policy, dwallet, destination, 1_000).unwrap();
    }
}
