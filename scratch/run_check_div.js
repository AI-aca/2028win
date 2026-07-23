const fs = require('fs');
const path = require('path');

try {
  const htmlPath = path.join(__dirname, '../index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  
  const openDivMatches = html.match(/<div\b[^>]*>/gi) || [];
  const closeDivMatches = html.match(/<\/div>/gi) || [];
  
  const openDivCount = openDivMatches.length;
  const closeDivCount = closeDivMatches.length;
  
  if (openDivCount === closeDivCount) {
    console.log(`[PASS] HTML DOM Check: div tag counts match (open: ${openDivCount}, close: ${closeDivCount})`);
    process.exit(0);
  } else {
    console.error(`[FAIL] HTML DOM Check: div tag count mismatch! open: ${openDivCount}, close: ${closeDivCount}`);
    process.exit(1);
  }
} catch (e) {
  console.error(`[FAIL] HTML DOM Check Exception: ${e.message}`);
  process.exit(1);
}
