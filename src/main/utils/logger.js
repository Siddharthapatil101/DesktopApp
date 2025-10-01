/**
 * Professional logging system with different levels and file output
 */

const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

class Logger {
    constructor(module = 'App') {
        this.module = module;
        this.logDir = path.join(app.getPath('userData'), 'logs');
        this.logFile = path.join(this.logDir, `app-${new Date().toISOString().split('T')[0]}.log`);
        
        this.levels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3
        };
        
        this.currentLevel = process.env.NODE_ENV === 'development' ? this.levels.DEBUG : this.levels.INFO;
        
        this.initializeLogDir();
    }

    async initializeLogDir() {
        try {
            await fs.mkdir(this.logDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create log directory:', error);
        }
    }

    formatMessage(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const formattedMessage = `[${timestamp}] [${level}] [${this.module}] ${message}`;
        
        if (data) {
            return `${formattedMessage} ${JSON.stringify(data, null, 2)}`;
        }
        
        return formattedMessage;
    }

    async writeToFile(message) {
        try {
            await fs.appendFile(this.logFile, message + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    log(level, message, data = null) {
        if (this.levels[level] <= this.currentLevel) {
            const formattedMessage = this.formatMessage(level, message, data);
            
            // Console output
            if (level === 'ERROR') {
                console.error(formattedMessage);
            } else if (level === 'WARN') {
                console.warn(formattedMessage);
            } else {
                console.log(formattedMessage);
            }
            
            // File output
            this.writeToFile(formattedMessage);
        }
    }

    error(message, data = null) {
        this.log('ERROR', message, data);
    }

    warn(message, data = null) {
        this.log('WARN', message, data);
    }

    info(message, data = null) {
        this.log('INFO', message, data);
    }

    debug(message, data = null) {
        this.log('DEBUG', message, data);
    }

    setLevel(level) {
        if (this.levels.hasOwnProperty(level)) {
            this.currentLevel = this.levels[level];
        }
    }

    getLogFile() {
        return this.logFile;
    }
}

module.exports = Logger;
