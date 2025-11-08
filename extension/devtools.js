const rowsEl = document.getElementById("rows");
const port = chrome.runtime.connect({ name: "monopix" });

let inspectedTabId = null;
let events = [];

function formatTime(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString();
  } catch {
    return "";
  }
}

function renderTable() {
  rowsEl.textContent = "";
  if (!events.length) {
    const empty = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.textContent = "Waiting for network activity…";
    cell.style.color = "#666";
    empty.appendChild(cell);
    rowsEl.appendChild(empty);
    return;
  }

  [...events]
    .sort((a, b) => a.time - b.time)
    .forEach((ev) => {
      const tr = document.createElement("tr");

      const time = document.createElement("td");
      time.textContent = formatTime(ev.time);

      const type = document.createElement("td");
      type.textContent = ev.type || "";

      const risk = document.createElement("td");
      risk.textContent = ev.risk || "";

      const url = document.createElement("td");
      url.textContent = ev.url || "";

      const why = document.createElement("td");
      const parts = [];
      if (ev.thirdParty) parts.push("3rd-party");
      if (ev.reason) parts.push(ev.reason);
      why.textContent = parts.join(" · ");

      tr.append(time, type, risk, url, why);
      rowsEl.appendChild(tr);
    });
}

function requestSnapshot() {
  if (inspectedTabId == null) return;
  port.postMessage({ type: "GET_SNAPSHOT" });
}

port.onMessage.addListener((msg) => {
  if (msg?.type === "SNAPSHOT") {
    events = Array.isArray(msg.events) ? msg.events.slice() : [];
    renderTable();
    return;
  }
  if (msg?.type === "EVENTS_UPDATE" && Array.isArray(msg.events)) {
    events.push(...msg.events);
    if (events.length > 500) events = events.slice(-500);
    renderTable();
  }
});

function attachToTab(tabId) {
  if (tabId == null) return;
  inspectedTabId = tabId;
  port.postMessage({ type: "HELLO", tabId });
  requestSnapshot();
}

if (chrome.devtools?.inspectedWindow?.tabId != null) {
  attachToTab(chrome.devtools.inspectedWindow.tabId);
  chrome.devtools.network.onNavigated.addListener(() => {
    attachToTab(chrome.devtools.inspectedWindow.tabId);
  });
} else {
  rowsEl.textContent = "";
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = 5;
  cell.textContent = "Unable to determine inspected tab.";
  row.appendChild(cell);
  rowsEl.appendChild(row);
}
