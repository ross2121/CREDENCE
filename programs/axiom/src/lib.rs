pub mod constants;
pub mod error;
pub mod events;
pub mod ika;
pub mod instructions;
pub mod kamino;
pub mod state;
pub mod verifying_key;
pub mod zk;

use anchor_lang::prelude::*;

pub use constants::*;
pub use error::*;
pub use events::*;
pub use ika::*;
pub use instructions::*;
pub use kamino::*;
pub use state::*;
pub use zk::*;

declare_id!("6Xrd8Ymz9vxecWjifKern6LAzXQ2XKcS4D1zsJ8ENLpK");

#[program]
pub mod axiom {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize::handler(ctx)
    }

    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        base_interest_rate: u64,
        kamino_vault: Pubkey,
    ) -> Result<()> {
        instructions::lending_pool_ix::handle_initialize_pool(ctx, base_interest_rate, kamino_vault)
    }

    pub fn deposit_liquidity(ctx: Context<DepositLiquidity>, amount: u64) -> Result<()> {
        instructions::lending_pool_ix::handle_deposit_liquidity(ctx, amount)
    }

    pub fn withdraw_liquidity(ctx: Context<WithdrawLiquidity>, amount: u64) -> Result<()> {
        instructions::lending_pool_ix::handle_withdraw_liquidity(ctx, amount)
    }

    pub fn disburse_loan(ctx: Context<DisburseLoan>) -> Result<()> {
        instructions::lending_pool_ix::handle_disburse_loan(ctx)
    }

    pub fn register_credit_proof(
        ctx: Context<RegisterCreditProof>,
        tier: CreditTier,
        max_loan: u64,
        zk_proof: Vec<u8>,
        public_inputs: Vec<[u8; 32]>,
        expiry: i64,
    ) -> Result<()> {
        instructions::credit_registry_ix::handle_register_credit_proof(
            ctx,
            tier,
            max_loan,
            zk_proof,
            public_inputs,
            expiry,
        )
    }

    pub fn request_loan(
        ctx: Context<RequestLoan>,
        amount: u64,
        duration_days: u64,
        collateral_amount: u64,
        ika_dwallet: Pubkey,
    ) -> Result<()> {
        instructions::credit_registry_ix::handle_request_loan(
            ctx,
            amount,
            duration_days,
            collateral_amount,
            ika_dwallet,
        )
    }

    pub fn init_repayment_stream(ctx: Context<InitRepayStream>) -> Result<()> {
        instructions::stream_repay_ix::handle_init_repayment_stream(ctx)
    }

    pub fn fund_repayment_stream(ctx: Context<FundStream>, amount: u64) -> Result<()> {
        instructions::stream_repay_ix::handle_fund_repayment_stream(ctx, amount)
    }

    pub fn claim_repayments(ctx: Context<ClaimRepayments>) -> Result<()> {
        instructions::stream_repay_ix::handle_claim_repayments(ctx)
    }

    pub fn close_repayment_stream(ctx: Context<CloseStream>) -> Result<()> {
        instructions::stream_repay_ix::handle_close_repayment_stream(ctx)
    }

    pub fn mint_reputation_nft(ctx: Context<MintReputation>) -> Result<()> {
        instructions::reputation_ix::handle_mint_reputation_nft(ctx)
    }

    pub fn update_reputation_success(ctx: Context<UpdateReputation>) -> Result<()> {
        instructions::reputation_ix::handle_update_reputation_success(ctx)
    }

    pub fn slash_reputation(ctx: Context<UpdateReputation>) -> Result<()> {
        instructions::reputation_ix::handle_slash_reputation(ctx)
    }

    pub fn stake_reputation_bond(ctx: Context<StakeBond>, amount: u64) -> Result<()> {
        instructions::reputation_ix::handle_stake_reputation_bond(ctx, amount)
    }

    pub fn initialize_ika_policy(
        ctx: Context<InitializeIkaPolicy>,
        kind: IkaPolicyKind,
        allowed_destinations: [Pubkey; MAX_IKA_DESTINATIONS],
        allowed_count: u8,
        max_transaction_amount: u64,
        cross_chain: bool,
        origin_chain: [u8; ORIGIN_CHAIN_BYTES],
    ) -> Result<()> {
        instructions::ika_policy_ix::handle_initialize_ika_policy(
            ctx,
            kind,
            allowed_destinations,
            allowed_count,
            max_transaction_amount,
            cross_chain,
            origin_chain,
        )
    }

    pub fn verify_ika_policy(
        ctx: Context<IkaVerify>,
        dwallet: Pubkey,
        destination: Pubkey,
        amount: u64,
    ) -> Result<()> {
        instructions::ika_policy_ix::handle_verify_ika_policy(ctx, dwallet, destination, amount)
    }

    pub fn rebalance_to_kamino(ctx: Context<RebalanceKamino>, amount: u64) -> Result<()> {
        instructions::kamino_ix::handle_rebalance_to_kamino(ctx, amount)
    }

    pub fn rebalance_from_kamino(ctx: Context<RebalanceFromKamino>, amount: u64) -> Result<()> {
        instructions::kamino_ix::handle_rebalance_from_kamino(ctx, amount)
    }

    pub fn issue_liquidation_warning(
        ctx: Context<IssueLiquidationWarning>,
        collateral_value_usdt: u64,
        loan_value_usdt: u64,
    ) -> Result<()> {
        instructions::liquidation_ix::handle_issue_liquidation_warning(
            ctx,
            collateral_value_usdt,
            loan_value_usdt,
        )
    }

    pub fn execute_liquidation(
        ctx: Context<ExecuteLiquidation>,
        recovered_usdt: u64,
    ) -> Result<()> {
        instructions::liquidation_ix::handle_execute_liquidation(ctx, recovered_usdt)
    }

    pub fn open_dispute(
        ctx: Context<OpenDispute>,
        loan_id: Pubkey,
        evidence_hash: [u8; 32],
    ) -> Result<()> {
        instructions::dispute_ix::handle_open_dispute(ctx, loan_id, evidence_hash)
    }

    pub fn register_arbitrator(ctx: Context<RegisterArbitrator>) -> Result<()> {
        instructions::dispute_ix::handle_register_arbitrator(ctx)
    }

    pub fn submit_arbitration_vote(
        ctx: Context<ArbitrationVote>,
        dispute_id: Pubkey,
        ruling: DisputeRuling,
    ) -> Result<()> {
        instructions::dispute_ix::handle_submit_arbitration_vote(ctx, dispute_id, ruling)
    }

    pub fn finalize_dispute(ctx: Context<FinalizeDispute>, dispute_id: Pubkey) -> Result<()> {
        instructions::dispute_ix::handle_finalize_dispute(ctx, dispute_id)
    }
}
