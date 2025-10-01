/**
 * Professional MDM Security Desktop Application - Renderer Process
 * Expert-level architecture with proper separation of concerns
 */

class ProfessionalMDMApp {
    constructor() {
        this.logger = new Logger('MDMApp');
        this.eventBus = new EventBus();
        this.stateManager = new StateManager(this.eventBus);
        this.uiManager = new UIManager(this.eventBus);
        this.timeTracker = new TimeTracker(this.eventBus);
        this.attendanceService = new AttendanceService(this.eventBus);
        this.notificationService = new NotificationService(this.eventBus);
        
        this.isInitialized = false;
        this.isLoading = true;
    }

    async initialize() {
        try {
            this.logger.info('Initializing Professional MDM Security Desktop App...');
            
            // Show loading screen
            this.showLoadingScreen();
            
            // Initialize services in order
            await this.initializeServices();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize UI
            await this.uiManager.initialize();
            
            // Load initial state
            await this.loadInitialState();
            
            // Hide loading screen
            this.hideLoadingScreen();
            
            this.isInitialized = true;
            this.isLoading = false;
            
            this.logger.info('Application initialized successfully');
            this.eventBus.emit('app:initialized');
            
        } catch (error) {
            this.logger.error('Failed to initialize application:', error);
            this.handleInitializationError(error);
        }
    }

    async initializeServices() {
        // Initialize state manager
        await this.stateManager.initialize();
        
        // Initialize time tracker
        await this.timeTracker.initialize();
        
        // Initialize attendance service
        await this.attendanceService.initialize();
        
        // Initialize notification service
        await this.notificationService.initialize();
    }

    setupEventListeners() {
        // App lifecycle events
        this.eventBus.on('app:ready', this.onAppReady.bind(this));
        this.eventBus.on('app:error', this.onAppError.bind(this));
        
        // State events
        this.eventBus.on('state:changed', this.onStateChanged.bind(this));
        this.eventBus.on('state:loaded', this.onStateLoaded.bind(this));
        
        // Time tracking events
        this.eventBus.on('time:checkin', this.onCheckIn.bind(this));
        this.eventBus.on('time:checkout', this.onCheckOut.bind(this));
        this.eventBus.on('time:break-start', this.onBreakStart.bind(this));
        this.eventBus.on('time:break-end', this.onBreakEnd.bind(this));
        
        // UI events
        this.eventBus.on('ui:navigation', this.onNavigation.bind(this));
        this.eventBus.on('ui:theme-changed', this.onThemeChanged.bind(this));
        
        // Window events
        window.addEventListener('beforeunload', this.onBeforeUnload.bind(this));
        window.addEventListener('online', this.onOnline.bind(this));
        window.addEventListener('offline', this.onOffline.bind(this));
    }

    async loadInitialState() {
        try {
            const state = await this.stateManager.load();
            this.logger.info('Initial state loaded:', state);
            this.eventBus.emit('state:loaded', state);
        } catch (error) {
            this.logger.error('Failed to load initial state:', error);
            // Continue with default state
        }
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
        
        // Show main content
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

    handleInitializationError(error) {
        this.hideLoadingScreen();
        
        // Show error message
        this.uiManager.showError('Failed to initialize application', error.message);
        
        // Log error
        this.logger.error('Initialization error:', error);
    }

    // Event handlers
    onAppReady() {
        this.logger.info('Application is ready');
    }

    onAppError(error) {
        this.logger.error('Application error:', error);
        this.uiManager.showError('Application Error', error.message);
    }

    onStateChanged(data) {
        this.logger.debug('State changed:', data);
        this.uiManager.updateUI(data);
    }

    onStateLoaded(state) {
        this.logger.info('State loaded:', state);
        this.uiManager.updateUI(state);
    }

    onCheckIn(data) {
        this.logger.info('Check in:', data);
        this.attendanceService.handleCheckIn(data);
    }

    onCheckOut(data) {
        this.logger.info('Check out:', data);
        this.attendanceService.handleCheckOut(data);
    }

    onBreakStart(data) {
        this.logger.info('Break start:', data);
        this.timeTracker.startBreak(data);
    }

    onBreakEnd(data) {
        this.logger.info('Break end:', data);
        this.timeTracker.endBreak(data);
    }

    onNavigation(data) {
        this.logger.debug('Navigation:', data);
        this.uiManager.handleNavigation(data);
    }

    onThemeChanged(theme) {
        this.logger.info('Theme changed:', theme);
        this.uiManager.applyTheme(theme);
    }

    onBeforeUnload(event) {
        if (this.isLoading) {
            event.preventDefault();
            event.returnValue = '';
        }
    }

    onOnline() {
        this.logger.info('Application is online');
        this.eventBus.emit('app:online');
    }

    onOffline() {
        this.logger.info('Application is offline');
        this.eventBus.emit('app:offline');
    }

    // Public API
    getStateManager() {
        return this.stateManager;
    }

    getUIManager() {
        return this.uiManager;
    }

    getTimeTracker() {
        return this.timeTracker;
    }

    getAttendanceService() {
        return this.attendanceService;
    }

    getEventBus() {
        return this.eventBus;
    }

    getLogger() {
        return this.logger;
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Load compatibility layer first
    await loadCompatibilityLayer();
    
    // Initialize the professional app
    const app = new ProfessionalMDMApp();
    await app.initialize();
    
    // Make app globally available for debugging
    window.mdmApp = app;
});

// Load compatibility layer
async function loadCompatibilityLayer() {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.type = 'module';
        script.src = './src/renderer/app-compat.js';
        script.onload = resolve;
        document.head.appendChild(script);
    });
}
