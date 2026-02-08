export type Platform = 'android' | 'ios' | 'electron' | 'web';

export function getPlatform(): Platform {
  // Electron
  if ((window as any).electronAPI?.isElectron) return 'electron';

  // Capacitor (Android/iOS)
  if ((window as any).Capacitor) {
    const platform = (window as any).Capacitor.getPlatform();
    if (platform === 'android') return 'android';
    if (platform === 'ios') return 'ios';
  }

  // User Agent fallback
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return 'android';
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';

  return 'web';
}

export function isMobileDevice(): boolean {
  const p = getPlatform();
  return p === 'android' || p === 'ios';
}

export function isDesktopApp(): boolean {
  return getPlatform() === 'electron';
}

export function isNativeApp(): boolean {
  return !!(window as any).Capacitor;
}
