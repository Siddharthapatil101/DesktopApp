const leaveBalances = {
    vacation: { total: 20, used: 8, remaining: 12 },
    sick: { total: 15, used: 5, remaining: 10 },
    personal: { total: 10, used: 5, remaining: 5 }
};

let leaveRequests = [
    {
        id: 1,
        type: 'vacation',
        duration: 'full',
        startDate: '2024-01-10',
        endDate: '2024-01-12',
        status: 'approved',
        reason: 'Family vacation'
    },
    {
        id: 2,
        type: 'sick',
        duration: 'full',
        startDate: '2024-01-15',
        endDate: '2024-01-15',
        status: 'pending',
        reason: 'Doctor appointment'
    }
];

document.addEventListener('DOMContentLoaded', () => {
    try {
        setupNavigation();
        initializeTimeOff();
        subscribeToStateUpdates();
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const contentSections = document.querySelectorAll('.content-section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            navLinks.forEach(l => l.classList.remove('active'));
            contentSections.forEach(s => s.classList.remove('active'));
            
            link.classList.add('active');
            
            const targetId = link.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
                
                if (targetId === 'timeoff') {
                    initializeTimeOff();
                }
            }
        });
    });

    if (window.location.hash) {
        const targetLink = document.querySelector(`a[href="${window.location.hash}"]`);
        if (targetLink) {
            targetLink.click();
        }
    }
}

function initializeTimeOff() {
    const timeOffSection = document.getElementById('timeoff');
    if (!timeOffSection || !timeOffSection.classList.contains('active')) {
        return; 
    }

    try {
        setupQuickLeaveForm();
        setupLeaveBalanceDisplay();
        setupLeaveRequestsTable();
        console.log('Time Off section initialized successfully');
    } catch (error) {
        console.error('Error during Time Off initialization:', error.message);
        showNotification('Failed to initialize Time Off section. Please refresh the page.', 'error');
    }
}

function subscribeToStateUpdates() {
    subscribeToState('timeOff', (state) => {
        updateLeaveBalances(state.balances);
        updateLeaveRequestsTable(state.requests);
    });
}

function setupQuickLeaveForm() {
    const form = document.getElementById('quickLeaveForm');
    const typeSelect = document.getElementById('quickLeaveType');
    const durationSelect = document.getElementById('quickLeaveDuration');
    const startDate = document.getElementById('quickLeaveStartDate');
    const endDate = document.getElementById('quickLeaveEndDate');
    const balanceDisplay = document.getElementById('leaveBalanceDisplay');

    const today = new Date().toISOString().split('T')[0];
    startDate.min = today;
    if (endDate) endDate.min = today;

    durationSelect.addEventListener('change', () => {
        const endDateField = document.querySelector('.end-date-field');
        endDateField.style.display = durationSelect.value === 'multiple' ? 'block' : 'none';
        endDate.required = durationSelect.value === 'multiple';
    });

    typeSelect.addEventListener('change', () => {
        const selectedType = typeSelect.value;
        const balance = AppState.timeOff.balances[selectedType];
        if (balance) {
            balanceDisplay.textContent = `${balance.remaining} days`;
        } else {
            balanceDisplay.textContent = '-- days';
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const formData = {
            type: typeSelect.value,
            duration: durationSelect.value,
            startDate: startDate.value,
            endDate: endDate.value,
            reason: document.getElementById('quickLeaveReason').value
        };

        if (formData.duration === 'multiple' && formData.endDate <= formData.startDate) {
            showNotification('Error', 'End date must be after start date', 'error');
            return;
        }

        let days = 1;
        if (formData.duration === 'multiple') {
            const start = new Date(formData.startDate);
            const end = new Date(formData.endDate);
            days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        } else if (formData.duration.startsWith('half')) {
            days = 0.5;
        }

        const balance = AppState.timeOff.balances[formData.type];
        if (days > balance.remaining) {
            showNotification('Error', 'Insufficient leave balance', 'error');
            return;
        }

        const request = {
            id: Date.now(),
            type: formData.type,
            startDate: formData.startDate,
            endDate: formData.duration === 'multiple' ? formData.endDate : formData.startDate,
            duration: days,
            reason: formData.reason,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        const newBalance = {
            ...balance,
            used: balance.used + days,
            remaining: balance.remaining - days
        };

        updateTimeOffState({
            balances: {
                ...AppState.timeOff.balances,
                [formData.type]: newBalance
            },
            requests: [...AppState.timeOff.requests, request]
        });
        bootstrap.Modal.getInstance(document.getElementById('quickLeaveModal')).hide();
        showNotification('Success', 'Leave request submitted successfully');

        form.reset();
        balanceDisplay.textContent = '-- days';
        document.querySelector('.end-date-field').style.display = 'none';
    });
}

function setupLeaveBalanceDisplay() {
    updateLeaveBalances(AppState.timeOff.balances);
}

function updateLeaveBalances(balances) {
    Object.entries(balances).forEach(([type, balance]) => {
        const container = document.querySelector(`.balance-item[data-type="${type}"]`);
        if (container) {
            const progressBar = container.querySelector('.progress-bar');
            const balanceValue = container.querySelector('.balance-value');
            
            const percentage = (balance.remaining / balance.total) * 100;
            progressBar.style.width = `${percentage}%`;
            balanceValue.textContent = `${balance.remaining} days left`;
        }
    });
}

function setupLeaveRequestsTable() {
    updateLeaveRequestsTable(AppState.timeOff.requests);
}

function updateLeaveRequestsTable(requests) {
    const tbody = document.querySelector('#leaveRequestsTable tbody');
    if (!tbody) return;

    const sortedRequests = [...requests].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );

    tbody.innerHTML = sortedRequests.map(request => `
        <tr>
            <td>
                <span class="leave-type-badge ${request.type}">
                    ${request.type.charAt(0).toUpperCase() + request.type.slice(1)}
                </span>
            </td>
            <td>${request.duration} day${request.duration === 1 ? '' : 's'}</td>
            <td>${formatDate(request.startDate)}</td>
            <td>${formatDate(request.endDate)}</td>
            <td>
                <span class="status-badge ${request.status}">
                    <i class="fas fa-${getStatusIcon(request.status)}"></i>
                    ${request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    ${request.status === 'pending' ? `
                        <button class="btn btn-icon edit" onclick="editLeaveRequest(${request.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-icon delete" onclick="cancelLeaveRequest(${request.id})">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function getStatusIcon(status) {
    switch (status) {
        case 'approved': return 'check-circle';
        case 'rejected': return 'times-circle';
        case 'pending': return 'clock';
        default: return 'question-circle';
    }
}

function editLeaveRequest(id) {
    const request = AppState.timeOff.requests.find(r => r.id === id);
    if (!request) return;

    const form = document.getElementById('quickLeaveForm');
    form.querySelector('#quickLeaveType').value = request.type;
    form.querySelector('#quickLeaveDuration').value = request.startDate === request.endDate ? 'full' : 'multiple';
    form.querySelector('#quickLeaveStartDate').value = request.startDate;
    form.querySelector('#quickLeaveEndDate').value = request.endDate;
    form.querySelector('#quickLeaveReason').value = request.reason;

    const endDateField = document.querySelector('.end-date-field');
    endDateField.style.display = request.startDate === request.endDate ? 'none' : 'block';

    new bootstrap.Modal(document.getElementById('quickLeaveModal')).show();

    cancelLeaveRequest(id);
}

function cancelLeaveRequest(id) {
    const request = AppState.timeOff.requests.find(r => r.id === id);
    if (!request || request.status !== 'pending') return;

    const balance = AppState.timeOff.balances[request.type];
    const newBalance = {
        ...balance,
        used: balance.used - request.duration,
        remaining: balance.remaining + request.duration
    };

    updateTimeOffState({
        balances: {
            ...AppState.timeOff.balances,
            [request.type]: newBalance
        },
        requests: AppState.timeOff.requests.filter(r => r.id !== id)
    });

    showNotification('Success', 'Leave request cancelled successfully');
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    container.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 5000);
} 