const electronAPI = window.electronAPI;
let timer = null;
let startTime = null;
let breakStartTime = null;
let totalBreakTime = 0;
let isCheckedIn = false;
let isOnBreak = false;
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    showLoadingScreen();
    setTimeout(() => {
        console.log('Fallback: Force hiding loading screen after timeout');
        hideLoadingScreen();
        initializeUI();
    }, 10000);
    setTimeout(() => {
        console.log('Starting app initialization...');
        initializeApp();
        setupEventListeners();
        setupWindowControls();
        startClock();
        updateGreeting();
        setTimeout(() => {
            console.log('Hiding loading screen...');
            hideLoadingScreen();
            initializeUI();
        }, 2000);
    }, 1000);
});
function initializeApp() {
    if (window.electronAPI) {
        electronAPI.getSavedState().then(savedState => {
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
    } else {
        console.log('Electron API not available, checking localStorage...');
        try {
            const savedState = localStorage.getItem('mdm-security-state');
            if (savedState) {
                const state = JSON.parse(savedState);
                isCheckedIn = state.isCheckedIn;
                startTime = state.startTime ? new Date(state.startTime) : null;
                totalBreakTime = state.totalBreakTime || 0;
                if (isCheckedIn) {
                    startTimer();
                }
            }
        } catch (error) {
            console.error('Error loading state from localStorage:', error);
        }
        updateButtonStates();
        updateStatistics();
    }
}
function setupEventListeners() {
    console.log('Setting up event listeners...');
    setupNavigation();
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
    const requestLeaveBtn = document.querySelector('.btn-request-leave');
    if (requestLeaveBtn) {
        requestLeaveBtn.addEventListener('click', () => {
            switchTab('request-timeoff');
        });
    }
    const actionBtns = document.querySelectorAll('.action-btn');
    actionBtns.forEach(btn => {
        btn.addEventListener('click', handleQuickAction);
    });
    const timeoffForm = document.querySelector('.timeoff-form');
    if (timeoffForm) {
        timeoffForm.addEventListener('submit', handleTimeOffRequest);
    }
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', handleTabSwitch);
    });
    setupSettingsEventListeners();

    setupDashboardEventListeners();
    
  
    updateButtonStates();
    updateStatistics();
    updateLeaveBalance();
    
    loadDashboardData();
}

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            navLinks.forEach(l => l.parentElement.classList.remove('active'));
            
            link.parentElement.classList.add('active');
            
            const targetId = link.getAttribute('href').substring(1);
            switchTab(targetId);
        });
    });
}

function switchTab(targetId) {
    const contentSections = document.querySelectorAll('.content-section');
    contentSections.forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(targetId);
    if (targetSection) {
        targetSection.classList.add('active');
        
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
    const attendanceCard = document.querySelector('.summary-card.attendance-rate .card-content h2');
    if (attendanceCard) {
        attendanceCard.textContent = '95%';
    }
    
    const thisWeekCard = document.querySelector('.summary-card.this-week .card-content h2');
    if (thisWeekCard) {
        thisWeekCard.textContent = '32h';
    }
    
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
    
    await saveState();
}

async function handleCheckOut() {
    if (!isCheckedIn) return;
    
    const now = new Date();
    const totalWorkTime = now - startTime - totalBreakTime;
    
    if (confirm('Are you sure you want to check out?')) {
        isCheckedIn = false;
        stopTimer();
        
        const timerElement = document.getElementById('workTimer');
        if (timerElement) {
            timerElement.textContent = '00:00:00';
        }
        
        updateButtonStates();
        
        addActivityRecord('checkout', 'completed');
      
        showCheckoutSummary(totalWorkTime);
        
        showNotification('Checked Out', 'You have successfully checked out for the day.', 'success');
        
        
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
    
    console.log(summary);
}

function handleQuickAction(e) {
    const action = e.currentTarget.querySelector('span').textContent;
    
    switch (action) {
        case 'Request Time Off':
            switchTab('request-timeoff');
            break;
        case 'View Schedule':
            showNotification('Schedule', 'Opening your work schedule...', 'info');
            break;
        case 'Report Issue':
            showNotification('Report Issue', 'Opening issue reporting form...', 'info');
            break;
        case 'Contact HR':
            showNotification('Contact HR', 'Opening HR contact form...', 'info');
            break;
    }
}

function handleTabSwitch(e) {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    
    const tabText = e.target.textContent;
    if (tabText === 'This Month') {
        console.log('Loading this month data...');
    } else if (tabText === 'Last Month') {
        console.log('Loading last month data...');
    }
}

function initializeTimeOff() {
 
    console.log('Initializing Time Off section...');
    
   
    updateTimeOffMetrics();
}

function initializeTimeOffForm() {
    
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
    
    const approvalRate = document.querySelector('.metric-card:nth-child(1) .metric-content h3');
    if (approvalRate) {
        approvalRate.textContent = '79.5%';
    }
    
    const responseTime = document.querySelector('.metric-card:nth-child(2) .metric-content h3');
    if (responseTime) {
        responseTime.textContent = '1.2 days';
    }
    
  
    const activeRequests = document.querySelector('.metric-card:nth-child(3) .metric-content h3');
    if (activeRequests) {
        activeRequests.textContent = '18';
    }
}



document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector(".timeoff-form");
    const saveDraftBtn = document.querySelector(".btn.btn-secondary");
    const inputs = form.querySelectorAll("input, select, textarea");
    const notificationContainer = document.getElementById("notification-container");

    function showNotification(message, type = "success") {
        const notification = document.createElement("div");
        notification.classList.add("notification", type);
        notification.textContent = message;
        notificationContainer.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    function showError(input, message) {
        removeError(input);
        const error = document.createElement("small");
        error.classList.add("error-message");
        error.style.color = "red";
        error.textContent = message;
        input.closest(".form-group").appendChild(error);
        input.classList.add("is-invalid");
    }

    function removeError(input) {
        const error = input.closest(".form-group").querySelector(".error-message");
        if (error) error.remove();
        input.classList.remove("is-invalid");
    }

    function isValidDate(dateStr) {
        if (!dateStr) return false;
        const parts = dateStr.split("/");
        if (parts.length !== 3) return false;
        const [month, day, year] = parts.map(Number);
        const date = new Date(year, month - 1, day);
        return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
    }

    function validateForm() {
        let isValid = true;

        inputs.forEach(input => {
            removeError(input);

            if (input.tagName === "SELECT" && input.value.includes("Select")) {
                showError(input, "This field is required");
                isValid = false;
            }

            if (input.tagName === "INPUT" && input.type === "text") {
                if (input.placeholder.includes("mm/dd/yyyy") && !isValidDate(input.value)) {
                    showError(input, "Enter a valid date (mm/dd/yyyy)");
                    isValid = false;
                }

                if (input.previousElementSibling?.textContent.includes("Duration") &&
                    (!/^[0-9]+$/.test(input.value) || input.value <= 0)) {
                    showError(input, "Enter a valid duration in days");
                    isValid = false;
                }

                if (input.placeholder.includes("Name and phone")) {
                    if (!/^\d{8,10}$/.test(input.value.trim())) {
                        showError(input, "Enter a valid 8-10 digit phone number");
                        isValid = false;
                    }
                }
            }

            if (input.tagName === "TEXTAREA") {
                if (input.value.trim() === "") {
                    showError(input, "Reason is required");
                    isValid = false;
                } else if (/\d/.test(input.value)) {
                    showError(input, "Text area cannot contain numbers");
                    isValid = false;
                }
            }
        });

      
        const allDates = form.querySelectorAll("input[placeholder='mm/dd/yyyy']");
        const requestDate = allDates[0].value;
        const startDate = allDates[1].value;
        const endDate = allDates[2].value;

        if (isValidDate(requestDate) && isValidDate(startDate) && isValidDate(endDate)) {
            const req = new Date(requestDate);
            const start = new Date(startDate);
            const end = new Date(endDate);

            if (!(req < start && start < end)) {
                allDates.forEach(d => showError(d, "Request < Start < End date required"));
                isValid = false;
            }
        }

        return isValid;
    }

    function setDefaultDates() {
        const allDates = form.querySelectorAll("input[placeholder='mm/dd/yyyy']");
       

        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);
        const endDate = new Date();
        endDate.setDate(tomorrow.getDate() + 5);

        function formatDate(d) {
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const yyyy = d.getFullYear();
            return `${mm}/${dd}/${yyyy}`;
        }

        requestDateInput.value = formatDate(today);
        startDateInput.value = formatDate(tomorrow);
        endDateInput.value = formatDate(endDate);
    }

   
    function loadDraft() {
        const savedDraft = localStorage.getItem("timeoffDraft");
        if (savedDraft) {
            const draftData = JSON.parse(savedDraft);
            inputs.forEach(input => {
                if (draftData[input.name]) input.value = draftData[input.name];
            });
        }
    }

    saveDraftBtn.addEventListener("click", () => {
        let isEmpty = true;

        inputs.forEach(input => {
            if (input.value.trim() !== "" && !input.value.includes("Select")) {
                isEmpty = false;
            }
        });

        if (isEmpty) {
            showNotification("Please fill the form before saving ❌", "error");
            return;
        }

        const draft = {};
        inputs.forEach(input => {
            if (input.name) draft[input.name] = input.value;
        });
        localStorage.setItem("timeoffDraft", JSON.stringify(draft));
        showNotification("Draft saved successfully ✅", "success");
    });

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        if (validateForm()) {
            const requestData = {};
            inputs.forEach(input => {
                if (input.name) requestData[input.name] = input.value;
            });

            console.log("Time Off Request Submitted:", requestData);
            showNotification("Request submitted successfully 🚀", "success");
            form.reset();
            setDefaultDates(); 
            localStorage.removeItem("timeoffDraft"); 
        } else {
            showNotification("Please correct the highlighted errors ❌", "error");
        }
    });


    const phoneInput = form.querySelector("input[placeholder*='Name and phone']");
    if (phoneInput) {
        phoneInput.addEventListener("input", () => {
            phoneInput.value = phoneInput.value.replace(/\D/g, "");
        });
    }

    const textareas = form.querySelectorAll("textarea");
    textareas.forEach(textarea => {
        textarea.addEventListener("input", () => {
            textarea.value = textarea.value.replace(/[0-9]/g, "");
        });
    });

    setDefaultDates();
    loadDraft(); 
});


function updateLeaveBalance() {
    const leaveTotal = document.querySelector('.leave-total h2');
    if (leaveTotal) {
        leaveTotal.textContent = '15';
    }
    
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

    activityList.insertBefore(activityItem, activityList.firstChild);

    const items = activityList.querySelectorAll('.activity-item');
    if (items.length > 5) {
        items[items.length - 1].remove();
    }
}

function showNotification(title, message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
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
  
    document.body.appendChild(notification);
    
    
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
    
   
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
        timeElement.textContent = now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }
   
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
        if (window.electronAPI) {
            await electronAPI.saveState(state);
        } else {
            // Fallback: save to localStorage
            localStorage.setItem('mdm-security-state', JSON.stringify(state));
        }
    } catch (error) {
        console.error('Failed to save state:', error);
    }
}

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
    const profileForm = document.querySelector('.settings-form');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileSettingsSubmit);
    }
    
    const passwordForm = document.querySelector('.password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordChange);
    }
    
    const newPasswordInput = document.getElementById('newPassword');
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', checkPasswordStrength);
    }
    
   
    const uploadBtn = document.querySelector('.profile-picture-upload .btn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', handleProfilePictureUpload);
    }
    
    const notificationToggles = document.querySelectorAll('.settings-option .switch input[type="checkbox"]');
    notificationToggles.forEach(toggle => {
        toggle.addEventListener('change', handleNotificationSettingChange);
    });
    
    const darkModeToggle = document.querySelector('.settings-option .switch input[type="checkbox"]:not([checked])');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', handleDarkModeToggle);
    }
    
    const languageSelect = document.querySelector('.form-group select');
    if (languageSelect) {
        languageSelect.addEventListener('change', handleLanguageChange);
    }
    
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
    
    
    if (!profileData.fullName || !profileData.email) {
        showNotification('Error', 'Please fill in all required fields', 'error');
        return;
    }
    
    if (!isValidEmail(profileData.email)) {
        showNotification('Error', 'Please enter a valid email address', 'error');
        return;
    }
    
    saveProfileData(profileData);
    
    updateProfileDisplay(profileData);
    
    showNotification('Success', 'Profile settings saved successfully!', 'success');
}

function handlePasswordChange(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    
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
    
    
    const strength = getPasswordStrength(newPassword);
    if (strength === 'weak') {
        showNotification('Warning', 'Password is too weak. Please choose a stronger password.', 'warning');
        return;
    }
    
    
    showNotification('Success', 'Password changed successfully!', 'success');
    
   
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
    
    
    strengthFill.classList.remove('weak', 'fair', 'good', 'strong');
   
    strengthFill.classList.add(strength);
    
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
    
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    if (score <= 2) return 'weak';
    if (score <= 3) return 'fair';
    if (score <= 4) return 'good';
    return 'strong';
}

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

window.savePersonalInfo = function(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    if (!data.fullName || !data.email) {
        showNotification('Error', 'Please fill in all required fields', 'error');
        return;
    }
    
    localStorage.setItem('personalInfo', JSON.stringify(data));
    
    
    updatePersonalInfoDisplay(data);
    
    showNotification('Success', 'Personal information saved successfully!', 'success');
};

window.saveWorkInfo = function(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    if (!data.department || !data.position) {
        showNotification('Error', 'Please fill in all required fields', 'error');
        return;
    }
    
    localStorage.setItem('workInfo', JSON.stringify(data));
    
    updateWorkInfoDisplay(data);
    
    showNotification('Success', 'Work information saved successfully!', 'success');
};

window.cancelEdit = function(gridId) {
    const grid = document.getElementById(gridId);
    
    if (gridId === 'personalInfoGrid') {
        const savedData = localStorage.getItem('personalInfo');
        if (savedData) {
            updatePersonalInfoDisplay(JSON.parse(savedData));
        } else {
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
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { 
                showNotification('Error', 'File size must be less than 5MB', 'error');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.querySelector('.profile-picture-preview');
                if (preview) {
                    preview.innerHTML = `<img src="${e.target.result}" alt="Profile Picture" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
                }
                
                
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
    
    localStorage.setItem('darkMode', isDarkMode);
    
    showNotification('Success', `Dark mode ${isDarkMode ? 'enabled' : 'disabled'}`, 'success');
}

function handleLanguageChange(e) {
    const language = e.target.value;
    
    localStorage.setItem('language', language);
    
    showNotification('Success', `Language changed to ${language}`, 'success');
}

function saveProfileData(profileData) {
    localStorage.setItem('profileData', JSON.stringify(profileData));
    
    console.log('Profile data saved:', profileData);
}

function updateProfileDisplay(profileData) {
    const profileName = document.querySelector('.profile-info h2');
    if (profileName) {
        profileName.textContent = profileData.fullName;
    }
    
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
    
    const form = document.querySelector('.settings-form');
    if (form) {
        form.querySelector('input[type="text"]').value = profileData.fullName;
        form.querySelector('input[type="email"]').value = profileData.email;
        form.querySelector('input[type="tel"]').value = profileData.phone;
        form.querySelectorAll('input[type="text"]')[1].value = profileData.department;
    }
}

function loadSavedSettings() {
    const savedProfileData = localStorage.getItem('profileData');
    if (savedProfileData) {
        const profileData = JSON.parse(savedProfileData);
        updateProfileDisplay(profileData);
    }
    
    const savedPersonalInfo = localStorage.getItem('personalInfo');
    if (savedPersonalInfo) {
        updatePersonalInfoDisplay(JSON.parse(savedPersonalInfo));
    }
    
   
    const savedWorkInfo = localStorage.getItem('workInfo');
    if (savedWorkInfo) {
        updateWorkInfoDisplay(JSON.parse(savedWorkInfo));
    }
    
    
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
    
    const darkMode = localStorage.getItem('darkMode') === 'true';
    const darkModeToggle = document.querySelector('.settings-option .switch input[type="checkbox"]:not([checked])');
    if (darkModeToggle && darkMode) {
        darkModeToggle.checked = true;
        document.body.classList.add('dark-mode');
    }
    
    
    const language = localStorage.getItem('language');
    const languageSelect = document.querySelector('.form-group select');
    if (languageSelect && language) {
        languageSelect.value = language;
    }
    
   
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


function setupDashboardEventListeners() {
 
    const refreshActivityBtn = document.getElementById('refreshActivityBtn');
    if (refreshActivityBtn) {
        refreshActivityBtn.addEventListener('click', loadRecentActivity);
    }
    
 
    const refreshEventsBtn = document.getElementById('refreshEventsBtn');
    if (refreshEventsBtn) {
        refreshEventsBtn.addEventListener('click', loadUpcomingEvents);
    }
    
   
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


const API_BASE_URL = 'http://localhost:8080/api';

async function loadDashboardData() {
    try {
        const response = await fetch(`${API_BASE_URL}/dashboard`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const dashboardData = await response.json();
        
        updateDashboardWithData(dashboardData);
        
        loadDashboardStats();
        
        loadActivities();
        loadEvents();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        loadDashboardStats();
        loadActivities();
        loadEvents();
    }
}

function updateDashboardWithData(data) {

    updateEmployeeProfile(data.employee_profile);
    

    updateSummaryCards(data.summary_cards);
    
   
    updateTimeTracking(data.time_tracking);
    
   
    updateWeeklyProgress(data.weekly_progress);
    
  
    updateLeaveBalance(data.leave_balance);
    
   
    updateInsights(data.insights);
}

function updateEmployeeProfile(profile) {
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
   
    const todayWorkCard = document.querySelector('.summary-card.today-work .card-content h2');
    const attendanceRateCard = document.querySelector('.summary-card.attendance-rate .card-content h2');
    const thisWeekCard = document.querySelector('.summary-card.this-week .card-content h2');
    
    if (todayWorkCard) {
        const hours = Math.floor(32 / 40); 
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
    
    activityList.innerHTML = `
        <div class="activity-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Loading activities...</span>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE_URL}/dashboard/activities`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const activities = await response.json();
        
        activityList.innerHTML = '';
        
        activities.forEach(activity => {
            const activityItem = createActivityItem(activity);
            activityList.appendChild(activityItem);
        });
    } catch (error) {
        console.error('Error loading activities:', error);
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
    
    eventsList.innerHTML = `
        <div class="events-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Loading events...</span>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE_URL}/dashboard/events`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const events = await response.json();
        
        eventsList.innerHTML = '';
        
        events.forEach(event => {
            const eventItem = createEventItem(event);
            eventsList.appendChild(eventItem);
        });
    } catch (error) {
        console.error('Error loading events:', error);
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

 function updateDateTime() {
    const timeElement = document.getElementById('currentTime');
    const dateElement = document.getElementById('currentDate');

    const now = new Date();

    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    timeElement.textContent = `${hours}:${minutes}`;

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = now.toLocaleDateString(undefined, options);
    dateElement.textContent = formattedDate;
  }

  updateDateTime();

  setInterval(updateDateTime, 60000);


  function showToast(message, type = "success", duration = 3000) {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 100);
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => container.removeChild(toast), 300);
    }, duration);
}

// --- Search Function ---
function handleSearch() {
    const searchInput = document.getElementById('dashboardSearch');
    const query = searchInput.value.trim();

    if (!query) { showToast("Please enter a search term", "warning"); return; }

    const dashboard = document.getElementById('dashboard');
    if (!dashboard) { showToast("Dashboard container not found", "error"); return; }

    dashboard.querySelectorAll('.search-highlight').forEach(el => {
        const parent = el.parentNode;
        parent.replaceChild(document.createTextNode(el.textContent), el);
    });

    const elements = dashboard.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div');
    const regex = new RegExp(`\\b${query}\\b`, 'gi');
    let firstEl = null;

    elements.forEach(el => {
        if (regex.test(el.textContent)) {
            el.innerHTML = el.innerHTML.replace(regex, match => {
                if (!firstEl) firstEl = el;
                return `<span class="search-highlight">${match}</span>`;
            });
        }
    });

    if (firstEl) firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    else showToast(`No results found for "${query}"`, "warning");
}

document.getElementById("searchBtn").addEventListener("click", handleSearch);
document.getElementById("dashboardSearch").addEventListener("keypress", function (e) {
    if (e.key === "Enter") handleSearch();
});

// --- Profile Dropdown ---
const userProfile = document.getElementById("userProfile");
const profileDropdown = document.getElementById("profileDropdown");

userProfile.addEventListener("click", () => {
    profileDropdown.style.display = profileDropdown.style.display === "flex" ? "none" : "flex";
});

// --- Profile Buttons ---
document.getElementById("viewProfileBtn").addEventListener("click", () => {
    showToast("Redirecting to profile page...", "success");
});

document.getElementById("logoutBtn").addEventListener("click", () => {
    showToast("Logging out...", "success");
});

// UI Initialization
function initializeUI() {
    console.log('Initializing UI elements...');
    
    // Ensure all sections are properly displayed
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        if (section.id === 'dashboard') {
            section.classList.add('active');
        } else {
            section.classList.remove('active');
        }
    });
    
    // Initialize navigation
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        if (item.querySelector('a[href="#dashboard"]')) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Ensure buttons are properly styled
    updateButtonStates();
    
    // Update statistics
    updateStatistics();
    
    // Test that main content is visible
    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
        console.log('Dashboard section found and active');
    } else {
        console.error('Dashboard section not found!');
    }
    
    console.log('UI initialization complete');
}

// Loading Screen Functions
function showLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.classList.remove('hidden');
    }
}

function hideLoadingScreen() {
    console.log('hideLoadingScreen called');
    const loadingScreen = document.getElementById('loadingScreen');
    console.log('Loading screen element:', loadingScreen);
    
    if (loadingScreen) {
        console.log('Adding hidden class to loading screen');
        loadingScreen.classList.add('hidden');
        
        // Show main content
        const mainContent = document.querySelector('.main-content');
        const header = document.querySelector('.header');
        const sidebar = document.querySelector('.sidebar');
        
        if (mainContent) {
            mainContent.classList.add('loaded');
            console.log('Main content shown');
        }
        
        if (header) {
            header.classList.add('loaded');
            console.log('Header shown');
        }
        
        if (sidebar) {
            sidebar.classList.add('loaded');
            console.log('Sidebar shown');
        }
        
        // Force hide after a short delay
        setTimeout(() => {
            console.log('Force hiding loading screen');
            loadingScreen.style.display = 'none';
            loadingScreen.style.opacity = '0';
            loadingScreen.style.visibility = 'hidden';
            
            // Remove from DOM after animation
            setTimeout(() => {
                if (loadingScreen.parentNode) {
                    console.log('Removing loading screen from DOM');
                    loadingScreen.parentNode.removeChild(loadingScreen);
                }
            }, 100);
        }, 100);
    } else {
        console.log('Loading screen element not found');
    }
}

// Window Controls Setup
function setupWindowControls() {
    // Only show window controls on Windows/Linux
    if (window.electronAPI) {
        const minimizeBtn = document.getElementById('minimizeBtn');
        const maximizeBtn = document.getElementById('maximizeBtn');
        const closeBtn = document.getElementById('closeBtn');

        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', () => {
                try {
                    electronAPI.minimizeWindow();
                } catch (error) {
                    console.error('Error minimizing window:', error);
                }
            });
        }

        if (maximizeBtn) {
            maximizeBtn.addEventListener('click', () => {
                try {
                    electronAPI.maximizeWindow();
                } catch (error) {
                    console.error('Error maximizing window:', error);
                }
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                try {
                    electronAPI.closeWindow();
                } catch (error) {
                    console.error('Error closing window:', error);
                }
            });
        }
    } else {
        // Hide window controls on macOS
        const windowControls = document.getElementById('windowControls');
        if (windowControls) {
            windowControls.style.display = 'none';
        }
    }
}