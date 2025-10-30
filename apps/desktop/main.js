const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');
const si = require('systeminformation');

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

// Hardware metrics collection
async function collectMetrics() {
  const [cpu, cpuSpeed, currentLoad, mem, graphics, disk, fsSize, osInfo, processes, battery] = await Promise.all([
    si.cpu(),
    si.cpuCurrentSpeed(),
    si.currentLoad(),
    si.mem(),
    si.graphics().catch(() => ({ controllers: [], displays: [] })),
    si.diskLayout().catch(() => []),
    si.fsSize().catch(() => []),
    si.osInfo(),
    si.processes().catch(() => ({ list: [], all: 0 })),
    si.battery().catch(() => ({ hasbattery: false })),
  ]);
  const totalDisk = fsSize.reduce((s, d) => s + (d.size || 0), 0);
  const usedDisk = fsSize.reduce((s, d) => s + (d.used || 0), 0);
  const gpu = (graphics.controllers || []).map(g => ({
    vendor: g.vendor,
    model: g.model,
    vram: g.vram,
    bus: g.bus,
    driverVersion: g.driverVersion,
  }));
  return {
    timestamp: Date.now(),
    platform: os.platform(),
    arch: os.arch(),
    os: { distro: osInfo.distro, release: osInfo.release, kernel: osInfo.kernel },
    cpu: {
      manufacturer: cpu.manufacturer,
      brand: cpu.brand,
      cores: cpu.cores,
      physicalCores: cpu.physicalCores,
      speed: cpuSpeed.avg,
      load: currentLoad.currentLoad,
      temps: await si.cpuTemperature().catch(() => ({ main: null })),
    },
    memory: {
      total: mem.total,
      free: mem.free,
      used: mem.used,
      active: mem.active,
      available: mem.available,
      swaptotal: mem.swaptotal,
      swapused: mem.swapused,
      swapfree: mem.swapfree,
    },
    gpu,
    disks: disk,
    fs: fsSize,
    diskSummary: { total: totalDisk, used: usedDisk },
    processes: { all: processes.all },
    battery,
  };
}

let monitorTimer = null;
ipcMain.handle('hw:getMetrics', async () => {
  try { return { ok: true, data: await collectMetrics() }; } catch (e) { return { ok: false, error: String(e) }; }
});

ipcMain.handle('hw:monitorStart', async (_evt, intervalMs = 5000) => {
  if (monitorTimer) return { ok: true };
  monitorTimer = setInterval(async () => {
    try {
      const data = await collectMetrics();
      if (win && !win.isDestroyed()) win.webContents.send('hw:metrics', data);
    } catch {}
  }, Math.max(1000, Number(intervalMs)));
  return { ok: true };
});

ipcMain.handle('hw:monitorStop', async () => {
  if (monitorTimer) { clearInterval(monitorTimer); monitorTimer = null; }
  return { ok: true };
});

// Driver update detection (best-effort stubs)
ipcMain.handle('hw:scanDrivers', async () => {
  const platform = os.platform();
  // Cross-platform, provide minimal info via systeminformation; full driver updates are platform-specific
  const graphics = await si.graphics().catch(() => ({ controllers: [] }));
  const gpus = (graphics.controllers || []).map(g => ({ model: g.model, vendor: g.vendor, driverVersion: g.driverVersion }));
  let notes = [];
  if (platform === 'win32') {
    notes.push('Open Windows Update to check for driver updates.');
  } else if (platform === 'darwin') {
    notes.push('Update macOS to receive latest drivers.');
  } else if (platform === 'linux') {
    notes.push('Use your distro package manager or vendor tools for drivers.');
  }
  return { ok: true, data: { platform, gpus, notes } };
});

ipcMain.handle('hw:recommendations', async () => {
  const m = await collectMetrics();
  const recs = [];
  // CPU
  if ((m.cpu.load || 0) > 85) recs.push('High CPU load: close heavy apps or reduce background processes.');
  // Memory
  const memPct = m.memory.total ? (m.memory.used / m.memory.total) * 100 : 0;
  if (memPct > 85) recs.push('High memory usage: consider closing tabs/apps or increasing RAM.');
  // Disk
  const diskPct = m.diskSummary.total ? (m.diskSummary.used / m.diskSummary.total) * 100 : 0;
  if (diskPct > 90) recs.push('Low disk space: clean temp files or move large files to external storage.');
  // Battery
  if (m.battery?.hasbattery && m.battery.ischarging === false && (m.battery.percent || 0) < 20) recs.push('Low battery: connect to power or enable battery saver.');
  // GPU
  if ((m.gpu || []).length === 0) recs.push('No discrete GPU detected: enable hardware acceleration in settings for better performance.');
  if (recs.length === 0) recs.push('System looks healthy. No immediate optimizations needed.');
  return { ok: true, data: { recommendations: recs } };
});
