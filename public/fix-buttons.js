// fix-buttons.js
// This script fixes the button colors after React renders

function fixButtonColors() {
  console.log("Fixing button colors...");
  
  // Buy buttons
  document.querySelectorAll('.buy-button').forEach(button => {
    button.style.cssText = "background: #00ff00 !important; background-color: #00ff00 !important; color: #000000 !important; border: none !important; font-weight: bold !important;";
  });

  // Sell buttons
  document.querySelectorAll('.sell-button').forEach(button => {
    button.style.cssText = "background: #ff0000 !important; background-color: #ff0000 !important; color: #ffffff !important; border: none !important; font-weight: bold !important;";
  });

  // Configure Buy buttons
  document.querySelectorAll('.configure-buy-button').forEach(button => {
    button.style.cssText = "background: rgba(0, 255, 0, 0.1) !important; background-color: rgba(0, 255, 0, 0.1) !important; color: #00ff00 !important; border: 1px solid #00ff00 !important;";
  });

  // Configure Sell buttons
  document.querySelectorAll('.configure-sell-button').forEach(button => {
    button.style.cssText = "background: rgba(255, 0, 0, 0.1) !important; background-color: rgba(255, 0, 0, 0.1) !important; color: #ff0000 !important; border: 1px solid #ff0000 !important;";
  });
  
  // Distribute button
  document.querySelectorAll('.distribute-button').forEach(button => {
    button.style.cssText = "background: #00aa88 !important; background-color: #00aa88 !important; color: #ffffff !important; border: none !important; font-weight: bold !important; padding: 8px 16px !important; border-radius: 4px !important;";
  });
  
  // Target button
  document.querySelectorAll('.target-button').forEach(button => {
    button.style.cssText = "background: #8800aa !important; background-color: #8800aa !important; color: #ffffff !important; border: none !important; font-weight: bold !important; padding: 8px 16px !important; border-radius: 4px !important;";
  });
  
  // Fund button
  document.querySelectorAll('.fund-button').forEach(button => {
    button.style.cssText = "background: rgba(0, 127, 255, 0.1) !important; background-color: rgba(0, 127, 255, 0.1) !important; color: #007fff !important; border: 1px solid #007fff !important; font-weight: bold !important; padding: 8px 16px !important; border-radius: 4px !important;";
  });
  
  // Select Target button in Target modal
  document.querySelectorAll('.select-target-button').forEach(button => {
    button.style.cssText = "background: #00aa88 !important; background-color: #00aa88 !important; color: #ffffff !important; border: none !important; font-weight: bold !important; padding: 8px 16px !important; border-radius: 4px !important;";
  });
  
  console.log("Button colors fixed!");
}

// Run the fix on page load and periodically to catch newly rendered buttons
window.addEventListener('load', () => {
  // Run initially after a short delay
  setTimeout(fixButtonColors, 500);
  
  // Run periodically to catch dynamically added buttons
  setInterval(fixButtonColors, 1000);
}); 