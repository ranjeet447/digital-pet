const { app, BrowserWindow, ipcMain, Menu, nativeImage, screen, Tray } = require("electron");
const path = require("node:path");

const COMMANDS = [
  ["sit", "Sit"],
  ["walk", "Walk"],
  ["run", "Run"],
  ["jump", "Jump"],
  ["down", "Down"],
  ["sleep", "Sleep in Corner"],
  ["roll-over", "Roll Over"],
  ["handshake", "Handshake"],
  ["hi-five", "Hi-Five"],
  ["salute", "Salute"],
  ["namaste", "Namaste"],
  ["speak", "Speak"],
  ["quiet", "Quiet"],
  ["fetch", "Fetch a Ball"],
  ["feed", "Feed"],
  ["treat", "Give a Treat"],
  ["surprise", "Surprise Trick"],
];

const SIZES = [
  ["small", "Small (75%)"],
  ["normal", "Normal (100%)"],
  ["large", "Large (125%)"],
  ["extra-large", "Extra Large (150%)"],
];

let petWindow;
let tray;
let state = {
  name: "Shiro",
  renderer: "3d",
  size: "normal",
  sound: false,
  hidden: false,
};

function sendAction(action) {
  if (!petWindow || petWindow.isDestroyed()) return;
  petWindow.webContents.send("pet:action", action);
}

function createTrayIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect width="32" height="32" rx="9" fill="#a95e24"/>
      <circle cx="11" cy="10" r="3.2" fill="#fff5e9"/>
      <circle cx="21" cy="10" r="3.2" fill="#fff5e9"/>
      <circle cx="8" cy="18" r="3" fill="#fff5e9"/>
      <circle cx="24" cy="18" r="3" fill="#fff5e9"/>
      <path d="M16 14c-5.8 0-8.2 8.1-3.5 10.3 1.8.8 2.7-.3 3.5-.3s1.7 1.1 3.5.3C24.2 22.1 21.8 14 16 14Z" fill="#fff5e9"/>
    </svg>`;
  const icon = nativeImage.createFromDataURL(
    `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
  );
  if (process.platform === "darwin") icon.setTemplateImage(true);
  return icon;
}

function rebuildTrayMenu() {
  if (!tray) return;
  const commandMenu = COMMANDS.map(([command, label]) => ({
    label,
    click: () => sendAction({ type: "command", command }),
  }));
  const sizeMenu = SIZES.map(([size, label]) => ({
    label,
    type: "radio",
    checked: state.size === size,
    click: () => sendAction({ type: "size", size }),
  }));

  tray.setToolTip(`${state.name} - Digital Pet`);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: state.hidden ? `Show ${state.name}` : `Hide ${state.name}`,
        click: () => sendAction({ type: state.hidden ? "show" : "hide" }),
      },
      { label: `Bring ${state.name} Here`, click: bringToCursor },
      { label: "Random Trick", click: () => sendAction({ type: "random-trick" }) },
      { label: "Take a Nap in Corner", click: () => sendAction({ type: "command", command: "sleep" }) },
      { type: "separator" },
      { label: "All Tricks & Commands", submenu: commandMenu },
      { label: "Size", submenu: sizeMenu },
      {
        label: "View",
        submenu: [
          {
            label: "2D Illustrated",
            type: "radio",
            checked: state.renderer === "2d",
            click: () => sendAction({ type: "renderer", renderer: "2d" }),
          },
          {
            label: "3D Model",
            type: "radio",
            checked: state.renderer === "3d",
            click: () => sendAction({ type: "renderer", renderer: "3d" }),
          },
        ],
      },
      {
        label: "Sounds",
        type: "checkbox",
        checked: state.sound,
        click: (item) => sendAction({ type: "sound", enabled: item.checked }),
      },
      { type: "separator" },
      {
        label: "Read Shiro's Stories",
        click: async () => {
          const { shell } = require("electron");
          await shell.openExternal("https://www.shirofinds.com/stories");
        },
      },
      {
        label: "Visit Shiro's Website",
        click: async () => {
          const { shell } = require("electron");
          await shell.openExternal("https://shiro.shravaniurankar.in/");
        },
      },
      { label: "Quit Digital Pet", role: "quit" },
    ]),
  );
}

function bringToCursor() {
  if (!petWindow || petWindow.isDestroyed()) return;
  const point = screen.getCursorScreenPoint();
  const bounds = petWindow.getBounds();
  sendAction({
    type: "bring",
    x: point.x - bounds.x,
    y: point.y - bounds.y,
  });
}

function fitWindowToDisplays() {
  if (!petWindow || petWindow.isDestroyed()) return;
  const displays = screen.getAllDisplays();
  const left = Math.min(...displays.map((display) => display.bounds.x));
  const top = Math.min(...displays.map((display) => display.bounds.y));
  const right = Math.max(...displays.map((display) => display.bounds.x + display.bounds.width));
  const bottom = Math.max(...displays.map((display) => display.bounds.y + display.bounds.height));
  petWindow.setBounds({ x: left, y: top, width: right - left, height: bottom - top });
}

function createWindow() {
  petWindow = new BrowserWindow({
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  fitWindowToDisplays();
  petWindow.setAlwaysOnTop(true, process.platform === "darwin" ? "screen-saver" : "floating");
  petWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  petWindow.setIgnoreMouseEvents(true, { forward: true });
  petWindow.loadFile(path.join(__dirname, "app", "index.html"));
  petWindow.once("ready-to-show", () => petWindow.showInactive());
  petWindow.on("closed", () => {
    petWindow = undefined;
  });
}

app.whenReady().then(() => {
  app.setName("Digital Pet");
  if (process.platform === "darwin") app.dock.hide();
  createWindow();
  tray = new Tray(createTrayIcon());
  rebuildTrayMenu();

  screen.on("display-added", fitWindowToDisplays);
  screen.on("display-removed", fitWindowToDisplays);
  screen.on("display-metrics-changed", fitWindowToDisplays);

  app.on("activate", () => {
    if (!petWindow) createWindow();
  });
});

ipcMain.on("pet:set-interactive", (_event, interactive) => {
  if (!petWindow || petWindow.isDestroyed()) return;
  petWindow.setIgnoreMouseEvents(!interactive, { forward: true });
});

ipcMain.on("pet:update-state", (_event, nextState) => {
  state = { ...state, ...nextState };
  rebuildTrayMenu();
});

app.on("window-all-closed", (event) => {
  event.preventDefault();
});
