const { ipcRenderer } = nodeRequire('electron');

window.addEventListener('load', function() {
  ipcRenderer.on('progress', (event, data) => {
    if (data.type === 'progress') {
      document.body.style.height = '0px';
      document.getElementById('progress-current').style.width = (data.progress || 0) + '%';
      document.getElementById('tip').innerHTML = data.tip || '';
      document.getElementById('title').innerHTML = data.title || '';
      setTimeout(() => {
        let size = {
          height: document.body.scrollHeight,
          width: document.body.scrollWidth
        };
        document.body.style.height = size.height + 'px';
        ipcRenderer.send('progress', { type: 'resize', size });
      });
    }
  });
})
