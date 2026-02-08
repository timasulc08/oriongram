import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile, User
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { UserProfile } from '../stores/chatStore';

export function onAuth(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

export async function loginEmail(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await updateDoc(doc(db, 'users', cred.user.uid), {
    lastSeen: Date.now(),
    online: true,
  }).catch(() => {});
}

export async function registerEmail(email: string, password: string, displayName: string, username: string) {
  const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase()));
  const snap = await getDocs(q);
  if (!snap.empty) throw { code: 'auth/username-taken', message: 'Юзернейм уже занят' };
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  await setDoc(doc(db, 'users', cred.user.uid), {
    email, displayName, username: username.toLowerCase(),
    bio: '', phone: '', createdAt: Date.now(), avatarUrl: '',
    lastSeen: Date.now(), peerId: '', online: true,
  });
  const { addDoc } = await import('firebase/firestore');
  await addDoc(collection(db, 'chats'), {
    title: 'Избранное', members: [cred.user.uid],
    isGroup: false, isChannel: false, isSavedMessages: true,
    createdAt: Date.now(), lastMessage: '', lastMessageDate: Date.now(),
    createdBy: cred.user.uid,
  });
}

export async function logout() {
  const uid = auth.currentUser?.uid;
  if (uid) {
    await updateDoc(doc(db, 'users', uid), {
      online: false, lastSeen: Date.now(),
    }).catch(() => {});
  }
  await signOut(auth);
}

export async function getMyProfile(): Promise<UserProfile | null> {
  const user = auth.currentUser;
  if (!user) return null;
  const snap = await getDoc(doc(db, 'users', user.uid));
  const d = snap.data();
  return {
    id: user.uid, email: user.email || '',
    displayName: d?.displayName || user.displayName || '',
    username: d?.username || '', avatarUrl: d?.avatarUrl || '',
    bio: d?.bio || '', phone: d?.phone || '',
    createdAt: d?.createdAt || Date.now(),
    lastSeen: d?.lastSeen, peerId: d?.peerId || '',
  };
}

export async function updateMyProfile(updates: Partial<UserProfile>) {
  const user = auth.currentUser;
  if (!user) return;
  const fields: Record<string, any> = {};
  if (updates.displayName !== undefined) {
    fields.displayName = updates.displayName;
    await updateProfile(user, { displayName: updates.displayName });
  }
  if (updates.bio !== undefined) fields.bio = updates.bio;
  if (updates.phone !== undefined) fields.phone = updates.phone;
  if (updates.avatarUrl !== undefined) fields.avatarUrl = updates.avatarUrl;
  if (updates.peerId !== undefined) fields.peerId = updates.peerId;
  if (updates.username !== undefined) {
    const q2 = query(collection(db, 'users'), where('username', '==', updates.username.toLowerCase()));
    const snap = await getDocs(q2);
    if (snap.docs.some(d => d.id !== user.uid)) throw { code: 'auth/username-taken', message: 'Юзернейм занят' };
    fields.username = updates.username.toLowerCase();
  }
  if (Object.keys(fields).length > 0) await updateDoc(doc(db, 'users', user.uid), fields);
}

export function getCurrentUserId(): string | null {
  return auth.currentUser?.uid || null;
}

// ========== ONLINE PRESENCE ==========

let presenceInterval: ReturnType<typeof setInterval> | null = null;

export function startPresence() {
  const uid = getCurrentUserId();
  if (!uid) return;

  // Сразу ставим online
  updateDoc(doc(db, 'users', uid), { online: true, lastSeen: Date.now() }).catch(() => {});

  // Обновляем каждые 30 секунд
  presenceInterval = setInterval(() => {
    updateDoc(doc(db, 'users', uid), { online: true, lastSeen: Date.now() }).catch(() => {});
  }, 30000);

  // При закрытии вкладки
  const handleUnload = () => {
    // navigator.sendBeacon не работает с Firestore, но попробуем через fetch
    const url = `https://firestore.googleapis.com/v1/projects/${(db as any)._databaseId?.projectId}/databases/(default)/documents/users/${uid}?updateMask.fieldPaths=online&updateMask.fieldPaths=lastSeen`;
    try {
      navigator.sendBeacon(url); // Может не сработать, но хотя бы пытаемся
    } catch {}
    // Фоллбек — просто обновляем
    updateDoc(doc(db, 'users', uid), { online: false, lastSeen: Date.now() }).catch(() => {});
  };

  window.addEventListener('beforeunload', handleUnload);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      updateDoc(doc(db, 'users', uid), { online: false, lastSeen: Date.now() }).catch(() => {});
    } else {
      updateDoc(doc(db, 'users', uid), { online: true, lastSeen: Date.now() }).catch(() => {});
    }
  });
}

export function stopPresence() {
  if (presenceInterval) clearInterval(presenceInterval);
  presenceInterval = null;
  const uid = getCurrentUserId();
  if (uid) {
    updateDoc(doc(db, 'users', uid), { online: false, lastSeen: Date.now() }).catch(() => {});
  }
}

// ========== SUBSCRIBE TO USER ONLINE STATUS ==========

export function subscribeUserOnline(userId: string, callback: (online: boolean, lastSeen: number) => void) {
  return onSnapshot(doc(db, 'users', userId), (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      const online = data.online === true;
      const lastSeen = data.lastSeen || 0;
      // Считаем оффлайн если lastSeen > 60 сек назад
      const isReallyOnline = online && (Date.now() - lastSeen < 60000);
      callback(isReallyOnline, lastSeen);
    }
  });
}
