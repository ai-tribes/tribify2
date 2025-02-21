use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("YOUR_PROGRAM_ID_ONCE_DEPLOYED");

#[program]
pub mod tribify_staking {
    use super::*;

    pub fn initialize_stake(
        ctx: Context<InitializeStake>,
        amount: u64,
        duration_minutes: u64,
    ) -> Result<()> {
        let stake_account = &mut ctx.accounts.stake_account;
        let clock = Clock::get()?;

        stake_account.owner = ctx.accounts.user.key();
        stake_account.amount = amount;
        stake_account.start_time = clock.unix_timestamp;
        stake_account.end_time = clock.unix_timestamp + (duration_minutes * 60) as i64;
        stake_account.withdrawn = false;

        // Transfer tokens to stake vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.stake_vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        Ok(())
    }

    pub fn unstake(ctx: Context<Unstake>) -> Result<()> {
        let stake_account = &mut ctx.accounts.stake_account;
        let clock = Clock::get()?;

        require!(!stake_account.withdrawn, StakingError::AlreadyWithdrawn);
        require!(
            clock.unix_timestamp >= stake_account.end_time,
            StakingError::StakeLocked
        );

        // Calculate rewards based on duration
        let duration = (stake_account.end_time - stake_account.start_time) as u64;
        let rewards = calculate_rewards(stake_account.amount, duration);

        // Transfer original stake + rewards
        let total_amount = stake_account.amount + rewards;
        
        // Transfer from vault back to user
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.stake_vault.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.stake_vault.to_account_info(),
                },
                &[&[
                    b"stake_vault",
                    &[ctx.bumps.stake_vault],
                ]],
            ),
            total_amount,
        )?;

        stake_account.withdrawn = true;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeStake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        init,
        payer = user,
        space = StakeAccount::SIZE,
        seeds = [b"stake", user.key().as_ref()],
        bump
    )]
    pub stake_account: Account<'info, StakeAccount>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"stake_vault"],
        bump
    )]
    pub stake_vault: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"stake", user.key().as_ref()],
        bump,
        has_one = owner @ StakingError::InvalidOwner,
    )]
    pub stake_account: Account<'info, StakeAccount>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"stake_vault"],
        bump
    )]
    pub stake_vault: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct StakeAccount {
    pub owner: Pubkey,
    pub amount: u64,
    pub start_time: i64,
    pub end_time: i64,
    pub withdrawn: bool,
}

impl StakeAccount {
    pub const SIZE: usize = 8 + 32 + 8 + 8 + 8 + 1;
}

#[error_code]
pub enum StakingError {
    #[msg("Stake is still locked")]
    StakeLocked,
    #[msg("Stake already withdrawn")]
    AlreadyWithdrawn,
    #[msg("Invalid stake owner")]
    InvalidOwner,
} 