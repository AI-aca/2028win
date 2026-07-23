const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    
    await page.goto('file:///C:/Users/slrud/OneDrive/문서/[안티그래비티]/2028 영재학교반/index.html');
    await new Promise(resolve => setTimeout(resolve, 2000));
    await browser.close();
})();
