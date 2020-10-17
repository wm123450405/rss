const { ipcRenderer } = nodeRequire('electron');
// function getParameter(name) {
//   let v = window.location.search.substring(1).split('&').find(str => str.startsWith(name + '='));
//   if (v) return decodeURIComponent(v.substring(name.length + 1));
//   return '';
// }

// window.onload = function() {
//   let image = getParameter('image');
//   if (image) {
//     document.getElementById('image').src = image;
//   } else {
//     document.getElementById('image').style.display = 'none';
//   }
//   document.getElementById('title').innerHTML = getParameter('title');
//   document.getElementById('title').href = getParameter('url');
//   document.getElementById('summary').innerHTML = getParameter('summary');
// }
ipcRenderer.on('notice', (event, data) => {
  alert(JSON.stringify(data));
  if (data.type === 'message') {
    if (data.data.image) {
      document.getElementById('image').src = data.data.image;
    } else {
      document.getElementById('image').style.display = 'none';
    }
    document.getElementById('title').innerHTML = data.data.title;
    document.getElementById('title').href = data.data.url;
    document.getElementById('summary').innerHTML = data.data.summary;
  }
})