import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.bizpocket.app',
  appName: 'BizPocket',
  webDir: 'out',
  server: {
    url: 'https://www.bizpocket.io',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
    },
  },
};

export default config;
