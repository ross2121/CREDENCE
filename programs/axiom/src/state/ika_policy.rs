use anchor_lang::prelude::*;

use crate::AxiomError;

pub const MAX_IKA_DESTINATIONS: usize = 3;
pub const ORIGIN_CHAIN_BYTES: usize = 16;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, Eq, InitSpace, PartialEq)]
pub enum IkaPolicyKind {
    Borrower,
    Lender,
    CrossChainCollateral,
}

#[account]
#[derive(InitSpace)]
pub struct IkaPolicy {
    pub owner: Pubkey,
    pub dwallet: Pubkey,
    pub kind: IkaPolicyKind,
    pub allowed_destinations: [Pubkey; MAX_IKA_DESTINATIONS],
    pub allowed_count: u8,
    pub max_transaction_amount: u64,
    pub cross_chain: bool,
    pub origin_chain: [u8; ORIGIN_CHAIN_BYTES],
    pub active: bool,
    pub bump: u8,
}

impl IkaPolicy {
    pub const LEN: usize = 8 + Self::INIT_SPACE;

    pub fn initialize(&mut self, args: IkaPolicyArgs, bump: u8) -> Result<()> {
        require!(
            args.allowed_count > 0 && args.allowed_count as usize <= MAX_IKA_DESTINATIONS,
            AxiomError::InvalidIkaPolicy
        );
        require!(
            args.max_transaction_amount > 0,
            AxiomError::InvalidIkaPolicy
        );

        self.owner = args.owner;
        self.dwallet = args.dwallet;
        self.kind = args.kind;
        self.allowed_destinations = args.allowed_destinations;
        self.allowed_count = args.allowed_count;
        self.max_transaction_amount = args.max_transaction_amount;
        self.cross_chain = args.cross_chain;
        self.origin_chain = args.origin_chain;
        self.active = true;
        self.bump = bump;

        Ok(())
    }

    pub fn verify_action(&self, dwallet: Pubkey, destination: Pubkey, amount: u64) -> Result<()> {
        require!(self.active, AxiomError::InvalidIkaPolicy);
        require!(self.dwallet == dwallet, AxiomError::IkaPolicyViolation);
        require!(amount > 0, AxiomError::InvalidAmount);
        require!(
            amount <= self.max_transaction_amount,
            AxiomError::IkaAmountExceeded
        );
        require!(
            self.destination_allowed(destination),
            AxiomError::IkaPolicyViolation
        );

        Ok(())
    }

    pub fn destination_allowed(&self, destination: Pubkey) -> bool {
        self.allowed_destinations
            .iter()
            .take(self.allowed_count as usize)
            .any(|allowed| *allowed == destination)
    }
}

pub struct IkaPolicyArgs {
    pub owner: Pubkey,
    pub dwallet: Pubkey,
    pub kind: IkaPolicyKind,
    pub allowed_destinations: [Pubkey; MAX_IKA_DESTINATIONS],
    pub allowed_count: u8,
    pub max_transaction_amount: u64,
    pub cross_chain: bool,
    pub origin_chain: [u8; ORIGIN_CHAIN_BYTES],
}

#[cfg(test)]
mod tests {
    use super::*;

    fn origin_chain(name: &[u8]) -> [u8; ORIGIN_CHAIN_BYTES] {
        let mut out = [0; ORIGIN_CHAIN_BYTES];
        out[..name.len()].copy_from_slice(name);
        out
    }

    fn policy() -> (IkaPolicy, Pubkey, Pubkey) {
        let owner = Pubkey::new_unique();
        let dwallet = Pubkey::new_unique();
        let repayment_destination = Pubkey::new_unique();
        let mut destinations = [Pubkey::default(); MAX_IKA_DESTINATIONS];
        destinations[0] = repayment_destination;

        let mut policy = IkaPolicy {
            owner: Pubkey::default(),
            dwallet: Pubkey::default(),
            kind: IkaPolicyKind::Borrower,
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
                    kind: IkaPolicyKind::Borrower,
                    allowed_destinations: destinations,
                    allowed_count: 1,
                    max_transaction_amount: 500,
                    cross_chain: false,
                    origin_chain: origin_chain(b"solana"),
                },
                255,
            )
            .unwrap();

        (policy, dwallet, repayment_destination)
    }

    #[test]
    fn initializes_borrower_policy() {
        let (policy, dwallet, destination) = policy();

        assert_eq!(policy.dwallet, dwallet);
        assert_eq!(policy.kind, IkaPolicyKind::Borrower);
        assert_eq!(policy.allowed_destinations[0], destination);
        assert_eq!(policy.allowed_count, 1);
        assert_eq!(policy.max_transaction_amount, 500);
        assert!(!policy.cross_chain);
        assert!(policy.active);
        assert_eq!(policy.bump, 255);
    }

    #[test]
    fn allows_repayment_to_configured_destination() {
        let (policy, dwallet, destination) = policy();

        policy.verify_action(dwallet, destination, 500).unwrap();
    }

    #[test]
    fn blocks_unconfigured_destination() {
        let (policy, dwallet, _) = policy();

        let err = policy
            .verify_action(dwallet, Pubkey::new_unique(), 100)
            .unwrap_err();

        assert_eq!(err, error!(AxiomError::IkaPolicyViolation));
    }

    #[test]
    fn blocks_transaction_above_max_amount() {
        let (policy, dwallet, destination) = policy();

        let err = policy.verify_action(dwallet, destination, 501).unwrap_err();

        assert_eq!(err, error!(AxiomError::IkaAmountExceeded));
    }

    #[test]
    fn initializes_cross_chain_collateral_policy() {
        let owner = Pubkey::new_unique();
        let dwallet = Pubkey::new_unique();
        let collateral_vault = Pubkey::new_unique();
        let mut destinations = [Pubkey::default(); MAX_IKA_DESTINATIONS];
        destinations[0] = collateral_vault;
        let mut policy = policy().0;

        policy
            .initialize(
                IkaPolicyArgs {
                    owner,
                    dwallet,
                    kind: IkaPolicyKind::CrossChainCollateral,
                    allowed_destinations: destinations,
                    allowed_count: 1,
                    max_transaction_amount: u64::MAX,
                    cross_chain: true,
                    origin_chain: origin_chain(b"ethereum"),
                },
                7,
            )
            .unwrap();

        assert_eq!(policy.kind, IkaPolicyKind::CrossChainCollateral);
        assert!(policy.cross_chain);
        assert_eq!(&policy.origin_chain[..8], b"ethereum");
        assert_eq!(policy.allowed_destinations[0], collateral_vault);
    }
}
