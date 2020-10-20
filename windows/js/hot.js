const { ipcRenderer } = nodeRequire('electron');

window.addEventListener('load', function() {
  let tags = [];

  ipcRenderer.on('hot', (event, data) => {
    if (data.type === 'tags') {
      tags = [];
      document.getElementById('tip').style.display = 'block';
      document.getElementById('other-tags').style.display = 'none';
      document.body.style.height = '0px';
      let tagContains = document.getElementById('tags');
      tagContains.innerHTML = '';
      let otherTagContains = document.getElementById('other-tags');
      otherTagContains.innerHTML = '';
      for (let tag of data.tags.slice(0, 50)) {
        let tagDiv = document.createElement('div');
        tagDiv.className = 'tag';
        tagDiv.innerHTML = tag;
        tagDiv.addEventListener('click', () => {
          if (tags.includes(tag)) {
            tags = tags.filter(t => t !== tag);
            tagDiv.className = 'tag';
          } else {
            tags.push(tag);
            tagDiv.className = 'tag selected';
          }
        })
        tagContains.appendChild(tagDiv);
      }
      for (let tag of data.tags.slice(50)) {
        let tagDiv = document.createElement('div');
        tagDiv.className = 'tag';
        tagDiv.innerHTML = tag;
        tagDiv.addEventListener('click', () => {
          if (tags.includes(tag)) {
            tags = tags.filter(t => t !== tag);
            tagDiv.className = 'tag';
          } else {
            tags.push(tag);
            tagDiv.className = 'tag selected';
          }
        })
        otherTagContains.appendChild(tagDiv);
      }
      setTimeout(() => {
        let size = {
          height: document.body.scrollHeight,
          width: document.body.scrollWidth
        };
        document.body.style.height = size.height + 'px';
        ipcRenderer.send('hot', { type: 'resize', size });
      });
    }
  });

  document.getElementById('more').addEventListener('click', event => {
    document.getElementById('tip').style.display = 'none';
    document.getElementById('other-tags').style.display = 'block';
    event.stopPropagation();
    setTimeout(() => {
      let size = {
        height: document.body.scrollHeight,
        width: document.body.scrollWidth
      };
      document.body.style.height = size.height + 'px';
      ipcRenderer.send('hot', { type: 'resize', size });
    });
  })

  document.getElementById('ok').addEventListener('click', event => {
    ipcRenderer.send('hot', { type: 'ok', tags });
    event.stopPropagation();
  })

  document.getElementById('cancel').addEventListener('click', event => {
    ipcRenderer.send('hot', { type: 'cancel' });
    event.stopPropagation();
  })
})
