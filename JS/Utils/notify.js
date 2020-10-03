const notifier = require('node-notifier');

const notify = (pl) => {
  notifier.notify(pl);
};

export default notify;
