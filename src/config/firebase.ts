import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// ==============================================
//  ВСТАВЬ КЛЮЧИ: https://console.firebase.google.com
//  1. Authentication -> Email/Password (включи)
//  2. Firestore Database -> Create (test mode)
//  3. Storage -> Create (test mode)
// ==============================================
const firebaseConfig = {
  apiKey: "AIzaSyDb8euKde3JvHsxbYkhkH1T04XN7OfkQwA",
  authDomain: "oniongram.firebaseapp.com",
  projectId: "oniongram",
  storageBucket: "oniongram.firebasestorage.app",
  messagingSenderId: "590611451971",
  appId: "1:590611451971:web:b36fd0f9c3d38efdd744f6"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
