/* ONEFILE_NOTIFICATIONS_FIX.js
   Запуск: node ONEFILE_NOTIFICATIONS_FIX.js
*/
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = process.cwd();
const isWin = process.platform === 'win32';

function run(cmd, args, opts = {}) {
  console.log(`\n> ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: isWin, // важно для npm/npx на Windows
    ...opts,
  });
  if (r.status !== 0) {
    throw new Error(`Command failed: ${cmd} ${args.join(' ')}`);
  }
}

function backup(file) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) return;
  const bak = full + '.bak';
  if (!fs.existsSync(bak)) {
    fs.copyFileSync(full, bak);
    console.log('  backup:', file, '->', path.basename(bak));
  }
}

function write(file, content) {
  const full = path.join(ROOT, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  backup(file);
  fs.writeFileSync(full, content.trimStart(), 'utf8');
  console.log('  write:', file);
}

function patchAndroidManifest() {
  const manifestPath = path.join(ROOT, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  if (!fs.existsSync(manifestPath)) {
    console.log('  skip: AndroidManifest.xml not found (android platform not added yet)');
    return;
  }
  const xml = fs.readFileSync(manifestPath, 'utf8');
  if (xml.includes('android.permission.POST_NOTIFICATIONS')) {
    console.log('  ok: POST_NOTIFICATIONS already in AndroidManifest.xml');
    return;
  }
  const insertion = `  <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />\n`;
  const patched = xml.replace(/<manifest[^>]*>\s*/i, (m) => m + '\n' + insertion);
  backup('android/app/src/main/AndroidManifest.xml');
  fs.writeFileSync(manifestPath, patched, 'utf8');
  console.log('  patch: AndroidManifest.xml (added POST_NOTIFICATIONS)');
}

function ensureLocalNotificationsDep() {
  const pkgPath = path.join(ROOT, 'package.json');
  if (!fs.existsSync(pkgPath)) throw new Error('package.json not found');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  // Ставим как dependency (можно и devDependency, но удобнее dependency)
  pkg.dependencies = pkg.dependencies || {};
  const wanted = '^6.0.0';
  if (pkg.dependencies['@capacitor/local-notifications'] !== wanted) {
    pkg.dependencies['@capacitor/local-notifications'] = wanted;
    backup('package.json');
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    console.log('  patch: package.json (+ @capacitor/local-notifications@^6.0.0)');
  } else {
    console.log('  ok: @capacitor/local-notifications already set');
  }
}

function main() {
  console.log('\n[ONEFILE] Fix Android/Web/Electron notifications\n');

  // 1) package.json dependency
  ensureLocalNotificationsDep();

  // 2) Patch Android Manifest permission (Android 13+)
  patchAndroidManifest();

  // 3) Write notifications util
  write('src/utils/notifications.ts', `
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
  `);

  // 4) Write notifications hook — IMPORTANT:
  //    мы подписываемся на ПОСЛЕДНЕЕ сообщение каждого чата (limit 1),
  //    иначе уведомления никогда не придут, потому что ты слушаешь messages только в открытом чате.
  write('src/hooks/useNotifications.ts', `
import { useEffect, useRef } from 'react';
import { collection, onSnapshot, orderBy, limit, query } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useStore } from '../stores/chatStore';
import { initNativeNotificationClickHandler, playNotificationSound, requestNotificationPermission, showMessageNotification } from '../utils/notifications';

export function useNotifications() {
  const myProfile = useStore(s => s.myProfile);
  const chats = useStore(s => s.chats);
  const currentChatId = useStore(s => s.currentChatId);
  const setCurrentChat = useStore(s => s.setCurrentChat);

  const notificationsEnabled = useStore(s => s.notificationsEnabled);
  const notificationsSound = useStore(s => s.notificationsSound);

  // per-chat last notified message id
  const lastMsgIdRef = useRef(new Map<string, string>());
  const unsubsRef = useRef(new Map<string, () => void>());
  const initializedRef = useRef(false);

  useEffect(() => {
    initNativeNotificationClickHandler((chatId) => setCurrentChat(chatId));
  }, []);

  useEffect(() => {
    if (!notificationsEnabled) return;
    requestNotificationPermission();
  }, [notificationsEnabled]);

  useEffect(() => {
    // очистка старых подписок
    for (const [chatId, unsub] of unsubsRef.current.entries()) {
      if (!chats.find(c => c.id === chatId)) {
        unsub();
        unsubsRef.current.delete(chatId);
        lastMsgIdRef.current.delete(chatId);
      }
    }

    if (!notificationsEnabled) {
      // если выключили — отписываемся от всего
      for (const [, unsub] of unsubsRef.current.entries()) unsub();
      unsubsRef.current.clear();
      lastMsgIdRef.current.clear();
      initializedRef.current = false;
      return;
    }

    if (!myProfile?.id) return;

    // подписка на последний msg каждого чата
    for (const chat of chats) {
      if (chat.isSavedMessages) continue; // не уведомляем по избранному

      if (unsubsRef.current.has(chat.id)) continue;

      const q = query(
        collection(db, 'chats', chat.id, 'messages'),
        orderBy('date', 'desc'),
        limit(1)
      );

      const unsub = onSnapshot(q, (snap) => {
        if (snap.empty) return;

        const doc0 = snap.docs[0];
        const msgId = doc0.id;
        const data: any = doc0.data();

        // первая инициализация: запоминаем, но не уведомляем
        if (!initializedRef.current) {
          lastMsgIdRef.current.set(chat.id, msgId);
          return;
        }

        const lastId = lastMsgIdRef.current.get(chat.id);
        if (lastId === msgId) return; // ничего нового
        lastMsgIdRef.current.set(chat.id, msgId);

        // не уведомлять о своих
        if (data.senderId === myProfile.id) return;

        // если чат открыт и приложение в фокусе — не уведомляем
        if (chat.id === currentChatId && document.hasFocus()) return;

        // текст
        let body = (data.text || '').toString().trim();
        if (!body) {
          if (data.mediaType === 'photo') body = '🖼 Фото';
          else if (data.mediaType === 'video') body = '🎥 Видео';
          else if (data.mediaType === 'document') body = '📎 ' + (data.fileName || 'Файл');
          else body = '[медиа]';
        }

        // группа — добавим имя
        if (chat.isGroup && data.senderName) {
          body = data.senderName + ': ' + body;
        }

        showMessageNotification({
          title: chat.title,
          body,
          avatar: chat.avatarUrl,
          chatId: chat.id,
        });

        if (notificationsSound) playNotificationSound();
      });

      unsubsRef.current.set(chat.id, unsub);
    }

    // после того как подписки созданы — включаем режим уведомлений
    // (но только когда уже есть хоть один чат)
    if (chats.length > 0) {
      // небольшая задержка — чтобы не поймать "старые" события
      setTimeout(() => { initializedRef.current = true; }, 700);
    }

    return () => {
      // не отписываемся тут — чтобы при ререндере не мигало
      // отписка идёт когда notificationsEnabled=false или чаты удалились
    };
  }, [notificationsEnabled, notificationsSound, chats, currentChatId, myProfile?.id]);
}
  `);

  // 5) Full chatStore with notifications settings
  write('src/stores/chatStore.ts', `
import { create } from 'zustand';

export interface Chat {
  id: string;
  title: string;
  lastMessage: string;
  time: string;
  lastMessageDate: number;
  unread: number;

  avatar: string;
  avatarUrl?: string;

  online: boolean;
  typing: boolean;

  isChannel: boolean;
  isGroup: boolean;

  isMuted: boolean;
  pinned: boolean;

  members: string[];
  isSavedMessages?: boolean;
}

export interface Msg {
  id: string;
  text: string;
  time: string;
  date: number;

  isOutgoing: boolean;
  isRead: boolean;

  senderId: string;
  senderName?: string;
  senderColor?: string;

  mediaType?: 'photo' | 'video' | 'document' | 'sticker' | 'voice' | 'audio' | 'gif';
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string;

  isNew?: boolean;

  replyTo?: { id: string; name: string; text: string };
  editedAt?: number;

  deleted?: boolean;
  deletedForAll?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  username: string;

  avatarUrl?: string;
  bio: string;
  phone: string;

  createdAt: number;
  lastSeen?: number;

  peerId?: string;
}

export interface ContextMenuState {
  open: boolean;
  x: number;
  y: number;
  msg: Msg | null;
}

export interface CallState {
  active: boolean;
  incoming: boolean;

  chatId: string | null;
  peerId: string | null;

  callerName: string;
  callerAvatar: string;

  type: 'audio' | 'video';
  duration: number;

  muted: boolean;
  videoEnabled: boolean;
}

interface Store {
  themeMode: 'light' | 'dark';
  loading: boolean;
  error: string;

  isLoggedIn: boolean;
  authStep: 'checking' | 'login' | 'register' | 'done';

  // Notification settings
  notificationsEnabled: boolean;
  notificationsSound: boolean;

  currentChatId: string | null;
  settingsOpen: boolean;
  chatInfoOpen: boolean;

  myProfile: UserProfile | null;
  chats: Chat[];
  messages: Map<string, Msg[]>;

  searchQuery: string;

  contextMenu: ContextMenuState;
  replyingTo: Msg | null;
  editingMsg: Msg | null;

  callState: CallState;

  imagePreview: string | null;

  toggleTheme: () => void;

  setLoading: (v: boolean) => void;
  setError: (e: string) => void;

  setLoggedIn: (v: boolean) => void;
  setAuthStep: (s: Store['authStep']) => void;

  setNotificationsEnabled: (v: boolean) => void;
  setNotificationsSound: (v: boolean) => void;

  setCurrentChat: (id: string | null) => void;
  setSettingsOpen: (v: boolean) => void;
  setChatInfoOpen: (v: boolean) => void;

  setMyProfile: (p: UserProfile | null) => void;

  setChats: (c: Chat[]) => void;
  setSearchQuery: (q: string) => void;

  setMessages: (chatId: string, m: Msg[]) => void;
  addMessage: (chatId: string, m: Msg) => void;
  updateMessage: (chatId: string, msgId: string, updates: Partial<Msg>) => void;
  removeMessage: (chatId: string, msgId: string) => void;

  setContextMenu: (cm: ContextMenuState) => void;
  setReplyingTo: (m: Msg | null) => void;
  setEditingMsg: (m: Msg | null) => void;

  setCallState: (c: Partial<CallState>) => void;
  resetCallState: () => void;

  setImagePreview: (url: string | null) => void;
}

const defaultCallState: CallState = {
  active: false,
  incoming: false,
  chatId: null,
  peerId: null,
  callerName: '',
  callerAvatar: '',
  type: 'audio',
  duration: 0,
  muted: false,
  videoEnabled: false,
};

export const useStore = create<Store>((set, get) => ({
  themeMode: (localStorage.getItem('og_theme') as 'light' | 'dark') || 'dark',
  loading: false,
  error: '',

  isLoggedIn: false,
  authStep: 'checking',

  notificationsEnabled: localStorage.getItem('og_notif_enabled') !== '0',
  notificationsSound: localStorage.getItem('og_notif_sound') !== '0',

  currentChatId: null,
  settingsOpen: false,
  chatInfoOpen: false,

  myProfile: null,
  chats: [],
  messages: new Map(),

  searchQuery: '',

  contextMenu: { open: false, x: 0, y: 0, msg: null },
  replyingTo: null,
  editingMsg: null,

  callState: defaultCallState,

  imagePreview: null,

  toggleTheme: () =>
    set((s) => {
      const next = s.themeMode === 'light' ? 'dark' : 'light';
      localStorage.setItem('og_theme', next);
      return { themeMode: next };
    }),

  setLoading: (v) => set({ loading: v }),
  setError: (e) => set({ error: e }),

  setLoggedIn: (v) => set({ isLoggedIn: v }),
  setAuthStep: (s) => set({ authStep: s }),

  setNotificationsEnabled: (v) => {
    localStorage.setItem('og_notif_enabled', v ? '1' : '0');
    set({ notificationsEnabled: v });
  },
  setNotificationsSound: (v) => {
    localStorage.setItem('og_notif_sound', v ? '1' : '0');
    set({ notificationsSound: v });
  },

  setCurrentChat: (id) =>
    set({
      currentChatId: id,
      chatInfoOpen: false,
      replyingTo: null,
      editingMsg: null,
      contextMenu: { open: false, x: 0, y: 0, msg: null },
    }),

  setSettingsOpen: (v) =>
    set({
      settingsOpen: v,
      chatInfoOpen: v ? false : get().chatInfoOpen,
    }),

  setChatInfoOpen: (v) => set({ chatInfoOpen: v }),

  setMyProfile: (p) => set({ myProfile: p }),

  setChats: (c) => set({ chats: c }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  setMessages: (chatId, m) => {
    const ms = new Map(get().messages);
    ms.set(chatId, m);
    set({ messages: ms });
  },

  addMessage: (chatId, m) => {
    const ms = new Map(get().messages);
    const existing = ms.get(chatId) || [];
    if (!existing.find((x) => x.id === m.id)) {
      ms.set(chatId, [...existing, m]);
      set({ messages: ms });
    }
  },

  updateMessage: (chatId, msgId, updates) => {
    const ms = new Map(get().messages);
    const msgs = ms.get(chatId) || [];
    ms.set(chatId, msgs.map((m) => (m.id === msgId ? { ...m, ...updates } : m)));
    set({ messages: ms });
  },

  removeMessage: (chatId, msgId) => {
    const ms = new Map(get().messages);
    const msgs = ms.get(chatId) || [];
    ms.set(chatId, msgs.filter((m) => m.id !== msgId));
    set({ messages: ms });
  },

  setContextMenu: (cm) => set({ contextMenu: cm }),
  setReplyingTo: (m) => set({ replyingTo: m, editingMsg: null }),
  setEditingMsg: (m) => set({ editingMsg: m, replyingTo: null }),

  setCallState: (c) => set((s) => ({ callState: { ...s.callState, ...c } })),
  resetCallState: () => set({ callState: defaultCallState }),

  setImagePreview: (url) => set({ imagePreview: url }),
}));
  `);

  // 6) Install deps + cap sync
  try {
    run('npm', ['install']);
  } catch (e) {
    console.log('\n[WARN] npm install failed. Run manually: npm install');
  }

  try {
    run('npx', ['cap', 'sync', 'android']);
  } catch (e) {
    console.log('\n[WARN] cap sync failed. Run manually: npx cap sync android');
  }

  console.log('\n✅ Done.\n');
  console.log('Дальше (Android APK):');
  console.log('  npm run build');
  console.log('  npx cap sync android');
  console.log('  cd android && .\\gradlew.bat assembleDebug && cd ..');
  console.log('\nAPK будет: android/app/build/outputs/apk/debug/app-debug.apk');
  console.log('\nВажно: это LOCAL уведомления (когда приложение запущено).');
  console.log('Чтобы уведомления работали когда приложение закрыто — нужны PUSH (FCM) + Cloud Functions.');
}

try {
  main();
} catch (e) {
  console.error('\n[ERROR]', e?.message || e);
  process.exit(1);
}