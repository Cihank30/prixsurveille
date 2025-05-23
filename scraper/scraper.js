const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha');

// Intégrer les plugins
puppeteer.use(StealthPlugin());
puppeteer.use(
  RecaptchaPlugin({
    provider: {
      id: '2captcha',
      token: 'ddb0c3d460ef1d123893efca4647a041' // Remplacez par votre clé API 2Captcha
    },
    visualFeedback: true // Affiche des indications visuelles lors de la résolution
  })
);
(async () => {
    const browser = await puppeteer.launch({ headless: false }); // headless:false pour voir le processus
    const page = await browser.newPage();
  
    // Naviguer vers une page contenant un reCAPTCHA
    await page.goto('https://www.google.com/recaptcha/api2/demo', { waitUntil: 'networkidle2' });
  
    // Résoudre automatiquement les reCAPTCHAs détectés sur la page
    const { captchas, solutions, solved, error } = await page.solveRecaptchas();
  
    if (error) {
      console.error('Erreur lors de la résolution du CAPTCHA:', error);
    } else {
      console.log('CAPTCHAs détectés:', captchas.length);
      console.log('CAPTCHAs résolus:', solved.length);
    }
  
    // Soumettre le formulaire ou continuer le processus après la résolution du CAPTCHA
    await Promise.all([
      page.waitForNavigation(),
      page.click('#recaptcha-demo-submit')
    ]);
  
    // Effectuer d'autres actions, comme prendre une capture d'écran
    await page.screenshot({ path: 'résultat.png', fullPage: true });
  
    await browser.close();
  })();
  (async () => {
    const browser = await puppeteer.launch({ headless: false }); // headless:false pour voir le processus
    const page = await browser.newPage();
  
    // Naviguer vers une page contenant un reCAPTCHA
    await page.goto('https://www.google.com/recaptcha/api2/demo', { waitUntil: 'networkidle2' });
  
    // Résoudre automatiquement les reCAPTCHAs détectés sur la page
    const { captchas, solutions, solved, error } = await page.solveRecaptchas();
  
    if (error) {
      console.error('Erreur lors de la résolution du CAPTCHA:', error);
    } else {
      console.log('CAPTCHAs détectés:', captchas.length);
      console.log('CAPTCHAs résolus:', solved.length);
    }
  
    // Soumettre le formulaire ou continuer le processus après la résolution du CAPTCHA
    await Promise.all([
      page.waitForNavigation(),
      page.click('#recaptcha-demo-submit')
    ]);
  
    // Effectuer d'autres actions, comme prendre une capture d'écran
    await page.screenshot({ path: 'résultat.png', fullPage: true });
  
    await browser.close();
  })();
  