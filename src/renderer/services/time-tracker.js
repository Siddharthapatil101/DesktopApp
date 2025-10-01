/**
 * Professional time tracking service
 */

class TimeTracker {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.timer = null;
        this.startTime = null;
        this.breakStartTime = null;
        this.totalBreakTime = 0;
        this.isRunning = false;
        this.isOnBreak = false;
    }

    async initialize() {
        console.log('Time tracker initialized');
    }

    start(startTime = new Date()) {
        if (this.isRunning) {
            console.warn('Timer is already running');
            return;
        }

        this.startTime = startTime;
        this.isRunning = true;
        
        this.timer = setInterval(() => {
            this.updateDisplay();
        }, 1000);

        this.eventBus.emit('time:started', { startTime });
        console.log('Timer started at:', startTime);
    }

    stop() {
        if (!this.isRunning) {
            console.warn('Timer is not running');
            return;
        }

        this.isRunning = false;
        this.isOnBreak = false;
        
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        const endTime = new Date();
        const duration = this.getTotalDuration();

        this.eventBus.emit('time:stopped', { 
            startTime: this.startTime, 
            endTime, 
            duration 
        });

        console.log('Timer stopped. Duration:', duration);
        
        // Reset
        this.startTime = null;
        this.totalBreakTime = 0;
    }

    startBreak() {
        if (!this.isRunning) {
            console.warn('Cannot start break - timer is not running');
            return;
        }

        if (this.isOnBreak) {
            console.warn('Already on break');
            return;
        }

        this.breakStartTime = new Date();
        this.isOnBreak = true;

        this.eventBus.emit('time:break-started', { breakStartTime: this.breakStartTime });
        console.log('Break started at:', this.breakStartTime);
    }

    endBreak() {
        if (!this.isOnBreak) {
            console.warn('Not currently on break');
            return;
        }

        const breakEndTime = new Date();
        const breakDuration = breakEndTime - this.breakStartTime;
        
        this.totalBreakTime += breakDuration;
        this.isOnBreak = false;
        this.breakStartTime = null;

        this.eventBus.emit('time:break-ended', { 
            breakEndTime, 
            breakDuration, 
            totalBreakTime: this.totalBreakTime 
        });

        console.log('Break ended. Duration:', breakDuration);
    }

    getTotalDuration() {
        if (!this.startTime) return 0;
        
        const now = new Date();
        const totalTime = now - this.startTime;
        const currentBreakTime = this.isOnBreak ? now - this.breakStartTime : 0;
        
        return totalTime - this.totalBreakTime - currentBreakTime;
    }

    getFormattedDuration() {
        const duration = this.getTotalDuration();
        return this.formatDuration(duration);
    }

    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        const remainingMinutes = minutes % 60;
        const remainingSeconds = seconds % 60;

        return `${hours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    updateDisplay() {
        if (!this.isRunning) return;

        const duration = this.getFormattedDuration();
        this.eventBus.emit('time:display-update', { duration });
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            isOnBreak: this.isOnBreak,
            startTime: this.startTime,
            breakStartTime: this.breakStartTime,
            totalBreakTime: this.totalBreakTime,
            currentDuration: this.getTotalDuration(),
            formattedDuration: this.getFormattedDuration()
        };
    }

    // Static utility methods
    static formatTime(date) {
        return date.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    static formatDate(date) {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    static calculateHoursWorked(startTime, endTime, breakTime = 0) {
        const totalTime = endTime - startTime;
        const workTime = totalTime - breakTime;
        return workTime / (1000 * 60 * 60); // Convert to hours
    }
}

export { TimeTracker };
