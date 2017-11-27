'use strict';

var Iframe = require('iframe');

module.exports = function setupWidget() {
  var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var iframe = void 0;
  var style = '\n    border: 0px;\n    position: absolute;\n    right: 0;\n    top: 0;\n    height: 7rem;';
  var resizeTimeout = void 0;

  var changeStyle = function changeStyle() {
    iframe.style = style + (window.outerWidth > 575 ? 'width: 19rem;' : 'width: 7rem;');
  };

  var resizeThrottler = function resizeThrottler() {
    if (!resizeTimeout) {
      resizeTimeout = setTimeout(function () {
        resizeTimeout = null;
        changeStyle();
        // 15fps
      }, 66);
    }
  };

  window.addEventListener('load', function () {
    if (window.web3) return;

    var frame = Iframe({
      src: opts.host + '/proxy/widget.html' || 'https://wallet.metamask.io/proxy/widget.html',
      container: opts.container || document.body,
      sandboxAttributes: opts.sandboxAttributes || ['allow-scripts', 'allow-popups', 'allow-same-origin', 'allow-top-navigation'],
      scrollingDisabled: true
    });

    iframe = frame.iframe;
    changeStyle();
  });

  window.addEventListener('resize', resizeThrottler, false);
};