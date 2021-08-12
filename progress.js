const { sleep } = require("asyncbox");
const { screen, ipcMain } = require("electron");
const { BrowserWindow } = require('glasstron');

class Progress {
  constructor() {

  }
  async init(app) {
    this.app = app;
    this.shown = false;
    this.progressing = false;
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
    ipcMain.on('progress', async (event, data) => {
      if (data.type === 'resize') {
        const size = data.size;
        const contains = screen.getPrimaryDisplay().workAreaSize;
        this.window.setBounds({ width: size.width, height: size.height, x: contains.width - size.width - 8, y: contains.height - size.height - 8 });
        this.window.showInactive();
        this.window.moveTop();
        this.progressing = false;
      }
    })
    await this.window.loadFile(`windows/progress.html`);
  }
  async show(title, tip) {
    this.shown = true;
    this.progressing = true;
    this.title = title || '';
    this.tip = tip || '';
    this.window.setBounds({ height: 0 });
    this.window.webContents.send('progress', { type: 'progress', title: this.title, progress: 0, tip: this.tip });
    while(this.progressing) {
      await sleep(100);
    }
  }
  async update(progress, tip) {
    if (this.shown) {
      this.progressing = true;
      this.tip = typeof tip === 'undefined' ? this.tip : tip;
      this.window.webContents.send('progress', { type: 'progress', title: this.title, progress, tip: this.tip });
      while(this.progressing) {
        await sleep(100);
      }
    }
  }
  close() {
    this.shown = false;
    this.window.hide();
  }
}

module.exports = Progress;