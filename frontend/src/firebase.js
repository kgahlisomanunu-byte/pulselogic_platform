import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  get,
  getDatabase,
  onValue,
  push,
  ref,
  runTransaction,
  update
} from 'firebase/database';

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

const isActiveSession = session => String(session?.status || '').toLowerCase() === 'active';

const createSessionError = message => {
  const error = new Error(message);
  error.name = 'SessionError';
  return error;
};

const firebaseErrorMessage = (error, action) => {
  const code = String(error?.code || '').toLowerCase().replace(/_/g, '-');
  if (code.includes('auth')) return 'Firebase authentication failed. Please sign in again.';
  if (code.includes('permission-denied')) return 'Firebase access was denied. Ask an administrator to check database permissions.';
  if (code.includes('network') || code.includes('unavailable')) return 'Firebase is unavailable. Check the network connection and try again.';
  return `Unable to ${action}. Please try again.`;
};

const validateFirebaseKey = (value, label) => {
  const key = String(value || '').trim();
  if (!key || /[.#$/\[\]]/.test(key)) {
    throw new Error(`The selected ${label} has an invalid identifier.`);
  }
  return key;
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

export const startPatientSession = async patientIdValue => {
  const patientId = validateFirebaseKey(patientIdValue, 'patient');
  const activeSessionRef = ref(database, 'activeSession');
  const latestRef = ref(database, `patients/${patientId}/latest`);

  try {
    await ensureRealtimeAuthentication();

    const [latestSnapshot, sessionsSnapshot] = await Promise.all([
      get(latestRef),
      get(ref(database, 'sessions'))
    ]);
    const latest = latestSnapshot.val() || {};
    const existingSessions = sessionsSnapshot.val() || {};
    const latestHasActiveSession = isActiveSession(latest);
    if (latestHasActiveSession && !latest.sessionId) {
      throw createSessionError('The patient already has an active session that cannot be identified.');
    }

    const activeSessionEntry = Object.entries(existingSessions)
      .filter(([, session]) =>
        isActiveSession(session) && String(session.patientId) === patientId
      )
      .sort(([, first], [, second]) =>
        Number(second.startedAt || 0) - Number(first.startedAt || 0)
      )[0];
    const existingPatientSessionId = latestHasActiveSession
      ? latest.sessionId
      : activeSessionEntry?.[0];
    const hasExistingPatientSession = Boolean(existingPatientSessionId);
    const proposedSessionId = hasExistingPatientSession
      ? validateFirebaseKey(existingPatientSessionId, 'session')
      : push(ref(database, 'sessions')).key;
    if (!proposedSessionId) {
      throw createSessionError('A session identifier could not be created.');
    }

    const existingPatientSession = activeSessionEntry?.[1];
    const startedAt = hasExistingPatientSession
      ? (latestHasActiveSession ? latest.startedAt : existingPatientSession?.startedAt) || Date.now()
      : Date.now();
    const proposedSession = {
      sessionId: proposedSessionId,
      patientId,
      status: 'active',
      startedAt,
      endedAt: null
    };

    const result = await runTransaction(
      activeSessionRef,
      current => {
        if (isActiveSession(current)) {
          return String(current.patientId) === patientId ? current : undefined;
        }
        return proposedSession;
      },
      { applyLocally: false }
    );

    const activeSession = result.snapshot.val();
    if (!result.committed) {
      if (isActiveSession(activeSession) && String(activeSession.patientId) !== patientId) {
        throw createSessionError('Another patient already has an active vitals session. End it before starting another.');
      }
      throw createSessionError('The session could not be activated. Please try again.');
    }
    if (!activeSession?.sessionId) {
      throw createSessionError('The active session has no session identifier.');
    }

    const sessionId = validateFirebaseKey(activeSession.sessionId, 'session');
    const session = {
      sessionId,
      patientId,
      status: 'active',
      startedAt: activeSession.startedAt || startedAt,
      endedAt: null
    };
    const updates = {
      [`sessions/${sessionId}/sessionId`]: session.sessionId,
      [`sessions/${sessionId}/patientId`]: session.patientId,
      [`sessions/${sessionId}/status`]: session.status,
      [`sessions/${sessionId}/startedAt`]: session.startedAt,
      [`sessions/${sessionId}/endedAt`]: null,
      [`patients/${patientId}/latest/sessionId`]: session.sessionId,
      [`patients/${patientId}/latest/status`]: session.status,
      [`patients/${patientId}/latest/startedAt`]: session.startedAt,
      [`patients/${patientId}/latest/endedAt`]: null
    };

    try {
      await update(ref(database), updates);
    } catch (error) {
      if (sessionId === proposedSessionId && !hasExistingPatientSession) {
        await runTransaction(
          activeSessionRef,
          current => String(current?.sessionId) === sessionId
            ? { ...current, status: 'completed', endedAt: Date.now() }
            : current,
          { applyLocally: false }
        ).catch(rollbackError => {
          console.error('Unable to roll back an incomplete Firebase session start:', rollbackError);
        });
      }
      throw error;
    }

    return {
      ...session,
      alreadyActive: sessionId !== proposedSessionId || hasExistingPatientSession
    };
  } catch (error) {
    if (error.name === 'SessionError') throw error;
    throw new Error(firebaseErrorMessage(error, 'start the vitals session'));
  }
};

export const endPatientSession = async (patientIdValue, sessionIdValue) => {
  const patientId = validateFirebaseKey(patientIdValue, 'patient');
  const sessionId = validateFirebaseKey(sessionIdValue, 'session');

  try {
    await ensureRealtimeAuthentication();
    const latestSnapshot = await get(ref(database, `patients/${patientId}/latest`));
    const latest = latestSnapshot.val() || {};
    const endedAt = Date.now();
    const updates = {
      [`sessions/${sessionId}/status`]: 'completed',
      [`sessions/${sessionId}/endedAt`]: endedAt
    };

    if (String(latest.sessionId || '') === sessionId) {
      updates[`patients/${patientId}/latest/status`] = 'completed';
      updates[`patients/${patientId}/latest/endedAt`] = endedAt;
    }

    await update(ref(database), updates);
    await runTransaction(
      ref(database, 'activeSession'),
      current => String(current?.sessionId || '') === sessionId && isActiveSession(current)
        ? { ...current, status: 'completed', endedAt }
        : current,
      { applyLocally: false }
    );

    return { sessionId, patientId, status: 'completed', endedAt };
  } catch (error) {
    throw new Error(firebaseErrorMessage(error, 'end the vitals session'));
  }
};
