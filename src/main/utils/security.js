/**
 * Security utilities and hardening measures
 */

const { app, dialog } = require('electron');
const { EventEmitter } = require('events');

class Security extends EventEmitter {
    constructor() {
        super();
        this.allowedOrigins = [
            'https://mdmsecurity.com',
            'https://app.mdmsecurity.com'
        ];
    }

    async harden() {
        // Disable hardware acceleration in development
        if (process.env.NODE_ENV === 'development') {
            app.disableHardwareAcceleration();
        }

        // Set secure defaults
        app.commandLine.appendSwitch('--disable-features', 'VizDisplayCompositor');
        app.commandLine.appendSwitch('--disable-web-security', 'false');
        app.commandLine.appendSwitch('--disable-site-isolation-trials', 'false');
        app.commandLine.appendSwitch('--enable-features', 'NetworkService,NetworkServiceLogging');
        
        // Disable dangerous features
        app.commandLine.appendSwitch('--disable-background-timer-throttling');
        app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');
        app.commandLine.appendSwitch('--disable-renderer-backgrounding');
        app.commandLine.appendSwitch('--disable-background-networking');
        
        // Security headers
        app.commandLine.appendSwitch('--disable-features', 'TranslateUI');
        app.commandLine.appendSwitch('--disable-ipc-flooding-protection');
        
        console.log('Security hardening applied');
    }

    handleCertificateError(event, webContents, url, error, certificate, callback) {
        // In production, always reject invalid certificates
        if (process.env.NODE_ENV === 'production') {
            event.preventDefault();
            callback(false);
            return;
        }

        // In development, allow self-signed certificates
        if (process.env.NODE_ENV === 'development') {
            callback(true);
            return;
        }

        // Default: reject
        event.preventDefault();
        callback(false);
    }

    validateUrl(url) {
        try {
            const parsedUrl = new URL(url);
            
            // Only allow HTTPS in production
            if (process.env.NODE_ENV === 'production' && parsedUrl.protocol !== 'https:') {
                return false;
            }
            
            // Check against allowed origins
            return this.allowedOrigins.some(origin => 
                parsedUrl.origin === origin || parsedUrl.hostname.endsWith(origin.replace('https://', ''))
            );
        } catch (error) {
            return false;
        }
    }

    sanitizeInput(input) {
        if (typeof input !== 'string') {
            return input;
        }

        // Remove potentially dangerous characters
        return input
            .replace(/[<>]/g, '') // Remove HTML tags
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/data:/gi, '') // Remove data: protocol
            .trim();
    }

    validateState(state) {
        const requiredFields = ['isCheckedIn', 'startTime', 'totalBreakTime'];
        
        for (const field of requiredFields) {
            if (!state.hasOwnProperty(field)) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Validate data types
        if (typeof state.isCheckedIn !== 'boolean') {
            throw new Error('isCheckedIn must be a boolean');
        }

        if (state.startTime && !(state.startTime instanceof Date || typeof state.startTime === 'string')) {
            throw new Error('startTime must be a Date or string');
        }

        if (typeof state.totalBreakTime !== 'number' || state.totalBreakTime < 0) {
            throw new Error('totalBreakTime must be a non-negative number');
        }

        return true;
    }

    createSecureHeaders() {
        return {
            'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' https:;",
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin'
        };
    }

    logSecurityEvent(event, details = {}) {
        console.log(`[SECURITY] ${event}:`, details);
        this.emit('security-event', { event, details, timestamp: new Date() });
    }
}

module.exports = Security;
