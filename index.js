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
  const hot = new Hot(app);

  await sleep(5000);

  let parsers = [
    new CnbetaParser(),
    new IthomeParser(),
    new DonewsParser()
  ];
  let stop = false;
  let matcher = hot.restore();
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
  for(let tick = 0; !stop; tick++) {
    let added = [];
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
          added.push(info);
        }
      }
    }
    if (tick % 1 == 0) {
      let tags = Information.hotTags();
      console.log(tags);
      let words = tags.map(tag => tag.word).filter(word => !matcher.includes(word));
      console.log(words);
      if (words.length > 10) {
        words = await hot.show(words);
        if (words.length) {
          matcher.interest(words);
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
  
  await browser.close();
  await app.quit();
})();