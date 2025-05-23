// bestbuy.js
const puppeteer = require('puppeteer');

async function scrapeBestBuy(url) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  // Attendre que le sélecteur du prix soit disponible
  await page.waitForSelector('.price_FHDfG');

  // Extraire le prix
  const price = await page.$eval('.price_FHDfG', el => el.textContent.trim());

  await browser.close();
  return price;
}

module.exports = scrapeBestBuy;
