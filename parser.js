const { sleep } = require("asyncbox");
const fs = require('fs');
const path = require('path');
const config = require('./config');
const initial = require('./initial');
const Enumerable = require('linq-js');
const { BrowserWindow } = require('glasstron');
const { tween } = require('shifty');
const { screen, ipcMain } = require("electron");

class ParserWindow {
  constructor() {
    this.selected = false;
  }
  async init(app) {
    this.app = app;
    this.window = new BrowserWindow({
      width: 450,
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
        tween({
          from: { width: size.width, height: height, x: contains.width - size.width - 8, y: contains.height - height - 8 },
          to: { width: size.width, height: size.height, x: contains.width - size.width - 8, y: contains.height - size.height - 8 },
          duration: 400,
          easing: 'easeInOutQuad',
          render: ({ width, height, x, y }) => {
            this.window.setBounds({ width, height: Math.floor(height), x, y: Math.floor(y) });
          }
        })
      } else if (data.type === 'ok') {
        this.window.hide();
        this.selected = data.parsers;
      }
    })
    await this.window.loadFile(`windows/parsers.html`);
  }
  async show(parsers) {
    this.selected = false;
    this.window.setBounds({ height: 0 });
    this.window.webContents.send('parsers', { type: 'parsers', initial, parsers });
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
  static async show(parsers) {
    parsers = await Parser.window.show(parsers);
    return parsers.map(Parser.auto);
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
      return infos.filter(info => info.url);
    } else {
      console.log('no infos');
      return [];
    }
  }
}

Parser.Types = {
  AUTO: 'AUTO',
  PAGE: 'PAGE',
  AJAX: 'AJAX',
  RSS: 'RSS',
  XML: 'XML'
}

module.exports = Parser;