#!/usr/bin/env node

/**
 * TRIBIFY.AI Landing Page Sync Script
 * 
 * This script automates the process of keeping the landing page in sync with the actual
 * features and content of the website by running the rules defined in cursorrules.json.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk'); // You may need to install this package: npm install chalk

// Configuration
const CURSOR_RULES_PATH = path.join(__dirname, 'cursorrules.json');
const LANDING_PAGE_PATH = path.join(__dirname, 'src/components/LandingPage.js');
const LANDING_PAGE_CSS_PATH = path.join(__dirname, 'src/components/LandingPage.css');
const FEATURES_DIR = path.join(__dirname, 'src/features');
const COMPONENTS_DIR = path.join(__dirname, 'src/components');

// Helper functions
function loadCursorRules() {
  try {
    const rulesContent = fs.readFileSync(CURSOR_RULES_PATH, 'utf8');
    return JSON.parse(rulesContent);
  } catch (error) {
    console.error(chalk.red('Error loading cursor rules:'), error.message);
    process.exit(1);
  }
}

function scanDirectory(dir, extension = '.js') {
  try {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    const result = [];

    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      
      if (file.isDirectory()) {
        // Check if it's a feature directory with an index.js file
        const indexPath = path.join(fullPath, 'index.js');
        if (fs.existsSync(indexPath)) {
          result.push({
            type: 'feature',
            name: file.name,
            path: fullPath,
            indexPath
          });
        }
        
        // Scan subdirectories
        result.push(...scanDirectory(fullPath, extension));
      } else if (file.name.endsWith(extension)) {
        // Check for component files with naming patterns that indicate features
        if (file.name.endsWith('Page.js') || file.name.endsWith('View.js')) {
          result.push({
            type: 'component',
            name: file.name.replace('.js', ''),
            path: fullPath
          });
        }
      }
    }

    return result;
  } catch (error) {
    console.error(chalk.red(`Error scanning directory ${dir}:`), error.message);
    return [];
  }
}

function extractFeaturesFromLandingPage() {
  try {
    const content = fs.readFileSync(LANDING_PAGE_PATH, 'utf8');
    
    // Extract feature headings (h3 tags in sections)
    const featureHeadings = [];
    const h3Regex = /<h3>(.*?)<\/h3>/g;
    let match;
    
    while ((match = h3Regex.exec(content)) !== null) {
      featureHeadings.push(match[1]);
    }
    
    return featureHeadings;
  } catch (error) {
    console.error(chalk.red('Error extracting features from landing page:'), error.message);
    return [];
  }
}

function compareFeatures(codebaseFeatures, landingPageFeatures) {
  // Features that exist in codebase but not on landing page
  const missingOnLandingPage = codebaseFeatures.filter(codeFeature => {
    return !landingPageFeatures.some(landingFeature => 
      landingFeature.includes(codeFeature.name) || 
      codeFeature.name.includes(landingFeature)
    );
  });

  // Features on landing page that might not exist in codebase
  const potentiallyMissingInCodebase = landingPageFeatures.filter(landingFeature => {
    return !codebaseFeatures.some(codeFeature => 
      landingFeature.includes(codeFeature.name) || 
      codeFeature.name.includes(landingFeature)
    );
  });

  return {
    missingOnLandingPage,
    potentiallyMissingInCodebase
  };
}

function validateSectionIds() {
  try {
    const content = fs.readFileSync(LANDING_PAGE_PATH, 'utf8');
    
    // Extract navigation links
    const navLinksRegex = /<a href="#([^"]+)"/g;
    const navLinks = [];
    let navMatch;
    
    while ((navMatch = navLinksRegex.exec(content)) !== null) {
      navLinks.push(navMatch[1]);
    }
    
    // Extract section IDs
    const sectionIdRegex = /id="([^"]+)"/g;
    const sectionIds = [];
    let sectionMatch;
    
    while ((sectionMatch = sectionIdRegex.exec(content)) !== null) {
      sectionIds.push(sectionMatch[1]);
    }
    
    // Find nav links that don't point to valid sections
    const invalidLinks = navLinks.filter(link => !sectionIds.includes(link));
    
    return {
      valid: invalidLinks.length === 0,
      invalidLinks
    };
  } catch (error) {
    console.error(chalk.red('Error validating section IDs:'), error.message);
    return { valid: false, error: error.message };
  }
}

function validateBrandingConsistency() {
  try {
    const content = fs.readFileSync(LANDING_PAGE_PATH, 'utf8');
    
    // Check for inconsistent branding
    const tribifyRegex = /Tribify(?!\.AI)/g;
    const inconsistentBranding = [];
    let brandingMatch;
    
    while ((brandingMatch = tribifyRegex.exec(content)) !== null) {
      inconsistentBranding.push({
        match: brandingMatch[0],
        position: brandingMatch.index
      });
    }
    
    return {
      valid: inconsistentBranding.length === 0,
      inconsistentBranding
    };
  } catch (error) {
    console.error(chalk.red('Error validating branding consistency:'), error.message);
    return { valid: false, error: error.message };
  }
}

// Main functions
function validateFeatureImplementation() {
  console.log(chalk.blue('\n🔍 Validating feature implementation...'));
  
  const rules = loadCursorRules();
  const landingFeatures = rules.rules.find(rule => rule.name === 'feature-implementation-validation')
    ?.pattern?.['landing-features'] || [];
  
  let allValid = true;
  
  for (const section of landingFeatures) {
    console.log(chalk.cyan(`\nChecking ${section.section} section features:`));
    
    for (const feature of section.features) {
      const featureName = feature.name;
      const implementationPaths = feature.implementation;
      
      let implemented = false;
      
      for (const implPath of implementationPaths) {
        const fullPath = path.join(__dirname, implPath);
        if (fs.existsSync(fullPath)) {
          implemented = true;
          break;
        }
      }
      
      if (implemented) {
        console.log(chalk.green(`✓ ${featureName}: Implemented`));
      } else {
        console.log(chalk.yellow(`⚠ ${featureName}: Not found in expected locations`));
        allValid = false;
      }
    }
  }
  
  if (allValid) {
    console.log(chalk.green('\n✅ All advertised features have implementations in the codebase.'));
  } else {
    console.log(chalk.yellow('\n⚠ Some advertised features may not be implemented yet.'));
    console.log(chalk.yellow('   Consider updating the landing page or prioritizing these features for development.'));
  }
  
  return allValid;
}

function discoverNewFeatures() {
  console.log(chalk.blue('\n🔍 Discovering new features...'));
  
  // Scan codebase for features
  console.log(chalk.cyan('Scanning codebase for features...'));
  const featureModules = scanDirectory(FEATURES_DIR);
  const componentFeatures = scanDirectory(COMPONENTS_DIR);
  const codebaseFeatures = [...featureModules, ...componentFeatures];
  
  // Extract features from landing page
  console.log(chalk.cyan('Extracting features from landing page...'));
  const landingPageFeatures = extractFeaturesFromLandingPage();
  
  // Compare and report
  console.log(chalk.cyan('Comparing features...'));
  const { missingOnLandingPage, potentiallyMissingInCodebase } = compareFeatures(
    codebaseFeatures, 
    landingPageFeatures
  );
  
  if (missingOnLandingPage.length > 0) {
    console.log(chalk.yellow('\n⚠ Features in codebase that may be missing from landing page:'));
    missingOnLandingPage.forEach(feature => {
      console.log(chalk.yellow(`   - ${feature.name} (${feature.type} in ${feature.path})`));
    });
  } else {
    console.log(chalk.green('\n✅ No missing features detected.'));
  }
  
  if (potentiallyMissingInCodebase.length > 0) {
    console.log(chalk.yellow('\n⚠ Features on landing page that may not exist in codebase:'));
    potentiallyMissingInCodebase.forEach(feature => {
      console.log(chalk.yellow(`   - ${feature}`));
    });
  }
  
  return {
    missingOnLandingPage,
    potentiallyMissingInCodebase
  };
}

function validateNavLinks() {
  console.log(chalk.blue('\n🔍 Validating navigation links...'));
  
  const { valid, invalidLinks } = validateSectionIds();
  
  if (valid) {
    console.log(chalk.green('✅ All navigation links point to valid sections.'));
  } else {
    console.log(chalk.yellow('⚠ Some navigation links may point to non-existent sections:'));
    invalidLinks.forEach(link => {
      console.log(chalk.yellow(`   - #${link}`));
    });
  }
  
  return valid;
}

function validateBranding() {
  console.log(chalk.blue('\n🔍 Validating branding consistency...'));
  
  const { valid, inconsistentBranding } = validateBrandingConsistency();
  
  if (valid) {
    console.log(chalk.green('✅ Branding is consistent throughout the landing page.'));
  } else {
    console.log(chalk.yellow('⚠ Inconsistent branding detected:'));
    inconsistentBranding.forEach(instance => {
      console.log(chalk.yellow(`   - "${instance.match}" at position ${instance.position}`));
    });
  }
  
  return valid;
}

function runAll() {
  console.log(chalk.blue('🚀 Running all landing page sync checks...'));
  
  const featureValidation = validateFeatureImplementation();
  const { missingOnLandingPage } = discoverNewFeatures();
  const navValidation = validateNavLinks();
  const brandingValidation = validateBranding();
  
  console.log(chalk.blue('\n📊 Summary:'));
  console.log(`Feature Implementation: ${featureValidation ? chalk.green('PASS') : chalk.yellow('NEEDS ATTENTION')}`);
  console.log(`New Features to Add: ${missingOnLandingPage.length === 0 ? chalk.green('NONE') : chalk.yellow(missingOnLandingPage.length)}`);
  console.log(`Navigation Links: ${navValidation ? chalk.green('VALID') : chalk.yellow('INVALID')}`);
  console.log(`Branding Consistency: ${brandingValidation ? chalk.green('CONSISTENT') : chalk.yellow('INCONSISTENT')}`);
  
  if (featureValidation && missingOnLandingPage.length === 0 && navValidation && brandingValidation) {
    console.log(chalk.green('\n✅ All checks passed! The landing page accurately reflects the website content.'));
  } else {
    console.log(chalk.yellow('\n⚠ Some checks failed. Review the results above and update the landing page accordingly.'));
  }
}

// Command-line interface
function printUsage() {
  console.log(`
${chalk.cyan('TRIBIFY.AI Landing Page Sync Tool')}

Usage:
  node sync-landing-page.js <command>

Commands:
  ${chalk.green('validate')}    Validate feature implementation
  ${chalk.green('discover')}    Discover new features
  ${chalk.green('nav')}         Validate navigation links
  ${chalk.green('branding')}    Validate branding consistency
  ${chalk.green('all')}         Run all checks (default)
  ${chalk.green('help')}        Show this help message
  `);
}

// Main execution
function main() {
  const command = process.argv[2] || 'all';
  
  switch (command.toLowerCase()) {
    case 'validate':
      validateFeatureImplementation();
      break;
    case 'discover':
      discoverNewFeatures();
      break;
    case 'nav':
      validateNavLinks();
      break;
    case 'branding':
      validateBranding();
      break;
    case 'all':
      runAll();
      break;
    case 'help':
      printUsage();
      break;
    default:
      console.error(chalk.red(`Unknown command: ${command}`));
      printUsage();
      process.exit(1);
  }
}

main(); 