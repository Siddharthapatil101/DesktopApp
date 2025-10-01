# MDM Security Desktop Application

A professional employee management and time tracking desktop application built with Electron.js.

## Features

- **Time Tracking**: Check-in/check-out functionality with break management
- **Attendance Management**: Employee attendance tracking and reporting
- **Time Off Management**: Leave request system with approval workflow
- **Dashboard Analytics**: Real-time statistics and progress tracking
- **User Profile Management**: Employee information and settings
- **Professional UI**: Modern, responsive design with dark mode support
- **Cross-Platform**: Runs on Windows, macOS, and Linux

## Tech Stack

- **Electron** (v28.2.3) - Cross-platform desktop framework
- **HTML5/CSS3** - Modern web technologies
- **Vanilla JavaScript** (ES6+) - Client-side scripting
- **Bootstrap 5.3.2** - CSS framework
- **Font Awesome 6.5.1** - Icon library
- **Chart.js 4.4.1** - Data visualization
- **Moment.js 2.30.1** - Date/time manipulation

## Prerequisites

- Node.js (v16 or higher)
- npm (v8 or higher)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mdm-security-desktop
```

2. Install dependencies:
```bash
npm install
```

## Development

### Running the Application

```bash
# Development mode with DevTools
npm run dev

# Production mode
npm start
```

### Building the Application

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux

# Package without installer
npm run pack
```

## Project Structure

```
mdm-security-desktop/
├── main.js              # Electron main process
├── preload.js           # Secure preload script
├── index.html           # Main application UI
├── styles.css           # Application styles
├── renderer.js          # Renderer process logic
├── state.js             # State management
├── timeoff.js           # Time off functionality
├── script.js            # Additional scripts
├── assets/              # Application assets
├── build/               # Build configuration
└── package.json         # Project configuration
```

## Security Features

- **Context Isolation**: Enabled for secure communication
- **Node Integration**: Disabled in renderer process
- **Preload Script**: Secure API exposure
- **External Link Protection**: Prevents unauthorized navigation
- **Certificate Validation**: Proper SSL/TLS handling

## Application Features

### Dashboard
- Real-time time tracking
- Work progress visualization
- Leave balance display
- Quick actions panel
- Recent activity feed

### Time Off Management
- Leave request submission
- Approval workflow
- Balance tracking
- Request history

### Attendance Tracking
- Check-in/check-out functionality
- Break management
- Daily/weekly/monthly reports
- Attendance statistics

### Settings
- Profile management
- Password change
- Notification preferences
- Appearance customization

## Keyboard Shortcuts

- `Ctrl/Cmd + N` - New Session
- `Ctrl/Cmd + E` - Export Data
- `Ctrl/Cmd + Q` - Quit Application
- `F11` - Toggle Fullscreen
- `Ctrl/Cmd + R` - Reload Application

## Building for Distribution

### Windows
- Creates NSIS installer and portable executable
- Supports x64 and ia32 architectures
- Includes desktop and start menu shortcuts

### macOS
- Creates DMG and ZIP packages
- Supports x64 and ARM64 architectures
- Includes hardened runtime and entitlements

### Linux
- Creates AppImage, DEB, and RPM packages
- Supports x64 architecture
- Includes desktop integration

## Development Guidelines

### Code Style
- Use ES6+ features
- Follow consistent naming conventions
- Add comments for complex logic
- Maintain security best practices

### Security
- Never expose Node.js APIs directly to renderer
- Use preload script for secure communication
- Validate all user inputs
- Implement proper error handling

### Performance
- Optimize asset loading
- Use efficient DOM manipulation
- Implement proper memory management
- Monitor application performance

## Troubleshooting

### Common Issues

1. **Application won't start**
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Check for port conflicts

2. **Build failures**
   - Ensure build tools are installed
   - Check platform-specific requirements
   - Verify icon files exist

3. **Security warnings**
   - Update to latest Electron version
   - Review security configurations
   - Check for known vulnerabilities

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the troubleshooting guide

## Version History

- **v1.0.0** - Initial release with core functionality
  - Time tracking and attendance management
  - Professional UI with dark mode
  - Cross-platform support
  - Security hardening
