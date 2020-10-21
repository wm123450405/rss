const { sleep } = require("asyncbox");
const { shell, screen, ipcMain } = require("electron");
const { BrowserWindow } = require('glasstron');
const { tween } = require('shifty');
const { EventEmitter } = require('events');

class Notice extends EventEmitter {
  constructor(app) {
    super();
    this.app = app;
    this.shown = false;
    this.notices = [];
    this.id = 0;
    this.current = false;
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
    this.window.menuBarVisible = false;
    this.window.loadFile(`windows/notice.html`);
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
          await shell.openExternal(url);
        } catch(e) {
          this.notices.push(this.current);
        }
        this.delaySend();
      } else if (data.type === 'close') {
        this.window.hide();
        this.shown = false;
        this.emit('uninterset', this.current);
        this.delaySend();
      }
    })
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
}

module.exports = Notice;