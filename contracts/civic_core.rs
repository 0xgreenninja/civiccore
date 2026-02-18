
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("CivicCore111111111111111111111111111111111");

#[program]
pub mod civic_core {
    use super::*;

    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        total_amount: u64,
        milestone_count: u8,
        name: String,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.authority = ctx.accounts.authority.key();
        vault.total_amount = total_amount;
        vault.released_amount = 0;
        vault.milestone_count = milestone_count;
        vault.approved_milestones = 0;
        vault.name = name;
        Ok(())
    }

    pub fn submit_proof(
        ctx: Context<SubmitProof>,
        milestone_index: u8,
        proof_hash: String,
    ) -> Result<()> {
        let milestone = &mut ctx.accounts.milestone;
        require!(milestone.released == false, ErrorCode::AlreadyReleased);
        milestone.proof_hash = proof_hash;
        milestone.index = milestone_index;
        Ok(())
    }

    pub fn approve_milestone(ctx: Context<ApproveMilestone>) -> Result<()> {
        let milestone = &mut ctx.accounts.milestone;
        let validator = ctx.accounts.validator.key();
        
        // Prevent double approval
        if !milestone.approvals.contains(&validator) {
            milestone.approvals.push(validator);
        }

        // Logic for auto-release can go here or in a separate instruction
        Ok(())
    }

    pub fn release_funds(ctx: Context<ReleaseFunds>, milestone_amount: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let milestone = &mut ctx.accounts.milestone;

        require!(milestone.approvals.len() >= 3, ErrorCode::InsufficientApprovals);
        require!(!milestone.released, ErrorCode::AlreadyReleased);

        // SPL Token Transfer
        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: ctx.accounts.vault.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        token::transfer(Context::new(cpi_program, cpi_accounts), milestone_amount)?;

        milestone.released = true;
        vault.released_amount += milestone_amount;
        vault.approved_milestones += 1;

        emit!(MilestoneReleased {
            vault: vault.key(),
            milestone_index: milestone.index,
            amount: milestone_amount,
        });

        Ok(())
    }
}

#[account]
pub struct Vault {
    pub authority: Pubkey,
    pub total_amount: u64,
    pub released_amount: u64,
    pub milestone_count: u8,
    pub approved_milestones: u8,
    pub name: String,
}

#[account]
pub struct Milestone {
    pub index: u8,
    pub proof_hash: String,
    pub approvals: Vec<Pubkey>,
    pub released: bool,
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(init, payer = authority, space = 8 + 32 + 8 + 8 + 1 + 1 + 64)]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, SystemProgram>,
}

#[derive(Accounts)]
pub struct SubmitProof<'info> {
    #[account(mut)]
    pub milestone: Account<'info, Milestone>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ApproveMilestone<'info> {
    #[account(mut)]
    pub milestone: Account<'info, Milestone>,
    pub validator: Signer<'info>,
}

#[derive(Accounts)]
pub struct ReleaseFunds<'info> {
    #[account(mut)]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub milestone: Account<'info, Milestone>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[event]
pub struct MilestoneReleased {
    pub vault: Pubkey,
    pub milestone_index: u8,
    pub amount: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Milestone already released.")]
    AlreadyReleased,
    #[msg("Minimum of 3 approvals required.")]
    InsufficientApprovals,
}
