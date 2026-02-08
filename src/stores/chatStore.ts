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
  