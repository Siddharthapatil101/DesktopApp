/**
 * Simplified preload script with secure API exposure
 */

const { contextBridge, ipcRenderer } = require('electron');

// Create a secure API object
const electronAPI = {
    // State management
    state: {
        save: (state) => ipcRenderer.invoke('save-state', state),
        get: () => ipcRenderer.invoke('get-saved-state')
    },

    // Window controls
    window: {
        minimize: () => ipcRenderer.invoke('minimize-window'),
        maximize: () => ipcRenderer.invoke('maximize-window'),
        close: () => ipcRenderer.invoke('close-window')
    },

    // App information
    app: {
        getVersion: () => ipcRenderer.invoke('get-app-version')
    },

    // File operations
    files: {
        showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options)
    },

    // External links
    external: {
        open: (url) => ipcRenderer.invoke('open-external', url)
    }
};

// Expose the API securely to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Log successful preload
console.log('Preload script loaded successfully');
