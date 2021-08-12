const { ipcRenderer } = nodeRequire('electron');

window.addEventListener('load', function() {
  let progress = 0, target = 0;

  setInterval(function() {
    if (target < progress) progress = 0;
    progress = Math.min(target, Math.ceil((target - progress) * 400 / 25) / 400 + progress);
    document.getElementById('progress-current').style.width = progress + '%';
    document.getElementById('current').innerHTML = progress.toFixed(2) + '%';
  }, 40);

  ipcRenderer.on('progress', (event, data) => {
    if (data.type === 'progress') {
      target = data.progress || 0;
      if (target < progress) progress = 0;
      document.body.style.height = '0px';
      if (data.tip) {
        document.getElementById('current').style.display = 'none';
        document.getElementById('tip').style.display = 'flex';
        document.getElementById('tip').innerHTML = data.tip || '';
      } else {
        document.getElementById('current').style.display = 'flex';
        document.getElementById('tip').style.display = 'none';
      }

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
