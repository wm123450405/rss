const puppeteer = require('puppeteer');
const { app } = require('electron');
const CnbetaParser = require('./parsers/cnbeta');
const Parser = require('./parser');
const Information = require('./information');
const { sleep } = require('asyncbox');
const Notice = require('./notice');
const Hot = require('./hot');
const IthomeParser = require('./parsers/ithome');
const DonewsParser = require('./parsers/donews');
const Enumerable = require('linq-js');
const config = require('./config');

(async () => {
  let browser, page;
  try {
    if (app.requestSingleInstanceLock()) {
      app.commandLine.appendSwitch("enable-transparent-visuals");
      await app.whenReady();
      await sleep(1000);
      // Electron has a bug on linux where it
      // won't initialize properly when using
      // transparency. To work around that, it
      // is necessary to delay the window
      // spawn function.
      browser = await puppeteer.launch({
        headless: true,
        userDataDir: 'userdata',
        // dumpio: true,
        ignoreHTTPSErrors: true,
        // devtools: true,
        pipe: true,
        args: [
          // '--disable-gpu-sandbox',
          // '--enable-sandbox-logging',
          // '--gpu-sandbox-allow-sysv-shm',
          '--no-sandbox', 
          // '--disable-setuid-sandbox',
          // '--deterministic-fetch',
          // '--no-zygote',
          // '--single-process',
          // '-–no-first-run',
          // '--disable-gpu',
          // '--disable-gl-drawing-for-tests',
          // '--disable-web-security',
          // "--fast-start", 
          // "--disable-extensions",
          // '--window-position=-19200,-10800'
        ],
        defaultViewport: {
          width: 1250,
          height: 800
        }
      });
      const pages = await browser.pages();
      page = pages.length ? pages[0] : await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36');
      page.setDefaultTimeout(60000);
      const notice = new Notice(app);
      const hot = new Hot(app);
    
      await sleep(5000);
    
      let stop = false;
      const { matcher } = hot.restore();
      notice.on('interset', info => {
        let sum = Enumerable.sum(info.tags, tag => tag.weight || 0);
        for (let tag of info.tags) {
          matcher.interest([ tag.word ], tag.weight / sum);
        }
      }).on('uninterset', info => {
        let sum = Enumerable.sum(info.tags, tag => tag.weight || 0);
        for (let tag of info.tags) {
          matcher.uninterest([ tag.word ], tag.weight / sum);
        }
      })
      if (matcher.empty()) {
        //首次热词选择
      }
      const parsers = [
        new CnbetaParser(),
        new IthomeParser(),
        new DonewsParser()
      ];
      for(let tick = 0; !stop; tick++) {
        let added = [];
        for (let parser of parsers) {
          let informations = [];
          if (parser.type === Parser.Types.PAGE) {
            try {
              await parser.refresh(page);
              console.log('page loaded')
              informations = (await parser.parse(page)).map(({ url, title, summary, image, time }) => new Information(url, title, summary, image, time));
            } catch(e) {
              console.error(e);
            }
          } else if (parser.type === Parser.Types.AJAX) {
    
          }
          for (let info of informations) {
            if (Information.add(info)) {
              added.push(info);
            }
          }
        }
        if (tick % 1 == 0) {
          let tags = Information.hotTags();
          let words = tags.map(tag => tag.word).filter(word => !matcher.includes(word));
          if (words.length > 10) {
            await notice.pause();
            let interestingWords = await hot.show(words);
            await notice.resume();
            if (interestingWords.length) {
              matcher.interest(interestingWords, config.hot.weight.interset);
              matcher.uninterest(words.slice(0, config.hot.main).filter(word => !interestingWords.includes(word)), config.hot.weight.uninterset.main);
              matcher.uninterest(words.slice(config.hot.main).filter(word => !interestingWords.includes(word)), config.hot.weight.uninterset.other);
            }
          }
        }
        for (let info of added) {
          if (matcher.match(info)) {
            notice.send(info);
          }
        }
        await sleep(10000);
      }
    }
  } finally {
    if (page) await page.screenshot({ path: 'debug/screenshot.png', fullPage: true });
    if (browser) await browser.close();
    await app.quit();
  }
})();