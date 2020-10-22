const { sleep } = require("asyncbox");
const { shell, screen, ipcMain } = require("electron");
const { BrowserWindow } = require('glasstron');
const { tween } = require('shifty');
const { EventEmitter } = require('events');
const { execSync } = require("child_process");
const log = require("electron-log");

class Notice extends EventEmitter {
  constructor(app) {
    super();
    this.shown = false;
    this.notices = [];
    this.id = 0;
    this.current = false;
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
    ipcMain.on('notice', async (event, data) => {
      if (data.type === 'resize') {
        const size = data.size;
        const contains = screen.getPrimaryDisplay().workAreaSize;
        this.window.setBounds({ width: size.width, height: size.height, x: contains.width, y: contains.height - size.height - 8 });
        this.window.showInactive();
        this.window.moveTop();
        //animation
        tween({
          from: { width: size.width, height: size.height, x: contains.width, y: contains.height - size.height - 8 },
          to: { width: size.width, height: size.height, x: contains.width - size.width - 8, y: contains.height - size.height - 8 },
          duration: 400,
          easing: 'easeInOutQuad',
          render: ({ width, height, x, y }) => {
            this.window.setBounds({ width, height, x: Math.floor(x), y });
          }
        })
      } else if (data.type === 'activate') {
        const url = data.url;
        this.window.hide();
        this.shown = false;
        this.emit('interset', this.current);
        try {
          log.info('open: ' + url);
          switch (process.platform) {
            case "darwin":
              execSync('open ' + url);
              break;
            case "win32":
              execSync('start ' + url);
              break;
            default:
              execSync('xdg-open', [url]);
          }
        } catch(e) {
          this.notices.push(this.current);
        }
        this.delaySend();
      } else if (data.type === 'close') {
        this.window.hide();
        this.shown = false;
        this.emit('uninterset', this.current);
        this.delaySend();
      } else if (data.type === 'read') {
        this.window.hide();
        this.shown = false;
        this.emit('interset', this.current);
        this.delaySend();
      }
    })
    await this.window.loadFile(`windows/notice.html`);
  }
  send(information) {
    this.notices.push(information);
    this.delaySend();
  }
  async delaySend() {
    await sleep(1500);
    this.doSend();
  }
  doSend() {
    if (!this.shown) {
      if (this.notices.length) {
        this.shown = true;
        this.current = this.notices.shift();
        log.info('剩余未读:' + this.notices.length);
        this.window.setBounds({ height: 0 });
        this.window.webContents.send('notice', {
          type: 'message',
          data: this.current
        })
      } else {
        this.shown = false;
      }
    }
  }
  async pause() {
    while (this.shown) {
      await sleep(500);
    }
    this.shown = true;
  }
  async resume() {
    this.shown = false;
    this.delaySend();
  }
  close() {
    this.notices = [];
    this.window.hide();
    this.shown = false;
  }
}

module.exports = Notice;