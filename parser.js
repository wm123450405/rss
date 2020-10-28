const { sleep } = require("asyncbox");
const fs = require('fs');
const path = require('path');
const config = require('./config');
const initial = require('./initial');
const Enumerable = require('linq-js');
const { BrowserWindow } = require('glasstron');
const { tween } = require('shifty');
const { screen, ipcMain } = require("electron");
const log = require("electron-log");

class ParserWindow {
  constructor() {
    this.selected = false;
  }
  async init(app) {
    this.app = app;
    this.shown = false;
    this.window = new BrowserWindow({
      width: 600,
      height: 0,
      minimizable: false,
      maximizable: false,
      alwaysOnTop: true,
      movable: false,
      resizable: false,
      show: false,
      titleBarStyle: 'hidden',
      frame: false,
      transparent: true,
      backgroundColor: '#0000FFE0', 
      webPreferences: {
        nodeIntegration: true,
        experimentalFeatures: true
      }
    });
    this.window.blurType = "acrylic";
    this.window.setBlur(true);
    this.window.setSkipTaskbar(true);
    this.window.menuBarVisible = false;
    ipcMain.on('parsers', async (event, data) => {
      if (data.type === 'resize') {
        const size = data.size;
        const contains = screen.getPrimaryDisplay().workAreaSize;
        const height = this.window.getBounds().height;
        this.window.setBounds({ width: size.width, height: height, x: contains.width - size.width - 8, y: contains.height - height - 8 });
        this.window.showInactive();
        this.window.moveTop();
        //animation
        await tween({
          from: { width: size.width, height: height, x: contains.width - size.width - 8, y: contains.height - height - 8 },
          to: { width: size.width, height: size.height, x: contains.width - size.width - 8, y: contains.height - size.height - 8 },
          duration: 400,
          easing: 'easeInOutQuad',
          render: ({ width, height, x, y }) => {
            this.window.setBounds({ width, height: Math.floor(height), x, y: Math.floor(y) });
          }
        })
        this.window.webContents.send('parsers', { type: 'shown' });
      } else if (data.type === 'fixsize') {
        const size = data.size;
        const contains = screen.getPrimaryDisplay().workAreaSize;
        this.window.setBounds({ width: size.width, height: size.height, x: contains.width - size.width - 8, y: contains.height - size.height - 8 });
      } else if (data.type === 'ok') {
        this.window.hide();
        let { parsers, search } = data;
        this.selected = { parsers, search };
        this.shown = false;
      }
    })
    await this.window.loadFile(`windows/parsers.html`);
  }
  async show({ parsers, search }) {
    this.shown = true;
    this.selected = false;
    this.window.setBounds({ height: 0 });
    this.window.webContents.send('parsers', { type: 'parsers', initial, parsers, search });
    while (!this.selected) {
      await sleep(500);
    }
    return this.selected;
  }
}

class Parser {
  constructor(code, name, url, icon) {
    this.code = code;
    this.url = url;
    this.name = name;
    this.icon = icon;
  }
  get type() {
    return Parser.Types.AUTO;
  }
  async parse(contains) {
    return [];
  }
  static window = new ParserWindow();
  static async init(app) {
    Parser.initStoreage();
    await Parser.window.init(app);
  }
  static async show({ parsers, search }) {
    ({ parsers, search } = await Parser.window.show({
      search,
      parsers : parsers.map(parser => parser.code)
    }));
    parsers = parsers.map(Parser.auto);
    return { parsers, search };
  }
  static async wait() {
    while(this.shown) {
      await sleep(500);
    }
  }
  static async isShown() {
    return Parser.window.shown;
  }
  static initStoreage() {
    if (!fs.existsSync(path.join(config.path.dir, config.path.parser))) {
      fs.writeFileSync(path.join(config.path.dir, config.path.parser), '{}');
    }
  }
  static restore() {
    const storage = JSON.parse(fs.readFileSync(path.join(config.path.dir, config.path.parser)));
    storage.parsers = (storage.parsers || []).map(Parser.auto);
    return storage;
  }
  static save(storage) {
    storage.parsers = storage.parsers.map(parser => parser.code);
    fs.writeFileSync(path.join(config.path.dir, config.path.parser), JSON.stringify(storage));
  }
  static page({ code, name, url, icon, parser }) {
    return new DefaultPageParser({ code, name, url, icon, parser });
  }
  static ajax({ code, name, url, icon, parser }) {
    return new DefaultAjaxParser({ code, name, url, icon, parser });
  }
  static auto(code) {
    let parser = Enumerable.from(initial.parsers).selectMany(t => t.parsers).first(tp => tp.code === code);
    switch(parser.type) {
      case Parser.Types.PAGE:
        return Parser.page(parser);
      case Parser.Types.AJAX:
        return Parser.ajax(parser);
      default:
        return false;
    }
  }
  static factories = [];
  static async match(page, url) {
    for (let factory of Parser.factories) {
      if (await factory.match(page)) {
        return await factory.create(page, url);
      }
    }
    return false;
  }
  static search(keyword) {
    return SearchParser.parsers(keyword);
  }
}

class DefaultAjaxParser extends Parser {
  constructor({ code, url, name, icon }) {
    super(code, name, url, icon);
  }
  get type() {
    return Parser.Types.AJAX;
  }
  async parse(contains) {
    
  }
}

class DefaultPageParser extends Parser {
  constructor({ code, name, url, icon, parser }) {
    super(code, name, url, icon);
    this.parser = parser;
  }
  get type() {
    return Parser.Types.PAGE;
  }
  async parse(page) {
    let infos = await page.evaluate(this.parser);
    if (infos) {
      infos = infos.filter(info => info.url && info.datetime);
      for (let info of infos) {
        if (info.url.startsWith('//')) {
          info.url = (this.url.startsWith('https:') ? 'https:' : 'http:') + info.url;
        }
        if (info.image && info.image.startsWith('//')) {
          info.image = (this.url.startsWith('https:') ? 'https:' : 'http:') + info.image;
        }
      }
      return infos;
    } else {
      log.warn('no infos');
      return [];
    }
  }
}

class ParserFactory {
  constructor() {

  }
  async match(page, url) {
    return false;
  }
  async create(page, url) {
    return false;
  }
}

class DiscuzParser extends DefaultPageParser {
  constructor(name, url, icon) {
    super({
      name, url, icon,
      code: url,
      parser: `[...document.querySelectorAll('#threadlisttableid tr')].filter(tr => tr.querySelector('.common a.s')).map(tr => ({ url: tr.querySelector('.common a.s').href, title: tr.querySelector('.common a.s').textContent, datetime: tr.querySelector('.num+.by em').textContent }))`
    });
  }
}

class DiscuzParserFactory extends ParserFactory {
  constructor() {
    super();
  }
  async match(page, url) {
    return await page.evaluate(`document.head.querySelector('meta[name=generator]')&&document.head.querySelector('meta[name=generator]').content.startsWith('Discuz!')||!!document.getElementById('discuz_tips')`);
  }
  async create(page, url) {
    let info = await page.evaluate(`{ name: document.head.querySelector('meta[name=application-name]')&&document.head.querySelector('meta[name=application-name]').content||document.title, icon: document.querySelector('#hd h2 img').src }`);
    return new DiscuzParser(info.name, url, info.icon);
  }
}

class SearchParser extends DefaultPageParser {
  constructor(url, code, name, icon, parser) {
    super({ code, name, url, icon, parser })
  }
  static parsers(keyword) {
    return [
      new BaiduSearchParser(keyword)
    ];
  }
}

class BaiduSearchParser extends SearchParser {
  constructor(keyword) {
    super(
      `https://www.baidu.com/s?tn=news&rtt=4&bsst=1&cl=2&medium=0&wd=${ keyword }`,
      `baidu.${keyword}`,
      `百度-${keyword}`,
      `https://www.baidu.com/img/flexible/logo/pc/result.png`,
      `$('.result-op.new-pmd').map(function() { return { title: $(this).find('a.news-title-font_1xS-F').text(), summary: $(this).find('.c-span-last>.c-font-normal').text(), image: $(this).find('img').attr('src'), url: $(this).find('a').attr('href'), datetime: $(this).find('.news-source>.c-color-gray2').text() }}).toArray()`
    );
  }
}

Parser.Types = {
  AUTO: 'AUTO',
  PAGE: 'PAGE',
  AJAX: 'AJAX',
  RSS: 'RSS',
  XML: 'XML'
}

Parser.factories = [
  new DiscuzParserFactory()
];

module.exports = Parser;