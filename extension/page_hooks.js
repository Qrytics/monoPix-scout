(function () {
  const _beacon = navigator.sendBeacon && navigator.sendBeacon.bind(navigator);
  if (_beacon) {
    navigator.sendBeacon = function (url, data) {
      try {
        window.postMessage(
          { source: "monopix", kind: "beacon", url: String(url), reason: "navigator.sendBeacon" },
          "*"
        );
      } catch (e) {}
      return _beacon(url, data);
    };
  }

  const _fetch = window.fetch && window.fetch.bind(window);
  if (_fetch) {
    window.fetch = function (input, init) {
      try {
        window.postMessage(
          { source: "monopix", kind: "xhr", url: String(input), reason: "fetch" },
          "*"
        );
      } catch (e) {}
      return _fetch(input, init);
    };
  }
})();
