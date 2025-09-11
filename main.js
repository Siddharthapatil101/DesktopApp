const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let currentState = null;

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
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.loadFile('register.html'); 
    if (process.env.NODE_ENV === 'development') {
        win.webContents.openDevTools();
    }

    win.webContents.on('crashed', (event) => {
        console.error('Window crashed:', event);
    });

    win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('Failed to load:', errorCode, errorDescription);
    });
}

app.whenReady().then(async () => {
    try {
        console.log('Setting up IPC handlers...');
        setupIpcHandlers();
        console.log('IPC handlers setup completed');
        
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
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
});

