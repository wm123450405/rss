const { sleep } = require("asyncbox");
const { shell, BrowserWindow } = require("electron");
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
    this.window = new BrowserWindow({
      width: 450,
      height: 200,
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
    this.window.menuBarVisible = false;
    this.window.loadFile(`windows/notice.html`);
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
        let information = this.notices.shift();
        this.window.webContents.send('notice', {
          type: 'message',
          data: information
        })
        this.window.show();
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