/**
 * Professional attendance management service
 */

class AttendanceService {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.attendance = {
            isCheckedIn: false,
            startTime: null,
            totalBreakTime: 0,
            isOnBreak: false,
            breakStartTime: null,
            lastCheckIn: null,
            lastCheckOut: null
        };
    }

    async initialize() {
        console.log('Attendance service initialized');
    }

    async checkIn() {
        if (this.attendance.isCheckedIn) {
            throw new Error('Already checked in');
        }

        const checkInTime = new Date();
        this.attendance.isCheckedIn = true;
        this.attendance.startTime = checkInTime;
        this.attendance.lastCheckIn = checkInTime;

        this.eventBus.emit('attendance:checked-in', { checkInTime });
        console.log('Checked in at:', checkInTime);

        return checkInTime;
    }

    async checkOut() {
        if (!this.attendance.isCheckedIn) {
            throw new Error('Not checked in');
        }

        const checkOutTime = new Date();
        const workDuration = this.calculateWorkDuration();
        
        this.attendance.isCheckedIn = false;
        this.attendance.lastCheckOut = checkOutTime;

        this.eventBus.emit('attendance:checked-out', { 
            checkOutTime, 
            workDuration,
            totalBreakTime: this.attendance.totalBreakTime
        });

        console.log('Checked out at:', checkOutTime);
        console.log('Work duration:', workDuration);

        return { checkOutTime, workDuration };
    }

    async startBreak() {
        if (!this.attendance.isCheckedIn) {
            throw new Error('Must be checked in to start break');
        }

        if (this.attendance.isOnBreak) {
            throw new Error('Already on break');
        }

        const breakStartTime = new Date();
        this.attendance.isOnBreak = true;
        this.attendance.breakStartTime = breakStartTime;

        this.eventBus.emit('attendance:break-started', { breakStartTime });
        console.log('Break started at:', breakStartTime);

        return breakStartTime;
    }

    async endBreak() {
        if (!this.attendance.isOnBreak) {
            throw new Error('Not currently on break');
        }

        const breakEndTime = new Date();
        const breakDuration = breakEndTime - this.attendance.breakStartTime;
        
        this.attendance.totalBreakTime += breakDuration;
        this.attendance.isOnBreak = false;
        this.attendance.breakStartTime = null;

        this.eventBus.emit('attendance:break-ended', { 
            breakEndTime, 
            breakDuration,
            totalBreakTime: this.attendance.totalBreakTime
        });

        console.log('Break ended at:', breakEndTime);
        console.log('Break duration:', breakDuration);

        return { breakEndTime, breakDuration };
    }

    calculateWorkDuration() {
        if (!this.attendance.startTime) return 0;

        const now = new Date();
        const totalTime = now - this.attendance.startTime;
        const currentBreakTime = this.attendance.isOnBreak ? 
            now - this.attendance.breakStartTime : 0;

        return totalTime - this.attendance.totalBreakTime - currentBreakTime;
    }

    getCurrentStatus() {
        return {
            ...this.attendance,
            currentWorkDuration: this.calculateWorkDuration(),
            formattedWorkDuration: this.formatDuration(this.calculateWorkDuration())
        };
    }

    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        const remainingMinutes = minutes % 60;
        const remainingSeconds = seconds % 60;

        return `${hours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    getAttendanceHistory() {
        // This would typically fetch from a database or API
        return {
            today: this.getTodayAttendance(),
            thisWeek: this.getThisWeekAttendance(),
            thisMonth: this.getThisMonthAttendance()
        };
    }

    getTodayAttendance() {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        return {
            date: today,
            checkIn: this.attendance.lastCheckIn,
            checkOut: this.attendance.lastCheckOut,
            totalWorkTime: this.calculateWorkDuration(),
            totalBreakTime: this.attendance.totalBreakTime,
            isActive: this.attendance.isCheckedIn
        };
    }

    getThisWeekAttendance() {
        // Mock data - in real app, this would come from database
        return {
            weekStart: new Date(),
            totalHours: 40,
            averageHours: 8,
            daysWorked: 5,
            attendance: [
                { date: '2024-01-01', hours: 8, status: 'present' },
                { date: '2024-01-02', hours: 8, status: 'present' },
                { date: '2024-01-03', hours: 7.5, status: 'present' },
                { date: '2024-01-04', hours: 8, status: 'present' },
                { date: '2024-01-05', hours: 8.5, status: 'present' }
            ]
        };
    }

    getThisMonthAttendance() {
        // Mock data - in real app, this would come from database
        return {
            month: new Date().getMonth(),
            year: new Date().getFullYear(),
            totalHours: 160,
            averageHours: 8,
            daysWorked: 20,
            attendanceRate: 95.2
        };
    }

    // Event handlers
    handleCheckIn(data) {
        this.checkIn().catch(error => {
            console.error('Check in failed:', error);
            this.eventBus.emit('attendance:error', { action: 'checkin', error: error.message });
        });
    }

    handleCheckOut(data) {
        this.checkOut().catch(error => {
            console.error('Check out failed:', error);
            this.eventBus.emit('attendance:error', { action: 'checkout', error: error.message });
        });
    }
}

export { AttendanceService };
