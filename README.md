# Incubator Control App

A React Native Expo application for controlling multiple ESP32-based egg incubators over local network via REST API.

## Features

- **Multi-Incubator Support**: Control multiple incubators on the same network
- **Real-time Monitoring**: Live temperature, humidity, and status updates
- **Incubation Management**: Start/stop incubation sessions for different bird species
- **Manual Controls**: Turn eggs, reset timers, restart system
- **Bilingual Interface**: English and Chinese language support
- **Responsive Design**: Works on iOS, Android, and Web

## Prerequisites

- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your mobile device (for testing)
- ESP32-based incubator(s) on the same network

## Installation

1. Clone or download the project
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npx expo start
   ```

## Project Structure

```
incubators-app/
├── app/                    # App entry point
├── components/            # Reusable UI components
├── screens/              # App screens (Dashboard, Settings)
├── services/             # API and localization services
├── locales/              # Translation files (en.json, zh.json)
├── utils/                # Utility functions
├── hooks/                # Custom React hooks
├── store/                # State management (if using Redux/Zustand)
└── assets/               # Images, icons, fonts
```

## API Integration

The app communicates with ESP32 incubators using the following endpoints:

- `GET /api/status` - Get current system status
- `GET/POST /api/config` - Get/update configuration
- `POST /api/command` - Execute commands (turn_now, start_incubation, etc.)
- `GET/POST /api/incubation` - Manage incubation sessions
- `GET /api/system` - Get system information
- `GET /api/time` - Get time information

## Configuration

### Network Discovery
By default, the app looks for incubators at:
- `http://incubator-esp32c.local`
- `http://192.168.1.100`

You can configure custom IP addresses in the Settings screen.

### Language Settings
The app supports English and Chinese. Language can be changed in Settings.

## Development

### Running the App

```bash
# Start development server
npx expo start

# Run on iOS (requires macOS)
npx expo start --ios

# Run on Android
npx expo start --android

# Run on Web
npx expo start --web
```

### Building for Production

```bash
# Build for Android
npx expo build:android

# Build for iOS (requires macOS)
npx expo build:ios

# Build for Web
npx expo build:web
```

## ESP32 Incubator Requirements

The incubator must be running firmware version 2.0.0 or higher with:
- Hostname: `incubator-esp32c`
- Web server on port 80
- REST API endpoints as documented in API_DOCUMENTATION.md

## Testing

1. Ensure your incubator is powered on and connected to WiFi
2. Verify you can access the web interface at `http://incubator-esp32c.local`
3. Run the app and check connection status
4. Test basic controls (turn eggs, check temperature)

## Troubleshooting

### Connection Issues
1. Verify incubator and phone are on the same network
2. Check if you can ping `incubator-esp32c.local`
3. Try using the IP address directly
4. Restart the incubator if needed

### App Issues
1. Clear Expo Go cache: `npx expo start --clear`
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Check Expo SDK compatibility

## License

MIT

## Support

For issues or questions, please refer to the ESP32 incubator documentation or contact the development team.