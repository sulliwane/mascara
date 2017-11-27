'use strict';

var pump = require('pump');
var RpcEngine = require('json-rpc-engine');
var createIdRemapMiddleware = require('json-rpc-engine/dist/idRemapMiddleware');
var createStreamMiddleware = require('json-rpc-middleware-stream');
var LocalStorageStore = require('obs-store');
var ObjectMultiplex = require('obj-multiplex');
var config = require('../config.json');

module.exports = MetamaskInpageProvider;

function MetamaskInpageProvider(connectionStream) {
  var self = this;

  // setup connectionStream multiplexing
  var mux = self.mux = new ObjectMultiplex();
  pump(connectionStream, mux, connectionStream, function (err) {
    return logStreamDisconnectWarning('MetaMask', err);
  });

  // subscribe to metamask public config (one-way)
  self.publicConfigStore = new LocalStorageStore({ storageKey: 'MetaMask-Config' });
  pump(mux.createStream('publicConfig'), self.publicConfigStore, function (err) {
    return logStreamDisconnectWarning('MetaMask PublicConfigStore', err);
  });

  // ignore phishing warning message (handled elsewhere)
  mux.ignoreStream('phishing');

  // connect to async provider
  var streamMiddleware = createStreamMiddleware();
  pump(streamMiddleware.stream, mux.createStream('provider'), streamMiddleware.stream, function (err) {
    return logStreamDisconnectWarning('MetaMask RpcProvider', err);
  });

  // handle sendAsync requests via dapp-side rpc engine
  var rpcEngine = new RpcEngine();
  rpcEngine.push(createIdRemapMiddleware());
  // deprecations
  rpcEngine.push(function (req, res, next, end) {
    var deprecationMessage = config['ethereum']['deprecated-methods'][req.method];
    if (!deprecationMessage) return next();
    end(new Error('MetaMask - ' + deprecationMessage));
  });

  rpcEngine.push(streamMiddleware);
  self.rpcEngine = rpcEngine;
}

// handle sendAsync requests via asyncProvider
// also remap ids inbound and outbound
MetamaskInpageProvider.prototype.sendAsync = function (payload, cb) {
  var self = this;
  self.rpcEngine.handle(payload, cb);
};

MetamaskInpageProvider.prototype.send = function (payload) {
  var self = this;

  var selectedAddress = void 0;
  var result = null;
  switch (payload.method) {

    case 'eth_accounts':
      // read from localStorage
      selectedAddress = self.publicConfigStore.getState().selectedAddress;
      result = selectedAddress ? [selectedAddress] : [];
      break;

    case 'eth_coinbase':
      // read from localStorage
      selectedAddress = self.publicConfigStore.getState().selectedAddress;
      result = selectedAddress || null;
      break;

    case 'eth_uninstallFilter':
      self.sendAsync(payload, noop);
      result = true;
      break;

    case 'net_version':
      var networkVersion = self.publicConfigStore.getState().networkVersion;
      result = networkVersion || null;
      break;

    // throw not-supported Error
    default:
      var link = 'https://github.com/MetaMask/faq/blob/master/DEVELOPERS.md#dizzy-all-async---think-of-metamask-as-a-light-client';
      var message = 'The MetaMask Web3 object does not support synchronous methods like ' + payload.method + ' without a callback parameter. See ' + link + ' for details.';
      throw new Error(message);

  }

  // return the result
  return {
    id: payload.id,
    jsonrpc: payload.jsonrpc,
    result: result
  };
};

MetamaskInpageProvider.prototype.isConnected = function () {
  return true;
};

MetamaskInpageProvider.prototype.isMetaMask = true;

// util

function logStreamDisconnectWarning(remoteLabel, err) {
  var warningMsg = 'MetamaskInpageProvider - lost connection to ' + remoteLabel;
  if (err) warningMsg += '\n' + err.stack;
  console.warn(warningMsg);
}

function noop() {}
