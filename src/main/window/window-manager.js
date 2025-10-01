/**
 * Professional window management with proper lifecycle handling
 */

const { BrowserWindow, screen } = require('electron');
const path = require('path');
const { EventEmitter } = require('events');

class WindowManager extends EventEmitter {
    constructor() {
        super();
        this.windows = new Map();
        this.mainWindow = null;
    }

    async createMainWindow() {
        try {
            if (this.mainWindow) {
                this.mainWindow.focus();
                return this.mainWindow;
            }

            const { width, height } = screen.getPrimaryDisplay().workAreaSize;
            
            this.mainWindow = new BrowserWindow({
                width: Math.min(1400, width - 100),
                height: Math.min(900, height - 100),
                minWidth: 1200,
                minHeight: 800,
                center: true,
                show: false,
                titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    enableRemoteModule: false,
                    webSecurity: true,
                    preload: path.join(__dirname, '../preload.js')
                },
                icon: path.join(__dirname, '../../assets/icon.png'),
                backgroundColor: '#f8fafc',
                title: 'MDM Security - Employee Dashboard'
            });

            this.windows.set('main', this.mainWindow);

            // Load the main application
            await this.mainWindow.loadFile(path.join(__dirname, '../../index.html'));

            // Setup event listeners
            this.setupWindowEvents(this.mainWindow);

            // Show window when ready
            this.mainWindow.once('ready-to-show', () => {
                this.mainWindow.show();
                this.emit('window-ready', this.mainWindow);
            });

            return this.mainWindow;

        } catch (error) {
            console.error('Failed to create main window:', error);
            throw error;
        }
    }

    setupWindowEvents(window) {
        window.on('closed', () => {
            this.windows.delete('main');
            this.mainWindow = null;
            this.emit('window-closed', window);
        });

        window.on('maximize', () => {
            this.emit('window-maximized', window);
        });

        window.on('unmaximize', () => {
            this.emit('window-unmaximized', window);
        });

        window.on('minimize', () => {
            this.emit('window-minimized', window);
        });

        window.on('restore', () => {
            this.emit('window-restored', window);
        });

        window.on('focus', () => {
            this.emit('window-focused', window);
        });

        window.on('blur', () => {
            this.emit('window-blurred', window);
        });

        // Handle crashes
        window.webContents.on('crashed', (event) => {
            console.error('Window crashed:', event);
            this.emit('window-crashed', window, event);
        });

        // Handle load failures
        window.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
            console.error('Window failed to load:', errorDescription);
            this.emit('window-load-failed', window, { errorCode, errorDescription, validatedURL });
        });
    }

    getMainWindow() {
        return this.mainWindow;
    }

    getAllWindows() {
        return Array.from(this.windows.values());
    }

    closeAll() {
        this.windows.forEach(window => {
            if (!window.isDestroyed()) {
                window.close();
            }
        });
        this.windows.clear();
    }

    minimize() {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.minimize();
        }
    }

    maximize() {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            if (this.mainWindow.isMaximized()) {
                this.mainWindow.unmaximize();
            } else {
                this.mainWindow.maximize();
            }
        }
    }

    close() {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.close();
        }
    }

    focus() {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.focus();
        }
    }

    isMaximized() {
        return this.mainWindow ? this.mainWindow.isMaximized() : false;
    }

    isMinimized() {
        return this.mainWindow ? this.mainWindow.isMinimized() : false;
    }

    isFocused() {
        return this.mainWindow ? this.mainWindow.isFocused() : false;
    }

    setTitle(title) {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.setTitle(title);
        }
    }

    sendToRenderer(channel, data) {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send(channel, data);
        }
    }
}

module.exports = WindowManager;
