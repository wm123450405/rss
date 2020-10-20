const puppeteer = require('puppeteer');
const { app } = require('electron');
const CnbetaParser = require('./parsers/cnbeta');
const Parser = require('./parser');
const Information = require('./information');
const { sleep } = require('asyncbox');
const Notice = require('./notice');
const IthomeParser = require('./parsers/ithome');
const DonewsParser = require('./parsers/donews');

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

  notice.send({ title: 'test', summary: 'test2', url: 'https://www.baidu.com/' });

  let parsers = [
    new CnbetaParser(),
    new IthomeParser(),
    new DonewsParser()
  ];
  let stop = false;
  let initing = true;
  while(!stop) {
    for (let parser of parsers) {
      let informations = [];
      if (parser.type === Parser.Types.PAGE) {
        try {
          await page.goto(parser.url, { timeout: 30000 });
          informations = await parser.parse(page);
        } catch(e) {
          console.error(e);
        }
      } else if (parser.type === Parser.Types.AJAX) {

      }
      for (let info of informations) {
        if (Information.add(info)) {
          // console.log('added', info);
          if (!initing) {
            if (/苹果|微软|谷歌|阿里/.test(info.title)) {
              notice.send(info);
            }
          }
        }
      }
    }
    if (initing) {
      let hotTags = Information.hotTags();
      console.log(hotTags);
    }
    await sleep(30000);
    initing = false;
  }
  
  await browser.close();
  await app.quit();
})();