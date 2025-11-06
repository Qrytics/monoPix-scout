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
function scanImages() {
  document.querySelectorAll("img").forEach((img) => {
    const size = { w: img.naturalWidth || img.width || 0, h: img.naturalHeight || img.height || 0 };
    if (isTiny(img) || isHidden(img)) {
      report("img", img.src, isTiny(img) ? "1x1 tiny (suspiciously)" : "hidden via CSS", size, true);
    }
  });
}
const _beacon = navigator.sendBeacon.bind(navigator);
navigator.sendBeacon = function(url, data){ report("beacon", url, "navigator.sendBeacon"); return _beacon(url, data); };
const _fetch = window.fetch.bind(window);
window.fetch = function(input, init){ try{ report("xhr", String(input), "fetch"); }catch{} return _fetch(input, init); };

scanImages();
new MutationObserver(() => scanImages()).observe(document.documentElement, { subtree: true, childList: true, attributes: true });

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "SOFT_BLOCK" && msg.url) {
    document.querySelectorAll(`img[src="${msg.url}"]`).forEach((img) => {
      try { const c=document.createElement("canvas"); c.width=img.width||1; c.height=img.height||1; img.src=c.toDataURL("image/png"); } catch {}
    });
  }
});
