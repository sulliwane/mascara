'use strict';

var Iframe = require('iframe');
var createIframeStream = require('iframe-stream').IframeStream;

module.exports = setupIframe;

function setupIframe(opts) {
  opts = opts || {};
  var frame = Iframe({
    src: opts.zeroClientProvider || 'https://wallet.metamask.io/',
    container: opts.container || document.head,
    sandboxAttributes: opts.sandboxAttributes || ['allow-scripts', 'allow-popups', 'allow-same-origin']
  });
  var iframe = frame.iframe;
  iframe.style.setProperty('display', 'none');
  var iframeStream = createIframeStream(iframe);

  return iframeStream;
}