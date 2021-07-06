const { ipcRenderer } = nodeRequire('electron');

window.addEventListener('load', function() {
  ipcRenderer.on('words', (event, data) => {
    if (data.type === 'shown') {
      setTimeout(() => {
        let size = {
          height: document.body.scrollHeight,
          width: document.body.scrollWidth
        };
        document.body.style.height = size.height + 'px';
        ipcRenderer.send('words', { type: 'resize', size });
      });
    }
  });

  document.getElementById('interset').addEventListener('click', event => {
    ipcRenderer.send('words', { type: 'interset', value: document.getElementById('content').value });
    event.stopPropagation();
  })

  document.getElementById('uninterset').addEventListener('click', event => {
    ipcRenderer.send('words', { type: 'uninterset', value: document.getElementById('content').value });
    event.stopPropagation();
  })

  document.getElementById('cancel').addEventListener('click', event => {
    ipcRenderer.send('words', { type: 'cancel' });
    event.stopPropagation();
  })
})
