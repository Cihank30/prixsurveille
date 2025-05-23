// index.js
const scrapeAmazon = require('./amazon');
const scrapeBestBuy = require('./bestbuy');
const scrapeWalmart = require('./walmart');
const scrapeCanadianTire = require('./canadiantire');

(async () => {
  const amazonUrl = 'https://www.amazon.ca/dp/B08N5WRWNW';
  const bestBuyUrl = 'https://www.bestbuy.ca/en-ca/product/123456';
  const walmartUrl = 'https://www.walmart.ca/en/ip/6000191234567';
  const canadianTireUrl = 'https://www.canadiantire.ca/en/pdp/123456.html';

  const amazonPrice = await scrapeAmazon(amazonUrl);
  const bestBuyPrice = await scrapeBestBuy(bestBuyUrl);
  const walmartPrice = await scrapeWalmart(walmartUrl);
  const canadianTirePrice = await scrapeCanadianTire(canadianTireUrl);

  console.log(`Amazon Price: ${amazonPrice}`);
  console.log(`BestBuy Price: ${bestBuyPrice}`);
  console.log(`Walmart Price: ${walmartPrice}`);
  console.log(`Canadian Tire Price: ${canadianTirePrice}`);
})();
