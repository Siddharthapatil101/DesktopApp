/**
 * Professional notification service for renderer process
 */

class NotificationService {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.notifications = [];
        this.isEnabled = true;
    }

    async initialize() {
        console.log('Notification service initialized');
    }

    show(title, message, type = 'info', duration = 5000) {
        if (!this.isEnabled) return;

        const notification = {
            id: Date.now(),
            title,
            message,
            type,
            timestamp: new Date(),
            duration
        };

        this.notifications.push(notification);
        this.renderNotification(notification);

        // Auto-remove after duration
        setTimeout(() => {
            this.remove(notification.id);
        }, duration);

        return notification.id;
    }

    renderNotification(notification) {
        const container = this.getNotificationContainer();
        const element = document.createElement('div');
        element.className = `notification notification-${notification.type}`;
        element.setAttribute('data-id', notification.id);
        
        element.innerHTML = `
            <div class="notification-content">
                <div class="notification-header">
                    <h4>${notification.title}</h4>
                    <button class="notification-close" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
                <p>${notification.message}</p>
            </div>
        `;

        container.appendChild(element);

        // Animate in
        setTimeout(() => {
            element.classList.add('show');
        }, 100);
    }

    remove(id) {
        const element = document.querySelector(`[data-id="${id}"]`);
        if (element) {
            element.classList.add('hide');
            setTimeout(() => {
                if (element.parentElement) {
                    element.remove();
                }
            }, 300);
        }

        this.notifications = this.notifications.filter(n => n.id !== id);
    }

    getNotificationContainer() {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
        return container;
    }

    clear() {
        this.notifications.forEach(notification => {
            this.remove(notification.id);
        });
    }

    enable() {
        this.isEnabled = true;
    }

    disable() {
        this.isEnabled = false;
        this.clear();
    }

    // Convenience methods
    success(title, message, duration) {
        return this.show(title, message, 'success', duration);
    }

    error(title, message, duration) {
        return this.show(title, message, 'error', duration);
    }

    warning(title, message, duration) {
        return this.show(title, message, 'warning', duration);
    }

    info(title, message, duration) {
        return this.show(title, message, 'info', duration);
    }
}

export { NotificationService };