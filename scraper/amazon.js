// amazon.js
const puppeteer = require('puppeteer');

async function scrapeAmazon(url) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  // Attendre que le sélecteur du prix soit disponible
  await page.waitForSelector('#priceblock_ourprice');

  // Extraire le prix
  const price = await page.$eval('#priceblock_ourprice', el => el.textContent.trim());

  await browser.close();
  return price;
}

module.exports = scrapeAmazon;
