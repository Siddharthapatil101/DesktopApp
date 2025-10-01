/**
 * Professional UI management with proper separation of concerns
 */

class UIManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.currentSection = 'dashboard';
        this.theme = 'light';
        this.elements = new Map();
    }

    async initialize() {
        try {
            this.cacheElements();
            this.setupEventListeners();
            this.initializeUI();
            console.log('UI Manager initialized');
        } catch (error) {
            console.error('Failed to initialize UI Manager:', error);
            throw error;
        }
    }

    cacheElements() {
        // Cache frequently used elements
        this.elements.set('loadingScreen', document.getElementById('loadingScreen'));
        this.elements.set('header', document.querySelector('.header'));
        this.elements.set('sidebar', document.querySelector('.sidebar'));
        this.elements.set('mainContent', document.querySelector('.main-content'));
        this.elements.set('dashboard', document.getElementById('dashboard'));
        this.elements.set('checkInBtn', document.getElementById('checkInBtn'));
        this.elements.set('checkOutBtn', document.getElementById('checkOutBtn'));
        this.elements.set('breakBtn', document.getElementById('breakBtn'));
        this.elements.set('timeDisplay', document.getElementById('timeDisplay'));
        this.elements.set('statusDisplay', document.getElementById('statusDisplay'));
    }

    setupEventListeners() {
        // Navigation events
        this.eventBus.on('ui:navigation', this.handleNavigation.bind(this));
        this.eventBus.on('ui:theme-changed', this.applyTheme.bind(this));
        
        // Time tracking events
        this.eventBus.on('time:display-update', this.updateTimeDisplay.bind(this));
        this.eventBus.on('attendance:checked-in', this.onCheckIn.bind(this));
        this.eventBus.on('attendance:checked-out', this.onCheckOut.bind(this));
        this.eventBus.on('attendance:break-started', this.onBreakStart.bind(this));
        this.eventBus.on('attendance:break-ended', this.onBreakEnd.bind(this));
        
        // State events
        this.eventBus.on('state:changed', this.updateUI.bind(this));
        this.eventBus.on('state:loaded', this.updateUI.bind(this));
        
        // Setup button event listeners
        this.setupButtonListeners();
    }

    setupButtonListeners() {
        const checkInBtn = this.elements.get('checkInBtn');
        const checkOutBtn = this.elements.get('checkOutBtn');
        const breakBtn = this.elements.get('breakBtn');

        if (checkInBtn) {
            checkInBtn.addEventListener('click', () => {
                this.eventBus.emit('time:checkin');
            });
        }

        if (checkOutBtn) {
            checkOutBtn.addEventListener('click', () => {
                this.eventBus.emit('time:checkout');
            });
        }

        if (breakBtn) {
            breakBtn.addEventListener('click', () => {
                this.eventBus.emit('time:break-start');
            });
        }
    }

    initializeUI() {
        // Set initial theme
        this.applyTheme(this.theme);
        
        // Show dashboard by default
        this.showSection('dashboard');
        
        // Initialize time display
        this.updateTimeDisplay({ duration: '00:00:00' });
        
        // Initialize status
        this.updateStatus('Ready to check in');
    }

    handleNavigation(data) {
        const { section } = data;
        if (section && section !== this.currentSection) {
            this.showSection(section);
        }
    }

    showSection(sectionId) {
        // Hide all sections
        const sections = document.querySelectorAll('.content-section');
        sections.forEach(section => {
            section.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = sectionId;
            
            // Update navigation
            this.updateNavigation(sectionId);
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

    updateUI(state) {
        if (!state) return;

        // Update attendance status
        if (state.attendance) {
            this.updateAttendanceUI(state.attendance);
        }

        // Update user info
        if (state.user) {
            this.updateUserUI(state.user);
        }

        // Update statistics
        if (state.statistics) {
            this.updateStatisticsUI(state.statistics);
        }
    }

    updateAttendanceUI(attendance) {
        const checkInBtn = this.elements.get('checkInBtn');
        const checkOutBtn = this.elements.get('checkOutBtn');
        const breakBtn = this.elements.get('breakBtn');

        if (attendance.isCheckedIn) {
            if (checkInBtn) checkInBtn.disabled = true;
            if (checkOutBtn) checkOutBtn.disabled = false;
            if (breakBtn) breakBtn.disabled = attendance.isOnBreak;
            
            this.updateStatus(attendance.isOnBreak ? 'On break' : 'Checked in');
        } else {
            if (checkInBtn) checkInBtn.disabled = false;
            if (checkOutBtn) checkOutBtn.disabled = true;
            if (breakBtn) breakBtn.disabled = true;
            
            this.updateStatus('Ready to check in');
        }
    }

    updateUserUI(user) {
        const nameElement = document.getElementById('FullName');
        if (nameElement && user.name) {
            nameElement.textContent = `Good ${this.getGreeting()}, ${user.name}👋`;
        }
    }

    updateStatisticsUI(statistics) {
        // Update statistics displays
        const elements = {
            totalHours: document.getElementById('totalHours'),
            weeklyHours: document.getElementById('weeklyHours'),
            monthlyHours: document.getElementById('monthlyHours'),
            attendanceRate: document.getElementById('attendanceRate')
        };

        Object.entries(elements).forEach(([key, element]) => {
            if (element && statistics[key] !== undefined) {
                element.textContent = statistics[key];
            }
        });
    }

    updateTimeDisplay(data) {
        const timeDisplay = this.elements.get('timeDisplay');
        if (timeDisplay && data.duration) {
            timeDisplay.textContent = data.duration;
        }
    }

    updateStatus(status) {
        const statusDisplay = this.elements.get('statusDisplay');
        if (statusDisplay) {
            statusDisplay.textContent = status;
        }
    }

    applyTheme(theme) {
        this.theme = theme;
        document.body.className = `theme-${theme}`;
        
        // Update theme toggle button
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
        }
    }

    showError(title, message) {
        // Create error notification
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <h4>${title}</h4>
                <p>${message}</p>
                <button onclick="this.parentElement.parentElement.remove()">Close</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    showSuccess(message) {
        // Create success notification
        const notification = document.createElement('div');
        notification.className = 'success-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <p>${message}</p>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 3000);
    }

    getGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return 'morning';
        if (hour < 17) return 'afternoon';
        return 'evening';
    }

    // Event handlers
    onCheckIn(data) {
        this.showSuccess('Checked in successfully!');
        this.updateStatus('Checked in');
    }

    onCheckOut(data) {
        this.showSuccess('Checked out successfully!');
        this.updateStatus('Ready to check in');
    }

    onBreakStart(data) {
        this.showSuccess('Break started');
        this.updateStatus('On break');
    }

    onBreakEnd(data) {
        this.showSuccess('Break ended');
        this.updateStatus('Checked in');
    }
}

export { UIManager };
