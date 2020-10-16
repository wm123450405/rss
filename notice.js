const { Notification, shell } = require("electron");

const notices = [];

class Notice {
  static shown = false;
  static send(information) {
    notices.push(information);
    Notice.delaySend();
  }
  static delaySend() {
    setTimeout(Notice.doSend, 1500);
  }
  static doSend() {
    console.log('do send ', Notice.shown);
    if (!Notice.shown) {
      if (notices.length) {
        Notice.shown = true;
        let information = notices.shift();
        if (Notification.isSupported()) {
          let notification = new Notification({
            title: information.title,
            body: information.summary
          });
          let timeout = setTimeout(() => {
            notices.push(information);
            Notice.shown = false;
            Notice.delaySend();
          }, 30000);
          notification.on('click', async () => {
            console.log('click notice');
            clearTimeout(timeout);
            Notice.shown = false;
            try {
              await shell.openExternal(information.url);
            } catch(e) {
              console.error(e);
            }
            Notice.delaySend();
          });
          notification.on('close', () => {
            console.log('close notice');
            clearTimeout(timeout);
            Notice.shown = false;
            Notice.delaySend();
          })
          notification.show();
        }
      } else {
        Notice.shown = false;
      }
    }
  }
}

module.exports = Notice;