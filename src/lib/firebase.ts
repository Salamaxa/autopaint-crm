import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export async function testFirebaseConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase Firestore connection verified successfully.');
    return true;
  } catch (error: any) {
    // Firestore SDK emits an 'unavailable' or 'client is offline' notification when first handshaking
    // or when working offline. This is standard Firestore behavior and will automatically reconnect.
    const msg = error?.message || String(error);
    if (msg.includes('unavailable') || msg.includes('offline') || error?.code === 'unavailable') {
      console.info('Firestore initial connection handshake in progress; operating with offline cache ready.');
    } else {
      console.info('Firebase connection check response:', error);
    }
    return false;
  }
}

// Initial non-blocking check
if (typeof window !== 'undefined') {
  setTimeout(() => {
    testFirebaseConnection().catch(() => {});
  }, 1000);
}

export { app };
