const puppeteer = require('puppeteer');
const { app } = require('electron');
const CnbetaParser = require('./parsers/cnbeta');
const Parser = require('./parser');
const Information = require('./information');
const { sleep } = require('asyncbox');
const Notice = require('./notice');
const IthomeParser = require('./parsers/ithome');
const DonewsParser = require('./parsers/donews');

let stop = false;

(async () => {
  app.commandLine.appendSwitch("enable-transparent-visuals");
  await app.whenReady();
  await sleep(1000);
  // Electron has a bug on linux where it
  // won't initialize properly when using
  // transparency. To work around that, it
  // is necessary to delay the window
  // spawn function.
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: 'userdata',
    defaultViewport: {
      width: 1250,
      height: 800
    }
  });
  const page = await browser.newPage();
  const notice = new Notice(app);

  await sleep(5000);

  notice.send({ title: 'test', summary: 'test2', url: 'https://baidu.com/' });

  let parsers = [
    new CnbetaParser(),
    new IthomeParser(),
    new DonewsParser()
  ];
  const informations = [];
  while(!stop) {
    for (let parser of parsers) {
      if (parser.type === Parser.Types.PAGE) {
        try {
          await page.goto(parser.url, { timeout: 30000 });
          for (let info of (await parser.parse(page))) {
            if (Information.add(info)) {
              // console.log('added', info);
              if (/苹果|微软|谷歌|阿里/.test(info.title)) {
                notice.send(info);
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