const { sleep } = require("asyncbox");
const { shell, screen, ipcMain } = require("electron");
const { BrowserWindow } = require('glasstron');
const { tween } = require('shifty');
console.log( tween );
// const { NotificationCenter, WindowsBalloon, Growl } = require("node-notifier");
// const notifier = require('node-notifier');
// const notifier = new Growl({ withFallback: false })

// notifier.on('click', function() {
//   console.log('click', arguments);
// }).on('activate', function() {
//   console.log('activate', arguments);
// }).on('close', function() {
//   console.log('close', arguments);
// }).on('timeout', function() {
//   console.log('timeout', arguments);
// });

class Notice {
  constructor(app) {
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
        try {
          await shell.openExternal(url);
        } catch(e) {
          this.notices.push(this.current);
        }
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

        // toaster.notify();
        // notifier.notify({
        //   id: id++,
        //   title: information.title,
        //   message: information.summary || information.title,
        //   timeout: false,
        //   time: 30000,
        //   wait: true,
        //   appID: 'smart-rss'
        // }, async (err, response, metadata) => {
        //   Notice.shown = false;
        //   console.log(err, response, metadata);
        //   try {
        //     if (response === 'activate' || typeof response === 'undefined') {
        //       await shell.openExternal(information.url);
        //     } else {
        //       notifier.notify({
        //         remove: id,
        //         title: information.title,
        //         timeout: false,
        //         wait: true,
        //         appID: 'smart-rss'
        //       })
        //     }
        //   } catch(e) {
        //     console.error(e);
        //     notices.push(information);
        //   }
        //   Notice.delaySend();
        // });
        // setTimeout(() => {
        //   notifier.notify({
        //     close: id,
        //     title: information.title,
        //     wait: true,
        //     appID: 'smart-rss'
        //   })
        // }, 2500)
        // setTimeout(() => {
        //   notifier.notify({
        //     close: id,
        //     title: information.title,
        //     wait: true,
        //     appID: 'smart-rss'
        //   })
        // }, 15000)
        // notifier.notify(new WindowsToaster({
        //   title: information.title,
        //   message: information.summary || information.title,
        //   wait: true
        // }), async (err, response, metadata) => {
        //   Notice.shown = false;
        //   try {
        //     if (response === 'activate' || typeof response === 'undefined') {
        //       await shell.openExternal(information.url);
        //     }
        //   } catch(e) {
        //     console.error(e);
        //     notices.push(information);
        //   }
        //   Notice.delaySend();
        // });
      } else {
        this.shown = false;
      }
    }
  }
}

module.exports = Notice;