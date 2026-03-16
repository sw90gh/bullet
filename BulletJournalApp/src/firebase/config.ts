import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBAEvpL75cURDcZ6Q5V9Mi7Jlu4UmfLZWc",
  authDomain: "bulletjournal-5a9d6.firebaseapp.com",
  projectId: "bulletjournal-5a9d6",
  storageBucket: "bulletjournal-5a9d6.firebasestorage.app",
  messagingSenderId: "682920452566",
  appId: "1:682920452566:web:210f131c3d1a3242da8477",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
