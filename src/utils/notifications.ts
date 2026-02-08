import { getPlatform } from './platform';

export type NotifyPermission = NotificationPermission | 'unavailable';

export async function requestNotificationPermission(): Promise<NotifyPermission> {
  const platform = getPlatform();

  // Electron — разрешение не нужно (кастомные окна)
  if (platform === 'electron') return 'granted';

  // Native (Capacitor) — LocalNotifications
  if ((window as any).Capacitor) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const res = await LocalNotifications.requestPermissions();
      return res.display === 'granted' ? 'granted' : 'denied';
    } catch {
      return 'unavailable';
    }
  }

  // Web/PWA
  if (!('Notification' in window)) return 'unavailable';
  return await Notification.requestPermission(); // 'default' | 'denied' | 'granted'
}

export async function showMessageNotification(opts: {
  title: string;
  body: string;
  avatar?: string;
  chatId?: string;
}) {
  const platform = getPlatform();

  // Electron custom notif
  if (platform === 'electron' && (window as any).electronAPI?.showNotification) {
    (window as any).electronAPI.showNotification({
      title: opts.title,
      body: opts.body,
      avatar: opts.avatar,
    });
    return;
  }

  // Native (Capacitor)
  if ((window as any).Capacitor) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.schedule({
        notifications: [{
          id: Math.floor(Date.now() % 2147483647),
          title: opts.title,
          body: (opts.body || '').slice(0, 140),
          schedule: { at: new Date(Date.now() + 50) },
          extra: { chatId: opts.chatId || '' },
        }],
      });
    } catch {}
    return;
  }

  // Web
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  // Не спамим, если вкладка активна
  if (document.hasFocus()) return;

  const n = new Notification(opts.title, {
    body: (opts.body || '').slice(0, 140),
    icon: opts.avatar || '/pwa-192x192.png',
    tag: 'og-msg-' + Date.now(),
    silent: false,
  });

  n.onclick = () => {
    window.focus();
    n.close();
  };

  setTimeout(() => n.close(), 5000);
}

export async function initNativeNotificationClickHandler(onOpenChat: (chatId: string) => void) {
  if (!(window as any).Capacitor) return;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.addListener('localNotificationActionPerformed', (ev) => {
      const chatId = (ev.notification as any)?.extra?.chatId;
      if (chatId) onOpenChat(chatId);
    });
  } catch {}
}

let audioCtx: AudioContext | null = null;
export function playNotificationSound() {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.22);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.22);
  } catch {}
}
  