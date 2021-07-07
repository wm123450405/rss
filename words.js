const { sleep } = require("asyncbox");
const { screen, ipcMain } = require("electron");
const { BrowserWindow } = require('glasstron');
const { tween } = require('shifty');
const path = require('path');

const config = require('./config');

class WordsWindow {
  constructor() {
    this.value = '';
    this.interest = 0;
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
    ipcMain.on('words', async (event, data) => {
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
      } else if (data.type === 'interest') {
        this.window.hide();
        this.value = data.value;
        this.interest = 1;
        this.shown = false;
      } else if (data.type === 'uninterest') {
        this.window.hide();
        this.value = data.value;
        this.interest = -1;
        this.shown = false;
      } else if (data.type === 'cancel') {
        this.window.hide();
        this.shown = false;
      }
    })
    await this.window.loadFile(`windows/words.html`);
  }
  async show() {
    this.shown = true;
    this.value = '';
    this.interest = 0;
    this.window.setBounds({ height: 0 });
    this.window.webContents.send('words', { type: 'shown' });
    while (this.shown) {
      await sleep(500);
    }
    return {
      interest: this.interest,
      words: this.value.split(/[\r\n]+/ig)
    };
  }
  async pause() {
    this.paused = true;
    this.window.hide();
  }
  async resume() {
    this.paused = false;
    if (this.shown) {
      await this.show();
    }
  }
  close() {
    this.window.hide();
    this.value = '';
    this.interest = 0;
    this.shown = false;
  }
}

class Words {
  static window = new WordsWindow();
  static async init(app) {
    await Words.window.init(app);
  }
  static async show() {
    return await Words.window.show();
  }
  static async wait() {
    while(Words.window.shown) {
      await sleep(500);
    }
  }
  static async isShown() {
    return Words.window.shown;
  }
  static close() {
    Words.window.close();
  }
}

module.exports = Words;