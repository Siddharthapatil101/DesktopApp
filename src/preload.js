

const { contextBridge, ipcRenderer } = require('electron');

const electronAPI = {
    state: {
        save: (state) => ipcRenderer.invoke('save-state', state),
        get: () => ipcRenderer.invoke('get-saved-state'),
        update: (updates) => ipcRenderer.invoke('update-state', updates),
        reset: () => ipcRenderer.invoke('reset-state'),
        export: () => ipcRenderer.invoke('export-state'),
        import: (data) => ipcRenderer.invoke('import-state', data)
    },

    window: {
        minimize: () => ipcRenderer.invoke('minimize-window'),
        maximize: () => ipcRenderer.invoke('maximize-window'),
        close: () => ipcRenderer.invoke('close-window'),
        focus: () => ipcRenderer.invoke('focus-window')
    },

    app: {
        getVersion: () => ipcRenderer.invoke('get-app-version'),
        getInfo: () => ipcRenderer.invoke('get-app-info'),
        getSystemInfo: () => ipcRenderer.invoke('get-system-info')
    },

    files: {
        showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
        showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options)
    },

    external: {
        open: (url) => ipcRenderer.invoke('open-external', url)
    },

    events: {
        onStateChanged: (callback) => {
            ipcRenderer.on('state-changed', (event, data) => callback(data));
        },
        onWindowEvent: (callback) => {
            ipcRenderer.on('window-event', (event, data) => callback(data));
        },
        removeAllListeners: (channel) => {
            ipcRenderer.removeAllListeners(channel);
        }
    }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

console.log('Preload script loaded successfully');
window.addEventListener('error', (event) => {
    console.error('Preload script error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Preload script unhandled rejection:', event.reason);
});

