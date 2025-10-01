/**
 * Professional menu management for Electron application
 */

const { Menu, shell } = require('electron');

class MenuManager {
    constructor() {
        this.menu = null;
    }

    setup() {
        try {
            this.createMenu();
            Menu.setApplicationMenu(this.menu);
            console.log('Application menu created successfully');
        } catch (error) {
            console.error('Failed to create application menu:', error);
        }
    }

    createMenu() {
        const template = [
            {
                label: 'File',
                submenu: [
                    {
                        label: 'New Session',
                        accelerator: 'CmdOrCtrl+N',
                        click: () => {
                            this.emit('menu:new-session');
                        }
                    },
                    {
                        label: 'Export Data',
                        accelerator: 'CmdOrCtrl+E',
                        click: () => {
                            this.emit('menu:export-data');
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'Quit',
                        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                        click: () => {
                            this.emit('menu:quit');
                        }
                    }
                ]
            },
            {
                label: 'Edit',
                submenu: [
                    { role: 'undo' },
                    { role: 'redo' },
                    { type: 'separator' },
                    { role: 'cut' },
                    { role: 'copy' },
                    { role: 'paste' },
                    { role: 'selectall' }
                ]
            },
            {
                label: 'View',
                submenu: [
                    { role: 'reload' },
                    { role: 'forceReload' },
                    { role: 'toggleDevTools' },
                    { type: 'separator' },
                    { role: 'resetZoom' },
                    { role: 'zoomIn' },
                    { role: 'zoomOut' },
                    { type: 'separator' },
                    { role: 'togglefullscreen' }
                ]
            },
            {
                label: 'Window',
                submenu: [
                    { role: 'minimize' },
                    { role: 'close' }
                ]
            },
            {
                label: 'Help',
                submenu: [
                    {
                        label: 'About MDM Security',
                        click: () => {
                            this.emit('menu:about');
                        }
                    },
                    {
                        label: 'Documentation',
                        click: () => {
                            shell.openExternal('https://mdmsecurity.com/docs');
                        }
                    },
                    {
                        label: 'Support',
                        click: () => {
                            shell.openExternal('https://mdmsecurity.com/support');
                        }
                    }
                ]
            }
        ];

        // macOS specific menu adjustments
        if (process.platform === 'darwin') {
            template.unshift({
                label: 'MDM Security',
                submenu: [
                    { role: 'about' },
                    { type: 'separator' },
                    { role: 'services' },
                    { type: 'separator' },
                    { role: 'hide' },
                    { role: 'hideothers' },
                    { role: 'unhide' },
                    { type: 'separator' },
                    { role: 'quit' }
                ]
            });

            // Window menu
            template[4].submenu = [
                { role: 'close' },
                { role: 'minimize' },
                { role: 'zoom' },
                { type: 'separator' },
                { role: 'front' }
            ];
        }

        this.menu = Menu.buildFromTemplate(template);
    }

    emit(event, data) {
        // This would typically emit to the main app's event system
        console.log(`Menu event: ${event}`, data);
    }

    getMenu() {
        return this.menu;
    }

    updateMenu(template) {
        try {
            this.menu = Menu.buildFromTemplate(template);
            Menu.setApplicationMenu(this.menu);
        } catch (error) {
            console.error('Failed to update menu:', error);
        }
    }
}

module.exports = MenuManager;
