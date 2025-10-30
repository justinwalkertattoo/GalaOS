const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let win;

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
  // Point to local web app; ensure dev/prod web is running on 3000
  win.loadURL(process.env.GALA_WEB_URL || 'http://127.0.0.1:3000');
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

ipcMain.handle('services:openDocker', async () => {
  const url = 'https://www.docker.com/products/docker-desktop/';
  await shell.openExternal(url);
  return { ok: true };
});

