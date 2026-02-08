export {};
declare global {
  interface Window {
    global: typeof globalThis;
    electronAPI?: {
      platform: string;
      isElectron: boolean;
      showNotification: (data: { title: string; body: string; avatar?: string }) => Promise<void>;
      focusWindow: () => Promise<void>;
    };
    Capacitor?: {
      getPlatform: () => string;
    };
  }
}
