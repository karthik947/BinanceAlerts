const log = console.log;
const genrandomid = () => Math.random().toString(36).substr(2, 6);

// Open all links in external browser
let shell = require('electron').shell;
document.addEventListener('click', function (event) {
  if (event.target.tagName === 'A' && event.target.href.startsWith('http')) {
    event.preventDefault();
    shell.openExternal(event.target.href);
  }
});
