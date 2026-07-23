const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  let hasError = false;
  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`[BROWSER ERROR] ${msg.text()}`);
        hasError = true;
      }
    });
    page.on('pageerror', err => {
      console.error(`[PAGE ERROR] ${err}`);
      hasError = true;
    });
    
    const filePath = 'file://' + path.resolve(__dirname, '../index.html');
    await page.goto(filePath, { waitUntil: 'networkidle0' });
    await browser.close();
    
    if (hasError) {
      console.error("[FAIL] Rendering test failed with errors.");
      process.exit(1);
    } else {
      console.log("[PASS] Rendering test passed. No console errors.");
      process.exit(0);
    }
  } catch(e) {
    console.error("[FAIL] Puppeteer execution error:", e);
    process.exit(1);
  }
})();
