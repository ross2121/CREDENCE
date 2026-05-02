use anchor_lang::prelude::*;

use crate::{
    mock_ika_verify_policy, IkaPolicy, IkaPolicyArgs, IkaPolicyKind, MAX_IKA_DESTINATIONS,
    ORIGIN_CHAIN_BYTES,
};

#[derive(Accounts)]
pub struct InitializeIkaPolicy<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        init,
        payer = owner,
        space = IkaPolicy::LEN,
        seeds = [b"ika_policy", owner.key().as_ref(), dwallet.key().as_ref()],
        bump
    )]
    pub ika_policy: Account<'info, IkaPolicy>,
    /// CHECK: Stored as the Ika dWallet identity governed by this policy.
    pub dwallet: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct IkaVerify<'info> {
    pub owner: Signer<'info>,
    #[account(
        seeds = [b"ika_policy", owner.key().as_ref(), ika_policy.dwallet.as_ref()],
        bump = ika_policy.bump
    )]
    pub ika_policy: Account<'info, IkaPolicy>,
}

pub fn handle_initialize_ika_policy(
    ctx: Context<InitializeIkaPolicy>,
    kind: IkaPolicyKind,
    allowed_destinations: [Pubkey; MAX_IKA_DESTINATIONS],
    allowed_count: u8,
    max_transaction_amount: u64,
    cross_chain: bool,
    origin_chain: [u8; ORIGIN_CHAIN_BYTES],
) -> Result<()> {
    ctx.accounts.ika_policy.initialize(
        IkaPolicyArgs {
            owner: ctx.accounts.owner.key(),
            dwallet: ctx.accounts.dwallet.key(),
            kind,
            allowed_destinations,
            allowed_count,
            max_transaction_amount,
            cross_chain,
            origin_chain,
        },
        ctx.bumps.ika_policy,
    )
}

pub fn handle_verify_ika_policy(
    ctx: Context<IkaVerify>,
    dwallet: Pubkey,
    destination: Pubkey,
    amount: u64,
) -> Result<()> {
    mock_ika_verify_policy(&ctx.accounts.ika_policy, dwallet, destination, amount)
}
