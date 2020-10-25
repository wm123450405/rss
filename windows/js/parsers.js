const { ipcRenderer } = nodeRequire('electron');

window.addEventListener('load', function() {
  let parsers = [];

  ipcRenderer.on('parsers', (event, data) => {
    if (data.type === 'parsers') {
      let allPromise = [];
      document.body.style.height = '0px';
      parsers = data.parsers;
      const classifyContains = document.getElementById('classify');
      classifyContains.innerHTML = '';
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

  document.getElementById('ok').addEventListener('click', event => {
    if (parsers.length) {
      ipcRenderer.send('parsers', { type: 'ok', parsers });
    }
    event.stopPropagation();
  })

})
