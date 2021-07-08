const { ipcRenderer } = nodeRequire('electron');

window.addEventListener('load', function() {
  let url = '';
  let shown = false;

  ipcRenderer.on('notice', (event, data) => {
    if (data.type === 'message') {
      shown = false;
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
    } else if (data.type === 'shown') {
      shown = true;
      document.body.style.height = '0px';
      setTimeout(() => {
        let size = {
          height: document.body.scrollHeight,
          width: document.body.scrollWidth
        };
        document.body.style.height = size.height + 'px';
        ipcRenderer.send('notice', { type: 'fixsize', size });
      });
    }
  })
  
  document.documentElement.addEventListener('click', () => {
    ipcRenderer.send('notice', { type: 'activate', url });
  })

  document.getElementById('image').addEventListener('load', () => {
    if (shown) {
      setTimeout(() => {
        let size = {
          height: document.body.scrollHeight,
          width: document.body.scrollWidth
        };
        document.body.style.height = size.height + 'px';
        ipcRenderer.send('notice', { type: 'fixsize', size });
      });
    }
  })

  document.getElementById('close').addEventListener('click', event => {
    document.getElementById('image').src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    ipcRenderer.send('notice', { type: 'close' });
    event.stopPropagation();
  })

  document.getElementById('read').addEventListener('click', event => {
    document.getElementById('image').src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    ipcRenderer.send('notice', { type: 'read' });
    event.stopPropagation();
  })
})
