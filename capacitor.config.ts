import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.oriongram.app',
  appName: 'OrionGram',
  webDir: 'dist',
  server: {
    // Для разработки — подключение к локальному серверу
    // url: 'http://192.168.1.XXX:5173',
    // cleartext: true,
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#141218',
      showSpinner: true,
      spinnerColor: '#D0BCFF',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#141218',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
