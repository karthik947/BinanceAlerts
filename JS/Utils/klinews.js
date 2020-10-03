const E = require('events');
const log = console.log;

const getsubs = (symbol) => symbol.toLowerCase() + '@kline_1m';

let klinews = {
  symbols: [],
  subsymbols: [],
  ws: '',
  eventEmitter: new E(),
  async downloadAllSymbols() {
    try {
      const res1 = await fetch(`https://api.binance.com/api/v3/exchangeInfo`);
      const result = await res1.json();
      return (klinews.symbols = [
        ...result.symbols
          .filter((s) => s.isSpotTradingAllowed)
          .map((s) => s.symbol),
      ]);
    } catch (err) {
      throw err;
    }
  },
  startSocket() {
    log('klinews socket started!');
    if (klinews.ws) {
      klinews.ws.terminate();
    }
    klinews.ws = '';
    klinews.ws = new WebSocket(`wss://stream.binance.com:9443/ws`);
    klinews.ws.onopen = klinews.onopen;
    klinews.ws.onmessage = klinews.processStream;
    klinews.ws.onclose = klinews.onclose;
    klinews.ws.onerror = klinews.onerror;
  },
  onopen() {
    log('klinews stream opened!');
    const params = klinews.subsymbols.map(getsubs);
    if (!params.length) return;
    klinews.ws.send(
      JSON.stringify({
        method: 'SUBSCRIBE',
        params,
        id: Math.floor(Math.random() * 10 ** 5),
      })
    );
  },
  onerror(err) {
    log(`klinews stream error ${err}!`);
    klinews.ws.terminate();
    klinews.startSocket();
  },
  onclose() {
    log('klinews stream closed!');
    klinews.ws.terminate();
    klinews.startSocket();
  },
  processStream({ data: streamEvent }) {
    streamEvent = JSON.parse(streamEvent);
    const { e, s: symbol } = streamEvent;
    if (e != 'kline') return;
    const {
      k: { c: close },
    } = streamEvent;
    klinews.eventEmitter.emit('PRICEUPDATES', { symbol, close });
  },
  subscribe({ symbol }) {
    if (klinews.subsymbols.includes(symbol)) return;
    if (klinews.ws.readyState !== WebSocket.OPEN) return;
    klinews.subsymbols.push(symbol);
    klinews.ws.send(
      JSON.stringify({
        method: 'SUBSCRIBE',
        params: [getsubs(symbol)],
        id: Math.floor(Math.random() * 10 ** 5),
      })
    );
  },
  unsubscribe({ symbol }) {
    if (!klinews.subsymbols.includes(symbol)) return;
    if (klinews.ws.readyState !== WebSocket.OPEN) return;
    klinews.subsymbols = klinews.subsymbols.filter((s) => s !== symbol);
    klinews.ws.send(
      JSON.stringify({
        method: 'UNSUBSCRIBE',
        params: [getsubs(symbol)],
        id: Math.floor(Math.random() * 10 ** 5),
      })
    );
  },
};

export default klinews;
