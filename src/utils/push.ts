import { PushNotifications } from '@capacitor/push-notifications';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getCurrentUserId } from '../api/auth';

export async function initPushNotifications() {
  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== 'granted') return;

  await PushNotifications.register();

  PushNotifications.addListener('registration', async (token) => {
    const uid = getCurrentUserId();
    if (!uid) return;
    await updateDoc(doc(db, 'users', uid), {
      fcmTokens: arrayUnion(token.value),
    }).catch(() => {});
  });
}