const { sleep } = require("asyncbox");
const { screen, ipcMain } = require("electron");
const { BrowserWindow } = require('glasstron');
const { tween } = require('shifty');
const Matcher = require("./matcher");
const fs = require('fs');
const path = require('path');

const config = require('./config');
const { timeStamp } = require("console");

class Hot {
  constructor() {
    this.tags = false;
    this.selected = false;
    this.initStoreage();
  }
  async init(app) {
    this.app = app;
    this.shown = false;
    this.paused = false;
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
    ipcMain.on('hot', async (event, data) => {
      if (data.type === 'resize') {
        if (!this.paused) {
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
        }
      } else if (data.type === 'ok') {
        this.window.hide();
        this.selected = data.tags;
        this.tags = false;
        this.shown = false;
      } else if (data.type === 'cancel') {
        this.window.hide();
        this.selected = [];
        this.tags = false;
        this.shown = false;
      }
    })
    await this.window.loadFile(`windows/hot.html`);
  }
  initStoreage() {
    if (!fs.existsSync(path.join(config.path.dir, config.path.hot))) {
      fs.writeFileSync(path.join(config.path.dir, config.path.hot), '{}');
    }
  }
  async show(tags) {
    if (!tags.length) return tags;
    this.shown = true;
    this.selected = false;
    this.tags = tags;
    this.window.setBounds({ height: 0 });
    this.window.webContents.send('hot', { type: 'tags', mainTags: tags.slice(0, config.hot.main), otherTags: tags.slice(config.hot.main) });
    while (!this.selected) {
      await sleep(500);
    }
    return this.selected;
  }
  async pause() {
    this.paused = true;
    this.window.hide();
  }
  async resume() {
    this.paused = false;
    if (this.shown && this.tags) {
      await this.show(this.tags);
    }
  }
  close() {
    this.window.hide();
    this.selected = [];
  }
  restore() {
    const saved = JSON.parse(fs.readFileSync(path.join(config.path.dir, config.path.hot)));
    this.matcher = new Matcher(saved.matcher || []);
    this.matcher.on('changed', () => this.save());
    return {
      matcher: this.matcher
    }
  }
  save() {
    const saved = {
      matcher: this.matcher.tags
    };
    fs.writeFileSync(path.join(config.path.dir, config.path.hot), JSON.stringify(saved));
  }
}

module.exports = Hot;