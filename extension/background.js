// Store memory of tabs
const perTab = new Map();
const tabPorts = new Map();

// Collect set of tabs
function getPorts(tabId) {
  if (!tabPorts.has(tabId)) tabPorts.set(tabId, new Set());
  return tabPorts.get(tabId);
}

// Collect list of 500 events
// Drop the oldest of those 500 in place of New
function pushEvent(tabId, ev) {
  const list = perTab.get(tabId) || [];
  list.push(ev);
  if (list.length > 500) list.shift();
  perTab.set(tabId, list);
  // live update for any listeners on this tab
  const payload = { type: "EVENTS_UPDATE", events: [ev] };
  for (const p of getPorts(tabId)) {
    try { p.postMessage(payload); } catch {}
  }
}

// Make list of curr events 
function currentEvents(tabId) {
  return perTab.get(tabId) || [];
}

// Asynch function for retrieving the 'siteMode' the extension uses
// If none available, use default, else "observe"
// Uses Promise() for scalable/readable asynch code
async function getSiteMode(host) {
  return new Promise((res) => {
    chrome.storage.local.get(["siteModes", "defaultMode"], (data) => {
      const m = (data.siteModes && data.siteModes[host]) || data.defaultMode || "observe";
      res(m);
    });
  });
}

// Wiring the popup and devtools
chrome.runtime.onConnect.addListener((port) => {
  // Expecting name "monopix"
  if (port.name !== "monopix") return;
  let tabIdRef = port.sender?.tab?.id ?? null;
    function attachToTab(tabId) {
    if (typeof tabId !== "number") return;
    if (tabIdRef != null && tabIdRef !== tabId) {
      getPorts(tabIdRef).delete(port);
    }
    tabIdRef = tabId;
    getPorts(tabIdRef).add(port);
  }

  // Attach immediately if we already know the tab
  if (typeof tabIdRef === "number") attachToTab(tabIdRef);

  port.onMessage.addListener((msg) => {
    if (msg?.type === "HELLO" && typeof msg.tabId === "number") {
      attachToTab(msg.tabId);
      return;
    }
    if (msg?.type === "GET_SNAPSHOT") {
      if (tabIdRef != null) {
        port.postMessage({ type: "SNAPSHOT", events: currentEvents(tabIdRef) });
      } else {
        port.postMessage({ type: "SNAPSHOT", error: "No tab attached" });
      }
      return;
    }
    if (msg?.type === "SET_SITE_MODE" && typeof msg.host === "string" && typeof msg.mode === "string") {
      chrome.storage.local.get(["siteModes"], (data) => {
        const siteModes = data?.siteModes ?? {};
        siteModes[msg.host] = msg.mode;
        chrome.storage.local.set({ siteModes });
      });
      return;
    }
  });

  port.onDisconnect.addListener(() => {
    if (tabIdRef != null) getPorts(tabIdRef).delete(port);
  });
});


// Message manager
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "PIXEL_CANDIDATE" && sender.tab?.id != null && msg.signal) {
    const ev = {
      tabId: sender.tab.id,
      url: msg.signal.url,
      type: msg.signal.kind,
      size: msg.signal.size ?? null,
      reason: msg.signal.reason ?? "",
      risk: score(msg.signal),
      thirdParty: !!msg.signal.thirdParty,
      time: Date.now()
    };
    pushEvent(sender.tab.id, ev);

    // soft-block based on per-site mode
    getSiteMode(safeHost(msg.signal.url)).then((mode) => {
      const r = ev.risk;
      const shouldSoft = (mode === "strict" && r !== "low") || (mode === "likely" && r === "high");
      if (shouldSoft && msg.signal.canSoftBlock) {
        chrome.tabs.sendMessage(sender.tab.id, { type: "SOFT_BLOCK", url: ev.url });
      }
    });

    sendResponse?.({ ok: true });
    return;
  }
});

// FIX
if (chrome.declarativeNetRequest.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((ev) => {
    if (ev?.tabId >= 0) {
      pushEvent(ev.tabId, {
        tabId: ev.tabId,
        url: ev.request.url,
        type: ev.request.resourceType || "request",
        size: null,
        reason: "blocked by rule:" + ev.rule.ruleId,
        risk: "high",
        thirdParty: //FIX,
        time: Date.now()
      });
    }
  });
}

// Scoring function to determine danger level
function score(sig) {
  let s = 0;
  if (sig.size && sig.size.w * sig.size.h <= 16) s += 2;
  if (sig.thirdParty) s += 2;
  if (/beacon|fetch|xhr/i.test(sig.reason)) s += 2;
  if (/(pixel|track|open|view|beacon|analytics)/i.test(sig.url)) s += 1;
  return s >= 4 ? "high" : (s >= 2 ? "medium" : "low");
}
function isThirdParty(url) {
  try { return new URL(url).hostname !== location.hostname; } catch { return false; }
}
function safeHost(url) {
  try { return new URL(url).hostname; } catch { return ""; }
}
