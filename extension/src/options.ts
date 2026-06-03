const portEl = document.getElementById("port") as HTMLInputElement;
const tokenEl = document.getElementById("token") as HTMLInputElement;
const statusEl = document.getElementById("status") as HTMLSpanElement;

chrome.storage.local.get(["port", "token"]).then(({ port, token }) => {
  if (port) portEl.value = String(port);
  if (token) tokenEl.value = String(token);
});

document.getElementById("save")!.addEventListener("click", async () => {
  await chrome.storage.local.set({ port: Number(portEl.value), token: tokenEl.value });
  statusEl.textContent = "Saved.";
  setTimeout(() => (statusEl.textContent = ""), 1500);
});
