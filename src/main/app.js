/**
 * MDM Security Desktop Application - Main Process
 * Expert-level architecture with proper error handling, logging, and security
 */

const { app, BrowserWindow, ipcMain, Menu, shell, dialog, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { EventEmitter } = require('events');

// Import modules
const Logger = require('./utils/logger');
const Config = require('./utils/config');
const Security = require('./utils/security');
const StateManager = require('./state/state-manager');
const WindowManager = require('./window/window-manager');
const MenuManager = require('./menu/menu-manager');
const IpcHandler = require('./ipc/ipc-handler');

class MDMApp extends EventEmitter {
    constructor() {
        super();
        this.logger = new Logger('MDMApp');
        this.config = new Config();
        this.security = new Security();
        this.stateManager = new StateManager();
        this.windowManager = new WindowManager();
        this.menuManager = new MenuManager();
        this.ipcHandler = new IpcHandler();
        
        this.isReady = false;
        this.isQuitting = false;
        
        this.logger.info('MDM Security Desktop Application starting...');
    }

    async initialize() {
        try {
            // Security hardening
            await this.security.harden();
            
            // Initialize state management
            await this.stateManager.initialize();
            
            // Setup IPC handlers
            this.ipcHandler.setup(this.stateManager, this.windowManager);
            
            // Setup application menu
            this.menuManager.setup();
            
            // Setup event listeners
            this.setupEventListeners();
            
            this.logger.info('Application initialized successfully');
            this.emit('initialized');
            
        } catch (error) {
            this.logger.error('Failed to initialize application:', error);
            this.emit('error', error);
            throw error;
        }
    }

    setupEventListeners() {
        // App events
        app.on('ready', this.onReady.bind(this));
        app.on('window-all-closed', this.onWindowAllClosed.bind(this));
        app.on('activate', this.onActivate.bind(this));
        app.on('before-quit', this.onBeforeQuit.bind(this));
        
        // Security events
        app.on('certificate-error', this.security.handleCertificateError.bind(this.security));
        
        // Uncaught exceptions
        process.on('uncaughtException', this.handleUncaughtException.bind(this));
        process.on('unhandledRejection', this.handleUnhandledRejection.bind(this));
    }

    async onReady() {
        try {
            this.logger.info('Application ready, creating main window...');
            
            // Create main window
            await this.windowManager.createMainWindow();
            
            // Show window when ready
            this.windowManager.on('window-ready', () => {
                this.isReady = true;
                this.emit('ready');
            });
            
        } catch (error) {
            this.logger.error('Failed to create main window:', error);
            this.emit('error', error);
        }
    }

    onWindowAllClosed() {
        if (process.platform !== 'darwin') {
            this.quit();
        }
    }

    onActivate() {
        if (this.windowManager.getMainWindow() === null) {
            this.windowManager.createMainWindow();
        }
    }

    onBeforeQuit(event) {
        if (!this.isQuitting) {
            event.preventDefault();
            this.quit();
        }
    }

    async quit() {
        try {
            this.isQuitting = true;
            this.logger.info('Application quitting...');
            
            // Save state
            await this.stateManager.save();
            
            // Close all windows
            this.windowManager.closeAll();
            
            // Cleanup
            await this.cleanup();
            
            app.quit();
            
        } catch (error) {
            this.logger.error('Error during quit:', error);
            app.quit();
        }
    }

    async cleanup() {
        try {
            // Cleanup resources
            this.removeAllListeners();
            this.logger.info('Cleanup completed');
        } catch (error) {
            this.logger.error('Error during cleanup:', error);
        }
    }

    handleUncaughtException(error) {
        this.logger.error('Uncaught Exception:', error);
        this.emit('error', error);
        
        // Show error dialog
        dialog.showErrorBox(
            'Application Error',
            `An unexpected error occurred: ${error.message}`
        );
    }

    handleUnhandledRejection(reason, promise) {
        this.logger.error('Unhandled Rejection:', reason);
        this.emit('error', reason);
    }

    getStateManager() {
        return this.stateManager;
    }

    getWindowManager() {
        return this.windowManager;
    }

    getLogger() {
        return this.logger;
    }
}

// Create and export app instance
const mdmApp = new MDMApp();

// Handle app initialization
mdmApp.initialize().catch(error => {
    console.error('Failed to initialize MDM App:', error);
    app.quit();
});

module.exports = mdmApp;
