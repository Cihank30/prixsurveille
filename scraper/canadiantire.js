// canadiantire.js
const puppeteer = require('puppeteer');

async function scrapeCanadianTire(url) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  // Attendre que le sélecteur du prix soit disponible
  await page.waitForSelector('.product-price__value');

  // Extraire le prix
  const price = await page.$eval('.product-price__value', el => el.textContent.trim());

  await browser.close();
  return price;
}

module.exports = scrapeCanadianTire;
