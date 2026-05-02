pub mod constants;
pub mod error;
pub mod ika;
pub mod instructions;
pub mod state;
pub mod zk;

use anchor_lang::prelude::*;

pub use constants::*;
pub use error::*;
pub use ika::*;
pub use instructions::*;
pub use state::*;
pub use zk::*;

declare_id!("HWZyoS2jthQHXuV9EDYfUz9iZBS6dbmWQyPKw1HB4dLb");

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
        expiry: i64,
    ) -> Result<()> {
        instructions::credit_registry_ix::handle_register_credit_proof(
            ctx, tier, max_loan, zk_proof, expiry,
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
}
