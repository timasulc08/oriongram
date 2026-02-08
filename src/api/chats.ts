import {
  collection, doc, addDoc, getDocs, getDoc, query, where,
  orderBy, limit, onSnapshot, updateDoc, deleteDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { getCurrentUserId } from './auth';
import { Chat, Msg } from '../stores/chatStore';
import { v4 as uuidv4 } from 'uuid';
import { SignJWT, importPKCS8 } from 'jose';

// =========================================================
//  НАСТРОЙКИ FCM V1 (ВОЗЬМИ ИЗ service-account-file.json)
// =========================================================

// 1. project_id
const PROJECT_ID = "oniongram"; 

// 2. client_email
const CLIENT_EMAIL = "firebase-adminsdk-fbsvc@oniongram.iam.gserviceaccount.com";

// 3. private_key (Скопируй ВСЁ содержимое между кавычками, включая \n)
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDynsoyFeR4zIt1\n8nGdnp4MD2TJjtlZhzvezvHlLDAb9NUSkju9a6IrpsE7uTPW/U7c7g3kVUlXWogR\nimvAI4kWKGXUI2f2yeyhRX0q5xBAD20kHlo5/YyKgXx/i1pLbW+l6ew7n0cQ7WnV\ngMpmZc7nq0CbpgiQ06jZpwyarOZLZcrcli/Jf46WPxx5myV/qdEG3F5bsoNAzThS\noLnLrbTuzf0DOQKUKovJLw3KUiFbE3XJM/TZh6n1mJGJ9IIkBpD1vLNTyDZGRHV3\nUrguWfDXBGk7FgtrW+ZjgXub9wFt4s3bRU+3O3fVSx+ZMTU9VhOQ5ShIvaoYl61N\nEAMuh/b9AgMBAAECggEAbTqB61Sh3KSx8LLq5bxgiStxA7FVNxJEKQZgLv3a1us9\n9jNxw9CuXRqhCkNSDGtUUvC1vmOLNlGiysrXwdP9xsT/OyeJibjU2LJRLLyEO2L2\njvk/Q7ZbzIuJQl65kxW82yRaX2lQ9FT+fcmS1dDl+rTFzI1Oc+1mqj6j1QscTzqv\nU3lyVlASH8l8sB4PVQ12dH6pOY8IZYkMdF0ygRBtF/leX3rsR4HgWdxKtthk82Hy\nEsOEE0PQiVpLVBvLtPD7Gp6cyFcdtunPK8o1OPrLTx7ELS7wBqICM2aOxpRDXNek\ns4lUTHtUq9YccUMlXiqryBmHpR0k36T90CgKKq8JfQKBgQD8QIO1ir0rO2QlP1hq\nx9WvHJ+Gzf2MnPDYCN18YzNqolVu+MMdOiV2s26W69wk4EpcKH0WyOuOzoZs5tXt\nwR2ty8OspabJCZUIW21X6iko7YIHeV8oRYHQtigzlq914+wMldA9Xgx0Z8DeJtQe\nx+QfM3cHJ4vFNId+c9yizky9owKBgQD2OaOpt2KWTfTuLDlqY94zlKkOxNOQ2eci\nk8slMsv8mxxUUURP02uG59AYKfIJLxe7MgF8mFQXxqi8MdjC8CPGOzcldMVpeKBq\nRnWoSdAR937C3U3+zbc7jh/H2amSl40dKZsBudEmVPzKqYqA84yKLxqK0jbvbQyE\nfisNizaC3wKBgQCFTW6M3GF1XDBjAqOt4ibJID4pVegci7822xB4sE+2lUzClRE+\n+8Bahx31AXVXw3NoWjkodksNL5SYLjB1MS2G73xbWzrVWIv6W55f7C2OJF0np/si\nZADjE7AQ+xuEGEtgpzbhhzbbuQySGUDVd1rVJjRLgpl5QHYt2/qHyq+BMwKBgQCN\nLaVqpWyQs+gxPAg7uUFpn96DSlXoYxiFGerLzGFr2GAY9HPPtXCc7IPDpyFRJMBd\npCF4GDt3Wn/bUFVyCJDqk39eKaMbg3+vD/Fcad40vwzenFehNsDOFAKi62mwVNcj\nlnx7M9j5OpereCSjJYI6pSF54WiARa18tn7nCCBcTwKBgArgTkzcpBnOPHkTI8kC\nywBHGVilNxYYapsh6nwBVzCh5YGZObmhdvretOwBIEtBCL6I1JZkJSoJh6Ys+xwY\nsnw2M4Y2dMd1lyAtz/KD2BkshIbrG4RfLDM7goOB7RuPqhHtJxU4o5O5wTzAD3JG\ngx4HED4guyr/tk1YYXSoV+Dp\n-----END PRIVATE KEY-----\n`;

// =========================================================

let cachedAccessToken: string | null = null;
let tokenExpirationTime = 0;

async function getAccessToken() {
  if (cachedAccessToken && Date.now() < tokenExpirationTime - 60000) {
    return cachedAccessToken;
  }

  try {
    // Чистим ключ от лишних символов, если они есть
    const pk = PRIVATE_KEY.replace(/\\n/g, '\n');
    const privateKey = await importPKCS8(pk, 'RS256');

    const jwt = await new SignJWT({
      iss: CLIENT_EMAIL,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token'
    })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });

    const data = await response.json();
    if (!data.access_token) throw new Error('No access token returned');
    
    cachedAccessToken = data.access_token;
    tokenExpirationTime = Date.now() + (data.expires_in * 1000);
    return cachedAccessToken;
  } catch (err) {
    console.error('[FCM] Token generation failed:', err);
    return null;
  }
}

async function sendPushNotification(chatId: string, text: string, senderName: string) {
  const myId = getCurrentUserId();
  if (!myId) return;

  try {
    // Получаем токен доступа
    const authToken = await getAccessToken();
    if (!authToken) return;

    // Ищем кому слать
    const chatSnap = await getDoc(doc(db, 'chats', chatId));
    if (!chatSnap.exists()) return;
    const members = chatSnap.data().members || [];
    const targets = members.filter((uid: string) => uid !== myId);

    for (const uid of targets) {
      const userSnap = await getDoc(doc(db, 'users', uid));
      const tokens = userSnap.data()?.fcmTokens || [];

      for (const deviceToken of tokens) {
        // Формат запроса FCM V1
        const message = {
          message: {
            token: deviceToken,
            notification: {
              title: senderName,
              body: text,
            },
            data: {
              chatId: chatId,
            },
            android: {
              priority: 'high',
              notification: {
                click_action: 'FCM_PLUGIN_ACTIVITY',
                channel_id: 'PopNotifications', // Важно для звука
                sound: 'default'
              }
            }
          }
        };

        // Отправка
        fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(message)
        }).catch(e => console.error('[FCM] Send error:', e));
      }
    }
  } catch (e) {
    console.error('[FCM] General error:', e);
  }
}

// ========== STANDARD EXPORTS (NO CHANGES BELOW) ==========

export async function createChat(title: string, memberIds: string[], isGroup = false): Promise<string> {
  const myId = getCurrentUserId();
  if (!myId) throw new Error('Not logged in');
  const allMembers = [...new Set([myId, ...memberIds])];
  if (!isGroup && allMembers.length === 2) {
    const existing = await findDirectChat(allMembers[0], allMembers[1]);
    if (existing) return existing;
  }
  const ref2 = await addDoc(collection(db, 'chats'), {
    title, members: allMembers, isGroup, isChannel: false,
    isSavedMessages: false, createdAt: Date.now(),
    lastMessage: '', lastMessageDate: Date.now(), createdBy: myId,
  });
  return ref2.id;
}

async function findDirectChat(uid1: string, uid2: string): Promise<string | null> {
  const q2 = query(collection(db, 'chats'), where('members', 'array-contains', uid1), where('isGroup', '==', false), where('isSavedMessages', '==', false));
  const snap = await getDocs(q2);
  for (const d of snap.docs) {
    const m = d.data().members;
    if (m.length === 2 && m.includes(uid2)) return d.id;
  }
  return null;
}

export function subscribeChats(myId: string, callback: (chats: Chat[]) => void) {
  if (!myId) return () => {};

  const q2 = query(collection(db, 'chats'), where('members', 'array-contains', myId));
  return onSnapshot(q2, async (snap) => {
    const chats: Chat[] = [];

    for (const d of snap.docs) {
      const data = d.data();
      let title = data.title;
      let avatarUrl = '';
      const isSaved = data.isSavedMessages === true;
      let online = false;

      if (isSaved) {
        title = 'Избранное';
      } else if (!data.isGroup && data.members?.length === 2) {
        const otherId = data.members.find((m: string) => m !== myId);
        if (otherId) {
          try {
            const uSnap = await getDoc(doc(db, 'users', otherId));
            const u = uSnap.data();
            if (u) {
              title = u.displayName || u.email || title;
              avatarUrl = u.avatarUrl || '';
              online = u.online === true && (Date.now() - (u.lastSeen || 0) < 60000);
            }
          } catch {}
        }
      }

      const lastDate = data.lastMessageDate || 0;
      const dd = new Date(lastDate);
      const now = new Date();
      let time = '';
      if (lastDate) {
        time =
          dd.toDateString() === now.toDateString()
            ? dd.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
            : dd.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
      }

      const readKey = `og_read_${d.id}`;
      const lastRead = parseInt(localStorage.getItem(readKey) || '0', 10);
      const unread = !isSaved && lastDate > lastRead ? 1 : 0;

      chats.push({
        id: d.id,
        title,
        lastMessage: data.lastMessage || '',
        time,
        lastMessageDate: lastDate,
        unread,
        avatar: isSaved ? '⭐' : title.charAt(0).toUpperCase(),
        avatarUrl,
        online,
        typing: false,
        isChannel: data.isChannel || false,
        isGroup: data.isGroup || false,
        isMuted: false,
        pinned: isSaved,
        members: data.members || [],
        isSavedMessages: isSaved,
      });
    }

    chats.sort((a, b) => {
      if (a.isSavedMessages && !b.isSavedMessages) return -1;
      if (!a.isSavedMessages && b.isSavedMessages) return 1;
      return b.lastMessageDate - a.lastMessageDate;
    });

    callback(chats);
  });
}

export function markChatAsRead(chatId: string) {
  const readKey = `og_read_${chatId}`;
  localStorage.setItem(readKey, Date.now().toString());
}

export async function markMessagesAsRead(chatId: string) {
  const myId = getCurrentUserId();
  if (!myId) return;
  markChatAsRead(chatId);
  const q2 = query(collection(db, 'chats', chatId, 'messages'), orderBy('date', 'desc'), limit(20));
  const snap = await getDocs(q2);
  for (const d of snap.docs) {
    const data = d.data();
    if (data.senderId !== myId) {
      const readBy = data.readBy || [];
      if (!readBy.includes(myId)) {
        await updateDoc(doc(db, 'chats', chatId, 'messages', d.id), { readBy: [...readBy, myId] }).catch(() => {});
      }
    }
  }
}

export function subscribeMessages(chatId: string, callback: (msgs: Msg[]) => void) {
  const myId = getCurrentUserId();
  const q2 = query(collection(db, 'chats', chatId, 'messages'), orderBy('date', 'asc'), limit(300));
  return onSnapshot(q2, (snap) => {
    const msgs: Msg[] = snap.docs.map(d => {
      const data = d.data();
      const date = data.date || 0;
      const time = date ? new Date(date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
      const readBy = data.readBy || [];
      const isOutgoing = data.senderId === myId;
      const isRead = isOutgoing ? readBy.length > 1 : true;
      return {
        id: d.id, text: data.text || '', time, date, isOutgoing, isRead,
        senderId: data.senderId || '', senderName: data.senderName || '',
        mediaType: data.mediaType || undefined, fileName: data.fileName || undefined,
        fileSize: data.fileSize || undefined, mediaUrl: data.mediaUrl || undefined,
        isNew: Date.now() - date < 2000, replyTo: data.replyTo || undefined,
        editedAt: data.editedAt || undefined, deleted: data.deleted || false, deletedForAll: data.deletedForAll || false,
      };
    }).filter(m => !m.deletedForAll && !(m.deleted && !m.isOutgoing));
    callback(msgs);
  });
}

export async function sendMessage(chatId: string, text: string, senderName: string, replyTo?: { id: string; name: string; text: string }) {
  const myId = getCurrentUserId();
  if (!myId) throw new Error('Not logged in');
  const date = Date.now();
  await addDoc(collection(db, 'chats', chatId, 'messages'), {
    text, senderId: myId, senderName, date, mediaType: null,
    replyTo: replyTo || null, editedAt: null, deleted: false, deletedForAll: false, readBy: [myId],
  });
  await updateDoc(doc(db, 'chats', chatId), { lastMessage: text.slice(0, 100), lastMessageDate: date });
  sendPushNotification(chatId, text, senderName);
}

export async function sendFileMessage(chatId: string, file: File, senderName: string, caption?: string) {
  const myId = getCurrentUserId();
  if (!myId) throw new Error('Not logged in');
  const { url, fileName, fileSize } = await uploadFile(file);
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  const date = Date.now();
  const mediaType = isImage ? 'photo' : isVideo ? 'video' : 'document';
  await addDoc(collection(db, 'chats', chatId, 'messages'), {
    text: caption || '', senderId: myId, senderName, date,
    mediaType, mediaUrl: url, fileName, fileSize,
    replyTo: null, editedAt: null, deleted: false, deletedForAll: false, readBy: [myId],
  });
  const lastMsg = isImage ? '🖼 Фото' : isVideo ? '🎥 Видео' : `📎 ${fileName}`;
  await updateDoc(doc(db, 'chats', chatId), { lastMessage: caption || lastMsg, lastMessageDate: date });
  sendPushNotification(chatId, caption || lastMsg, senderName);
}

export async function editMessage(chatId: string, msgId: string, newText: string) {
  await updateDoc(doc(db, 'chats', chatId, 'messages', msgId), { text: newText, editedAt: Date.now() });
}

export async function deleteMessage(chatId: string, msgId: string, forAll: boolean) {
  if (forAll) await updateDoc(doc(db, 'chats', chatId, 'messages', msgId), { deleted: true, deletedForAll: true, text: '', mediaUrl: null });
  else await updateDoc(doc(db, 'chats', chatId, 'messages', msgId), { deleted: true });
}

export async function uploadFile(file: File): Promise<{ url: string; fileName: string; fileSize: string }> {
  const ext = file.name.split('.').pop();
  const filePath = `uploads/${getCurrentUserId()}/${uuidv4()}.${ext}`;
  const storageRef2 = ref(storage, filePath);
  await uploadBytes(storageRef2, file);
  const url = await getDownloadURL(storageRef2);
  let fileSize = '';
  if (file.size > 1048576) fileSize = (file.size / 1048576).toFixed(1) + ' MB';
  else if (file.size > 1024) fileSize = (file.size / 1024).toFixed(0) + ' KB';
  else fileSize = file.size + ' B';
  return { url, fileName: file.name, fileSize };
}

export async function uploadAvatar(file: File): Promise<string> {
  const myId = getCurrentUserId();
  if (!myId) throw new Error('Not logged in');
  const filePath = `avatars/${myId}/${uuidv4()}.jpg`;
  const storageRef2 = ref(storage, filePath);
  const canvas = document.createElement('canvas');
  const img = new Image();
  const url = URL.createObjectURL(file);
  await new Promise<void>(r => { img.onload = () => r(); img.src = url; });
  const size = Math.min(img.width, img.height, 512);
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const sx = (img.width - size) / 2, sy = (img.height - size) / 2;
  ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);
  URL.revokeObjectURL(url);
  const blob = await new Promise<Blob>(r => canvas.toBlob(b => r(b!), 'image/jpeg', 0.85));
  await uploadBytes(storageRef2, blob);
  return await getDownloadURL(storageRef2);
}

export async function searchUsers(q: string) {
  const snap = await getDocs(collection(db, 'users'));
  const results: Array<{ id: string; email: string; displayName: string; username: string; avatarUrl: string }> = [];
  const myId = getCurrentUserId();
  const query2 = q.toLowerCase().replace('@', '');
  snap.docs.forEach(d => {
    const data = d.data();
    if (d.id !== myId && (data.email?.toLowerCase().includes(query2) || data.displayName?.toLowerCase().includes(query2) || data.username?.toLowerCase().includes(query2))) {
      results.push({ id: d.id, email: data.email, displayName: data.displayName, username: data.username || '', avatarUrl: data.avatarUrl || '' });
    }
  });
  return results;
}

export async function getUserById(uid: string) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}