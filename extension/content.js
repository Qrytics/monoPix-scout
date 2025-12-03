function isTiny(img) {
  const w = img.naturalWidth || img.width || 0;
  const h = img.naturalHeight || img.height || 0;
  return (w <= 1 && h <= 1) || (w * h <= 16);
}
function isHidden(elem) {
  const cs = getComputedStyle(elem);
  return cs.opacity === "0" || cs.visibility === "hidden" || cs.display === "none";
}
function is3p(url) {
  try { return new URL(url, location.href).hostname !== location.hostname; } catch { return false; }
}
function report(kind, url, reason, size, canSoftBlock) {
  chrome.runtime.sendMessage({
    type: "PIXEL_CANDIDATE",
    signal: { kind, url, reason, size, thirdParty: is3p(url), canSoftBlock }
  });
}

window.addEventListener("message", (ev) => {
  const data = ev.data;
  if (!data || data.source !== "monopix") return;
  
  chrome.runtime.sendMessage({
    type: "PIXEL_CANDIDATE",
    signal: {
      kind: data.kind,
      url: data.url,
      reason: data.reason,
      size: null,
      canSoftBlock: false
    }
  });
});

function scanImages() {
  document.querySelectorAll("img").forEach((img) => {
    const size = { w: img.naturalWidth || img.width || 0, h: img.naturalHeight || img.height || 0 };
    if (isTiny(img) || isHidden(img)) {
      report("img", img.src, isTiny(img) ? "1x1 tiny (suspiciously)" : "hidden via CSS", size, true);
    }
  });
}

scanImages();
new MutationObserver(() => scanImages()).observe(document.documentElement, { subtree: true, childList: true, attributes: true });

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "RESCAN") {
    try {
      scanImages();
      sendResponse?.({ ok: true });
    } catch (e) {
      console.error("RESCAN failed", e);
      sendResponse?.({ ok: false, error: String(e) });
    }
    return;
  }

  if (msg?.type === "SOFT_BLOCK" && msg.url) {
    document.querySelectorAll(`img[src="${msg.url}"]`).forEach((img) => {
      try {
        const c = document.createElement("canvas");
        c.width = img.width || 1;
        c.height = img.height || 1;
        img.src = c.toDataURL("image/png");
      } catch {}
    });
  }
});

(function injectHooksIntoPage() {
  const code = `
    (function() {
      const _beacon = navigator.sendBeacon && navigator.sendBeacon.bind(navigator);
      if (_beacon) {
        navigator.sendBeacon = function(url, data) {
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
        window.fetch = function(input, init) {
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
  `;

  const s = document.createElement("script");
  s.textContent = code;
  (document.head || document.documentElement).appendChild(s);
  s.remove();
})();
