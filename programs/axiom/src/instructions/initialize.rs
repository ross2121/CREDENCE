use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct Initialize {}

pub fn handler(ctx: Context<Initialize>) -> Result<()> {
    msg!("AXIOM program initialized: {:?}", ctx.program_id);
    Ok(())
}
