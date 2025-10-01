/**
 * Professional IPC handler with proper error handling and validation
 */

const { ipcMain, dialog, shell } = require('electron');
const { EventEmitter } = require('events');

class IpcHandler extends EventEmitter {
    constructor() {
        super();
        this.handlers = new Map();
    }

    setup(stateManager, windowManager) {
        this.stateManager = stateManager;
        this.windowManager = windowManager;
        
        this.registerHandlers();
        console.log('IPC handlers registered');
    }

    registerHandlers() {
        // State management handlers
        this.registerHandler('save-state', this.handleSaveState.bind(this));
        this.registerHandler('get-saved-state', this.handleGetSavedState.bind(this));
        this.registerHandler('update-state', this.handleUpdateState.bind(this));
        this.registerHandler('reset-state', this.handleResetState.bind(this));
        this.registerHandler('export-state', this.handleExportState.bind(this));
        this.registerHandler('import-state', this.handleImportState.bind(this));

        // Window control handlers
        this.registerHandler('minimize-window', this.handleMinimizeWindow.bind(this));
        this.registerHandler('maximize-window', this.handleMaximizeWindow.bind(this));
        this.registerHandler('close-window', this.handleCloseWindow.bind(this));
        this.registerHandler('focus-window', this.handleFocusWindow.bind(this));

        // App information handlers
        this.registerHandler('get-app-version', this.handleGetAppVersion.bind(this));
        this.registerHandler('get-app-info', this.handleGetAppInfo.bind(this));

        // File operations handlers
        this.registerHandler('show-save-dialog', this.handleShowSaveDialog.bind(this));
        this.registerHandler('show-open-dialog', this.handleShowOpenDialog.bind(this));

        // External links handler
        this.registerHandler('open-external', this.handleOpenExternal.bind(this));

        // System handlers
        this.registerHandler('get-system-info', this.handleGetSystemInfo.bind(this));
    }

    registerHandler(channel, handler) {
        this.handlers.set(channel, handler);
        
        ipcMain.handle(channel, async (event, ...args) => {
            try {
                const result = await handler(event, ...args);
                return { success: true, data: result };
            } catch (error) {
                console.error(`Error in IPC handler ${channel}:`, error);
                return { success: false, error: error.message };
            }
        });
    }

    // State management handlers
    async handleSaveState(event, state) {
        this.validateState(state);
        this.stateManager.setState('attendance', state);
        return { success: true };
    }

    async handleGetSavedState(event) {
        return this.stateManager.getState('attendance');
    }

    async handleUpdateState(event, updates) {
        for (const [path, value] of Object.entries(updates)) {
            this.stateManager.setState(path, value);
        }
        return { success: true };
    }

    async handleResetState(event) {
        this.stateManager.reset();
        return { success: true };
    }

    async handleExportState(event) {
        return this.stateManager.export();
    }

    async handleImportState(event, data) {
        this.stateManager.import(data);
        return { success: true };
    }

    // Window control handlers
    async handleMinimizeWindow(event) {
        this.windowManager.minimize();
        return { success: true };
    }

    async handleMaximizeWindow(event) {
        this.windowManager.maximize();
        return { success: true };
    }

    async handleCloseWindow(event) {
        this.windowManager.close();
        return { success: true };
    }

    async handleFocusWindow(event) {
        this.windowManager.focus();
        return { success: true };
    }

    // App information handlers
    async handleGetAppVersion(event) {
        return require('../../package.json').version;
    }

    async handleGetAppInfo(event) {
        const { app } = require('electron');
        return {
            name: app.getName(),
            version: app.getVersion(),
            platform: process.platform,
            arch: process.arch,
            electronVersion: process.versions.electron,
            nodeVersion: process.versions.node,
            chromeVersion: process.versions.chrome
        };
    }

    // File operations handlers
    async handleShowSaveDialog(event, options = {}) {
        const result = await dialog.showSaveDialog(this.windowManager.getMainWindow(), {
            title: 'Save File',
            defaultPath: 'export.json',
            filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
            ],
            ...options
        });
        return result;
    }

    async handleShowOpenDialog(event, options = {}) {
        const result = await dialog.showOpenDialog(this.windowManager.getMainWindow(), {
            title: 'Open File',
            filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
            ],
            properties: ['openFile'],
            ...options
        });
        return result;
    }

    // External links handler
    async handleOpenExternal(event, url) {
        if (typeof url !== 'string' || !url.startsWith('http')) {
            throw new Error('Invalid URL');
        }
        
        await shell.openExternal(url);
        return { success: true };
    }

    // System handlers
    async handleGetSystemInfo(event) {
        const { app } = require('electron');
        const os = require('os');
        
        return {
            platform: process.platform,
            arch: process.arch,
            version: os.release(),
            hostname: os.hostname(),
            userInfo: os.userInfo(),
            totalMemory: os.totalmem(),
            freeMemory: os.freemem(),
            cpuCount: os.cpus().length,
            uptime: os.uptime(),
            appVersion: app.getVersion(),
            electronVersion: process.versions.electron
        };
    }

    validateState(state) {
        if (!state || typeof state !== 'object') {
            throw new Error('State must be an object');
        }

        const requiredFields = ['isCheckedIn', 'totalBreakTime'];
        for (const field of requiredFields) {
            if (!state.hasOwnProperty(field)) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        if (typeof state.isCheckedIn !== 'boolean') {
            throw new Error('isCheckedIn must be a boolean');
        }

        if (typeof state.totalBreakTime !== 'number' || state.totalBreakTime < 0) {
            throw new Error('totalBreakTime must be a non-negative number');
        }
    }

    cleanup() {
        this.handlers.forEach((handler, channel) => {
            ipcMain.removeHandler(channel);
        });
        this.handlers.clear();
    }
}

module.exports = IpcHandler;
