import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getDatabase, onValue, ref } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyDuIHJCA-ZrIWXjwjnwUgCniHj9BnDnpzg',
  authDomain: 'pulselogic2026-d4154.firebaseapp.com',
  databaseURL: 'https://pulselogic2026-d4154-default-rtdb.firebaseio.com',
  projectId: 'pulselogic2026-d4154',
  storageBucket: 'pulselogic2026-d4154.firebasestorage.app',
  messagingSenderId: '39610195127',
  appId: '1:39610195127:web:810101f05bf7c9efd44132',
  measurementId: 'G-5ZEJB5QR4B'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
let authenticationPromise;

const ensureRealtimeAuthentication = () => {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  if (!authenticationPromise) {
    authenticationPromise = signInAnonymously(auth)
      .then(({ user }) => user)
      .finally(() => {
        authenticationPromise = null;
      });
  }
  return authenticationPromise;
};

export const subscribeToRealtimePath = (path, onData, onError) => {
  let cancelled = false;
  let unsubscribe = () => {};

  ensureRealtimeAuthentication()
    .then(() => {
      if (!cancelled) {
        unsubscribe = onValue(
          ref(database, path),
          snapshot => onData(snapshot.val()),
          onError
        );
      }
    })
    .catch(onError);

  return () => {
    cancelled = true;
    unsubscribe();
  };
};
