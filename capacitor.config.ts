import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.75507a907e2b421c9e2d6aa7effd7c93',
  appName: 'santiyem-io',
  webDir: 'dist',
  server: {
    url: 'https://75507a90-7e2b-421c-9e2d-6aa7effd7c93.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  // Custom URL scheme used by iyzico deep-link callback (santiyem://odeme-sonucu?...)
  ios: {
    scheme: 'santiyem',
  },
};

export default config;
