import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
  reload as reloadUser,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  linkWithCredential,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
} from 'firebase/auth';

import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  onSnapshot,
} from 'firebase/firestore';

import { auth, db } from '../config/firebase';
import { UserProfile } from '../stores/chatStore';

/* =========================
   Helpers / Presence
========================= */

export function onAuth(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

export function getCurrentUserId(): string | null {
  return auth.currentUser?.uid || null;
}

let presenceInterval: ReturnType<typeof setInterval> | null = null;

export function startPresence() {
  const uid = getCurrentUserId();
  if (!uid) return;

  updateDoc(doc(db, 'users', uid), { online: true, lastSeen: Date.now() }).catch(() => {});
  presenceInterval = setInterval(() => {
    updateDoc(doc(db, 'users', uid), { online: true, lastSeen: Date.now() }).catch(() => {});
  }, 30000);

  document.addEventListener('visibilitychange', () => {
    const uid2 = getCurrentUserId();
    if (!uid2) return;
    if (document.hidden) {
      updateDoc(doc(db, 'users', uid2), { online: false, lastSeen: Date.now() }).catch(() => {});
    } else {
      updateDoc(doc(db, 'users', uid2), { online: true, lastSeen: Date.now() }).catch(() => {});
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

export function subscribeUserOnline(userId: string, cb: (online: boolean, lastSeen: number) => void) {
  return onSnapshot(doc(db, 'users', userId), (snap) => {
    if (!snap.exists()) return;
    const d: any = snap.data();
    const lastSeen = d.lastSeen || 0;
    const online = d.online === true && Date.now() - lastSeen < 60000;
    cb(online, lastSeen);
  });
}

/* =========================
   Email/Password Auth
========================= */

export async function loginEmail(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await updateDoc(doc(db, 'users', cred.user.uid), { lastSeen: Date.now(), online: true }).catch(() => {});
}

export async function registerEmail(email: string, password: string, displayName: string, username: string) {
  const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase()));
  const snap = await getDocs(q);
  if (!snap.empty) throw { code: 'auth/username-taken', message: 'Юзернейм уже занят' };

  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });

  await setDoc(doc(db, 'users', cred.user.uid), {
    email,
    displayName,
    username: username.toLowerCase(),
    bio: '',
    phone: '',
    createdAt: Date.now(),
    avatarUrl: '',
    lastSeen: Date.now(),
    online: true,
    peerId: '',
    fcmTokens: [],
  });

  await addDoc(collection(db, 'chats'), {
    title: 'Избранное',
    members: [cred.user.uid],
    isGroup: false,
    isChannel: false,
    isSavedMessages: true,
    createdAt: Date.now(),
    lastMessage: '',
    lastMessageDate: Date.now(),
    createdBy: cred.user.uid,
  });

  try {
    await sendEmailVerification(cred.user);
  } catch {}
}

export async function logout() {
  const uid = getCurrentUserId();
  if (uid) {
    await updateDoc(doc(db, 'users', uid), { online: false, lastSeen: Date.now() }).catch(() => {});
  }
  await signOut(auth);
}

export async function getMyProfile(): Promise<UserProfile | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const snap = await getDoc(doc(db, 'users', user.uid));
  const d: any = snap.data();

  return {
    id: user.uid,
    email: user.email || '',
    displayName: d?.displayName || user.displayName || '',
    username: d?.username || '',
    avatarUrl: d?.avatarUrl || '',
    bio: d?.bio || '',
    phone: d?.phone || '',
    createdAt: d?.createdAt || Date.now(),
    lastSeen: d?.lastSeen,
    peerId: d?.peerId || '',
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
    if (snap.docs.some((d) => d.id !== user.uid)) {
      throw { code: 'auth/username-taken', message: 'Юзернейм занят' };
    }
    fields.username = updates.username.toLowerCase();
  }

  if (Object.keys(fields).length > 0) {
    await updateDoc(doc(db, 'users', user.uid), fields);
  }
}

// === ЭТИХ ФУНКЦИЙ НЕ ХВАТАЛО ===

export async function refreshEmailVerified(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  await reloadUser(user);
  return !!user.emailVerified;
}

export async function resendVerificationEmail(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in');
  await sendEmailVerification(user);
}

// ===============================

/* =========================
   Google Auth
========================= */

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function signInWithGooglePopup() {
  try {
    if ((window as any).Capacitor?.getPlatform() === 'android') {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    const res = await signInWithPopup(auth, googleProvider);
    const cred = GoogleAuthProvider.credentialFromResult(res);
    const uid = res.user.uid;
    const email = res.user.email || '';
    const userDoc = await getDoc(doc(db, 'users', uid));
    
    return { 
      kind: 'signed_in', 
      uid, 
      email, 
      googleCredential: cred, 
      hasAccount: userDoc.exists(),
      isNewUser: !!(res as any)._tokenResponse?.isNewUser 
    };
  } catch (e: any) {
    if (e.code === 'auth/account-exists-with-different-credential') {
      const email = e.customData?.email || '';
      const cred = GoogleAuthProvider.credentialFromError(e);
      return { kind: 'conflict', email, googleCredential: cred };
    }
    throw e;
  }
}

export async function finishGoogleRedirectIfAny() {
  if ((window as any).Capacitor?.getPlatform() !== 'android') return;
  try {
    const res = await getRedirectResult(auth);
    if (res) localStorage.setItem('og_google_pending', 'true');
  } catch (e) { console.error(e); }
}

export async function createAccountForCurrentUser() {
  const user = auth.currentUser;
  if (!user) return;
  const userRef = doc(db, 'users', user.uid);
  if (!(await getDoc(userRef)).exists()) {
    await setDoc(userRef, {
      email: user.email||'', displayName: user.displayName||'User',
      username: 'user_' + user.uid.slice(0,6).toLowerCase(),
      createdAt: Date.now(), online: true, fcmTokens: []
    });
    await addDoc(collection(db, 'chats'), {
      title: 'Избранное', members: [user.uid], isSavedMessages: true, createdAt: Date.now(), createdBy: user.uid
    });
  }
}

export const createUserDocAndSavedChatForCurrentUser = createAccountForCurrentUser;

export async function linkGoogleToExistingAccount(opts: any) {
  if (opts.deleteTempGoogleUser && auth.currentUser) {
    try { await deleteUser(auth.currentUser); } catch {}
  }
  const cred = await signInWithEmailAndPassword(auth, opts.existingEmail, opts.existingPassword);
  await linkWithCredential(cred.user, opts.googleCredential);
}

// Алиас для обратной совместимости
export const linkGoogleToExistingAccountAndDeleteTempIfNeeded = linkGoogleToExistingAccount;
export async function startGoogleSignInExternal() {
  // ВНИМАНИЕ: Замени "oniongram" на ID своего проекта из firebaseConfig
  const projectId = "oniongram"; // <-- ПРОВЕРЬ ЭТО
  const authUrl = `https://${projectId}.web.app/auth-callback.html`; 
  
  if ((window as any).electronAPI) {
    // ЭТО ВАЖНО: говорим Электрону открыть системный браузер
    (window as any).electronAPI.openExternal(authUrl);
  } else {
    window.location.href = authUrl;
  }
}
export function listenForExternalAuth(onSuccess: () => void) {
  if (!(window as any).electronAPI) return;
  (window as any).electronAPI.onGoogleAuthSuccess(async (idToken: string) => {
    const { GoogleAuthProvider, signInWithCredential } = await import('firebase/auth');
    const cred = GoogleAuthProvider.credential(idToken);
    await signInWithCredential(auth, cred);
    onSuccess();
  });
}
