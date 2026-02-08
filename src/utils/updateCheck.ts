import { useStore } from '../stores/chatStore';

function isElectron(): boolean {
  return !!(window as any).electronAPI?.isElectron;
}

export async function checkUpdatesOnStartup() {
  if (!isElectron()) return;
  const api = (window as any).electronAPI;
  if (!api?.checkUpdates) return;

  try {
    const r = await api.checkUpdates();

    if (!r?.ok) {
      console.warn('[Updates] check failed:', r?.error);
      return;
    }

    if (r.updateAvailable) {
      useStore.getState().setUpdateBanner({
        open: true,
        latestVersion: r.latest,
        url: r.url,
      });
    }
  } catch (e) {
    console.warn('[Updates] error:', e);
  }
}