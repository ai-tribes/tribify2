#!/usr/bin/env node

/**
 * TRIBIFY.AI Landing Page Sync - Git Hooks Installer
 * 
 * This script installs Git hooks to automatically run validation rules
 * at appropriate times in the development workflow.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Check if chalk is installed, and if not, use a simple color function
let chalk;
try {
  chalk = require('chalk');
} catch (error) {
  chalk = {
    green: (text) => `\x1b[32m${text}\x1b[0m`,
    red: (text) => `\x1b[31m${text}\x1b[0m`,
    yellow: (text) => `\x1b[33m${text}\x1b[0m`,
    blue: (text) => `\x1b[34m${text}\x1b[0m`,
    cyan: (text) => `\x1b[36m${text}\x1b[0m`
  };
}

// Get the Git hooks directory
function getGitHooksDir() {
  try {
    // Get the Git root directory
    const gitDir = execSync('git rev-parse --git-dir', { encoding: 'utf8' }).trim();
    return path.resolve(gitDir, 'hooks');
  } catch (error) {
    console.error(chalk.red('Error: This does not appear to be a Git repository.'));
    process.exit(1);
  }
}

// Create pre-commit hook
function createPreCommitHook(hooksDir) {
  const hookPath = path.join(hooksDir, 'pre-commit');
  const hookContent = `#!/bin/sh
  
# TRIBIFY.AI Landing Page Sync - Pre-Commit Hook
echo "${chalk.cyan('Running TRIBIFY.AI landing page validation...')}"

# Run feature implementation validation
node "${path.resolve(__dirname, 'sync-landing-page.js')}" validate

# Run branding consistency check
node "${path.resolve(__dirname, 'sync-landing-page.js')}" branding

# Run section ID validation
node "${path.resolve(__dirname, 'sync-landing-page.js')}" nav

# Exit with the combined status
exit $?
`;

  try {
    fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
    console.log(chalk.green('✅ Pre-commit hook installed successfully'));
    return true;
  } catch (error) {
    console.error(chalk.red(`Error creating pre-commit hook: ${error.message}`));
    return false;
  }
}

// Create post-merge hook
function createPostMergeHook(hooksDir) {
  const hookPath = path.join(hooksDir, 'post-merge');
  const hookContent = `#!/bin/sh
  
# TRIBIFY.AI Landing Page Sync - Post-Merge Hook
echo "${chalk.cyan('Running TRIBIFY.AI landing page feature discovery...')}"

# Run feature discovery
node "${path.resolve(__dirname, 'sync-landing-page.js')}" discover

# Run landing page responsiveness check
node "${path.resolve(__dirname, 'sync-landing-page.js')}" all

# Exit with success (these are informational checks only)
exit 0
`;

  try {
    fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
    console.log(chalk.green('✅ Post-merge hook installed successfully'));
    return true;
  } catch (error) {
    console.error(chalk.red(`Error creating post-merge hook: ${error.message}`));
    return false;
  }
}

// Main function
function main() {
  console.log(chalk.blue('🔨 Installing TRIBIFY.AI landing page sync Git hooks...'));
  
  // Get Git hooks directory
  const hooksDir = getGitHooksDir();
  console.log(chalk.cyan(`Git hooks directory: ${hooksDir}`));
  
  // Ensure the directory exists
  if (!fs.existsSync(hooksDir)) {
    try {
      fs.mkdirSync(hooksDir, { recursive: true });
    } catch (error) {
      console.error(chalk.red(`Error creating hooks directory: ${error.message}`));
      process.exit(1);
    }
  }
  
  // Create the hooks
  const preCommitSuccess = createPreCommitHook(hooksDir);
  const postMergeSuccess = createPostMergeHook(hooksDir);
  
  // Print summary
  if (preCommitSuccess && postMergeSuccess) {
    console.log(chalk.green('\n✅ All Git hooks installed successfully!'));
    console.log(chalk.cyan('\nThe following checks will run automatically:'));
    console.log(chalk.cyan('- Before commits: Feature validation, branding consistency, navigation validation'));
    console.log(chalk.cyan('- After merges: Feature discovery, responsiveness check'));
    console.log(chalk.yellow('\nYou can also run checks manually with:'));
    console.log(chalk.yellow('  npm run check-all'));
  } else {
    console.error(chalk.red('\n❌ Some hooks could not be installed. See errors above.'));
    process.exit(1);
  }
}

// Run the main function
main(); 