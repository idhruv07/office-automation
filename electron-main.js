const { app, BrowserWindow } = require('electron');
const path = require('path');

// Disable hardware acceleration to prevent common Linux rendering issues
app.disableHardwareAcceleration();

// Require the express server to start it
require('./server.js');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, 'public', 'favicon.ico'), // fallback if there's an icon
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load the local express server
  const PORT = process.env.PORT || 3000;
  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
