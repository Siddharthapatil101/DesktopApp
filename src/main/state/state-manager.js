/**
 * Professional state management with persistence and validation
 */

const { app } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { EventEmitter } = require('events');

class StateManager extends EventEmitter {
    constructor() {
        super();
        this.stateFile = path.join(app.getPath('userData'), 'app-state.json');
        this.state = this.getInitialState();
        this.isDirty = false;
        this.saveTimeout = null;
    }

    getInitialState() {
        return {
            attendance: {
                isCheckedIn: false,
                startTime: null,
                totalBreakTime: 0,
                isOnBreak: false,
                breakStartTime: null,
                lastCheckIn: null,
                lastCheckOut: null
            },
            user: {
                id: null,
                name: 'Employee',
                position: 'Staff',
                department: 'General',
                avatar: null
            },
            settings: {
                theme: 'light',
                notifications: true,
                autoSave: true,
                language: 'en'
            },
            statistics: {
                totalHours: 0,
                weeklyHours: 0,
                monthlyHours: 0,
                attendanceRate: 0,
                lastUpdated: null
            },
            timeOff: {
                requests: [],
                balance: {
                    vacation: 20,
                    sick: 10,
                    personal: 5
                }
            },
            metadata: {
                version: app.getVersion(),
                lastSaved: null,
                created: new Date().toISOString()
            }
        };
    }

    async initialize() {
        try {
            await this.load();
            this.setupAutoSave();
            console.log('State manager initialized');
        } catch (error) {
            console.error('Failed to initialize state manager:', error);
            throw error;
        }
    }

    async load() {
        try {
            const data = await fs.readFile(this.stateFile, 'utf8');
            const loadedState = JSON.parse(data);
            
            // Merge with initial state to handle new fields
            this.state = this.mergeState(this.getInitialState(), loadedState);
            
            // Validate state
            this.validateState(this.state);
            
            this.emit('state-loaded', this.state);
            console.log('State loaded successfully');
            
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('Error loading state:', error);
            }
            // Use initial state if file doesn't exist or is corrupted
            this.state = this.getInitialState();
        }
    }

    async save() {
        try {
            this.state.metadata.lastSaved = new Date().toISOString();
            
            await fs.mkdir(path.dirname(this.stateFile), { recursive: true });
            await fs.writeFile(this.stateFile, JSON.stringify(this.state, null, 2));
            
            this.isDirty = false;
            this.emit('state-saved', this.state);
            console.log('State saved successfully');
            
        } catch (error) {
            console.error('Error saving state:', error);
            throw error;
        }
    }

    setupAutoSave() {
        // Auto-save every 30 seconds if dirty
        setInterval(() => {
            if (this.isDirty) {
                this.save().catch(console.error);
            }
        }, 30000);
    }

    getState(path = null) {
        if (path) {
            return this.getNestedValue(this.state, path);
        }
        return { ...this.state };
    }

    setState(path, value) {
        this.setNestedValue(this.state, path, value);
        this.isDirty = true;
        this.emit('state-changed', { path, value, state: this.state });
        
        // Debounced save
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        this.saveTimeout = setTimeout(() => {
            this.save().catch(console.error);
        }, 1000);
    }

    updateState(updates) {
        for (const [path, value] of Object.entries(updates)) {
            this.setState(path, value);
        }
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!current[key]) current[key] = {};
            return current[key];
        }, obj);
        
        target[lastKey] = value;
    }

    mergeState(initial, loaded) {
        const merged = { ...initial };
        
        for (const key in loaded) {
            if (typeof loaded[key] === 'object' && !Array.isArray(loaded[key])) {
                merged[key] = this.mergeState(merged[key] || {}, loaded[key]);
            } else {
                merged[key] = loaded[key];
            }
        }
        
        return merged;
    }

    validateState(state) {
        // Validate required structure
        const requiredSections = ['attendance', 'user', 'settings', 'statistics', 'timeOff', 'metadata'];
        
        for (const section of requiredSections) {
            if (!state[section]) {
                throw new Error(`Missing required state section: ${section}`);
            }
        }

        // Validate attendance state
        const attendance = state.attendance;
        if (typeof attendance.isCheckedIn !== 'boolean') {
            throw new Error('Invalid attendance.isCheckedIn');
        }
        
        if (typeof attendance.totalBreakTime !== 'number' || attendance.totalBreakTime < 0) {
            throw new Error('Invalid attendance.totalBreakTime');
        }

        return true;
    }

    reset() {
        this.state = this.getInitialState();
        this.isDirty = true;
        this.emit('state-reset', this.state);
        this.save().catch(console.error);
    }

    export() {
        return JSON.stringify(this.state, null, 2);
    }

    import(data) {
        try {
            const importedState = JSON.parse(data);
            this.validateState(importedState);
            this.state = this.mergeState(this.getInitialState(), importedState);
            this.isDirty = true;
            this.emit('state-imported', this.state);
            this.save().catch(console.error);
        } catch (error) {
            throw new Error(`Invalid state data: ${error.message}`);
        }
    }
}

module.exports = StateManager;
