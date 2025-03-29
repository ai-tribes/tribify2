const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/WalletPage.js');

// Read the file content
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add TARGET column to the table header
content = content.replace(
  '<div className="col-usdc">USDC</div>',
  '<div className="col-usdc">USDC</div>\n            <div className="col-target">TARGET</div>'
);

// 2. Add TARGET to the totals row
content = content.replace(
  '<div className="col-usdc total-value">\n              ${(calculateTotals().usdc || 0).toFixed(2)}\n            </div>',
  '<div className="col-usdc total-value">\n              ${(calculateTotals().usdc || 0).toFixed(2)}\n            </div>\n            <div className="col-target total-value">\n              {(calculateTotals().target || 0).toLocaleString()} TARGET\n            </div>'
);

// 3. Add TARGET to each table row
content = content.replace(
  '<div className="col-usdc">\n                ${(walletBalances[keypair.publicKey.toString()]?.usdc || 0).toFixed(2)}\n              </div>',
  '<div className="col-usdc">\n                ${(walletBalances[keypair.publicKey.toString()]?.usdc || 0).toFixed(2)}\n              </div>\n              <div className="col-target">\n                {(walletBalances[keypair.publicKey.toString()]?.target || 0).toLocaleString()} TARGET\n              </div>'
);

// 4. Add TARGET to parent wallet balances
content = content.replace(
  '<span className="parent-balance usdc">\n                ${(walletBalances[\'parent\']?.usdc || 0).toFixed(2)} USDC\n              </span>',
  '<span className="parent-balance usdc">\n                ${(walletBalances[\'parent\']?.usdc || 0).toFixed(2)} USDC\n              </span>\n              <span className="parent-balance target">\n                {(walletBalances[\'parent\']?.target || 0).toLocaleString()} TARGET\n              </span>'
);

// 5. Update calculateTotals function
content = content.replace(
  'if (!walletBalances) return { sol: 0, usdc: 0, tribify: 0 };',
  'if (!walletBalances) return { sol: 0, usdc: 0, tribify: 0, target: 0 };'
);

content = content.replace(
  'tribify: totals.tribify + (balance?.tribify || 0)\n        };',
  'tribify: totals.tribify + (balance?.tribify || 0),\n          target: totals.target + (balance?.target || 0)\n        };'
);

content = content.replace(
  '}, { sol: 0, usdc: 0, tribify: 0 });',
  '}, { sol: 0, usdc: 0, tribify: 0, target: 0 });'
);

// 6. Update fetchBalances to include target property
content = content.replace(
  'newBalances[\'parent\'] = {\n          tribify: parentTokenAccounts.value.length \n            ? parentTokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount \n            : 0,\n          sol: parentSolBalance / LAMPORTS_PER_SOL',
  'newBalances[\'parent\'] = {\n          tribify: parentTokenAccounts.value.length \n            ? parentTokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount \n            : 0,\n          target: 0,\n          sol: parentSolBalance / LAMPORTS_PER_SOL'
);

content = content.replace(
  'newBalances[kp.publicKey.toString()] = {\n            tribify: tokenAccounts.value.length \n              ? tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount \n              : 0,\n            sol: solBalance / LAMPORTS_PER_SOL',
  'newBalances[kp.publicKey.toString()] = {\n            tribify: tokenAccounts.value.length \n              ? tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount \n              : 0,\n            target: 0,\n            sol: solBalance / LAMPORTS_PER_SOL'
);

content = content.replace(
  'newBalances[kp.publicKey.toString()] = { tribify: 0, sol: 0 };',
  'newBalances[kp.publicKey.toString()] = { tribify: 0, sol: 0, target: 0 };'
);

// 7. Modify any other public key display that isn't already truncated
content = content.replace(
  /\{keypair\.publicKey\.toString\(\)\}/g,
  '{`${keypair.publicKey.toString().slice(0, 5)}...${keypair.publicKey.toString().slice(-5)}`}'
);

// Write the modified content back to the file
fs.writeFileSync(filePath, content);

console.log('Changes applied successfully!');
