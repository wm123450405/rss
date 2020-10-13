const puppeteer = require('puppeteer');
const { app } = require('electron');

(async () => {
  await app.whenReady();
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: 'userdata',
    defaultViewport: {
      width: 1250,
      height: 800
    }
  });
  const page = await browser.newPage();

  
  
  await browser.close();
  await app.quit();
})();