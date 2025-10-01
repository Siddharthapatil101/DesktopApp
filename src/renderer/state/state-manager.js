/**
 * Professional state management for renderer process
 */

class StateManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
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
            if (window.electronAPI) {
                const result = await window.electronAPI.state.get();
                if (result.success) {
                    this.state = this.mergeState(this.getInitialState(), result.data);
                }
            } else {
                // Fallback to localStorage
                const savedState = localStorage.getItem('mdm-security-state');
                if (savedState) {
                    this.state = this.mergeState(this.getInitialState(), JSON.parse(savedState));
                }
            }
            
            this.eventBus.emit('state:loaded', this.state);
            console.log('State loaded successfully');
            
        } catch (error) {
            console.error('Error loading state:', error);
            this.state = this.getInitialState();
        }
    }

    async save() {
        try {
            if (window.electronAPI) {
                const result = await window.electronAPI.state.save(this.state.attendance);
                if (!result.success) {
                    throw new Error(result.error);
                }
            } else {
                // Fallback to localStorage
                localStorage.setItem('mdm-security-state', JSON.stringify(this.state));
            }
            
            this.isDirty = false;
            this.eventBus.emit('state:saved', this.state);
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
        this.eventBus.emit('state:changed', { path, value, state: this.state });
        
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

    reset() {
        this.state = this.getInitialState();
        this.isDirty = true;
        this.eventBus.emit('state:reset', this.state);
        this.save().catch(console.error);
    }
}

export { StateManager };
