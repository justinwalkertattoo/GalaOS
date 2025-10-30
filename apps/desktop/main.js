const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let win;
let webWin;

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  // Load the status/control renderer
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('services:start', async () => {
  return new Promise((resolve) => {
    const composeFile = path.resolve(process.cwd(), 'docker', 'docker-compose.yml');
    const cmd = process.platform === 'win32' ? 'docker' : 'docker';
    const args = ['compose', '-f', composeFile, 'up', '-d'];
    const child = spawn(cmd, args, { stdio: 'inherit', shell: true });
    child.on('exit', (code) => resolve({ ok: code === 0, code }));
  });
});

ipcMain.handle('services:stop', async () => {
  return new Promise((resolve) => {
    const composeFile = path.resolve(process.cwd(), 'docker', 'docker-compose.yml');
    const cmd = process.platform === 'win32' ? 'docker' : 'docker';
    const args = ['compose', '-f', composeFile, 'down'];
    const child = spawn(cmd, args, { stdio: 'inherit', shell: true });
    child.on('exit', (code) => resolve({ ok: code === 0, code }));
  });
});

ipcMain.handle('services:openDocker', async () => {
  const url = 'https://www.docker.com/products/docker-desktop/';
  await shell.openExternal(url);
  return { ok: true };
});

ipcMain.handle('web:open', async () => {
  if (webWin && !webWin.isDestroyed()) {
    webWin.focus();
    return { ok: true };
  }
  webWin = new BrowserWindow({
    width: 1280,
    height: 900,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  const target = process.env.GALA_WEB_URL || 'http://127.0.0.1:3000';
  await webWin.loadURL(target);
  return { ok: true };
});
