class SimpleMDMApp {
    constructor() {
        this.isInitialized = false;
        this.isLoading = true;
        this.state = {
            attendance: {
                isCheckedIn: false,
                startTime: null,
                totalBreakTime: 0,
                isOnBreak: false,
                breakStartTime: null
            },
            activities: [],
            attendanceRecords: [],
            currentCalendarMonth: new Date().getMonth(),
            currentCalendarYear: new Date().getFullYear()
        };
        this.timer = null;
    }
    async initialize() {
        try {
            console.log('Initializing Simple MDM Security Desktop App...');
            this.showLoadingScreen();
            this.setupEventListeners();
            await this.loadInitialState();
            this.initializeUI();
            this.hideLoadingScreen();
            this.isInitialized = true;
            this.isLoading = false;
            console.log('Application initialized successfully');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.handleInitializationError(error);
        }
    }
    setupEventListeners() {
        const checkInBtn = document.getElementById('checkInBtn');
        const checkOutBtn = document.getElementById('checkOutBtn');
        const breakBtn = document.getElementById('breakBtn');
        if (checkInBtn) {
            checkInBtn.addEventListener('click', () => this.handleCheckIn());
        }
        if (checkOutBtn) {
            checkOutBtn.addEventListener('click', () => this.handleCheckOut());
        }
        if (breakBtn) {
            breakBtn.addEventListener('click', () => this.handleBreak());
        }
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const href = link.getAttribute('href');
                if (href && href.startsWith('#')) {
                    this.showSection(href.substring(1));
                }
            });
        });
        window.addEventListener('beforeunload', () => {
            if (this.isLoading) {
                return false;
            }
        });
    }
    async loadInitialState() {
        try {
            if (window.electronAPI) {
                const result = await window.electronAPI.state.get();
                if (result.success && result.data) {
                    this.state.attendance = { ...this.state.attendance, ...result.data };
                }
            } else {
                const savedState = localStorage.getItem('mdm-security-state');
                if (savedState) {
                    const parsed = JSON.parse(savedState);
                    this.state.attendance = { ...this.state.attendance, ...parsed };
                }
            }
            console.log('Initial state loaded:', this.state);
            if (this.state.attendance.totalBreakTime < 0) {
                this.state.attendance.totalBreakTime = 0;
            }
            if (this.state.attendance.startTime && !this.state.attendance.isCheckedIn) {
                this.state.attendance.startTime = null;
                this.state.attendance.totalBreakTime = 0;
                this.state.attendance.isOnBreak = false;
                this.state.attendance.breakStartTime = null;
            }
        } catch (error) {
            console.error('Error loading initial state:', error);
        }
    }
    async saveState() {
        try {
            if (window.electronAPI) {
                const result = await window.electronAPI.state.save(this.state.attendance);
                if (!result.success) {
                    throw new Error(result.error);
                }
            } else {
                localStorage.setItem('mdm-security-state', JSON.stringify(this.state.attendance));
            }

            console.log('State saved successfully');

        } catch (error) {
            console.error('Error saving state:', error);
        }
    }

    initializeUI() {
        this.updateButtonStates();
        this.updateTimeDisplay();
        this.updateStatus();
        this.initializeSampleActivities();
        this.updateDashboardStats();
        this.startClock();
    }
    showLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.remove('hidden');
            loadingScreen.style.display = 'flex';
        }
    }
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
        this.showMainContent();
    }
    showMainContent() {
        const elements = ['.header', '.sidebar', '.main-content'];
        elements.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                element.classList.add('loaded');
            }
        });
    }
    showSection(sectionId) {
        const sections = document.querySelectorAll('.content-section');
        sections.forEach(section => {
            section.classList.remove('active');
        });
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            this.updateNavigation(sectionId);
            if (sectionId === 'attendance') {
                this.initializeAttendanceTab();                setTimeout(() => {
                    this.forceRefreshAttendanceData();
                }, 100);
            }
        }
    }

    updateNavigation(activeSection) {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.classList.remove('active');
            const link = item.querySelector('a');
            if (link && link.getAttribute('href') === `#${activeSection}`) {
                item.classList.add('active');
            }
        });
    }

    updateButtonStates() {
        const checkInBtn = document.getElementById('checkInBtn');
        const checkOutBtn = document.getElementById('checkOutBtn');
        const breakBtn = document.getElementById('breakBtn');

        if (this.state.attendance.isCheckedIn) {
            if (checkInBtn) checkInBtn.disabled = true;
            if (checkOutBtn) checkOutBtn.disabled = false;
            if (breakBtn) {
                breakBtn.disabled = false;
                if (this.state.attendance.isOnBreak) {
                    breakBtn.innerHTML = '<i class="fas fa-play"></i> End Break';
                    breakBtn.className = 'btn btn-success';
                } else {
                    breakBtn.innerHTML = '<i class="fas fa-coffee"></i> Start Break';
                    breakBtn.className = 'btn btn-warning';
                }
            }
        } else {
            if (checkInBtn) checkInBtn.disabled = false;
            if (checkOutBtn) checkOutBtn.disabled = true;
            if (breakBtn) {
                breakBtn.disabled = true;
                breakBtn.innerHTML = '<i class="fas fa-coffee"></i> Break';
                breakBtn.className = 'btn btn-warning';
            }
        }
    }

    updateTimeDisplay() {
        const timeDisplay = document.getElementById('timeDisplay');
        if (timeDisplay) {
            if (this.state.attendance.isCheckedIn && this.state.attendance.startTime) {
                const duration = this.calculateDuration();
                timeDisplay.textContent = this.formatDuration(duration);
            } else {
                timeDisplay.textContent = '00:00:00';
            }
        }
    }

    updateStatus() {
        const statusDisplay = document.getElementById('statusDisplay');
        if (statusDisplay) {
            if (this.state.attendance.isCheckedIn) {
                if (this.state.attendance.isOnBreak) {
                    statusDisplay.textContent = 'On Break - Click "End Break" to resume';
                    statusDisplay.style.color = '#f59e0b';
                } else {
                    statusDisplay.textContent = 'Working - Click "Start Break" to take a break';
                    statusDisplay.style.color = '#10b981';
                }
            } else {
                statusDisplay.textContent = 'Ready to check in';
                statusDisplay.style.color = '#6b7280';
            }
        }
    }

    calculateDuration() {
        if (!this.state.attendance.startTime) return 0;

        const now = new Date();
        const startTime = new Date(this.state.attendance.startTime);
        const totalElapsedTime = now - startTime;
        let totalBreakTime = this.state.attendance.totalBreakTime;
        if (this.state.attendance.isOnBreak && this.state.attendance.breakStartTime) {
            const currentBreakDuration = now - new Date(this.state.attendance.breakStartTime);
            totalBreakTime += currentBreakDuration;
        }
        const workTime = Math.max(0, totalElapsedTime - totalBreakTime);

        return workTime;
    }
    formatDuration(milliseconds) {
        const safeMilliseconds = Math.max(0, milliseconds);
        const seconds = Math.floor(safeMilliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        const remainingSeconds = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    startClock() {
        this.timer = setInterval(() => {
            this.updateTimeDisplay();
            this.updateActivityTimes();
            this.updateDashboardStats();
            this.updateTodayRecordInRealTime();
            this.updateTodayInCalendar();
            this.updateCalendarAlways();
        }, 1000);
    }

    updateTodayRecordInRealTime() {
        if (this.state.attendance.isCheckedIn && this.state.attendance.startTime) {
            const today = new Date();
            const todayString = today.toISOString().split('T')[0];
            let todayRecord = this.state.attendanceRecords.find(record => record.date === todayString);
            if (todayRecord) {
                const startTime = new Date(this.state.attendance.startTime);
                const totalElapsedTime = (today - startTime) / (1000 * 60 * 60);
                let totalBreakTime = this.state.attendance.totalBreakTime / (1000 * 60 * 60);
                if (this.state.attendance.isOnBreak && this.state.attendance.breakStartTime) {
                    const currentBreakDuration = (today - new Date(this.state.attendance.breakStartTime)) / (1000 * 60 * 60);
                    totalBreakTime += currentBreakDuration;
                }
                const workTime = Math.max(0, totalElapsedTime - totalBreakTime);
                todayRecord.totalHours = workTime;
                todayRecord.breakTime = totalBreakTime;
                this.updateAttendanceTabIfVisible();
            }
        }
    }

    updateActivityTimes() {
        this.state.activities.forEach(activity => {
            activity.timeString = this.formatTime(activity.timestamp);
        });
        this.updateActivityList();
    }
    async handleCheckIn() {
        try {
            const checkInTime = new Date();
            this.state.attendance.isCheckedIn = true;
            this.state.attendance.startTime = checkInTime.toISOString();
            this.state.attendance.isOnBreak = false;
            this.state.attendance.breakStartTime = null;
            this.addActivity('checkin', 'Checked in', checkInTime);
            this.updateTodayAttendanceRecord('checkin', checkInTime);
            this.updateButtonStates();
            this.updateStatus();
            this.showNotification('Success', 'Checked in successfully!', 'success');
            await this.saveState();
        } catch (error) {
            console.error('Check in failed:', error);
            this.showNotification('Error', 'Failed to check in', 'error');
        }
    }
    async handleCheckOut() {
        try {
            const checkOutTime = new Date();
            this.state.attendance.isCheckedIn = false;
            this.state.attendance.isOnBreak = false;
            this.state.attendance.breakStartTime = null;
            console.log('Checkout - Updating attendance record...');
            this.addActivity('checkout', 'Checked out', checkOutTime);
            this.updateTodayAttendanceRecord('checkout', checkOutTime);
            console.log('Checkout - Updated attendance record:', this.state.attendanceRecords[0]);
            this.updateButtonStates();
            this.updateStatus();
            this.showNotification('Success', 'Checked out successfully!', 'success');
            await this.saveState();
        } catch (error) {
            console.error('Check out failed:', error);
            this.showNotification('Error', 'Failed to check out', 'error');
        }
    }
    async handleBreak() {
        try {
            if (this.state.attendance.isOnBreak) {
              
                const breakEndTime = new Date();
                const breakDuration = breakEndTime - new Date(this.state.attendance.breakStartTime);
                this.state.attendance.totalBreakTime += breakDuration;
                this.state.attendance.isOnBreak = false;
                this.state.attendance.breakStartTime = null;
                this.addActivity('break-end', 'Break ended', breakEndTime);
                this.updateTodayAttendanceRecord('break-end', breakEndTime);

                this.showNotification('Success', 'Break ended', 'success');
            } else {
                const breakStartTime = new Date();
                this.state.attendance.isOnBreak = true;
                this.state.attendance.breakStartTime = breakStartTime.toISOString();

                // Add to recent activity
                this.addActivity('break-start', 'Break started', breakStartTime);

                // Update today's attendance record
                this.updateTodayAttendanceRecord('break-start', breakStartTime);

                this.showNotification('Success', 'Break started', 'success');
            }

            this.updateButtonStates();
            this.updateStatus();

            await this.saveState();

        } catch (error) {
            console.error('Break handling failed:', error);
            this.showNotification('Error', 'Failed to handle break', 'error');
        }
    }

    showNotification(title, message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
        `;

        // Add to page
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'notification-container';
            document.body.appendChild(container);
        }

        container.appendChild(notification);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 3000);
    }

    handleInitializationError(error) {
        this.hideLoadingScreen();
        this.showNotification('Error', 'Failed to initialize application', 'error');
        console.error('Initialization error:', error);
    }

    // Activity Management Functions
    addActivity(type, title, timestamp) {
        const activity = {
            id: Date.now(),
            type: type,
            title: title,
            timestamp: timestamp,
            timeString: this.formatTime(timestamp),
            dateTimeString: this.formatDateTime(timestamp)
        };

        // Add to beginning of activities array
        this.state.activities.unshift(activity);

        // Keep only last 10 activities
        if (this.state.activities.length > 10) {
            this.state.activities = this.state.activities.slice(0, 10);
        }

        // Update the UI
        this.updateActivityList();
        this.updateDashboardStats();
    }

    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) {
            return 'Just now';
        } else if (minutes < 60) {
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else if (hours < 24) {
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else if (days < 7) {
            return `${days} day${days > 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }

    formatDateTime(date) {
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const isYesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString() === date.toDateString();

        if (isToday) {
            return `Today at ${date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            })}`;
        } else if (isYesterday) {
            return `Yesterday at ${date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            })}`;
        } else {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        }
    }

    getActivityIcon(type) {
        const icons = {
            'checkin': 'fas fa-sign-in-alt',
            'checkout': 'fas fa-sign-out-alt',
            'break-start': 'fas fa-coffee',
            'break-end': 'fas fa-play'
        };
        return icons[type] || 'fas fa-circle';
    }

    getActivityColor(type) {
        const colors = {
            'checkin': 'linear-gradient(135deg, #10b981, #059669)',
            'checkout': 'linear-gradient(135deg, #3b82f6, #2563eb)',
            'break-start': 'linear-gradient(135deg, #f59e0b, #d97706)',
            'break-end': 'linear-gradient(135deg, #10b981, #059669)'
        };
        return colors[type] || 'linear-gradient(135deg, #6b7280, #4b5563)';
    }

    updateActivityList() {
        const activityList = document.querySelector('.activity-list');
        if (!activityList) return;

        // Clear existing activities
        activityList.innerHTML = '';

        // Add activities from state
        this.state.activities.forEach(activity => {
            const activityItem = document.createElement('li');
            activityItem.className = 'activity-item';
            activityItem.innerHTML = `
                <div class="activity-icon" style="background: ${this.getActivityColor(activity.type)};">
                    <i class="${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-time">${activity.dateTimeString || activity.timeString}</div>
                </div>
            `;
            activityList.appendChild(activityItem);
        });

        // If no activities, show placeholder
        if (this.state.activities.length === 0) {
            const placeholder = document.createElement('li');
            placeholder.className = 'activity-item';
            placeholder.innerHTML = `
                <div class="activity-icon" style="background: linear-gradient(135deg, #6b7280, #4b5563);">
                    <i class="fas fa-info-circle"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">No recent activity</div>
                    <div class="activity-time">Start tracking your time to see activity here</div>
                </div>
            `;
            activityList.appendChild(placeholder);
        }
    }

    // Dashboard Statistics Functions
    updateDashboardStats() {
        this.updateHoursWorked();
        this.updateAttendanceStatus();
        this.updateBreakTime();
        this.updateProductivityScore();
    }

    updateHoursWorked() {
        const hoursWorkedElement = document.getElementById('totalHours');
        if (!hoursWorkedElement) return;

        if (this.state.attendance.isCheckedIn && this.state.attendance.startTime) {
            const startTime = new Date(this.state.attendance.startTime);
            const now = new Date();
            const totalElapsedTime = now - startTime;

            // Calculate total break time (completed breaks + current break if on break)
            let totalBreakTime = this.state.attendance.totalBreakTime;
            if (this.state.attendance.isOnBreak && this.state.attendance.breakStartTime) {
                const currentBreakDuration = now - new Date(this.state.attendance.breakStartTime);
                totalBreakTime += currentBreakDuration;
            }

            const workTime = Math.max(0, totalElapsedTime - totalBreakTime);

            const hours = Math.floor(workTime / (1000 * 60 * 60));
            const minutes = Math.floor((workTime % (1000 * 60 * 60)) / (1000 * 60));

            hoursWorkedElement.textContent = `${hours}h ${minutes}m`;
        } else {
            hoursWorkedElement.textContent = '0h 0m';
        }
    }

    updateAttendanceStatus() {
        const statusElement = document.getElementById('attendanceRate');
        if (!statusElement) return;

        if (this.state.attendance.isCheckedIn) {
            if (this.state.attendance.isOnBreak) {
                statusElement.textContent = 'On Break';
                statusElement.className = 'stat-value attendance-status status-break';
            } else {
                statusElement.textContent = 'Present';
                statusElement.className = 'stat-value attendance-status status-present';
            }
        } else {
            statusElement.textContent = 'Absent';
            statusElement.className = 'stat-value attendance-status status-absent';
        }
    }

    updateBreakTime() {
        const breakTimeElement = document.getElementById('breakTime');
        if (!breakTimeElement) return;

        let totalBreakTime = this.state.attendance.totalBreakTime;

        // Add current break time if on break
        if (this.state.attendance.isOnBreak && this.state.attendance.breakStartTime) {
            totalBreakTime += (new Date() - new Date(this.state.attendance.breakStartTime));
        }

        // Ensure break time is never negative
        totalBreakTime = Math.max(0, totalBreakTime);

        const hours = Math.floor(totalBreakTime / (1000 * 60 * 60));
        const minutes = Math.floor((totalBreakTime % (1000 * 60 * 60)) / (1000 * 60));

        breakTimeElement.textContent = `${hours}h ${minutes}m`;
    }

    updateProductivityScore() {
        const productivityElement = document.querySelector('.productivity-score');
        if (!productivityElement) return;

        if (this.state.attendance.isCheckedIn && this.state.attendance.startTime) {
            const startTime = new Date(this.state.attendance.startTime);
            const now = new Date();
            const totalElapsedTime = now - startTime;

            // Calculate total break time (completed breaks + current break if on break)
            let totalBreakTime = this.state.attendance.totalBreakTime;
            if (this.state.attendance.isOnBreak && this.state.attendance.breakStartTime) {
                const currentBreakDuration = now - new Date(this.state.attendance.breakStartTime);
                totalBreakTime += currentBreakDuration;
            }

            const workTime = Math.max(0, totalElapsedTime - totalBreakTime);

            // Calculate productivity score (work time / total time * 100)
            const productivity = totalElapsedTime > 0 ? Math.round((workTime / totalElapsedTime) * 100) : 0;
            productivityElement.textContent = `${productivity}%`;
        } else {
            productivityElement.textContent = '0%';
        }
    }

    // Initialize with some sample activities
    initializeSampleActivities() {
        const now = new Date();
        const sampleActivities = [
            {
                id: 1,
                type: 'checkin',
                title: 'Checked in',
                timestamp: new Date(now.getTime() - 8 * 60 * 60 * 1000), // 8 hours ago
                timeString: '8 hours ago',
                dateTimeString: this.formatDateTime(new Date(now.getTime() - 8 * 60 * 60 * 1000))
            },
            {
                id: 2,
                type: 'break-start',
                title: 'Break started',
                timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
                timeString: '4 hours ago',
                dateTimeString: this.formatDateTime(new Date(now.getTime() - 4 * 60 * 60 * 1000))
            },
            {
                id: 3,
                type: 'break-end',
                title: 'Break ended',
                timestamp: new Date(now.getTime() - 3.5 * 60 * 60 * 1000), // 3.5 hours ago
                timeString: '3.5 hours ago',
                dateTimeString: this.formatDateTime(new Date(now.getTime() - 3.5 * 60 * 60 * 1000))
            }
        ];

        this.state.activities = sampleActivities;
        this.updateActivityList();
    }

    // Attendance Tab Functions
    initializeAttendanceTab() {
        this.generateSampleAttendanceRecords();
        this.updateAttendanceOverview();
        this.generateAttendanceCalendar();
        this.updateAttendanceTable();
        this.setupAttendanceEventListeners();

        console.log('Attendance tab initialized with records:', this.state.attendanceRecords.slice(0, 3));
    }

    generateSampleAttendanceRecords() {
        const now = new Date();
        const records = [];
        const todayString = now.toISOString().split('T')[0];

        // Generate records for the last 30 days (excluding today)
        for (let i = 1; i <= 30; i++) {
            const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
            const dayOfWeek = date.getDay();

            // Skip weekends for most records
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                if (Math.random() > 0.7) { // 30% chance of weekend work
                    records.push(this.generateAttendanceRecord(date, 'partial'));
                }
                continue;
            }

            // Generate different types of attendance
            const rand = Math.random();
            if (rand > 0.9) {
                records.push(this.generateAttendanceRecord(date, 'absent'));
            } else if (rand > 0.8) {
                records.push(this.generateAttendanceRecord(date, 'partial'));
            } else {
                records.push(this.generateAttendanceRecord(date, 'present'));
            }
        }

        this.state.attendanceRecords = records.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Always create today's record, even if not checked in yet
        this.ensureTodayRecordExists();

        console.log('Generated sample records, total count:', this.state.attendanceRecords.length);
        console.log('Today string:', todayString);
        console.log('Today record exists:', this.state.attendanceRecords.find(r => r.date === todayString));
    }

    ensureTodayRecordExists() {
        const today = new Date();
        const todayString = today.toISOString().split('T')[0];

        // Check if today's record already exists
        let todayRecord = this.state.attendanceRecords.find(record => record.date === todayString);

        if (!todayRecord) {
            // Create new record for today
            todayRecord = {
                date: todayString,
                checkIn: null,
                checkOut: null,
                totalHours: 0,
                breakTime: 0,
                status: 'absent'
            };

            // Add to the beginning of the array
            this.state.attendanceRecords.unshift(todayRecord);
            console.log('Created today record:', todayRecord);
        } else {
            console.log('Today record already exists:', todayRecord);
        }

        // Sort records by date (newest first)
        this.state.attendanceRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    generateAttendanceRecord(date, status) {
        const checkInTime = new Date(date);
        checkInTime.setHours(9 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);

        let checkOutTime = null;
        let totalHours = 0;
        let breakTime = 0;

        if (status === 'present') {
            checkOutTime = new Date(checkInTime);
            checkOutTime.setHours(17 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);
            totalHours = (checkOutTime - checkInTime) / (1000 * 60 * 60);
            breakTime = Math.floor(Math.random() * 2) + 0.5; // 0.5 to 2.5 hours break
            totalHours -= breakTime;
        } else if (status === 'partial') {
            checkOutTime = new Date(checkInTime);
            checkOutTime.setHours(12 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 60), 0, 0);
            totalHours = (checkOutTime - checkInTime) / (1000 * 60 * 60);
            breakTime = Math.floor(Math.random() * 1) + 0.5; // 0.5 to 1.5 hours break
            totalHours -= breakTime;
        }

        return {
            date: date.toISOString().split('T')[0],
            checkIn: checkInTime.toTimeString().split(' ')[0].substring(0, 5),
            checkOut: checkOutTime ? checkOutTime.toTimeString().split(' ')[0].substring(0, 5) : null,
            totalHours: Math.max(0, totalHours),
            breakTime: breakTime,
            status: status
        };
    }

    updateAttendanceOverview() {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const monthlyRecords = this.state.attendanceRecords.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
        });

      
        const daysWorked = monthlyRecords.filter(r => r.status === 'present' || r.status === 'partial').length;
        const totalHours = monthlyRecords.reduce((sum, r) => sum + r.totalHours, 0);
        const totalBreakTime = monthlyRecords.reduce((sum, r) => sum + r.breakTime, 0);
        const attendanceRate = monthlyRecords.length > 0 ? Math.round((daysWorked / monthlyRecords.length) * 100) : 0;

    
        document.getElementById('totalDaysWorked').textContent = daysWorked;
        document.getElementById('totalHoursThisMonth').textContent = `${Math.floor(totalHours)}h ${Math.round((totalHours % 1) * 60)}m`;
        document.getElementById('attendancePercentage').textContent = `${attendanceRate}%`;
        document.getElementById('totalBreakTime').textContent = `${Math.floor(totalBreakTime)}h ${Math.round((totalBreakTime % 1) * 60)}m`;
    }

    generateAttendanceCalendar() {
        const calendar = document.getElementById('attendanceCalendar');
        if (!calendar) return;

        const month = this.state.currentCalendarMonth;
        const year = this.state.currentCalendarYear;

        calendar.innerHTML = '';

        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            const header = document.createElement('div');
            header.className = 'calendar-day-header';
            header.textContent = day;
            header.style.cssText = 'background: #f3f4f6; padding: 0.5rem; text-align: center; font-weight: 600; color: #374151;';
            calendar.appendChild(header);
        });

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        for (let i = 0; i < startingDayOfWeek; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day other-month';
            calendar.appendChild(emptyDay);
        }


        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            const currentDate = new Date(year, month, day);
            const dateString = currentDate.toISOString().split('T')[0];

            dayElement.className = 'calendar-day';

            const today = new Date();
            if (currentDate.toDateString() === today.toDateString()) {
                dayElement.classList.add('today');
            }

            const record = this.state.attendanceRecords.find(r => r.date === dateString);

            const dayNumber = document.createElement('div');
            dayNumber.className = 'day-number';
            dayNumber.textContent = day;
            dayElement.appendChild(dayNumber);

            const isPastDay = currentDate < today;
            const isToday = currentDate.toDateString() === today.toDateString();
            const isFutureDay = currentDate > today;

            if (isFutureDay) {
                dayElement.classList.add('future-day');
            } else if (record) {
                if (isToday) {
                    if (this.state.attendance.isCheckedIn) {
                        if (this.state.attendance.isOnBreak) {
                            dayElement.classList.add('partial');
                            const dayStatus = document.createElement('div');
                            dayStatus.className = 'day-status partial';
                            dayStatus.textContent = 'On Break';
                            dayElement.appendChild(dayStatus);
                        } else {
                            dayElement.classList.add('worked');
                            const dayStatus = document.createElement('div');
                            dayStatus.className = 'day-status worked';
                            dayStatus.textContent = 'Working';
                            dayElement.appendChild(dayStatus);
                        }
                    } else {
                        dayElement.classList.add('partial');
                        const dayStatus = document.createElement('div');
                        dayStatus.className = 'day-status partial';
                        dayStatus.textContent = 'Checked Out';
                        dayElement.appendChild(dayStatus);
                    }
                } else {
                    dayElement.classList.add(record.status);
                    const dayStatus = document.createElement('div');
                    dayStatus.className = `day-status ${record.status}`;
                    dayStatus.textContent = record.status === 'present' ? 'Full' :
                        record.status === 'partial' ? 'Partial' : 'Absent';
                    dayElement.appendChild(dayStatus);
                }
            } else {
                if (isToday) {
                    dayElement.classList.add('absent');
                    const dayStatus = document.createElement('div');
                    dayStatus.className = 'day-status absent';
                    dayStatus.textContent = 'Not Started';
                    dayElement.appendChild(dayStatus);
                } else if (isPastDay) {
                    dayElement.classList.add('absent');
                    const dayStatus = document.createElement('div');
                    dayStatus.className = 'day-status absent';
                    dayStatus.textContent = 'Absent';
                    dayElement.appendChild(dayStatus);
                }
            }

            if (isToday && !record && this.state.attendance.isCheckedIn === false && this.state.attendance.startTime) {
                dayElement.classList.remove('absent');
                dayElement.classList.add('partial');
                const dayStatus = document.createElement('div');
                dayStatus.className = 'day-status partial';
                dayStatus.textContent = 'Checked Out';
                dayElement.appendChild(dayStatus);
            }

            calendar.appendChild(dayElement);
        }

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;
    }

    updateAttendanceTable() {
        const tbody = document.getElementById('attendanceTableBody');
        if (!tbody) {
            console.error('Attendance table body not found!');
            return;
        }

        console.log('=== UPDATING ATTENDANCE TABLE ===');
        console.log('Total records in state:', this.state.attendanceRecords.length);
        console.log('All records:', this.state.attendanceRecords);

        tbody.innerHTML = '';

        const recentRecords = [...this.state.attendanceRecords]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 20);

        console.log('Recent records for table:', recentRecords);

        if (recentRecords.length === 0) {
            console.warn('No records to display in attendance table!');
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="6" style="text-align: center; color: #6b7280;">No attendance records found</td>';
            tbody.appendChild(row);
            return;
        }

        recentRecords.forEach((record, index) => {
            const row = document.createElement('tr');

            const date = new Date(record.date);
            const formattedDate = date.toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            console.log(`Adding row ${index + 1}:`, {
                date: record.date,
                formattedDate,
                checkIn: record.checkIn,
                checkOut: record.checkOut,
                totalHours: record.totalHours,
                status: record.status
            });

            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>${record.checkIn || '-'}</td>
                <td>${record.checkOut || '-'}</td>
                <td>${record.totalHours.toFixed(1)}h</td>
                <td>${record.breakTime.toFixed(1)}h</td>
                <td><span class="status-badge ${record.status}">${record.status.charAt(0).toUpperCase() + record.status.slice(1)}</span></td>
            `;

            tbody.appendChild(row);
        });

        console.log('=== ATTENDANCE TABLE UPDATE COMPLETE ===');
    }

    setupAttendanceEventListeners() {
        document.getElementById('prevMonth')?.addEventListener('click', () => {
            this.state.currentCalendarMonth--;
            if (this.state.currentCalendarMonth < 0) {
                this.state.currentCalendarMonth = 11;
                this.state.currentCalendarYear--;
            }
            this.generateAttendanceCalendar();
        });

        document.getElementById('nextMonth')?.addEventListener('click', () => {
            this.state.currentCalendarMonth++;
            if (this.state.currentCalendarMonth > 11) {
                this.state.currentCalendarMonth = 0;
                this.state.currentCalendarYear++;
            }
            this.generateAttendanceCalendar();
        });

        // Filter change
        document.getElementById('attendanceFilter')?.addEventListener('change', (e) => {
            this.filterAttendanceRecords(e.target.value);
        });

        // Export button
        document.getElementById('exportAttendance')?.addEventListener('click', () => {
            this.exportAttendanceData();
        });
    }

    filterAttendanceRecords(filter) {
        const tbody = document.getElementById('attendanceTableBody');
        if (!tbody) return;

        let filteredRecords = [...this.state.attendanceRecords];
        const now = new Date();

        switch (filter) {
            case 'this-week':
                const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
                filteredRecords = filteredRecords.filter(r => new Date(r.date) >= weekStart);
                break;
            case 'this-month':
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                filteredRecords = filteredRecords.filter(r => new Date(r.date) >= monthStart);
                break;
            case 'last-month':
                const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
                filteredRecords = filteredRecords.filter(r => {
                    const recordDate = new Date(r.date);
                    return recordDate >= lastMonthStart && recordDate <= lastMonthEnd;
                });
                break;
        }

        tbody.innerHTML = '';
        filteredRecords.slice(0, 20).forEach(record => {
            const row = document.createElement('tr');

            const date = new Date(record.date);
            const formattedDate = date.toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>${record.checkIn}</td>
                <td>${record.checkOut || '-'}</td>
                <td>${record.totalHours.toFixed(1)}h</td>
                <td>${record.breakTime.toFixed(1)}h</td>
                <td><span class="status-badge ${record.status}">${record.status.charAt(0).toUpperCase() + record.status.slice(1)}</span></td>
            `;

            tbody.appendChild(row);
        });
    }

    exportAttendanceData() {
        const csvContent = this.generateCSV();
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.showNotification('Success', 'Attendance data exported successfully!', 'success');
    }

    generateCSV() {
        const headers = ['Date', 'Check In', 'Check Out', 'Total Hours', 'Break Time', 'Status'];
        const rows = this.state.attendanceRecords.map(record => [
            record.date,
            record.checkIn,
            record.checkOut || '',
            record.totalHours.toFixed(1),
            record.breakTime.toFixed(1),
            record.status
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    updateTodayAttendanceRecord(action, timestamp) {
        const today = new Date();
        const todayString = today.toISOString().split('T')[0];

        console.log(`Updating today's record for action: ${action}, date: ${todayString}`);
        this.ensureTodayRecordExists();
        let todayRecord = this.state.attendanceRecords.find(record => record.date === todayString);
        if (!todayRecord) {
            console.error('Today record not found after ensuring it exists!');
            return;
        }
        console.log('Found existing record for today:', todayRecord);
        switch (action) {
            case 'checkin':
                todayRecord.checkIn = timestamp.toTimeString().split(' ')[0].substring(0, 5);
                todayRecord.status = 'present';
                console.log('Updated check-in:', todayRecord.checkIn);
                break;
            case 'checkout':
                todayRecord.checkOut = timestamp.toTimeString().split(' ')[0].substring(0, 5);
                if (todayRecord.checkIn) {
                    const checkInTime = new Date(`${todayString}T${todayRecord.checkIn}:00`);
                    const totalElapsedTime = (timestamp - checkInTime) / (1000 * 60 * 60);
                    const totalBreakTime = this.state.attendance.totalBreakTime / (1000 * 60 * 60);
                    todayRecord.totalHours = Math.max(0, totalElapsedTime - totalBreakTime);
                    todayRecord.breakTime = totalBreakTime;
                    if (todayRecord.totalHours >= 7) {
                        todayRecord.status = 'present';
                    } else if (todayRecord.totalHours >= 4) {
                        todayRecord.status = 'partial';
                    } else {
                        todayRecord.status = 'partial';
                    }
                }
                console.log('Updated check-out:', todayRecord.checkOut, 'Total hours:', todayRecord.totalHours, 'Status:', todayRecord.status);
                break;
            case 'break-start':
                break;
            case 'break-end':
                todayRecord.breakTime = this.state.attendance.totalBreakTime / (1000 * 60 * 60);
                break;
        }
        this.state.attendanceRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        console.log('Final attendance records after update:', this.state.attendanceRecords.slice(0, 3));
        console.log('Today record in final array:', this.state.attendanceRecords.find(r => r.date === todayString));
        this.forceRefreshAttendanceData();
        this.updateTodayInCalendar();
    }
    updateAttendanceTabIfVisible() {
        const attendanceSection = document.getElementById('attendance');
        if (attendanceSection && attendanceSection.classList.contains('active')) {
            this.updateAttendanceOverview();
            this.generateAttendanceCalendar();
            this.updateAttendanceTable();
        }
    }
    updateCalendarAlways() {
        const attendanceSection = document.getElementById('attendance');
        if (attendanceSection) {
            console.log('=== UPDATING CALENDAR ALWAYS ===');
            console.log('Current attendance records count:', this.state.attendanceRecords.length);

            this.updateAttendanceOverview();
            this.generateAttendanceCalendar();
            this.updateAttendanceTable();

            console.log('=== CALENDAR ALWAYS UPDATE COMPLETE ===');
        }
    }
    forceRefreshAttendanceData() {
        console.log('=== FORCE REFRESHING ATTENDANCE DATA ===');
        this.ensureTodayRecordExists();
        this.updateAttendanceOverview();
        this.generateAttendanceCalendar();
        this.updateAttendanceTable();
        console.log('=== FORCE REFRESH COMPLETE ===');
    }
    updateTodayInCalendar() {
        const today = new Date();
        const todayString = today.toISOString().split('T')[0];
        const currentMonth = this.state.currentCalendarMonth;
        const currentYear = this.state.currentCalendarYear;
        console.log('=== UPDATE TODAY IN CALENDAR ===');
        console.log('Today string:', todayString);
        console.log('Current month:', currentMonth, 'Current year:', currentYear);
        console.log('Is checked in:', this.state.attendance.isCheckedIn);
        console.log('Start time:', this.state.attendance.startTime);
        console.log('Today record exists:', !!this.state.attendanceRecords.find(record => record.date === todayString));
        const calendar = document.getElementById('attendanceCalendar');
        if (!calendar) return;
        if (today.getMonth() === currentMonth && today.getFullYear() === currentYear) {
            const calendarDays = calendar.querySelectorAll('.calendar-day');
            calendarDays.forEach(dayElement => {
                const dayNumber = dayElement.querySelector('.day-number');
                if (dayNumber && dayNumber.textContent == today.getDate()) {
                    dayElement.classList.remove('worked', 'partial', 'absent', 'today');
                    dayElement.classList.add('today');
                    const todayRecord = this.state.attendanceRecords.find(record => record.date === todayString);
                    if (todayRecord) {
                        if (this.state.attendance.isCheckedIn) {
                            if (this.state.attendance.isOnBreak) {
                                dayElement.classList.add('partial');
                                this.updateDayStatus(dayElement, 'On Break');
                            } else {
                                dayElement.classList.add('worked');
                                this.updateDayStatus(dayElement, 'Working');
                            }
                        } else {
                            if (todayRecord.checkIn) {
                                dayElement.classList.add('partial');
                                this.updateDayStatus(dayElement, 'Checked Out');
                            } else {
                                dayElement.classList.add('absent');
                                this.updateDayStatus(dayElement, 'Not Started');
                            }
                        }
                    } else {
                        if (this.state.attendance.startTime && !this.state.attendance.isCheckedIn) {
                            dayElement.classList.add('partial');
                            this.updateDayStatus(dayElement, 'Checked Out');
                        } else {
                            dayElement.classList.add('absent');
                            this.updateDayStatus(dayElement, 'Not Started');
                        }
                    }
                }
            });
        }
    }
    updateDayStatus(dayElement, statusText) {
        const existingStatus = dayElement.querySelector('.day-status');
        if (existingStatus) {
            existingStatus.remove();
        }
        const dayStatus = document.createElement('div');
        dayStatus.className = 'day-status';
        if (statusText === 'Working' || statusText === 'Full') {
            dayStatus.classList.add('worked');
        } else if (statusText === 'On Break' || statusText === 'Partial' || statusText === 'Checked Out') {
            dayStatus.classList.add('partial');
        } else {
            dayStatus.classList.add('absent');
        }

        dayStatus.textContent = statusText;
        dayElement.appendChild(dayStatus);
    }
}
document.addEventListener('DOMContentLoaded', async () => {
    const app = new SimpleMDMApp();
    await app.initialize();
    window.mdmApp = app;
    window.debugAttendance = () => {
        console.log('=== ATTENDANCE DEBUG INFO ===');
        console.log('App state:', app.state);
        console.log('Attendance records:', app.state.attendanceRecords);
        console.log('Today string:', new Date().toISOString().split('T')[0]);
        console.log('Today record:', app.state.attendanceRecords.find(r => r.date === new Date().toISOString().split('T')[0]));
        console.log('Table element exists:', !!document.getElementById('attendanceTableBody'));
        console.log('Calendar element exists:', !!document.getElementById('attendanceCalendar'));
    };

    window.forceRefreshAttendance = () => {
        console.log('=== FORCE REFRESHING ATTENDANCE ===');
        app.forceRefreshAttendanceData();
    };
});


function updateTime() {
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    };
    document.getElementById('currentTime').textContent = now.toLocaleString('en-US', options);
}
setInterval(updateTime, 1000);
updateTime();

function handleSearch() {
    const searchInput = document.getElementById('dashboardSearch');
    const query = searchInput.value.trim();

    if (!query) {
        alert("Please enter a search term");
        return;
    }

   
    document.querySelectorAll('.search-highlight').forEach(el => {
        const parent = el.parentNode;
        parent.replaceChild(document.createTextNode(el.textContent), el);
    });

    const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div');
    const regex = new RegExp(`\\b${query}\\b`, 'gi'); 

    let firstHighlight = null;

    elements.forEach(el => {
        if (regex.test(el.textContent)) {
            el.innerHTML = el.innerHTML.replace(regex, match => {
                const highlighted = `<span class="search-highlight" style="background-color: yellow;">${match}</span>`;
                if (!firstHighlight) firstHighlight = highlighted;
                return highlighted;
            });
        }
    });

    const firstEl = document.querySelector('.search-highlight');
    if (firstEl) {
        firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
        alert(`No results found for "${query}"`);
    }
}

document.getElementById("searchBtn").addEventListener("click", handleSearch);

document.getElementById("dashboardSearch").addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
        handleSearch();
    }
});

function getGreeting() {
    const now = new Date();
    const hours = now.getHours();

    if (hours < 12) return "Good morning";
    else if (hours < 18) return "Good afternoon";
    else return "Good evening";
}


const userName = localStorage.getItem("username");


if (userName) {
    document.getElementById("FullName").textContent = `${getGreeting()}, ${userName} 👋`;
} else {
    document.getElementById("FullName").textContent = `${getGreeting()}, Guest 👋`;
}



const employeeData = JSON.parse(localStorage.getItem('employeeData'));

if (employeeData) {

    if (document.getElementById('userName')) {
        document.getElementById('userName').textContent = employeeData.employeeName || "Guest";
    }
    if (document.getElementById('userRole')) {
        document.getElementById('userRole').textContent = employeeData.designation || "Employee";
    }


    if (document.getElementById('employeeName')) {
        document.getElementById('employeeName').textContent = employeeData.employeeName || "Guest";
    }
    if (document.getElementById('designation')) {
        document.getElementById('designation').textContent = employeeData.designation || "Employee";
    }
} else {

    if (document.getElementById('userName')) {
        document.getElementById('userName').textContent = localStorage.getItem("username") || "Guest";
    }
    if (document.getElementById('userRole')) {
        document.getElementById('userRole').textContent = "Employee";
    }

    if (document.getElementById('employeeName')) {
        document.getElementById('employeeName').textContent = "Guest";
    }
    if (document.getElementById('designation')) {
        document.getElementById('designation').textContent = "Employee";
    }
}
document.addEventListener('DOMContentLoaded', function() {

    const minimizeBtn = document.getElementById('minimizeBtn');
    const maximizeBtn = document.getElementById('maximizeBtn');
    const closeBtn = document.getElementById('closeBtn');

    const dashboard = document.querySelector('.dashboard') || document.querySelector('.main-content');

    const originalStyles = {
        width: dashboard.offsetWidth + 'px',
        height: dashboard.offsetHeight + 'px',
        position: dashboard.style.position || 'relative',
        top: dashboard.style.top || '0',
        left: dashboard.style.left || '0',
        margin: dashboard.style.margin || '',
        padding: dashboard.style.padding || '',
        zIndex: dashboard.style.zIndex || '',
        overflow: dashboard.style.overflow || '',
        display: dashboard.style.display || 'block'
    };

    dashboard.style.transition = 'all 0.3s ease';

    
    let isMinimized = false;
    let isMaximized = false;
    let isClosed = false;

    minimizeBtn?.addEventListener('click', () => {
        if (!isMinimized) {
            dashboard.style.display = 'none';
            minimizeBtn.querySelector('i').className = 'fas fa-window-restore';
            minimizeBtn.title = 'Restore';
            isMinimized = true;
        } else {
            dashboard.style.display = 'block';
            minimizeBtn.querySelector('i').className = 'fas fa-minus';
            minimizeBtn.title = 'Minimize';
            isMinimized = false;
        }
    });

    maximizeBtn?.addEventListener('click', () => {
        if (!isMaximized) {
            dashboard.style.position = 'fixed';
            dashboard.style.top = '0';
            dashboard.style.left = '0';
            dashboard.style.width = '100vw';
            dashboard.style.height = '100vh';
            dashboard.style.margin = '0';
            dashboard.style.padding = '0';
            dashboard.style.zIndex = '10000';
            dashboard.style.overflow = 'auto';
            maximizeBtn.querySelector('i').className = 'fas fa-window-restore';
            maximizeBtn.title = 'Restore';
            isMaximized = true;
        } else {
            Object.keys(originalStyles).forEach(prop => {
                dashboard.style[prop] = originalStyles[prop];
            });
            maximizeBtn.querySelector('i').className = 'fas fa-square';
            maximizeBtn.title = 'Maximize';
            isMaximized = false;
        }
    });

    closeBtn?.addEventListener('click', () => {
        dashboard.style.display = 'none';
        isClosed = true;
        setTimeout(() => {
            if (confirm('Dashboard was closed. Restore it?')) {
                dashboard.style.display = 'block';
                isClosed = false;
            }
        }, 2000);
    });

    document.querySelector('.header')?.addEventListener('dblclick', () => {
        maximizeBtn?.click();
    });

    document.addEventListener('keydown', (e) => {
        if ((e.altKey && e.key === 'F4') || (e.ctrlKey && e.key === 'w')) closeBtn?.click();
        if (e.key === 'F11') maximizeBtn?.click();
        if (e.ctrlKey && e.key === 'm') minimizeBtn?.click();
    });

    [minimizeBtn, maximizeBtn, closeBtn].forEach(btn => {
        btn?.addEventListener('mouseenter', () => btn.style.backgroundColor = 'rgba(255,255,255,0.2)');
        btn?.addEventListener('mouseleave', () => btn.style.backgroundColor = '');
        btn?.addEventListener('dragstart', e => e.preventDefault());
    });

});

    document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn.addEventListener('click', function() {
        alert("You have been logged out!");
        localStorage.removeItem('userData'); 
        window.location.href = "login.html"; 
    });
});
document.querySelectorAll('.settings-cards-wrapper').forEach(wrapper => {
    const editBtns = wrapper.querySelectorAll('.edit-btn');
    const saveBtns = wrapper.querySelectorAll('.save-btn');

    editBtns.forEach((editBtn, index) => {
        editBtn.addEventListener('click', () => {
            const form = editBtn.closest('.settings-form');
            form.querySelectorAll('.form-control').forEach(input => input.removeAttribute('readonly'));
            form.querySelector('.save-btn').removeAttribute('disabled');
        });
    });

    saveBtns.forEach(saveBtn => {
        saveBtn.addEventListener('click', e => {
            e.preventDefault();
            const form = saveBtn.closest('.settings-form');
            alert('Changes saved!');
            form.querySelectorAll('.form-control').forEach(input => input.setAttribute('readonly', true));
            saveBtn.setAttribute('disabled', true);
        });
    });
});
document.querySelectorAll(".settings-card").forEach(card => {
    const editBtn = card.querySelector(".edit-btn");
    const saveBtn = card.querySelector(".save-btn");
    const inputs = card.querySelectorAll("input, select");

    editBtn.addEventListener("click", () => {
        inputs.forEach(input => {
            if (input.tagName === "INPUT") {
                input.removeAttribute("readonly");
            }
            if (input.tagName === "SELECT") {
                input.removeAttribute("disabled");
            }
        });
        saveBtn.removeAttribute("disabled");
        editBtn.setAttribute("disabled", true);
    });

    saveBtn.addEventListener("click", (e) => {
        e.preventDefault();
        inputs.forEach(input => {
            if (input.tagName === "INPUT") {
                input.setAttribute("readonly", true);
            }
            if (input.tagName === "SELECT") {
                input.setAttribute("disabled", true);
            }
        });
        saveBtn.setAttribute("disabled", true);
        editBtn.removeAttribute("disabled");
    });
});