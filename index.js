const { app, Tray, Menu } = require('electron');
const log = require('electron-log');
const { autoUpdater } = require('electron-updater');
console.log = log.info;
const path = require('path');
const puppeteer = require('puppeteer');
const Pool = require('./pool');
const Parser = require('./parser');
const Words = require('./words');
const Information = require('./information');
const Notice = require('./notice');
const Progress = require('./progress');
const { sleep, waitForCondition, parallel } = require('asyncbox');
const Hot = require('./hot');
const fs = require('fs');
const Enumerable = require('linq-js');
const config = require('./config');
const browserFetcher = puppeteer.createBrowserFetcher({ path: path.resolve('puppeteer'), host: 'https://npm.taobao.org/mirrors' });
const revision = require('puppeteer/package').puppeteer.chromium_revision;

log.transports.file.level = "debug";

if (!fs.existsSync('debug')) {
  fs.mkdirSync('debug');
}
if (!fs.existsSync(path.join(app.getPath('userData'), config.path.dir))) {
  fs.mkdirSync(path.join(app.getPath('userData'), config.path.dir));
}

(async () => {
  log.debug('app starting');
  let browser, pool, pages = [];
  try {
    if (app.requestSingleInstanceLock()) {
      log.debug('start check and download chromium');
      let downloaded = false, downloadError = false, downloadBytes, totalBytes;
      browserFetcher.download(revision, (db, tb) => {
        downloadBytes = db;
        totalBytes = tb;
      })
        .then(() => downloaded = true)
        .catch(error => {
          downloaded = true;
          downloadError = error;
        });
      if (!fs.existsSync(config.path.dir)) {
        fs.mkdirSync(config.path.dir);
      }

      log.debug('application starting');
      app.commandLine.appendSwitch("enable-transparent-visuals");
      app.commandLine.appendSwitch("disable-http-cache");
      await app.whenReady();
      await sleep(1000);
      log.debug('application started');
      // Electron has a bug on linux where it
      // won't initialize properly when using
      // transparency. To work around that, it
      // is necessary to delay the window
      // spawn function.

      const progress = new Progress();
      await progress.init(app);
      const notice = new Notice();
      await notice.init(app);
      const hot = new Hot();
      await hot.init(app);
      await Parser.init(app);
      await Words.init(app);
      log.debug('user settings restoring');
      let { parsers, search } = Parser.restore();
      let { matcher } = hot.restore();
      log.debug('user settings restored');

      if (!parsers.length) {
        log.debug('user settings need init');
        ({ parsers, search } = await Parser.show({ parsers, search }));
        Parser.save({ parsers, search });
        log.debug('user settings need inited');
      }
      if (parsers.length) {
        if (!downloaded) {
          await progress.show('更新必要组件', '0.00%');
        }
        await waitForCondition(async () => {
          if (totalBytes) {
            await progress.update(downloadBytes * 100 / totalBytes, downloadBytes !== totalBytes ? (downloadBytes * 100 / totalBytes).toFixed(2) + '%' : '安装中...')
          }
          return downloaded;
        }, { waitMs: 3600000 });
        if (downloadError) {
          log.debug('chromium downloaded with an error');
          throw downloadError;
        } else {
          progress.close();
          log.debug('chromium success downloaded');
        }

        autoUpdater.logger = log;
        if (autoUpdater.isUpdaterActive()) {
          autoUpdater.on('update-downloaded', async () => {
            await notice.pause(true);
            await hot.pause();
            autoUpdater.quitAndInstall();
          });
          autoUpdater.on('error', async () => {
            await sleep(30000);
            autoUpdater.checkForUpdates();
          });
          autoUpdater.on('update-not-available', async () => {
            await sleep(3600000);
            autoUpdater.checkForUpdates();
          });
          autoUpdater.checkForUpdates();
        }
  
        const executablePath = browserFetcher.revisionInfo(revision).executablePath;
        log.debug('chromium starting: ' + executablePath);
        browser = await puppeteer.launch({
          executablePath: executablePath,
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
        log.debug('chromium started');
        log.debug('chromium page tab starting');
        for (let parser of parsers) {
          parser.page = await browser.newPage();
          await parser.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36');
          parser.page.setDefaultTimeout(60000);
        }
        page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36');
        page.setDefaultTimeout(60000);
        pool = new Pool(
          async () => {
            let page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36');
            page.setDefaultTimeout(60000);
            return page;
          },
          async page => {
            await page.close();
          }
        );

        log.debug('chromium page tab started');
      
        await Information.initStorage(app);

        await sleep(5000);
        tray = new Tray(path.join(__dirname, 'assets/icon/icon.ico'));
        const settingsMenu = Menu.buildFromTemplate([
          {
            label: '配置源',
            click: async () => {
              log.debug('user settings need updating');
              settingsMenu.items.find(mi => mi.label === '配置源').enabled = false;
              await notice.pause(true);
              await hot.pause();
              ({ parsers, search } = await Parser.show({ parsers, search }));
              Parser.save({ parsers, search });
              await hot.resume();
              await notice.resume();
              settingsMenu.items.find(mi => mi.label === '配置源').enabled = true;
            }
          },
          {
            label: '配置热词',
            click: async () => {
              settingsMenu.items.find(mi => mi.label === '配置热词').enabled = false;
              await notice.pause(true);
              await hot.pause();
              let { words, interest } = await Words.show();
              console.log(words, interest);
              if (words && words.length) {
                if (!interest || interest > 0) {
                  matcher.interest(words, config.hot.weight.interset);
                } else {
                  matcher.uninterest(words, config.hot.weight.uninterset.main);
                }
              }
              await hot.resume();
              await notice.resume();
              settingsMenu.items.find(mi => mi.label === '配置热词').enabled = true;
            }
          }
        ]);
        const contextMenu = Menu.buildFromTemplate([
          {
            label: '设置',
            type: 'submenu',
            submenu: settingsMenu
          },
          {
            label: '退出',
            click: () => {
              stop = true;
              hot.close();
              notice.close();
              progress.close();
              Words.close();
              Parser.close();
              tray.destroy();
            }
          },
        ])
        tray.setToolTip('smart-rss');
        tray.setContextMenu(contextMenu);
      
        let stop = false;
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
        latest = +Date.now() - 86400000;
        for(let tick = 0; !stop; tick++) {
          let added = [];
          log.debug('start geting news');

          await parallel(parsers.map(parser => (async () => {
            let informations = [];
            if (stop) return informations;
            log.debug('start geting news from ' + (parser.name || parser.url));
            if (parser.type === Parser.Types.PAGE) {
              try {
                log.info('page loading: ' + parser.url);
                await parser.page.goto(parser.url);
                log.info('page loaded: ' + parser.url);
                if (stop) return informations;
                informations = (await parser.parse(parser.page)).map(({ url, title, summary, image, datetime }) => new Information(url, title, summary, image, datetime)).filter(info => info.datetime);
                log.info(informations.length + ' news got from: ' + parser.url);
              } catch(e) {
                log.error(e);
              }
            } else if (parser.type === Parser.Types.AJAX) {
              
            }
            for (let info of informations) {
              if (await Information.add(info)) {
                added.push(info);
              }
            }
            log.debug('news got from ' + (parser.name || parser.url));
            return informations;
          })()));
          if (stop) break;
          if (search) {
            await parallel(Enumerable.selectMany(matcher.search(), word => Parser.search(word)).select(parser => (async () => {
              let informations = [];
              if (stop) return informations;
              log.debug('start search news from:' + parser.name);
              if (parser.type === Parser.Types.PAGE) {
                let page;
                try {
                  log.info('page loading: ' + parser.url);
                  page = await pool.get();
                  await page.goto(parser.url);
                  log.info('page loaded: ' + parser.url);
                  if (stop) return informations;
                  informations = (await parser.parse(page)).map(({ url, title, summary, image, datetime }) => new Information(url, title, summary, image, datetime)).filter(info => info.datetime);
                  log.info(informations.length + ' news searched from: ' + parser.url);
                } catch(e) {
                  log.error(e);
                } finally {
                  if (page) pool.free(page);
                }
              } else if (parser.type === Parser.Types.AJAX) {
                
              }
              for (let info of informations) {
                if (await Information.add(info)) {
                  added.push(info);
                }
              }
              log.debug('news searched from ' + parser.name);
            })()).toArray());
          }
          if (stop) break;
          log.debug('news got');
          if (tick % 10 == 0) {
            log.debug('check and add hot tags');
            let tags = await Information.hotTags([], latest);
            let words = tags.map(tag => tag.word).filter(word => !matcher.includes(word));
            if (words.length >= config.hot.main) {
              await notice.pause();
              await Parser.wait();
              let interestingWords = await hot.show(words);
              await notice.resume();
              if (interestingWords.length) {
                matcher.interest(interestingWords, config.hot.weight.interset);
                matcher.uninterest(words.slice(0, config.hot.main).filter(word => !interestingWords.includes(word)), config.hot.weight.uninterset.main);
                matcher.uninterest(words.slice(config.hot.main).filter(word => !interestingWords.includes(word)), config.hot.weight.uninterset.other);
                latest = +Date.now();
              }
            } else {
              latest = +Date.now();
            }
          }
          for (let info of added) {
            if (info.datetime >= +Date.now() - 86400000 && matcher.match(info)) {
              notice.send(info);
            }
          }
          for (let i = 0; i < 60; i++) {
            if (stop) break;
            await sleep(1000);
          }
        }
      }
    }
  } catch(e) {
    log.error(e);
  } finally {
    try {
      await parallel([ ...pages, ...(pool ? pool.values : []) ].map(page => (async () => {
        if (page && page.url()) await page.screenshot({ path: `debug/screenshot.${ page.url().replace(/[-:&%\?\/\.]/ig, '_') }.png`, fullPage: true });
      })()));
    } catch(e) {
      log.error(e);
    } finally {
      try {
        if (browser) await browser.close();
      } catch(e) {
        log.error(e);
      } finally {
        await app.quit();
      }
    }
  }
})();