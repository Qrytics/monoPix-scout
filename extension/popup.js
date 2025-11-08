const listEl = document.getElementById("list");
const modeSelect = document.getElementById("mode");
const refreshBtn = document.getElementById("refresh");

const port = chrome.runtime.connect({ name: "monopix" });

let currentTabId = null;
let currentHost = null;
let events = [];

function formatTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString();
  } catch {
    return "";
  }
}

function riskClass(risk) {
  if (risk === "high") return "badge high";
  if (risk === "medium") return "badge medium";
  return "badge low";
}

function renderEvents() {
  listEl.textContent = "";
  if (!events.length) {
    const empty = document.createElement("p");
    empty.textContent = "No tracking activity seen yet on this tab.";
    empty.style.fontSize = "12px";
    empty.style.color = "#666";
    empty.style.marginTop = "8px";
    listEl.appendChild(empty);
    return;
  }

  [...events]
    .sort((a, b) => b.time - a.time)
    .forEach((ev) => {
      const row = document.createElement("div");
      row.className = "row";

      const top = document.createElement("div");
      top.className = "top";

      const url = document.createElement("div");
      url.className = "url";
      url.textContent = ev.url;

      const badge = document.createElement("span");
      badge.className = riskClass(ev.risk);
      badge.textContent = ev.risk.toUpperCase();

      top.append(url, badge);

      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = [
        ev.type,
        ev.thirdParty ? "3p" : "1p",
        ev.reason,
        formatTime(ev.time)
      ]
        .filter(Boolean)
        .join(" · ");

      row.append(top, meta);
      listEl.appendChild(row);
    });
}

function requestSnapshot() {
  if (currentTabId == null) return;
  try {
    port.postMessage({ type: "GET_SNAPSHOT" });
  } catch (err) {
    console.error("Failed to request snapshot", err);
  }
}

function loadMode(host) {
  modeSelect.disabled = !host;
  if (!host) {
    modeSelect.value = "observe";
    return;
  }
  chrome.storage.local.get(["siteModes", "defaultMode"], (data) => {
    if (chrome.runtime.lastError) {
      console.warn("storage error", chrome.runtime.lastError);
      return;
    }
    const mode =
      (data.siteModes && data.siteModes[host]) ||
      data.defaultMode ||
      "observe";
    modeSelect.value = mode;
  });
}

modeSelect.addEventListener("change", (ev) => {
  if (!currentHost) return;
  port.postMessage({
    type: "SET_SITE_MODE",
    host: currentHost,
    mode: ev.target.value
  });
});

refreshBtn.addEventListener("click", () => requestSnapshot());

port.onMessage.addListener((msg) => {
  if (msg?.type === "SNAPSHOT") {
    if (msg.error) {
      listEl.textContent = msg.error;
      return;
    }
    events = Array.isArray(msg.events) ? msg.events : [];
    renderEvents();
    return;
  }
  if (msg?.type === "EVENTS_UPDATE" && Array.isArray(msg.events)) {
    events.push(...msg.events);
    if (events.length > 500) {
      events = events.slice(-500);
    }
    renderEvents();
  }
});

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const [tab] = tabs;
  if (!tab || tab.id == null) return;
  currentTabId = tab.id;
  currentHost = (() => {
    try {
      return new URL(tab.url).hostname;
    } catch {
      return null;
    }
  })();
  loadMode(currentHost);
  port.postMessage({ type: "HELLO", tabId: currentTabId });
  requestSnapshot();
});
