const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("digitalPetDesktop", {
  platform: process.platform,
  setInteractive: (interactive) => ipcRenderer.send("pet:set-interactive", Boolean(interactive)),
  updateState: (state) => ipcRenderer.send("pet:update-state", state),
  onAction: (callback) => {
    const listener = (_event, action) => callback(action);
    ipcRenderer.on("pet:action", listener);
    return () => ipcRenderer.removeListener("pet:action", listener);
  },
});
