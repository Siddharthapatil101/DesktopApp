const { ipcRenderer } = require('electron');

// Global variables
let timer = null;
let startTime = null;
let breakStartTime = null;
let totalBreakTime = 0;
let isCheckedIn = false;
let isOnBreak = false;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    initializeApp();
    setupEventListeners();
    startClock();
    updateGreeting();
});

function initializeApp() {
    // Restore previous state if exists
    ipcRenderer.invoke('get-saved-state').then(savedState => {
        if (savedState && savedState.data) {
            isCheckedIn = savedState.data.isCheckedIn;
            startTime = savedState.data.startTime ? new Date(savedState.data.startTime) : null;
            totalBreakTime = savedState.data.totalBreakTime || 0;
            
            if (isCheckedIn) {
                startTimer();
            }
        }
        updateButtonStates();
        updateStatistics();
    }).catch(console.error);
}

function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Navigation
    setupNavigation();
    
    // Time tracking buttons
    const checkInBtn = document.querySelector('.btn-checkin');
    const breakBtn = document.querySelector('.btn-break');
    const checkoutBtn = document.querySelector('.btn-checkout');
    
    if (checkInBtn) {
        checkInBtn.addEventListener('click', handleCheckIn);
    }
    
    if (breakBtn) {
        breakBtn.addEventListener('click', handleBreak);
    }
    
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', handleCheckOut);
    }
    
    // Request leave button
    const requestLeaveBtn = document.querySelector('.btn-request-leave');
    if (requestLeaveBtn) {
        requestLeaveBtn.addEventListener('click', () => {
            switchTab('request-timeoff');
        });
    }
    
    // Quick action buttons
    const actionBtns = document.querySelectorAll('.action-btn');
    actionBtns.forEach(btn => {
        btn.addEventListener('click', handleQuickAction);
    });
    
    // Time off form
    const timeoffForm = document.querySelector('.timeoff-form');
    if (timeoffForm) {
        timeoffForm.addEventListener('submit', handleTimeOffRequest);
    }
    
    // Overview tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', handleTabSwitch);
    });
    
    // Settings functionality
    setupSettingsEventListeners();
    
    // Dashboard functionality
    setupDashboardEventListeners();
    
    // Initialize dashboard state
    updateButtonStates();
    updateStatistics();
    updateLeaveBalance();
    
    // Load dashboard data
    loadDashboardData();
}

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all links
            navLinks.forEach(l => l.parentElement.classList.remove('active'));
            
            // Add active class to clicked link
            link.parentElement.classList.add('active');
            
            const targetId = link.getAttribute('href').substring(1);
            switchTab(targetId);
        });
    });
}

function switchTab(targetId) {
    // Hide all content sections
    const contentSections = document.querySelectorAll('.content-section');
    contentSections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Show target section
    const targetSection = document.getElementById(targetId);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Initialize specific tab content if needed
        if (targetId === 'timeoff') {
            initializeTimeOff();
        } else if (targetId === 'request-timeoff') {
            initializeTimeOffForm();
        }
    }
}

function updateGreeting() {
    const greeting = document.querySelector('.greeting-section h1');
    if (greeting) {
        const hour = new Date().getHours();
        let timeOfDay = 'morning';
        
        if (hour >= 12 && hour < 17) {
            timeOfDay = 'afternoon';
        } else if (hour >= 17) {
            timeOfDay = 'evening';
        }
        
        greeting.textContent = `Good ${timeOfDay}, John! 👋`;
    }
}

function startTimer() {
    if (!timer) {
        timer = setInterval(updateTimer, 1000);
    }
}

function stopTimer() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

function updateTimer() {
    if (startTime && isCheckedIn) {
        const now = new Date();
        let elapsed = now - startTime;
        
        if (isOnBreak && breakStartTime) {
            elapsed -= (now - breakStartTime);
        }
        
        const formattedTime = formatTime(elapsed);
        updateTimerDisplay(formattedTime);
        
        // Update today's work in summary cards
        updateTodayWork(elapsed);
    } else {
        updateTimerDisplay('00:00:00');
        updateTodayWork(0);
    }
}

function formatTime(ms) {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function updateTimerDisplay(time) {
    const timerElement = document.getElementById('workTimer');
    if (timerElement) {
        timerElement.textContent = time;
    }
}

function updateTodayWork(elapsed) {
    const todayWorkCard = document.querySelector('.summary-card.today-work .card-content h2');
    if (todayWorkCard) {
        const hours = Math.floor(elapsed / (1000 * 60 * 60));
        const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
        todayWorkCard.textContent = `${hours}h ${minutes}m`;
    }
}

function updateStatistics() {
    // Update attendance rate
    const attendanceCard = document.querySelector('.summary-card.attendance-rate .card-content h2');
    if (attendanceCard) {
        attendanceCard.textContent = '95%';
    }
    
    // Update this week hours
    const thisWeekCard = document.querySelector('.summary-card.this-week .card-content h2');
    if (thisWeekCard) {
        thisWeekCard.textContent = '32h';
    }
    
    // Update days available
    const daysAvailableCard = document.querySelector('.summary-card.days-available .card-content h2');
    if (daysAvailableCard) {
        daysAvailableCard.textContent = '15';
    }
}

function updateButtonStates() {
    const checkInBtn = document.querySelector('.btn-checkin');
    const breakBtn = document.querySelector('.btn-break');
    const checkoutBtn = document.querySelector('.btn-checkout');
    const statusBadge = document.querySelector('.status-badge.working');
    
    if (isCheckedIn) {
        if (checkInBtn) checkInBtn.disabled = true;
        if (breakBtn) breakBtn.disabled = false;
        if (checkoutBtn) checkoutBtn.disabled = false;
        if (statusBadge) statusBadge.style.display = 'block';
    } else {
        if (checkInBtn) checkInBtn.disabled = false;
        if (breakBtn) breakBtn.disabled = true;
        if (checkoutBtn) checkoutBtn.disabled = true;
        if (statusBadge) statusBadge.style.display = 'none';
    }
}

async function handleBreak() {
    if (!isCheckedIn) return;
    
    if (!isOnBreak) {
        // Start break
        isOnBreak = true;
        breakStartTime = new Date();
        
        const breakBtn = document.querySelector('.btn-break');
        if (breakBtn) {
            breakBtn.innerHTML = '<i class="fas fa-play"></i><span>Resume</span>';
        }
        
        const statusBadge = document.querySelector('.status-badge.working');
        if (statusBadge) {
            statusBadge.innerHTML = '<span>ON BREAK</span>';
            statusBadge.className = 'status-badge break';
        }
        
        showNotification('Break Started', 'You are now on break. Take some time to relax!', 'info');
    } else {
        // End break
        isOnBreak = false;
        if (breakStartTime) {
            totalBreakTime += new Date() - breakStartTime;
            breakStartTime = null;
        }
        
        const breakBtn = document.querySelector('.btn-break');
        if (breakBtn) {
            breakBtn.innerHTML = '<i class="fas fa-pause"></i><span>Break</span>';
        }
        
        const statusBadge = document.querySelector('.status-badge.break');
        if (statusBadge) {
            statusBadge.innerHTML = '<span>WORKING</span>';
            statusBadge.className = 'status-badge working';
        }
        
        showNotification('Break Ended', 'Welcome back! You are now working again.', 'success');
    }
    
    // Save state
    await saveState();
}

async function handleCheckOut() {
    if (!isCheckedIn) return;
    
    const now = new Date();
    const totalWorkTime = now - startTime - totalBreakTime;
    
    // Show checkout confirmation
    if (confirm('Are you sure you want to check out?')) {
        isCheckedIn = false;
        stopTimer();
        
        // Reset timer display
        const timerElement = document.getElementById('workTimer');
        if (timerElement) {
            timerElement.textContent = '00:00:00';
        }
        
        // Update button states
        updateButtonStates();
        
        // Add activity record
        addActivityRecord('checkout', 'completed');
        
        // Show summary
        showCheckoutSummary(totalWorkTime);
        
        showNotification('Checked Out', 'You have successfully checked out for the day.', 'success');
        
        // Save state
        await saveState();
    }
}

function showCheckoutSummary(totalWorkTime) {
    const hours = Math.floor(totalWorkTime / (1000 * 60 * 60));
    const minutes = Math.floor((totalWorkTime % (1000 * 60 * 60)) / (1000 * 60));
    
    const summary = `
        <div class="checkout-summary">
            <h5>Today's Summary</h5>
            <div class="summary-item">
                <span>Total Work Time:</span>
                <strong>${hours}h ${minutes}m</strong>
            </div>
            <div class="summary-item">
                <span>Break Time:</span>
                <strong>${Math.floor(totalBreakTime / (1000 * 60))}m</strong>
            </div>
            <div class="summary-item">
                <span>Productivity Score:</span>
                <strong>92%</strong>
            </div>
        </div>
    `;
    
    // You can show this in a modal or notification
    console.log(summary);
}

function handleQuickAction(e) {
    const action = e.currentTarget.querySelector('span').textContent;
    
    switch (action) {
        case 'Request Time Off':
            switchTab('request-timeoff');
            break;
        case 'View Schedule':
            // Handle view schedule
            showNotification('Schedule', 'Opening your work schedule...', 'info');
            break;
        case 'Report Issue':
            // Handle report issue
            showNotification('Report Issue', 'Opening issue reporting form...', 'info');
            break;
        case 'Contact HR':
            // Handle contact HR
            showNotification('Contact HR', 'Opening HR contact form...', 'info');
            break;
    }
}

function handleTabSwitch(e) {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    
    // Handle tab content switching
    const tabText = e.target.textContent;
    if (tabText === 'This Month') {
        // Load this month data
        console.log('Loading this month data...');
    } else if (tabText === 'Last Month') {
        // Load last month data
        console.log('Loading last month data...');
    }
}

function initializeTimeOff() {
    // Load time off data
    console.log('Initializing Time Off section...');
    
    // Update metrics
    updateTimeOffMetrics();
}

function initializeTimeOffForm() {
    // Set current date
    const requestDateInput = document.querySelector('.timeoff-form input[value="08/05/2025"]');
    if (requestDateInput) {
        const today = new Date();
        const formattedDate = today.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
        });
        requestDateInput.value = formattedDate;
    }
    
    // Add date picker functionality
    const dateInputs = document.querySelectorAll('.input-with-icon input[placeholder="mm/dd/yyyy"]');
    dateInputs.forEach(input => {
        input.addEventListener('focus', () => {
            input.type = 'date';
        });
        
        input.addEventListener('blur', () => {
            if (!input.value) {
                input.type = 'text';
            }
        });
    });
}

function updateTimeOffMetrics() {
    // Update approval rate
    const approvalRate = document.querySelector('.metric-card:nth-child(1) .metric-content h3');
    if (approvalRate) {
        approvalRate.textContent = '79.5%';
    }
    
    // Update response time
    const responseTime = document.querySelector('.metric-card:nth-child(2) .metric-content h3');
    if (responseTime) {
        responseTime.textContent = '1.2 days';
    }
    
    // Update active requests
    const activeRequests = document.querySelector('.metric-card:nth-child(3) .metric-content h3');
    if (activeRequests) {
        activeRequests.textContent = '18';
    }
}

async function handleTimeOffRequest(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const leaveData = {
        type: formData.get('leaveType') || 'Vacation',
        startDate: formData.get('startDate'),
        endDate: formData.get('endDate'),
        duration: formData.get('duration'),
        priority: formData.get('priority'),
        reason: formData.get('reason'),
        emergencyContact: formData.get('emergencyContact')
    };
    
    // Validate form
    if (!validateTimeOffForm(leaveData)) {
        return;
    }
    
    try {
        // Local processing only - no API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        showNotification('Success', 'Your time off request has been submitted successfully!', 'success');
        
        // Reset form
        e.target.reset();
        
        // Switch back to time off section
        switchTab('timeoff');
        
    } catch (error) {
        showNotification('Error', 'Failed to submit time off request. Please try again.', 'error');
    }
}

function validateTimeOffForm(data) {
    if (!data.startDate || !data.endDate) {
        showNotification('Error', 'Please select start and end dates.', 'error');
        return false;
    }
    
    if (!data.reason) {
        showNotification('Error', 'Please provide a reason for your leave request.', 'error');
        return false;
    }
    
    return true;
}

function updateLeaveBalance() {
    // Update leave balance in the widget
    const leaveTotal = document.querySelector('.leave-total h2');
    if (leaveTotal) {
        leaveTotal.textContent = '15';
    }
    
    // Update individual leave types
    const leaveTypes = document.querySelectorAll('.leave-type');
    leaveTypes.forEach(type => {
        const info = type.querySelector('.leave-info');
        if (info) {
            const typeName = type.classList.contains('vacation') ? 'Vacation' :
                           type.classList.contains('sick') ? 'Sick Leave' : 'Personal';
            
            const days = type.classList.contains('vacation') ? '10 days' :
                        type.classList.contains('sick') ? '3 days' : '2 days';
            
            info.innerHTML = `<span>${typeName}</span><span>${days}</span>`;
        }
    });
}

function addActivityRecord(type, status) {
    const activityList = document.querySelector('.activity-list');
    if (!activityList) return;
    
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
    
    const dateString = now.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });
    
    let icon, text, statusClass;
    
    switch (type) {
        case 'checkout':
            icon = 'fas fa-sign-out-alt';
            text = 'Checked Out';
            statusClass = 'completed';
            break;
        case 'break':
            icon = 'fas fa-coffee';
            text = 'Started Break';
            statusClass = 'active';
            break;
        case 'checkin':
            icon = 'fas fa-sign-in-alt';
            text = 'Checked In';
            statusClass = 'completed';
            break;
    }
    
    const activityItem = document.createElement('div');
    activityItem.className = `activity-item ${statusClass}`;
    activityItem.innerHTML = `
        <div class="activity-icon">
            <i class="${icon}"></i>
        </div>
        <div class="activity-info">
            <span>${text}</span>
            <small>${dateString} at ${timeString}</small>
        </div>
        <div class="activity-status">
            ${status === 'completed' ? '<i class="fas fa-check"></i>' : '<span class="status-number">1</span>'}
        </div>
    `;
    
    // Add to the beginning of the list
    activityList.insertBefore(activityItem, activityList.firstChild);
    
    // Remove old items if more than 5
    const items = activityList.querySelectorAll('.activity-item');
    if (items.length > 5) {
        items[items.length - 1].remove();
    }
}

function showNotification(title, message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // Get appropriate icon based on type
    let icon = 'info-circle';
    switch (type) {
        case 'success':
            icon = 'check-circle';
            break;
        case 'error':
            icon = 'exclamation-circle';
            break;
        case 'warning':
            icon = 'exclamation-triangle';
            break;
        case 'info':
            icon = 'info-circle';
            break;
    }
    
    notification.innerHTML = `
        <i class="fas fa-${icon} notification-icon"></i>
        <div class="notification-content">
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.classList.add('hiding');
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
}

function startClock() {
    updateClock();
    setInterval(updateClock, 1000);
}

function updateClock() {
    const now = new Date();
    
    // Update time
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
        timeElement.textContent = now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }
    
    // Update date
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    }
}

async function saveState() {
    const state = {
        isCheckedIn,
        startTime: startTime ? startTime.toISOString() : null,
        totalBreakTime,
        isOnBreak,
        breakStartTime: breakStartTime ? breakStartTime.toISOString() : null
    };
    
    try {
        await ipcRenderer.invoke('save-state', state);
    } catch (error) {
        console.error('Failed to save state:', error);
    }
}

// Manual check-in functionality
async function handleCheckIn() {
    if (!isCheckedIn) {
        isCheckedIn = true;
        startTime = new Date();
        startTimer();
        updateButtonStates();
        addActivityRecord('checkin', 'completed');
        showNotification('Check In', 'You have successfully checked in.', 'success');
        saveState();
    }
}

function setupSettingsEventListeners() {
    // Profile settings form
    const profileForm = document.querySelector('.settings-form');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileSettingsSubmit);
    }
    
    // Password change form
    const passwordForm = document.querySelector('.password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordChange);
    }
    
    // Password strength checking
    const newPasswordInput = document.getElementById('newPassword');
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', checkPasswordStrength);
    }
    
    // Profile picture upload
    const uploadBtn = document.querySelector('.profile-picture-upload .btn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', handleProfilePictureUpload);
    }
    
    // Notification settings toggles
    const notificationToggles = document.querySelectorAll('.settings-option .switch input[type="checkbox"]');
    notificationToggles.forEach(toggle => {
        toggle.addEventListener('change', handleNotificationSettingChange);
    });
    
    // Appearance settings
    const darkModeToggle = document.querySelector('.settings-option .switch input[type="checkbox"]:not([checked])');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', handleDarkModeToggle);
    }
    
    const languageSelect = document.querySelector('.form-group select');
    if (languageSelect) {
        languageSelect.addEventListener('change', handleLanguageChange);
    }
    
    // Load saved settings
    loadSavedSettings();
}

function handleProfileSettingsSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const profileData = {
        fullName: e.target.querySelector('input[type="text"]').value,
        email: e.target.querySelector('input[type="email"]').value,
        phone: e.target.querySelector('input[type="tel"]').value,
        department: e.target.querySelectorAll('input[type="text"]')[1].value
    };
    
    // Validate form data
    if (!profileData.fullName || !profileData.email) {
        showNotification('Error', 'Please fill in all required fields', 'error');
        return;
    }
    
    if (!isValidEmail(profileData.email)) {
        showNotification('Error', 'Please enter a valid email address', 'error');
        return;
    }
    
    // Save profile data
    saveProfileData(profileData);
    
    // Update profile display
    updateProfileDisplay(profileData);
    
    showNotification('Success', 'Profile settings saved successfully!', 'success');
}

function handlePasswordChange(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
        showNotification('Error', 'Please fill in all password fields', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showNotification('Error', 'New passwords do not match', 'error');
        return;
    }
    
    if (newPassword.length < 8) {
        showNotification('Error', 'Password must be at least 8 characters long', 'error');
        return;
    }
    
    // Check password strength
    const strength = getPasswordStrength(newPassword);
    if (strength === 'weak') {
        showNotification('Warning', 'Password is too weak. Please choose a stronger password.', 'warning');
        return;
    }
    
    // In a real app, you would verify current password and update on server
    // For demo purposes, we'll just show success
    showNotification('Success', 'Password changed successfully!', 'success');
    
    // Clear form
    e.target.reset();
    document.getElementById('passwordStrength').style.display = 'none';
}

function checkPasswordStrength(e) {
    const password = e.target.value;
    const strengthDiv = document.getElementById('passwordStrength');
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    
    if (password.length === 0) {
        strengthDiv.style.display = 'none';
        return;
    }
    
    const strength = getPasswordStrength(password);
    strengthDiv.style.display = 'block';
    
    // Remove all strength classes
    strengthFill.classList.remove('weak', 'fair', 'good', 'strong');
    
    // Add appropriate class
    strengthFill.classList.add(strength);
    
    // Update text
    const strengthLabels = {
        weak: 'Weak',
        fair: 'Fair',
        good: 'Good',
        strong: 'Strong'
    };
    
    strengthText.textContent = `Password strength: ${strengthLabels[strength]}`;
}

function getPasswordStrength(password) {
    let score = 0;
    
    // Length check
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    
    // Character variety checks
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    // Determine strength level
    if (score <= 2) return 'weak';
    if (score <= 3) return 'fair';
    if (score <= 4) return 'good';
    return 'strong';
}

// Global function for password toggle (called from HTML)
window.togglePassword = function(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
};

// Global function for editing personal information
window.editPersonalInfo = function() {
    const grid = document.getElementById('personalInfoGrid');
    const currentData = {
        fullName: 'John Michael Doe',
        email: 'john.doe@company.com',
        phone: '+1 (555) 123-4567',
        dateOfBirth: 'March 15, 1990',
        address: '123 Main Street, City, State 12345',
        emergencyContact: 'Jane Doe - +1 (555) 987-6543'
    };
    
    // Create edit form
    const formHTML = `
        <form class="edit-form" onsubmit="savePersonalInfo(event)">
            <div class="form-row">
                <div class="form-group">
                    <label>Full Name</label>
                    <input type="text" class="form-control" value="${currentData.fullName}" name="fullName">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" class="form-control" value="${currentData.email}" name="email">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Phone</label>
                    <input type="tel" class="form-control" value="${currentData.phone}" name="phone">
                </div>
                <div class="form-group">
                    <label>Date of Birth</label>
                    <input type="text" class="form-control" value="${currentData.dateOfBirth}" name="dateOfBirth">
                </div>
            </div>
            <div class="form-group">
                <label>Address</label>
                <input type="text" class="form-control" value="${currentData.address}" name="address">
            </div>
            <div class="form-group">
                <label>Emergency Contact</label>
                <input type="text" class="form-control" value="${currentData.emergencyContact}" name="emergencyContact">
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-save"></i>
                    <span>Save Changes</span>
                </button>
                <button type="button" class="btn btn-secondary" onclick="cancelEdit('personalInfoGrid')">
                    <i class="fas fa-times"></i>
                    <span>Cancel</span>
                </button>
            </div>
        </form>
    `;
    
    grid.innerHTML = formHTML;
};

// Global function for editing work information
window.editWorkInfo = function() {
    const grid = document.getElementById('workInfoGrid');
    const currentData = {
        employeeId: 'EMP001',
        department: 'Software Engineering',
        position: 'Senior Software Engineer',
        hireDate: 'January 15, 2020',
        manager: 'Sarah Johnson',
        workLocation: 'Main Office - Floor 3'
    };
    
    // Create edit form
    const formHTML = `
        <form class="edit-form" onsubmit="saveWorkInfo(event)">
            <div class="form-row">
                <div class="form-group">
                    <label>Employee ID</label>
                    <input type="text" class="form-control" value="${currentData.employeeId}" name="employeeId" readonly>
                </div>
                <div class="form-group">
                    <label>Department</label>
                    <input type="text" class="form-control" value="${currentData.department}" name="department">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Position</label>
                    <input type="text" class="form-control" value="${currentData.position}" name="position">
                </div>
                <div class="form-group">
                    <label>Hire Date</label>
                    <input type="text" class="form-control" value="${currentData.hireDate}" name="hireDate" readonly>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Manager</label>
                    <input type="text" class="form-control" value="${currentData.manager}" name="manager">
                </div>
                <div class="form-group">
                    <label>Work Location</label>
                    <input type="text" class="form-control" value="${currentData.workLocation}" name="workLocation">
                </div>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-save"></i>
                    <span>Save Changes</span>
                </button>
                <button type="button" class="btn btn-secondary" onclick="cancelEdit('workInfoGrid')">
                    <i class="fas fa-times"></i>
                    <span>Cancel</span>
                </button>
            </div>
        </form>
    `;
    
    grid.innerHTML = formHTML;
};

// Global function for saving personal information
window.savePersonalInfo = function(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    // Validate required fields
    if (!data.fullName || !data.email) {
        showNotification('Error', 'Please fill in all required fields', 'error');
        return;
    }
    
    // Save to localStorage
    localStorage.setItem('personalInfo', JSON.stringify(data));
    
    // Update display
    updatePersonalInfoDisplay(data);
    
    showNotification('Success', 'Personal information saved successfully!', 'success');
};

// Global function for saving work information
window.saveWorkInfo = function(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    // Validate required fields
    if (!data.department || !data.position) {
        showNotification('Error', 'Please fill in all required fields', 'error');
        return;
    }
    
    // Save to localStorage
    localStorage.setItem('workInfo', JSON.stringify(data));
    
    // Update display
    updateWorkInfoDisplay(data);
    
    showNotification('Success', 'Work information saved successfully!', 'success');
};

// Global function for canceling edit
window.cancelEdit = function(gridId) {
    const grid = document.getElementById(gridId);
    
    if (gridId === 'personalInfoGrid') {
        const savedData = localStorage.getItem('personalInfo');
        if (savedData) {
            updatePersonalInfoDisplay(JSON.parse(savedData));
        } else {
            // Restore default data
            updatePersonalInfoDisplay({
                fullName: 'John Michael Doe',
                email: 'john.doe@company.com',
                phone: '+1 (555) 123-4567',
                dateOfBirth: 'March 15, 1990',
                address: '123 Main Street, City, State 12345',
                emergencyContact: 'Jane Doe - +1 (555) 987-6543'
            });
        }
    } else if (gridId === 'workInfoGrid') {
        const savedData = localStorage.getItem('workInfo');
        if (savedData) {
            updateWorkInfoDisplay(JSON.parse(savedData));
        } else {
            // Restore default data
            updateWorkInfoDisplay({
                employeeId: 'EMP001',
                department: 'Software Engineering',
                position: 'Senior Software Engineer',
                hireDate: 'January 15, 2020',
                manager: 'Sarah Johnson',
                workLocation: 'Main Office - Floor 3'
            });
        }
    }
};



// Helper function to update personal info display
function updatePersonalInfoDisplay(data) {
    const grid = document.getElementById('personalInfoGrid');
    grid.innerHTML = `
        <div class="detail-item">
            <label>Full Name</label>
            <span>${data.fullName}</span>
        </div>
        <div class="detail-item">
            <label>Email</label>
            <span>${data.email}</span>
        </div>
        <div class="detail-item">
            <label>Phone</label>
            <span>${data.phone}</span>
        </div>
        <div class="detail-item">
            <label>Date of Birth</label>
            <span>${data.dateOfBirth}</span>
        </div>
        <div class="detail-item">
            <label>Address</label>
            <span>${data.address}</span>
        </div>
        <div class="detail-item">
            <label>Emergency Contact</label>
            <span>${data.emergencyContact}</span>
        </div>
    `;
}

// Helper function to update work info display
function updateWorkInfoDisplay(data) {
    const grid = document.getElementById('workInfoGrid');
    grid.innerHTML = `
        <div class="detail-item">
            <label>Employee ID</label>
            <span>${data.employeeId}</span>
        </div>
        <div class="detail-item">
            <label>Department</label>
            <span>${data.department}</span>
        </div>
        <div class="detail-item">
            <label>Position</label>
            <span>${data.position}</span>
        </div>
        <div class="detail-item">
            <label>Hire Date</label>
            <span>${data.hireDate}</span>
        </div>
        <div class="detail-item">
            <label>Manager</label>
            <span>${data.manager}</span>
        </div>
        <div class="detail-item">
            <label>Work Location</label>
            <span>${data.workLocation}</span>
        </div>
    `;
}

function handleProfilePictureUpload() {
    // Create a file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                showNotification('Error', 'File size must be less than 5MB', 'error');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.querySelector('.profile-picture-preview');
                if (preview) {
                    preview.innerHTML = `<img src="${e.target.result}" alt="Profile Picture" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
                }
                
                // Save profile picture
                localStorage.setItem('profilePicture', e.target.result);
                showNotification('Success', 'Profile picture uploaded successfully!', 'success');
            };
            reader.readAsDataURL(file);
        }
    });
    
    fileInput.click();
}

function handleNotificationSettingChange(e) {
    const settingName = e.target.closest('.settings-option').querySelector('h4').textContent;
    const isEnabled = e.target.checked;
    
    // Save notification setting
    const settings = JSON.parse(localStorage.getItem('notificationSettings') || '{}');
    settings[settingName] = isEnabled;
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
    
    showNotification('Success', `${settingName} ${isEnabled ? 'enabled' : 'disabled'}`, 'success');
}

function handleDarkModeToggle(e) {
    const isDarkMode = e.target.checked;
    
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    
    // Save dark mode setting
    localStorage.setItem('darkMode', isDarkMode);
    
    showNotification('Success', `Dark mode ${isDarkMode ? 'enabled' : 'disabled'}`, 'success');
}

function handleLanguageChange(e) {
    const language = e.target.value;
    
    // Save language setting
    localStorage.setItem('language', language);
    
    showNotification('Success', `Language changed to ${language}`, 'success');
}

function saveProfileData(profileData) {
    // Save to localStorage
    localStorage.setItem('profileData', JSON.stringify(profileData));
    
    // In a real app, you would send this to a server
    console.log('Profile data saved:', profileData);
}

function updateProfileDisplay(profileData) {
    // Update profile header
    const profileName = document.querySelector('.profile-info h2');
    if (profileName) {
        profileName.textContent = profileData.fullName;
    }
    
    // Update profile details
    const detailItems = document.querySelectorAll('.detail-item');
    detailItems.forEach(item => {
        const label = item.querySelector('label').textContent;
        const span = item.querySelector('span');
        
        switch (label) {
            case 'Full Name':
                span.textContent = profileData.fullName;
                break;
            case 'Email':
                span.textContent = profileData.email;
                break;
            case 'Phone':
                span.textContent = profileData.phone;
                break;
        }
    });
    
    // Update settings form with new values
    const form = document.querySelector('.settings-form');
    if (form) {
        form.querySelector('input[type="text"]').value = profileData.fullName;
        form.querySelector('input[type="email"]').value = profileData.email;
        form.querySelector('input[type="tel"]').value = profileData.phone;
        form.querySelectorAll('input[type="text"]')[1].value = profileData.department;
    }
}

function loadSavedSettings() {
    // Load profile data
    const savedProfileData = localStorage.getItem('profileData');
    if (savedProfileData) {
        const profileData = JSON.parse(savedProfileData);
        updateProfileDisplay(profileData);
    }
    
    // Load personal information
    const savedPersonalInfo = localStorage.getItem('personalInfo');
    if (savedPersonalInfo) {
        updatePersonalInfoDisplay(JSON.parse(savedPersonalInfo));
    }
    
    // Load work information
    const savedWorkInfo = localStorage.getItem('workInfo');
    if (savedWorkInfo) {
        updateWorkInfoDisplay(JSON.parse(savedWorkInfo));
    }
    
    // Load notification settings
    const savedNotificationSettings = localStorage.getItem('notificationSettings');
    if (savedNotificationSettings) {
        const settings = JSON.parse(savedNotificationSettings);
        Object.keys(settings).forEach(settingName => {
            const toggle = Array.from(document.querySelectorAll('.settings-option .switch input[type="checkbox"]'))
                .find(toggle => toggle.closest('.settings-option').querySelector('h4').textContent === settingName);
            if (toggle) {
                toggle.checked = settings[settingName];
            }
        });
    }
    
    // Load dark mode setting
    const darkMode = localStorage.getItem('darkMode') === 'true';
    const darkModeToggle = document.querySelector('.settings-option .switch input[type="checkbox"]:not([checked])');
    if (darkModeToggle && darkMode) {
        darkModeToggle.checked = true;
        document.body.classList.add('dark-mode');
    }
    
    // Load language setting
    const language = localStorage.getItem('language');
    const languageSelect = document.querySelector('.form-group select');
    if (languageSelect && language) {
        languageSelect.value = language;
    }
    
    // Load profile picture
    const profilePicture = localStorage.getItem('profilePicture');
    if (profilePicture) {
        const preview = document.querySelector('.profile-picture-preview');
        if (preview) {
            preview.innerHTML = `<img src="${profilePicture}" alt="Profile Picture" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        }
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Dashboard Functions
function setupDashboardEventListeners() {
    // Refresh activity button
    const refreshActivityBtn = document.getElementById('refreshActivityBtn');
    if (refreshActivityBtn) {
        refreshActivityBtn.addEventListener('click', loadRecentActivity);
    }
    
    // Refresh events button
    const refreshEventsBtn = document.getElementById('refreshEventsBtn');
    if (refreshEventsBtn) {
        refreshEventsBtn.addEventListener('click', loadUpcomingEvents);
    }
    
    // Search functionality
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('dashboardSearch');
    
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', handleSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
    }
    
    // Quick action buttons
    const requestTimeOffBtn = document.getElementById('requestTimeOffBtn');
    const viewScheduleBtn = document.getElementById('viewScheduleBtn');
    const reportIssueBtn = document.getElementById('reportIssueBtn');
    const contactHRBtn = document.getElementById('contactHRBtn');
    const viewReportsBtn = document.getElementById('viewReportsBtn');
    
    if (requestTimeOffBtn) {
        requestTimeOffBtn.addEventListener('click', () => {
            switchTab('timeoff');
            showNotification('Navigation', 'Switched to Time Off section', 'info');
        });
    }
    
    if (viewScheduleBtn) {
        viewScheduleBtn.addEventListener('click', () => {
            showNotification('Schedule', 'Schedule view coming soon!', 'info');
        });
    }
    
    if (reportIssueBtn) {
        reportIssueBtn.addEventListener('click', () => {
            showNotification('Report Issue', 'Issue reporting feature coming soon!', 'info');
        });
    }
    
    if (contactHRBtn) {
        contactHRBtn.addEventListener('click', () => {
            showNotification('Contact HR', 'HR contact feature coming soon!', 'info');
        });
    }
    
    if (viewReportsBtn) {
        viewReportsBtn.addEventListener('click', () => {
            showNotification('Reports', 'Reports feature coming soon!', 'info');
        });
    }
    

}

// API Configuration
const API_BASE_URL = 'http://localhost:8080/api';

async function loadDashboardData() {
    try {
        // Fetch complete dashboard data from API
        const response = await fetch(`${API_BASE_URL}/dashboard`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const dashboardData = await response.json();
        
        // Update dashboard with API data
        updateDashboardWithData(dashboardData);
        
        // Load additional dashboard statistics
        loadDashboardStats();
        
        // Load activities and events
        loadActivities();
        loadEvents();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Fallback to local data if API fails
        loadDashboardStats();
        loadActivities();
        loadEvents();
    }
}

function updateDashboardWithData(data) {
    // Update employee profile
    updateEmployeeProfile(data.employee_profile);
    
    // Update summary cards
    updateSummaryCards(data.summary_cards);
    
    // Update time tracking
    updateTimeTracking(data.time_tracking);
    
    // Update weekly progress
    updateWeeklyProgress(data.weekly_progress);
    
    // Update leave balance
    updateLeaveBalance(data.leave_balance);
    
    // Update insights
    updateInsights(data.insights);
}

function updateEmployeeProfile(profile) {
    // Check if profile data exists
    if (!profile) {
        console.warn('Employee profile data is undefined, skipping update');
        return;
    }
    
    const userNameElement = document.querySelector('.user-info h4');
    const userRoleElement = document.querySelector('.user-info p');
    const greetingElement = document.querySelector('.greeting-content h1');
    
    if (userNameElement) userNameElement.textContent = profile.name || 'Employee';
    if (userRoleElement) userRoleElement.textContent = profile.role || 'Staff';
    if (greetingElement) {
        const timeOfDay = getTimeOfDay();
        const firstName = profile.name ? profile.name.split(' ')[0] : 'there';
        greetingElement.textContent = `Good ${timeOfDay}, ${firstName}! 👋`;
    }
}

function updateSummaryCards(summary) {
    // Check if summary data exists
    if (!summary) {
        console.warn('Summary cards data is undefined, skipping update');
        return;
    }
    
    const todayWorkCard = document.querySelector('.summary-card.today-work .card-content h2');
    const attendanceCard = document.querySelector('.summary-card.attendance-rate .card-content h2');
    const thisWeekCard = document.querySelector('.summary-card.this-week .card-content h2');
    const daysAvailableCard = document.querySelector('.summary-card.days-available .card-content h2');
    
    if (todayWorkCard) todayWorkCard.textContent = summary.today_work || '0h 0m';
    if (attendanceCard) attendanceCard.textContent = (summary.attendance_rate || 0) + '%';
    if (thisWeekCard) thisWeekCard.textContent = summary.this_week || '0h';
    if (daysAvailableCard) daysAvailableCard.textContent = summary.days_available || 0;
}

function updateTimeTracking(tracking) {
    // Check if tracking data exists
    if (!tracking) {
        console.warn('Time tracking data is undefined, skipping update');
        return;
    }
    
    const timerElement = document.getElementById('workTimer');
    const checkInBtn = document.querySelector('.btn-checkin');
    const checkOutBtn = document.querySelector('.btn-checkout');
    const breakBtn = document.querySelector('.btn-break');
    const statusBadge = document.querySelector('.status-badge');
    
    if (timerElement) timerElement.textContent = tracking.current_session || '00:00:00';
    
    if (tracking.is_checked_in) {
        if (checkInBtn) checkInBtn.disabled = true;
        if (checkOutBtn) checkOutBtn.disabled = false;
        if (breakBtn) breakBtn.disabled = false;
        if (statusBadge) {
            statusBadge.style.display = 'block';
            statusBadge.innerHTML = '<span>WORKING</span>';
        }
    } else {
        if (checkInBtn) checkInBtn.disabled = false;
        if (checkOutBtn) checkOutBtn.disabled = true;
        if (breakBtn) breakBtn.disabled = true;
        if (statusBadge) statusBadge.style.display = 'none';
    }
}

function updateWeeklyProgress(progress) {
    // Check if progress data exists
    if (!progress) {
        console.warn('Weekly progress data is undefined, skipping update');
        return;
    }
    
    const workHoursProgress = document.querySelector('.progress-item:nth-child(1) .progress-fill');
    const breakTimeProgress = document.querySelector('.progress-item:nth-child(2) .progress-fill');
    const overtimeProgress = document.querySelector('.progress-item:nth-child(3) .progress-fill');
    
    if (workHoursProgress) workHoursProgress.style.width = (progress.work_hours_percentage || 0) + '%';
    if (breakTimeProgress) breakTimeProgress.style.width = (progress.break_time_percentage || 0) + '%';
    if (overtimeProgress) overtimeProgress.style.width = (progress.overtime_percentage || 0) + '%';
}

function updateLeaveBalance(leave) {
    // Check if leave data exists
    if (!leave) {
        console.warn('Leave balance data is undefined, skipping update');
        return;
    }
    
    const totalDaysElement = document.querySelector('.leave-total h2');
    const vacationDaysElement = document.querySelector('.leave-type.vacation .leave-info span:last-child');
    const sickDaysElement = document.querySelector('.leave-type.sick .leave-info span:last-child');
    const personalDaysElement = document.querySelector('.leave-type.personal .leave-info span:last-child');
    
    if (totalDaysElement) totalDaysElement.textContent = leave.total_days || 0;
    if (vacationDaysElement) vacationDaysElement.textContent = (leave.vacation_days || 0) + ' days';
    if (sickDaysElement) sickDaysElement.textContent = (leave.sick_days || 0) + ' days';
    if (personalDaysElement) personalDaysElement.textContent = (leave.personal_days || 0) + ' days';
}

function updateInsights(insights) {
    // Check if insights data exists
    if (!insights || !Array.isArray(insights)) {
        console.warn('Insights data is undefined or not an array, skipping update');
        return;
    }
    
    const insightsContainer = document.querySelector('.insights .widget-content');
    if (!insightsContainer) return;
    
    insightsContainer.innerHTML = '';
    
    insights.forEach(insight => {
        const insightElement = document.createElement('div');
        insightElement.className = 'insight-item';
        insightElement.innerHTML = `
            <div class="insight-label">
                <span>${insight.metric || 'Metric'}</span>
                <span>${insight.trend === 'up' ? '↑' : '↓'} ${insight.change || '0%'}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${insight.value || 0}%"></div>
            </div>
            <span class="progress-percentage">${insight.value || 0}%</span>
        `;
        insightsContainer.appendChild(insightElement);
    });
}

function getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
}

function loadDashboardStats() {
    // Update summary cards with local data
    const todayWorkCard = document.querySelector('.summary-card.today-work .card-content h2');
    const attendanceRateCard = document.querySelector('.summary-card.attendance-rate .card-content h2');
    const thisWeekCard = document.querySelector('.summary-card.this-week .card-content h2');
    
    if (todayWorkCard) {
        const hours = Math.floor(32 / 40); // Assuming 40-hour work week
        const minutes = Math.floor((32 % 40) * 60);
        todayWorkCard.textContent = `${hours}h ${minutes}m`;
    }
    
    if (attendanceRateCard) {
        attendanceRateCard.textContent = '95%';
    }
    
    if (thisWeekCard) {
        thisWeekCard.textContent = '32h';
    }
}

async function loadRecentActivity() {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    
    // Show loading state
    activityList.innerHTML = `
        <div class="activity-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Loading activities...</span>
        </div>
    `;
    
    try {
        // Fetch activities from API
        const response = await fetch(`${API_BASE_URL}/dashboard/activities`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const activities = await response.json();
        
        // Clear and render activities
        activityList.innerHTML = '';
        
        activities.forEach(activity => {
            const activityItem = createActivityItem(activity);
            activityList.appendChild(activityItem);
        });
    } catch (error) {
        console.error('Error loading activities:', error);
        // Fallback to mock data
        const fallbackActivities = [
            {
                id: 1,
                type: 'clock_in',
                message: 'John Doe clocked in',
                timestamp: new Date(Date.now() - 5 * 60000),
                user_id: 1,
                user_name: 'John Doe',
                icon: 'fas fa-sign-in-alt',
                color: 'success'
            },
            {
                id: 2,
                type: 'timeoff_request',
                message: 'Sarah Smith requested vacation',
                timestamp: new Date(Date.now() - 15 * 60000),
                user_id: 2,
                user_name: 'Sarah Smith',
                icon: 'fas fa-calendar-plus',
                color: 'info'
            }
        ];
        
        activityList.innerHTML = '';
        fallbackActivities.forEach(activity => {
            const activityItem = createActivityItem(activity);
            activityList.appendChild(activityItem);
        });
    }
}

function createActivityItem(activity) {
    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item completed';
    
    // Handle both API format and legacy format
    const message = activity.message || activity.title;
    const timestamp = activity.timestamp ? new Date(activity.timestamp) : activity.timestamp;
    const timeAgo = getTimeAgo(timestamp);
    
    activityItem.innerHTML = `
        <div class="activity-icon">
            <i class="${activity.icon}"></i>
        </div>
        <div class="activity-info">
            <span>${message}</span>
            <small>${timeAgo}</small>
        </div>
        <div class="activity-status">
            <i class="fas fa-check"></i>
        </div>
    `;
    
    return activityItem;
}

async function loadUpcomingEvents() {
    const eventsList = document.getElementById('eventsList');
    if (!eventsList) return;
    
    // Show loading state
    eventsList.innerHTML = `
        <div class="events-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Loading events...</span>
        </div>
    `;
    
    try {
        // Fetch events from API
        const response = await fetch(`${API_BASE_URL}/dashboard/events`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const events = await response.json();
        
        // Clear and render events
        eventsList.innerHTML = '';
        
        events.forEach(event => {
            const eventItem = createEventItem(event);
            eventsList.appendChild(eventItem);
        });
    } catch (error) {
        console.error('Error loading events:', error);
        // Fallback to mock data
        const fallbackEvents = [
            {
                id: 1,
                title: 'Team Meeting',
                type: 'meeting',
                datetime: new Date(Date.now() + 2 * 60 * 60000),
                duration: 60,
                attendees: ['John Doe', 'Sarah Smith', 'Mike Johnson'],
                location: 'Conference Room A',
                description: 'Weekly team sync meeting'
            },
            {
                id: 2,
                title: 'Project Deadline',
                type: 'deadline',
                datetime: new Date(Date.now() + 3 * 24 * 60 * 60000),
                priority: 'high',
                project: 'MDM Security System',
                description: 'Phase 1 completion deadline'
            }
        ];
        
        eventsList.innerHTML = '';
        fallbackEvents.forEach(event => {
            const eventItem = createEventItem(event);
            eventsList.appendChild(eventItem);
        });
    }
}

function createEventItem(event) {
    const eventItem = document.createElement('div');
    eventItem.className = `event-item ${event.type}`;
    
    // Handle both API format and legacy format
    const eventDateTime = event.datetime ? new Date(event.datetime) : new Date(`${event.date}T${event.time}`);
    const eventTime = formatEventTime(eventDateTime);
    const eventIcon = getEventIcon(event.type);
    
    let priorityBadge = '';
    if (event.priority) {
        priorityBadge = `<span class="event-priority ${event.priority}">${event.priority}</span>`;
    }
    
    eventItem.innerHTML = `
        <div class="event-icon">
            <i class="${eventIcon}"></i>
        </div>
        <div class="event-info">
            <div class="event-title">${event.title}</div>
            <div class="event-details">${event.description}</div>
            <div class="event-time">${eventTime}</div>
        </div>
        ${priorityBadge}
    `;
    
    return eventItem;
}

function getEventIcon(type) {
    const icons = {
        meeting: 'fas fa-users',
        deadline: 'fas fa-clock',
        holiday: 'fas fa-calendar-day',
        training: 'fas fa-graduation-cap',
        review: 'fas fa-star'
    };
    return icons[type] || 'fas fa-calendar';
}

function formatEventTime(datetime) {
    const now = new Date();
    const eventDate = new Date(datetime);
    const diffTime = eventDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Tomorrow';
    } else if (diffDays < 7) {
        return `In ${diffDays} days`;
    } else {
        return eventDate.toLocaleDateString();
    }
}

function getTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) {
        return 'Just now';
    } else if (diffMins < 60) {
        return `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
        return `${diffHours} hours ago`;
    } else {
        return `${diffDays} days ago`;
    }
}

function handleSearch() {
    const searchInput = document.getElementById('dashboardSearch');
    const query = searchInput.value.trim();
    
    if (!query) {
        showNotification('Search', 'Please enter a search term', 'warning');
        return;
    }
    
    showNotification('Search', 'Search functionality coming soon!', 'info');
}


