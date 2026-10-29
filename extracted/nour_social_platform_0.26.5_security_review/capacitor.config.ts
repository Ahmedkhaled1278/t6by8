import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Nūr — Capacitor shell for Android (APK) / iOS.
 *
 * Modes:
 * - Production: set CAPACITOR_SERVER_URL to your HTTPS site (recommended for dynamic social routes).
 * - Bundled: leave server.url unset and load static export from webDir (apps/web/out).
 */
const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: 'app.nour.social',
  appName: 'نُور',
  webDir: 'apps/web/out',
  backgroundColor: '#f8fbfa',
  server: {
    androidScheme: 'https',
    // When set, the native shell loads the live Next.js site (full dynamic routes + SSR).
    ...(serverUrl
      ? {
          url: serverUrl,
          cleartext: serverUrl.startsWith('http://'),
        }
      : {}),
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#08796e',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#08796e',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#f8fbfa',
    webContentsDebuggingEnabled: false,
  },
};

export default config;
