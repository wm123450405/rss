const { ipcRenderer } = nodeRequire('electron');

window.addEventListener('load', function() {
  let tags = [];
  let countdown = -1;
  let timer;

  function formatCountdown(countdown) {
    return countdown > 100 ? countdown : countdown > 10 ? '0' + countdown : ('00' + countdown);
  }

  ipcRenderer.on('hot', (event, data) => {
    if (data.type === 'tags') {
      document.body.style.height = '0px';
      tags = [];
      countdown = 120;
      document.getElementById('tip').style.display = 'block';
      document.getElementById('other-tags').style.display = 'none';
      let tagContains = document.getElementById('tags');
      tagContains.innerHTML = '';
      let otherTagContains = document.getElementById('other-tags');
      otherTagContains.innerHTML = '';
      for (let tag of data.mainTags) {
        let tagDiv = document.createElement('div');
        tagDiv.className = 'tag';
        tagDiv.innerHTML = tag;
        tagDiv.addEventListener('click', () => {
          clearInterval(timer);
          countdown = -1;
          document.getElementById('cancel').innerHTML = '取消';
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
      for (let tag of data.otherTags) {
        let tagDiv = document.createElement('div');
        tagDiv.className = 'tag';
        tagDiv.innerHTML = tag;
        tagDiv.addEventListener('click', () => {
          clearInterval(timer);
          countdown = -1;
          document.getElementById('cancel').innerHTML = '取消';
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
      document.getElementById('cancel').innerHTML = countdown < 0 ? '取消' : `取消 (${ formatCountdown(countdown) })`;
      timer = setInterval(() => {
        countdown--;
        if (countdown === 0) {
          clearInterval(timer);
          ipcRenderer.send('hot', { type: 'cancel' });
        } else {
          document.getElementById('cancel').innerHTML = countdown < 0 ? '取消' : `取消 (${ formatCountdown(countdown) })`;
        }
      }, 1000);
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
    clearInterval(timer);
    ipcRenderer.send('hot', { type: 'ok', tags });
    event.stopPropagation();
  })

  document.getElementById('cancel').addEventListener('click', event => {
    clearInterval(timer);
    ipcRenderer.send('hot', { type: 'cancel' });
    event.stopPropagation();
  })
})
