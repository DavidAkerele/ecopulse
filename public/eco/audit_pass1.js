// audit_pass1.js – Automated checks for missing DOM elements & visibility issues
const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({headless: true});
  const page = await browser.newPage();
  await page.goto('http://localhost:3000', {waitUntil: 'networkidle2'});
  const selectors = [
    '.top-pill-bar',
    '.sidebar-nav',
    '.right-sidebar',
    '.bottom-bento-grid',
    '.tour-overlay',
    '.pill-model-selector',
  ];
  for (const sel of selectors) {
    const visible = await page.evaluate((s) => {
      const el = document.querySelector(s);
      return !!el && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    }, sel);
    console.log(`${sel}: ${visible ? 'VISIBLE' : 'HIDDEN'}`);
  }
  await browser.close();
})();
