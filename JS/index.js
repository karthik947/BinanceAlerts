import klinews from './Utils/klinews.js';
import notify from './Utils/notify.js';
const swal = require('sweetalert');

let alerts = [];

const initialize = async () => {
  await klinews.downloadAllSymbols();
  klinews.startSocket();
  klinews.eventEmitter.on('PRICEUPDATES', klineEHandler);
};

//Add event Listeners
const klineEHandler = ({ symbol, close }) => {
  const currentPrice = parseFloat(close);
  alerts
    .filter((a) => a.symbol === symbol && a.status === 'PENDING')
    .forEach((a, i) => {
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
      if (otheralerts) return;
      klinews.unsubscribe({ symbol: a.symbol });
      notify({
        title: `${a.symbol} Price ${a.condition === 'GE' ? '>=' : '<='} ${
          a.price
        }`,
        message: a.message,
      }); //notify
    });
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
  klinews.subscribe({ symbol });
  document.getElementById('symbol').value = '';
  document.getElementById('condition').value = 'GE';
  document.getElementById('price').value = '';
  document.getElementById('message').value = '';
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
    (d) =>
      d.symbol === alert.symbol && d.id !== alert.id && d.status === 'PENDING'
  ).length;
  if (otheralerts) return;
  klinews.unsubscribe({ symbol: a.symbol });
};

document.getElementById('addAlertBtn').addEventListener('click', addAlertBtnFn);

//Delete closed alerts
const deleteClosed = () => {
  alerts
    .filter((a) => a.status === 'CLOSED')
    .forEach((a) => {
      document.getElementById(a.id).remove();
    });

  alerts = alerts.filter((a) => a.status !== 'CLOSED');
};
setInterval(deleteClosed, 2 * 60 * 1000);

initialize();
