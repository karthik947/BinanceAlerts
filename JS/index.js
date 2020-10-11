import klinews from './Utils/klinews.js';
import notify from './Utils/notify.js';
const swal = require('sweetalert');

const chartsymbolupd = async (e) => {
  try {
    const id = e?.currentTarget?.id;
    const alert = alerts.find((a) => a.id === id);
    const { symbol } = alert || chart;
    if (!alerts.length)
      return swal('Missing Alerts!', 'Please set atleast one alert!', 'error');
    const interval = document.getElementById('interval').value;
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=1000`;
    const res1 = await fetch(url);
    if (res1.status != 200) throw await res1.text();
    const result = await res1.json();
    const hist = result.map((d) => {
      return {
        time: d[0] / 1000,
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
        volume: parseFloat(d[5]),
      };
    });
    //plot chart
    document
      .getElementsByClassName('ChartFilter')[0]
      .classList.remove('HiddenFilter');
    chart.live = false;
    chart.symbol = symbol;
    document.getElementById(`chart`).innerHTML = '<div id="tvchart"></div>';
    const domElement = document.getElementById('tvchart');
    const chartObj = LightweightCharts.createChart(domElement, chartProperties);
    chartObj.applyOptions({
      watermark: {
        color: 'grey',
        visible: true,
        text: `${symbol} ${interval}`,
        fontSize: 21,
        horzAlign: 'left',
        vertAlign: 'top',
      },
    });
    chart.candleSeries = chartObj.addCandlestickSeries();
    chart.candleSeries.setData(hist);
    chart.current = { ...hist.slice(-1)[0] };
    chart.live = true;
    //plot lines
    alerts
      .filter((a) => a.symbol === symbol)
      .forEach((a) => {
        const { price, id, message, condition, status } = a;
        chart.lines = [
          ...chart.lines,
          {
            id,
            priceLine: chart.candleSeries.createPriceLine({
              price,
              color:
                status == 'PENDING'
                  ? condition === 'GE'
                    ? 'red'
                    : 'green'
                  : 'black',
              lineWidth: 2,
              lineStyle:
                status == 'PENDING'
                  ? LightweightCharts.LineStyle.Dotted
                  : LightweightCharts.LineStyle.Solid,
              axisLabelVisible: true,
              title: message,
            }),
          },
        ];
      });
    return 'done!';
  } catch (err) {
    swal('Invalid Symbol!', err, 'error');
  }
};

const initialize = async () => {
  await klinews.downloadAllSymbols();
  klinews.startSocket();
  klinews.eventEmitter.on('PRICEUPDATES', klineEHandler);
};

//Add event Listeners
const klineEHandler = ({ symbol, ts, open, high, low, close }) => {
  const currentPrice = parseFloat(close);
  alerts.forEach((a, i) => {
    if (a.symbol !== symbol || a.status !== 'PENDING') return;
    document.getElementById(`${a.id}cp`).innerHTML = currentPrice;
    //check if alert is triggered
    const flag =
      a.condition === 'GE'
        ? currentPrice >= a.price
          ? true
          : false
        : currentPrice <= a.price
        ? true
        : false;
    if (!flag) return;
    alerts[i].status = 'CLOSED';
    document.getElementById(
      `${a.id}status`
    ).innerHTML = `<span class="span-alert-closed">Closed</span>`;
    const otheralerts = alerts.filter(
      (d) => d.symbol === a.symbol && d.id !== a.id && d.status === 'PENDING'
    ).length;
    if (!otheralerts) {
      klinews.unsubscribe({ symbol: a.symbol });
    }
    notify({
      title: `${a.symbol} Price ${a.condition === 'GE' ? '>=' : '<='} ${
        a.price
      }`,
      message: a.message,
    }); //notify
    chartsymbolupd();
  });

  //update chart
  if (!chart.live || chart.symbol !== symbol) return;
  const interval = document.getElementById('interval').value;
  const { current } = chart;
  const opents = ~~(Math.floor(ts / 1000) / tfw[interval]) * tfw[interval];
  if (current.time === opents) {
    //old candle
    current.close = parseFloat(close);
    current.high = Math.max(current.high, high);
    current.low = Math.min(current.low, low);
    chart.current = { ...current };
    chart.candleSeries.update(chart.current);
  } else {
    //new candle set current
    const newkline = {
      time: opents,
      open: parseFloat(open),
      high: parseFloat(high),
      low: parseFloat(low),
      close: parseFloat(close),
    };
    chart.current = { ...newkline };
    chart.candleSeries.update(chart.current);
  }
};

const addAlertBtnFn = () => {
  const symbol = document.getElementById('symbol').value;
  const condition = document.getElementById('condition').value;
  const message = document.getElementById('message').value;
  const price = parseFloat(document.getElementById('price').value);
  if (!klinews.symbols.includes(symbol))
    return swal('Invalid Symbol!', ' Please enter a valid symbol!', 'error');
  if (!price)
    return swal('Invalid Price!', ' Please enter a valid price!', 'error');
  const alert = {
    symbol,
    condition,
    price,
    message,
    status: 'PENDING',
    id: genrandomid(),
  };
  alerts = [...alerts, alert];
  const markup = `<tr id="${alert.id}">
  <td>${alerts.length}</td>
  <td>${symbol}</td>
  <td>${condition}</td>
  <td>${price}</td>
  <td id="${alert.id}cp">${price}</td>
  <td id="${alert.id}status"><span class="span-alert-pending">Pending</span></td>
  <td><i id="${alert.id}delete" class="fas fa-trash-alt btn-delete"></i></td>
  <td>${message}</td>
  <td><a target="_blank" href="https://www.tradingview.com/chart/?symbol=BINANCE:${symbol}">link</a></td>
  </tr>`;
  document.getElementById('alertsbody').insertAdjacentHTML('beforeend', markup);
  document
    .getElementById(`${alert.id}delete`)
    .addEventListener('click', deleteAlertFn);
  document.getElementById(alert.id).addEventListener('click', chartsymbolupd);
  document.getElementById(alert.id).style.cursor = 'pointer';
  klinews.subscribe({ symbol });
  document.getElementById('symbol').value = '';
  document.getElementById('condition').value = 'GE';
  document.getElementById('price').value = '';
  document.getElementById('message').value = '';
  if (alert.symbol === chart.symbol) chartsymbolupd();
};

const deleteAlertFn = async (e) => {
  const willDelete = await swal({
    title: 'Are you sure?',
    icon: 'warning',
    buttons: true,
    dangerMode: true,
  });
  if (!willDelete) return;
  const id = e.target.id.substring(0, 6);
  const alert = alerts.find((a) => a.id === id);
  document
    .getElementById(`${alert.id}delete`)
    .removeEventListener('click', deleteAlertFn);
  document.getElementById(alert.id).remove();
  alerts = alerts.filter((a) => a.id !== id);
  const otheralerts = alerts.filter(
    (d) => d.symbol === alert.symbol && d.id !== id && d.status === 'PENDING'
  ).length;

  if (otheralerts) {
    if (alert.symbol === chart.symbol) {
      chartsymbolupd();
    }
  } else {
    klinews.unsubscribe({ symbol: alert.symbol });
    if (alert.symbol === chart.symbol) {
      document
        .getElementsByClassName('ChartFilter')[0]
        .classList.add('HiddenFilter');
      document.getElementById(`chart`).innerHTML = '<div id="tvchart"></div>';
    }
  }
};

document.getElementById('addAlertBtn').addEventListener('click', addAlertBtnFn);
document.getElementById('interval').addEventListener('change', chartsymbolupd);

//Delete closed alerts
const deleteClosed = () => {
  let refreshFlag = false;
  alerts
    .filter((a) => a.status === 'CLOSED')
    .forEach((a) => {
      document.getElementById(a.id).remove();
      refreshFlag = true;
    });

  alerts = alerts.filter((a) => a.status !== 'CLOSED');
  if (refreshFlag && alerts.filter((a) => a.symbol === chart.symbol).length) {
    chartsymbolupd();
  } else {
    document
      .getElementsByClassName('ChartFilter')[0]
      .classList.add('HiddenFilter');
    document.getElementById(`chart`).innerHTML = '<div id="tvchart"></div>';
  }
};
setInterval(deleteClosed, 2 * 60 * 1000);

initialize();
