const { ipcRenderer } = nodeRequire('electron');

window.addEventListener('load', function() {
  let parsers = [];
  let search = false;
  let initial = {};

  ipcRenderer.on('parsers', (event, data) => {
    if (data.type === 'parsers') {
      let allPromise = [];
      document.body.style.height = '0px';
      parsers = data.parsers || [];
      search = data.search || false;
      const classifyContains = document.getElementById('classify');
      classifyContains.innerHTML = '';
      initial = data.initial;
      for (let classify of data.initial.parsers) {
        let classifyDiv = document.createElement('div');
        classifyDiv.className = 'classify';
        let classifyTitleDiv = document.createElement('div');
        classifyTitleDiv.className = 'classify-title';
        classifyTitleDiv.innerHTML = classify.name;
        classifyDiv.appendChild(classifyTitleDiv);
        let tagsDiv = document.createElement('div');
        tagsDiv.className = 'tags';
        classifyDiv.appendChild(tagsDiv);
        for (let parser of classify.parsers) {
          let tagDiv = document.createElement('div');
          tagDiv.className = parsers.includes(parser.code) ? 'tag selected' : 'tag';
          let tagImage = new Image();
          tagImage.src = parser.icon;
          allPromise.push(new Promise((reslove, reject) => {
            tagImage.addEventListener('load', () => {
              reslove();
            })
            tagImage.addEventListener('error', () => {
              reslove();
            })
          }));
          tagDiv.appendChild(tagImage);
          let tagSpan = document.createElement('span');
          tagSpan.innerHTML = parser.name;
          tagDiv.appendChild(tagSpan);
          tagDiv.addEventListener('click', () => {
            if (parsers.includes(parser.code)) {
              parsers = parsers.filter(code => code !== parser.code);
              tagDiv.className = 'tag';
            } else {
              parsers.push(parser.code);
              tagDiv.className = 'tag selected';
            }
            document.getElementById('ok').className = parsers.length ? 'btn' : 'btn disabled'
          })
          tagsDiv.appendChild(tagDiv);
        }
        classifyContains.appendChild(classifyDiv);
      }
      document.getElementById('expand').innerHTML = '▼';
      document.getElementById('others').display = 'none';
      document.getElementById('others').value = parsers.filter(p => !data.initial.parsers.some(c => c.parsers.some(parser => parser.code === p))).join('\r\n');
      document.getElementById('search').checked = search;
      document.getElementById('ok').className = parsers.length ? 'btn' : 'btn disabled'
      if (allPromise.length) {
        Promise.all(allPromise).then(() => {
          setTimeout(() => {
            let size = {
              height: document.body.scrollHeight,
              width: document.body.scrollWidth
            };
            document.body.style.height = size.height + 'px';
            ipcRenderer.send('parsers', { type: 'resize', size });
          });
        })
      } else {
        setTimeout(() => {
          let size = {
            height: document.body.scrollHeight,
            width: document.body.scrollWidth
          };
          document.body.style.height = size.height + 'px';
          ipcRenderer.send('parsers', { type: 'resize', size });
        });
      }
    } else if (data.type === 'shown') {
      document.getElementById('others').style.display = 'none';
      document.getElementById('expand').innerHTML = '▼';
      document.body.style.height = '0px';
      setTimeout(() => {
        let size = {
          height: document.body.scrollHeight,
          width: document.body.scrollWidth
        };
        document.body.style.height = size.height + 'px';
        ipcRenderer.send('parsers', { type: 'fixsize', size });
      });
    }
  });

  document.getElementById('expand').addEventListener('click', event => {
    if (document.getElementById('others').style.display === 'none') {
      document.getElementById('others').style.display = 'block';
      document.getElementById('expand').innerHTML = '▲';
    } else {
      document.getElementById('others').style.display = 'none';
      document.getElementById('expand').innerHTML = '▼';
    }
    document.body.style.height = '0px';
    setTimeout(() => {
      let size = {
        height: document.body.scrollHeight,
        width: document.body.scrollWidth
      };
      document.body.style.height = size.height + 'px';
      ipcRenderer.send('parsers', { type: 'fixsize', size });
    });
  });

  document.getElementById('search').addEventListener('change', event => {
    search = document.getElementById('search').checked || false;
  })

  document.getElementById('ok').addEventListener('click', event => {
    if (parsers.length || document.getElementById('others').value) {
      parsers = [...document.getElementById('others').value.split(/[\r\n]+/ig).filter(p => p && p.trim()), ...parsers.filter(p => initial.parsers.some(c => c.parsers.some(parser => parser.code === p)))];
      ipcRenderer.send('parsers', { type: 'ok', parsers, search });
    }
    event.stopPropagation();
  })

})
