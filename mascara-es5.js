'use strict';

var setupProvider = require('./dist/setup-provider.js');
var setupDappAutoReload = require('./dist/auto-reload.js');
var setupWidget = require('./dist/setup-widget.js');
var config = require('./config.json');

module.exports = {
  createDefaultProvider: createDefaultProvider,
  // disabled for now
  setupWidget: setupWidget
};

function createDefaultProvider() {
  var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var host = opts.host || 'https://wallet.metamask.io';
  //
  // setup provider
  //

  var provider = setupProvider({
    mascaraUrl: host + '/proxy/'
  });
  instrumentForUserInteractionTriggers(provider);

  //
  // ui stuff
  //

  var shouldPop = false;
  window.addEventListener('click', maybeTriggerPopup);

  return !window.web3 ? setupDappAutoReload(provider, provider.publicConfigStore) : provider;

  //
  // util
  //

  function maybeTriggerPopup(event) {
    if (!shouldPop) return;
    shouldPop = false;
    window.open(host, '', 'width=360 height=500');
  }

  function instrumentForUserInteractionTriggers(provider) {
    if (window.web3) return provider;
    var _super = provider.sendAsync.bind(provider);
    provider.sendAsync = function (payload, cb) {
      if (config.ethereum['should-show-ui'].includes(payload.method)) {
        shouldPop = true;
      }
      _super(payload, cb);
    };
  }
}

// function setupWidget (opts = {}) {

// }
