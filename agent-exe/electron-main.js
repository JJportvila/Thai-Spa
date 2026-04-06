const path = require('node:path');
const { app, BrowserWindow, Menu, Tray, nativeImage, shell, dialog } = require('electron');

let mainWindow = null;
let tray = null;
let agentLoaded = false;
let quitting = false;

const BASE_URL = 'http://127.0.0.1:9195';
const APP_URL = `${BASE_URL}/app`;
const AGENT_URL = `${BASE_URL}/agent`;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1100,
    minHeight: 700,
    title: 'StretPOS Retail Client',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const loadApp = () =>
    mainWindow
      .loadURL(APP_URL)
      .catch(() => setTimeout(() => mainWindow && mainWindow.loadURL(APP_URL).catch(() => {}), 1200));
  loadApp();

  mainWindow.on('close', (event) => {
    if (!quitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
};

const ensureAgent = () => {
  if (agentLoaded) return;
  const agentPath = path.join(__dirname, 'agent.js');
  try {
    const mod = require(agentPath);
    if (mod && typeof mod.bootstrap === 'function') {
      mod.bootstrap();
      agentLoaded = true;
    }
  } catch (error) {
    dialog.showErrorBox('Agent Start Error', String(error && error.message ? error.message : error));
  }
};

const buildTrayMenu = () =>
  Menu.buildFromTemplate([
    {
      label: '打开收银客户端',
      click: () => {
        if (!mainWindow) createWindow();
        mainWindow.loadURL(APP_URL).catch(() => {});
        mainWindow.show();
        mainWindow.focus();
      },
    },
    {
      label: '打开本地设置',
      click: () => {
        if (!mainWindow) createWindow();
        mainWindow.loadURL(AGENT_URL).catch(() => {});
        mainWindow.show();
        mainWindow.focus();
      },
    },
    {
      label: '刷新页面',
      click: () => {
        if (mainWindow) mainWindow.webContents.reloadIgnoringCache();
      },
    },
    {
      label: '打开调试工具',
      click: () => {
        if (mainWindow) mainWindow.webContents.openDevTools({ mode: 'detach' });
      },
    },
    {
      label: '打开状态接口',
      click: () => shell.openExternal(`${BASE_URL}/api/status`),
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        quitting = true;
        app.quit();
      },
    },
  ]);

const createTray = () => {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('StretPOS Retail Client');
  tray.setContextMenu(buildTrayMenu());
  tray.on('click', () => {
    if (!mainWindow) createWindow();
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
};

app.whenReady().then(() => {
  ensureAgent();
  createWindow();
  createTray();
});

app.on('before-quit', () => {
  quitting = true;
});

app.on('window-all-closed', (event) => {
  event.preventDefault();
});

app.on('web-contents-created', (_, webContents) => {
  webContents.on('did-fail-load', () => {
    dialog.showErrorBox('页面加载失败', '本地服务尚未就绪，请稍后自动重试。');
  });
});

