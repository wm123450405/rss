const { app, Tray, Menu } = require('electron');
const path = require('path');
const dir = app.isPackaged ? path.dirname(app.getPath('exe')) : __dirname;
const user = app.getPath('userData');
const log = require('electron-log');
console.log = log.info;
console.error = log.error;
const { autoUpdater } = require('electron-updater');
const Store = require('electron-store');
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
const browserFetcher = puppeteer.createBrowserFetcher({ path: path.join(user, 'puppeteer'), host: 'https://npm.taobao.org/mirrors' });
const revision = require('puppeteer/package').puppeteer.chromium_revision;
const { exit } = require('process');
const ex = process.execPath;

log.transports.file.level = "debug";

log.debug(dir);

if (!fs.existsSync(path.join(dir, 'debug'))) {
  fs.mkdirSync(path.join(dir, 'debug'));
}
if (!fs.existsSync(path.join(user, config.path.dir))) {
  fs.mkdirSync(path.join(user, config.path.dir));
}

(async () => {
  log.debug('app starting');
  const store = new Store();
  let browser, pool;
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
      if (!fs.existsSync(path.join(dir, config.path.dir))) {
        fs.mkdirSync(path.join(dir, config.path.dir));
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
          await progress.show('更新必要组件', '');
        }
        await waitForCondition(async () => {
          if (totalBytes) {
            await progress.update(downloadBytes * 100 / totalBytes, downloadBytes !== totalBytes ? '' : '安装中...')
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
        pool = new Pool(
          async () => {
            let page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36');
            page.setDefaultTimeout(60000);
            return page;
          },
          async page => {
            await page.goto('about:blank');
          },
          async page => {
            if (page && !page.isClosed()) {
              await page.close();
            }
          }
        );

        log.debug('chromium page tab started');
      
        await Information.initStorage(app);

        await sleep(1000);

        const autoOpen = store.get('base.autoOpen') !== false;
        store.set('base.autoOpen', autoOpen);
        if (app.isPackaged) {
          app.setLoginItemSettings({
            openAtLogin: autoOpen,
            path: ex,
            args: []
          });
        }

        tray = new Tray(path.join(__dirname, 'assets/icon/icon.ico'));

        const exit = () => {
          stop = true;
          pool.finalize(async (page) => {
            if (page && !page.isClosed()) {
              await page.close();
            }
          });
          hot.close();
          notice.close();
          progress.close();
          Words.close();
          Parser.close();
          tray.destroy();
        };

        const settingsMenu = Menu.buildFromTemplate([
          {
            label: '开机启动',
            type: 'checkbox',
            checked: autoOpen,
            enabled: app.isPackaged,
            click: async () => {
              let menuItem = settingsMenu.items.find(mi => mi.label === '开机启动');
              store.set('base.autoOpen', menuItem.checked);
              if (menuItem.checked) {
                app.setLoginItemSettings({
                  openAtLogin: true,
                  path: ex,
                  args: []
                });
              } else {
                app.setLoginItemSettings({
                  openAtLogin: false,
                  path: ex,
                  args: []
                });
              }
            }
          },
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
              log.info(words, interest);
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
          },
          {
            label: '清空痕迹',
            click: async () => {
              await hot.clear();
              await Parser.clear();
              exit();
              app.relaunch();
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
            click: exit
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
          notice.clear(matcher);
        }).on('uninterset', info => {
          let sum = Enumerable.sum(info.tags, tag => tag.weight || 0);
          for (let tag of info.tags) {
            matcher.uninterest([ tag.word ], tag.weight / sum);
          }
          notice.clear(matcher);
        })
        latest = +Date.now() - 86400000;
        for(let tick = 0; !stop; tick++) {
          let added = [];
          let informations = [];
          log.debug('start geting news');
          await parallel(parsers.map(parser => (async () => {
            let infos = [];
            if (stop) return;
            log.debug('start geting news from ' + (parser.name || parser.url));
            if (parser.type === Parser.Types.PAGE) {
              let page;
              try {
                log.info('page loading: ' + parser.url);
                page = await pool.get();
                await page.goto(parser.url);
                log.info('page loaded: ' + parser.url);
                if (stop) return;
                infos = (await parser.parse(page)).map(({ url, title, summary, image, datetime }) => new Information(url, title, summary, image, datetime)).filter(info => info.datetime);
                log.info(infos.length + ' news got from: ' + parser.url);
                informations.push(...infos);
              } catch(e) {
                if (!stop) {
                  log.error(e);
                }
              } finally {
                if (page) pool.free(page);
              }
            } else if (parser.type === Parser.Types.AJAX) {
              
            }
            log.debug('news got from ' + (parser.name || parser.url));
          })()));
          if (stop) break;
          if (search) {
            await parallel(Enumerable.selectMany(matcher.search(), word => Parser.search(word)).select(parser => (async () => {
              let infos = [];
              if (stop) return;
              log.debug('start search news from:' + parser.name);
              if (parser.type === Parser.Types.PAGE) {
                let page;
                try {
                  log.info('page loading: ' + parser.url);
                  page = await pool.get();
                  await page.goto(parser.url);
                  log.info('page loaded: ' + parser.url);
                  if (stop) return;
                  infos = (await parser.parse(page)).map(({ url, title, summary, image, datetime }) => new Information(url, title, summary, image, datetime)).filter(info => info.datetime);
                  log.info(infos.length + ' news searched from: ' + parser.url);
                  informations.push(...infos);
                } catch(e) {
                  if (!stop) {
                    log.error(e);
                  }
                } finally {
                  if (page) pool.free(page);
                }
              } else if (parser.type === Parser.Types.AJAX) {
                
              }
              log.debug('news searched from ' + parser.name);
            })()).toArray());
          }

          await notice.pause();
          if (stop) break;
          added.push(...(await Information.addAll(informations)));
          await notice.resume();

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
      if (pool) {
        await pool.finalize(async (page) => {
          if (page && !page.isClosed()) {
            await page.close();
          }
        });
        await parallel(pool.values.map(page => (async () => {
          if (page && !page.isClosed() && page.url()) await page.screenshot({ path: `debug/screenshot.${ page.url().replace(/[-:&%\?\/\.]/ig, '_') }.png`, fullPage: true });
        })()));
      }
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