const AppState = {
    user: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        department: 'IT',
        joinDate: '2023-01-15'
    },
    attendance: {
        isCheckedIn: false,
        startTime: null,
        breakStartTime: null,
        totalBreakTime: 0,
        dailyHours: 0,
        weeklyHours: 0,
        monthlyHours: 0,
        records: []
    },
    timeOff: {
        balances: {
            vacation: { total: 20, used: 8, remaining: 12 },
            sick: { total: 15, used: 5, remaining: 10 },
            personal: { total: 10, used: 5, remaining: 5 }
        },
        requests: []
    },
    stats: {
        daily: {
            productivity: 85,
            workedHours: 6,
            breakTime: 1,
            targetHours: 8
        },
        weekly: {
            targetHours: 40,
            workedHours: 0,
            attendance: 0,
            productivity: 0,
            pattern: {
                monday: 7.5,
                tuesday: 8,
                wednesday: 7.75,
                thursday: 8,
                friday: 7.25
            }
        },
        monthly: {
            targetHours: 160,
            workedHours: 0,
            attendance: 0,
            leavesTaken: 0
        }
    },
    settings: {
        notifications: {
            emailLeave: true,
            emailAttendance: true,
            emailAnnouncements: false,
            desktopBreak: true,
            desktopCheckout: true
        },
        preferences: {
            language: 'en',
            timezone: 'UTC-5',
            dateFormat: 'MM/DD/YYYY',
            timeFormat: '12'
        }
    }
};

const subscribers = {
    attendance: [],
    timeOff: [],
    stats: []
};
function subscribeToState(stateKey, callback) {
    if (subscribers[stateKey]) {
        subscribers[stateKey].push(callback);
        callback(AppState[stateKey]);
    }
}

function updateAttendanceState(updates) {
    const previousState = { ...AppState.attendance };
    
    AppState.attendance = {
        ...AppState.attendance,
        ...updates
    };
    
    updateStats();
    
    if (typeof require !== 'undefined') {
        const { ipcRenderer } = require('electron');
        
        ipcRenderer.invoke('save-state', AppState.attendance).then(result => {
            if (!result.success) {
                console.error('Failed to save state:', result.error);
            }
        });
    }
    
    subscribers.attendance.forEach(callback => {
        try {
            callback(AppState.attendance);
        } catch (error) {
            console.error('Error in attendance subscriber:', error);
        }
    });
}

function updateTimeOffState(updates) {
    AppState.timeOff = {
        ...AppState.timeOff,
        ...updates
    };
    
    updateStats();
    
    subscribers.timeOff.forEach(callback => {
        try {
            callback(AppState.timeOff);
        } catch (error) {
            console.error('Error in timeOff subscriber:', error);
        }
    });
}

function updateStats() {
    const now = new Date();
    if (AppState.attendance.isCheckedIn && AppState.attendance.startTime) {
        const startTime = new Date(AppState.attendance.startTime);
        const totalMs = now - startTime - AppState.attendance.totalBreakTime;
        AppState.stats.daily.workedHours = totalMs / (1000 * 60 * 60);
        AppState.stats.daily.breakTime = AppState.attendance.totalBreakTime / (1000 * 60 * 60);
        AppState.stats.daily.productivity = Math.min((AppState.stats.daily.workedHours / AppState.stats.daily.targetHours) * 100, 100);
    }

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const weeklyRecords = AppState.attendance.records.filter(record => 
        new Date(record.date) >= weekStart
    );

    AppState.stats.weekly.workedHours = weeklyRecords.reduce((total, record) => 
        total + (parseFloat(record.totalHours) || 0), 0
    );
    
    if (AppState.attendance.isCheckedIn) {
        AppState.stats.weekly.workedHours += AppState.stats.daily.workedHours;
    }

    AppState.stats.weekly.attendance = (weeklyRecords.length / 5) * 100;
    AppState.stats.weekly.productivity = Math.min((AppState.stats.weekly.workedHours / AppState.stats.weekly.targetHours) * 100, 100);

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const pattern = {
        monday: 0,
        tuesday: 0,
        wednesday: 0,
        thursday: 0,
        friday: 0
    };

    weeklyRecords.forEach(record => {
        const date = new Date(record.date);
        const day = days[date.getDay()].toLowerCase();
        if (pattern.hasOwnProperty(day)) {
            pattern[day] = parseFloat(record.totalHours) || 0;
        }
    });

    if (AppState.attendance.isCheckedIn) {
        const today = days[now.getDay()].toLowerCase();
        if (pattern.hasOwnProperty(today)) {
            pattern[today] = AppState.stats.daily.workedHours;
        }
    }

    AppState.stats.weekly.pattern = pattern;

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyRecords = AppState.attendance.records.filter(record => 
        new Date(record.date) >= monthStart
    );

    AppState.stats.monthly.workedHours = monthlyRecords.reduce((total, record) => 
        total + (parseFloat(record.totalHours) || 0), 0
    );

    if (AppState.attendance.isCheckedIn) {
        AppState.stats.monthly.workedHours += AppState.stats.daily.workedHours;
    }

    AppState.stats.monthly.attendance = (monthlyRecords.length / 20) * 100;
    AppState.stats.monthly.leavesTaken = AppState.timeOff.requests.filter(request => 
        request.status === 'approved' && new Date(request.startDate) >= monthStart
    ).length;

    subscribers.stats.forEach(callback => {
        try {
            callback(AppState.stats);
        } catch (error) {
            console.error('Error in stats subscriber:', error);
        }
    });
}

function formatHours(hours) {
    if (typeof hours !== 'number' || isNaN(hours)) return '0h 0m';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}

function formatTime(time) {
    if (!time) return '--:--';
    return new Date(time).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: AppState.settings.preferences.timeFormat === '12'
    });
}

window.AppState = AppState;
window.updateAttendanceState = updateAttendanceState;
window.updateTimeOffState = updateTimeOffState;
window.subscribeToState = subscribeToState;
window.formatHours = formatHours;
window.formatDate = formatDate;
window.formatTime = formatTime; 