// walmart.js
const puppeteer = require('puppeteer');

async function scrapeWalmart(url) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  // Attendre que le sélecteur du prix soit disponible
  await page.waitForSelector('span.price-characteristic');

  // Extraire le prix
  const price = await page.$eval('span.price-characteristic', el => el.textContent.trim());

  await browser.close();
  return price;
}

module.exports = scrapeWalmart;
