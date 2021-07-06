const { ipcRenderer } = nodeRequire('electron');

window.addEventListener('load', function() {
  ipcRenderer.on('words', (event, data) => {
    if (data.type === 'shown') {
      document.getElementById('content').value = '';
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

  document.getElementById('interest').addEventListener('click', event => {
    ipcRenderer.send('words', { type: 'interest', value: document.getElementById('content').value });
    event.stopPropagation();
  })

  document.getElementById('uninterest').addEventListener('click', event => {
    ipcRenderer.send('words', { type: 'uninterest', value: document.getElementById('content').value });
    event.stopPropagation();
  })

  document.getElementById('cancel').addEventListener('click', event => {
    ipcRenderer.send('words', { type: 'cancel' });
    event.stopPropagation();
  })
})
