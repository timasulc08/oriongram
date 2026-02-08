export {};

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      checkUpdates: () => Promise<
        | { ok: true; updateAvailable: boolean; current: string; latest: string; url: string }
        | { ok: false; error: string; tag?: string }
      >;
      openExternal: (url: string) => Promise<void>;
      onGoogleAuthSuccess: (callback: (token: string) => void) => void;
    };
  }
}


// ===== Electron update checker API =====
declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      checkUpdates: () => Promise<
        | { ok: true; updateAvailable: boolean; current: string; latest: string; url: string }
        | { ok: false; error: string; tag?: string }
      >;
      openExternal: (url: string) => Promise<void>;
      onGoogleAuthSuccess: (callback: (token: string) => void) => void;
    };
  }
}
