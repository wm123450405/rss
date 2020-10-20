const { ipcRenderer } = nodeRequire('electron');

window.addEventListener('load', function() {
  let url = '';

  ipcRenderer.on('notice', (event, data) => {
    if (data.type === 'message') {
      document.body.style.height = '0px';
      if (data.data.image) {
        document.getElementById('image').src = data.data.image;
        document.getElementById('image').style.display = 'inline-block';
      } else {
        document.getElementById('image').style.display = 'none';
      }
      document.getElementById('title').innerHTML = data.data.title;
      if (data.data.summary) {
        document.getElementById('summary').innerHTML = data.data.summary;
      } else {
        document.getElementById('summary').style.display = 'inline-block';
        document.getElementById('summary').style.display = 'none';
      }
      url = data.data.url;
      setTimeout(() => {
        let size = {
          height: document.body.scrollHeight,
          width: document.body.scrollWidth
        };
        document.body.style.height = size.height + 'px';
        ipcRenderer.send('notice', { type: 'resize', size });
      });
    }
  })
  
  document.documentElement.addEventListener('click', () => {
    ipcRenderer.send('notice', { type: 'activate', url });
  })

  document.getElementById('close').addEventListener('click', event => {
    ipcRenderer.send('notice', { type: 'close' });
    event.stopPropagation();
  })
})
