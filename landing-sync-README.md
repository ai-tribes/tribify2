# TRIBIFY.AI Landing Page Sync System

## Overview

This system helps ensure that the TRIBIFY.AI landing page accurately reflects the actual features and content of the application as it evolves. As new features are developed or existing ones are modified, it's crucial that the landing page—which serves as the first impression for users—remains up-to-date and truthful about what the application offers.

The system consists of two main components:
1. **cursorrules.json**: Defines validation rules and automated checks
2. **sync-landing-page.js**: Script to run the rules and generate reports

## How It Works

The landing page sync system performs three main functions:

### 1. Validation

The system validates that features advertised on the landing page are actually implemented in the codebase. This prevents showcasing features that don't exist yet.

### 2. Discovery

It scans the codebase for new components and features that may have been implemented but aren't yet mentioned on the landing page.

### 3. Maintenance

It ensures the landing page maintains consistency in branding, responsive design, and overall accuracy.

## Rule Types

The system includes several rule types:

### Feature Implementation Validation

Checks if features advertised on the landing page exist in the actual codebase. For example, if the landing page mentions "Share Tokenization," the rule verifies that corresponding implementation files exist.

### Feature Discovery

Scans the codebase for new components or features that might be candidates for inclusion on the landing page.

### Branding Consistency

Ensures the brand name is consistently displayed as "TRIBIFY.AI" throughout the landing page and adheres to the color schemes.

### Feature Description Accuracy

Validates that the descriptions of features on the landing page align with their actual implementation in the codebase.

### Responsiveness Validation

Ensures the landing page remains responsive after changes, checking for proper media queries and responsive elements.

### Section ID Validation

Validates that all navigation links on the landing page point to valid sections, preventing broken navigation.

### Orphaned Styles Detection

Identifies CSS classes in the landing page stylesheet that are no longer used in the component.

### Image Path Validation

Checks if images referenced on the landing page exist in the expected directories.

### Copyright Year Update

Ensures the copyright year in the footer is current.

## When Rules Run

Rules can run at different times:

- **Pre-commit**: Some rules run automatically before code is committed, catching issues early
- **Post-merge**: Rules that run after merging code from other developers
- **Manual**: You can run all rules manually using the sync script

## Usage for Developers

### Setting Up

1. Ensure Node.js is installed on your system
2. Install the required dependencies:
   ```
   npm install chalk
   ```
3. Make the sync script executable:
   ```
   chmod +x sync-landing-page.js
   ```

### Adding a New Feature to the Landing Page

When adding a new feature to the application that should be showcased on the landing page:

1. Implement your feature in the appropriate directory
2. Run the feature discovery check:
   ```
   node sync-landing-page.js discover
   ```
3. If your feature is detected but not on the landing page, update the landing page to include it
4. Add the feature to the `cursorrules.json` file under the appropriate section in the "feature-implementation-validation" rule

### Modifying an Existing Feature

When modifying a feature that's already on the landing page:

1. Update the implementation
2. Run the validation check:
   ```
   node sync-landing-page.js validate
   ```
3. If the description no longer matches the implementation, update the landing page accordingly

### Removing a Feature

When removing a feature that's mentioned on the landing page:

1. Run the validation check to confirm the feature is no longer implemented:
   ```
   node sync-landing-page.js validate
   ```
2. Update the landing page to remove mentions of the feature
3. Update the `cursorrules.json` file to remove the feature from the rules

### Running All Checks

To run a complete check of the landing page:

```
node sync-landing-page.js all
```

This will run all validation rules and provide a comprehensive report.

## Troubleshooting

### False Positives

If you encounter false positives (rules flagging issues that aren't really issues):

1. Review the pattern in the `cursorrules.json` file for the specific rule
2. Adjust the implementation paths or patterns as needed
3. If the rule doesn't apply to your specific case, you can temporarily ignore it

### Adding New Rules

To add a new validation rule:

1. Open `cursorrules.json`
2. Add a new rule object to the "rules" array, following the pattern of existing rules
3. Specify:
   - A unique name
   - A clear description
   - The pattern to match
   - The fix type and severity
4. Add the rule name to the appropriate hook in the "hooks" section

## Conclusion

By following this system, you can ensure that the TRIBIFY.AI landing page remains an accurate representation of the application's features and capabilities. This builds trust with users and prevents miscommunication about the product's offerings.

Remember that the landing page is often the first interaction users have with TRIBIFY.AI, so maintaining its accuracy is crucial for user experience and setting appropriate expectations. 