// main-simple.mjs OR keep as main-simple.js (since "type": "module" is set in package.json)

import { app, BrowserWindow, ipcMain, Menu, shell, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let currentState = null;

const isDev = process.env.NODE_ENV === 'development';

function setupIpcHandlers() {
  ipcMain.handle('save-state', async (event, state) => {
    try {
      currentState = state;
      return { success: true };
    } catch (error) {
      console.error('Error in save-state:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-saved-state', async () => {
    try {
      return { success: true, data: currentState };
    } catch (error) {
      console.error('Error in get-saved-state:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-app-version', () => app.getVersion());

  ipcMain.handle('minimize-window', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.handle('maximize-window', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) mainWindow.unmaximize();
      else mainWindow.maximize();
    }
  });

  ipcMain.handle('close-window', () => {
    if (mainWindow) mainWindow.close();
  });

  ipcMain.handle('open-external', async (event, url) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error('Error opening external link:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('show-save-dialog', async (event, options) => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, options);
      return result;
    } catch (error) {
      console.error('Error showing save dialog:', error);
      return { canceled: true };
    }
  });
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Session',
          accelerator: 'CmdOrCtrl+N',
          click: () => console.log('New session requested')
        },
        {
          label: 'Export Data',
          accelerator: 'CmdOrCtrl+E',
          click: () => console.log('Export data requested')
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About MDM Security',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About MDM Security',
              message: 'MDM Security Desktop Application',
              detail: `Version: ${app.getVersion()}\nA professional employee management and time tracking application.`
            });
          }
        }
      ]
    }
  ];

  if (process.platform === 'darwin') {
    template.unshift({
      label: 'MDM Security',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload-simple.js')
    },
    icon: path.join(__dirname, 'assets', 'Vecter 13.png'),
    backgroundColor: '#f8fafc',
    title: 'MDM Security - Employee Dashboard'
  });

  mainWindow.loadFile('register.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });

  mainWindow.webContents.on('crashed', (event) => {
    console.error('Window crashed:', event);
    dialog.showErrorBox('Application Crashed', 'The application has crashed. Please restart the application.');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Window failed to load:', errorDescription);
    dialog.showErrorBox('Load Failed', `Failed to load: ${errorDescription}`);
  });
}

app.whenReady().then(() => {
  try {
    console.log('Setting up IPC handlers...');
    setupIpcHandlers();
    console.log('IPC handlers setup completed');

    console.log('Creating application menu...');
    createMenu();
    console.log('Application menu created');

    console.log('Creating main window...');
    createWindow();
    console.log('Main window created');

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    console.error('Error during app initialization:', error);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  dialog.showErrorBox('Uncaught Exception', `An unexpected error occurred: ${error.message}`);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  dialog.showErrorBox('Unhandled Rejection', `An unexpected error occurred: ${error.message}`);
});
