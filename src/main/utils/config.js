/**
 * Configuration management with environment-specific settings
 */

const { app } = require('electron');
const path = require('path');
const fs = require('fs').promises;

class Config {
    constructor() {
        this.configDir = app.getPath('userData');
        this.configFile = path.join(this.configDir, 'config.json');
        this.defaultConfig = this.getDefaultConfig();
        this.config = { ...this.defaultConfig };
        
        this.load();
    }

    getDefaultConfig() {
        return {
            app: {
                name: 'MDM Security',
                version: app.getVersion(),
                autoStart: false,
                minimizeToTray: true,
                startMinimized: false
            },
            window: {
                width: 1400,
                height: 900,
                minWidth: 1200,
                minHeight: 800,
                center: true,
                resizable: true,
                maximizable: true,
                minimizable: true,
                closable: true
            },
            security: {
                contextIsolation: true,
                nodeIntegration: false,
                enableRemoteModule: false,
                webSecurity: true,
                allowRunningInsecureContent: false
            },
            features: {
                devTools: process.env.NODE_ENV === 'development',
                autoUpdater: process.env.NODE_ENV === 'production',
                crashReporter: true,
                analytics: false
            },
            logging: {
                level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
                maxFiles: 7,
                maxSize: '10MB'
            }
        };
    }

    async load() {
        try {
            const data = await fs.readFile(this.configFile, 'utf8');
            const userConfig = JSON.parse(data);
            this.config = this.mergeConfig(this.defaultConfig, userConfig);
        } catch (error) {
            // Config file doesn't exist or is invalid, use defaults
            await this.save();
        }
    }

    async save() {
        try {
            await fs.mkdir(this.configDir, { recursive: true });
            await fs.writeFile(this.configFile, JSON.stringify(this.config, null, 2));
        } catch (error) {
            console.error('Failed to save config:', error);
        }
    }

    mergeConfig(defaultConfig, userConfig) {
        const merged = { ...defaultConfig };
        
        for (const key in userConfig) {
            if (typeof userConfig[key] === 'object' && !Array.isArray(userConfig[key])) {
                merged[key] = this.mergeConfig(merged[key] || {}, userConfig[key]);
            } else {
                merged[key] = userConfig[key];
            }
        }
        
        return merged;
    }

    get(path) {
        return path.split('.').reduce((obj, key) => obj?.[key], this.config);
    }

    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, key) => {
            if (!obj[key]) obj[key] = {};
            return obj[key];
        }, this.config);
        
        target[lastKey] = value;
        this.save();
    }

    getAll() {
        return { ...this.config };
    }

    reset() {
        this.config = { ...this.defaultConfig };
        this.save();
    }
}

module.exports = Config;
