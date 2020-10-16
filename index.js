const puppeteer = require('puppeteer');
const { app } = require('electron');
const CnbetaParser = require('./parsers/cnbeta');
const Parser = require('./parser');
const Information = require('./information');
const { sleep } = require('asyncbox');
const Notice = require('./notice');
const IthomeParser = require('./parsers/ithome');

let stop = false;

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

  await sleep(5000);

  let parsers = [
    new CnbetaParser(),
    new IthomeParser()
  ];
  const informations = [];
  while(!stop) {
    for (let parser of parsers) {
      if (parser.type === Parser.Types.PAGE) {
        try {
          await page.goto(parser.url, { timeout: 30000 });
          for (let info of (await parser.parse(page))) {
            if (Information.add(info)) {
              console.log('added', info);
              if (/苹果|微软|谷歌|阿里/.test(info.title)) {
                Notice.send(info);
              }
            }
          }
        } catch(e) {
          console.error(e);
        }
      } else if (parser.type === Parser.Types.AJAX) {

      }
    }
    await sleep(30000);
  }
  
  await browser.close();
  await app.quit();
})();