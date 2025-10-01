const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // State management
    saveState: (state) => ipcRenderer.invoke('save-state', state),
    getSavedState: () => ipcRenderer.invoke('get-saved-state'),
    
    // App information
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    
    // External links
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    
    // File operations
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
    
    // Window controls
    minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
    maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
    closeWindow: () => ipcRenderer.invoke('close-window'),
    
    // Event listeners
    onNewSession: (callback) => ipcRenderer.on('new-session', callback),
    onExportData: (callback) => ipcRenderer.on('export-data', callback),
    
    // Remove listeners
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

// Expose a limited set of Node.js APIs for the renderer process
contextBridge.exposeInMainWorld('nodeAPI', {
    platform: process.platform,
    versions: process.versions
});

// Security: Prevent the renderer from accessing Node.js APIs directly
window.addEventListener('DOMContentLoaded', () => {
    // Remove any existing Node.js globals that might have been exposed
    delete window.require;
    delete window.exports;
    delete window.module;
    
    // Add any additional security measures here
    console.log('Preload script loaded successfully');
});
