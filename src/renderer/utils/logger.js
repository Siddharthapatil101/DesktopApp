/**
 * Professional logging system for renderer process
 */

class Logger {
    constructor(module = 'Renderer') {
        this.module = module;
        this.levels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3
        };
        
        this.currentLevel = process.env.NODE_ENV === 'development' ? this.levels.DEBUG : this.levels.INFO;
    }

    formatMessage(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const formattedMessage = `[${timestamp}] [${level}] [${this.module}] ${message}`;
        
        if (data) {
            return `${formattedMessage} ${JSON.stringify(data, null, 2)}`;
        }
        
        return formattedMessage;
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
}

export { Logger };
