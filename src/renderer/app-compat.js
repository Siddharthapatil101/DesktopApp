/**
 * Compatibility layer for the new architecture
 * Converts ES6 modules to work with current setup
 */

// Import all modules and make them globally available
import { StateManager } from './state/state-manager.js';
import { UIManager } from './ui/ui-manager.js';
import { TimeTracker } from './services/time-tracker.js';
import { AttendanceService } from './services/attendance-service.js';
import { NotificationService } from './services/notification-service.js';
import { Logger } from './utils/logger.js';
import { EventBus } from './utils/event-bus.js';

// Make classes globally available
window.StateManager = StateManager;
window.UIManager = UIManager;
window.TimeTracker = TimeTracker;
window.AttendanceService = AttendanceService;
window.NotificationService = NotificationService;
window.Logger = Logger;
window.EventBus = EventBus;

console.log('Professional architecture modules loaded');
