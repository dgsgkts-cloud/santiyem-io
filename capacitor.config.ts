import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.75507a907e2b421c9e2d6aa7effd7c93',
  appName: 'santiyem-io',
  webDir: 'dist',
  // Custom URL scheme used by iyzico deep-link callback (santiyem://payment-callback?...)
  ios: {
    scheme: 'santiyem',
  },
  server: {
    url: 'https://75507a90-7e2b-421c-9e2d-6aa7effd7c93.lovableproject.com?forceHideBadge=true',
    cleartext: true,
    androidScheme: 'santiyem',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0F1419',
      showSpinner: false,
    },
    Keyboard: {
      resize: 'body' as any,
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0F1419',
      overlaysWebView: false,
    },
  },
};

export default config;
