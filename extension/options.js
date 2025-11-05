const $default = document.getElementById("defaultMode");

chrome.storage.local.get(["defaultMode"], (data) => {
  $default.value = data.defaultMode || "observe";
});

$default.addEventListener("change", () => {
  chrome.storage.local.set({ defaultMode: $default.value });
});
