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

const chartProperties = {
  timeScale: {
    timeVisible: true,
    secondsVisible: false,
  },
};

const tfw = {
  '1m': 1 * 60,
  '3m': 3 * 60,
  '5m': 5 * 60,
  '15m': 15 * 60,
  '30m': 30 * 60,
  '1h': 1 * 60 * 60,
  '2h': 2 * 60 * 60,
  '4h': 4 * 60 * 60,
  '8h': 8 * 60 * 60,
  '12h': 12 * 60 * 60,
  '1d': 1 * 24 * 60 * 60,
  '3d': 3 * 24 * 60 * 60,
  '1w': 7 * 24 * 60 * 60,
  '1M': 30 * 24 * 60 * 60,
};

let alerts = [];
let chart = {
  symbol: '',
  candleSeries: '',
  live: false,
  current: {},
  lines: [], //{id:'12121',title:'12121',price:'1212',status:'pending',priceLine:LWC}
};
