import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';
import { API_URL } from '../config';
import { endPatientSession, subscribeToRealtimePath } from '../firebase';
import './styles/vitals.css';

const entries = value => Object.entries(value || {});

const formatTimestamp = value => {
  if (!value) return '—';
  const date = typeof value === 'number' ? new Date(value) : new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

const displayType = type => String(type || 'Vital').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ');

function VitalsReadings() {
  const [firebasePatients, setFirebasePatients] = useState({});
  const [sessions, setSessions] = useState({});
  const [mysqlPatients, setMysqlPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [firebaseReady, setFirebaseReady] = useState(0);

  useEffect(() => {
    const handleFirebaseError = databaseError => {
      console.error('Firebase Realtime Database error:', databaseError);
      setError(databaseError.message || 'Unable to read vital readings from Firebase.');
      setLoading(false);
    };
    const unsubscribePatients = subscribeToRealtimePath('patients', value => {
      setFirebasePatients(value || {});
      setFirebaseReady(count => count + 1);
    }, handleFirebaseError);
    const unsubscribeSessions = subscribeToRealtimePath('sessions', value => {
      setSessions(value || {});
      setFirebaseReady(count => count + 1);
    }, handleFirebaseError);
    const token = localStorage.getItem('token');

    fetch(`${API_URL}/patients`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    })
      .then(async response => {
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Unable to load MySQL patient records.');
        }
        setMysqlPatients(data.patients || []);
      })
      .catch(patientError => {
        console.error('MySQL patient lookup error:', patientError);
        setError(patientError.message || 'Unable to load MySQL patient records.');
      });

    return () => {
      unsubscribePatients();
      unsubscribeSessions();
    };
  }, []);

  useEffect(() => {
    if (firebaseReady >= 2) setLoading(false);
  }, [firebaseReady]);

  const patientNames = useMemo(() => {
    const names = new Map();
    mysqlPatients.forEach(patient => {
      const fullName = [patient.first_name, patient.last_name].filter(Boolean).join(' ');
      [patient.patient_id, patient.patient_code].forEach(id => {
        if (id !== null && id !== undefined) names.set(String(id), fullName);
      });
    });
    return names;
  }, [mysqlPatients]);

  const readings = useMemo(() => {
    const sessionReadings = entries(sessions).flatMap(([sessionKey, session]) =>
      entries(session.readings).map(([readingKey, reading]) => ({
        id: `${sessionKey}-${readingKey}`,
        ...reading,
        patientId: reading.patientId || session.patientId,
        sessionId: reading.sessionId || session.sessionId || sessionKey
      }))
    );

    const currentReadings = entries(firebasePatients).flatMap(([patientId, patient]) => {
      const latest = patient.latest || {};
      return [
        latest.temperature !== undefined && {
          id: `${patientId}-latest-temperature`,
          type: 'temperature',
          value: latest.temperature,
          unit: '°C',
          patientId,
          sessionId: latest.sessionId,
          timestamp: latest.temperatureTimestamp
        },
        latest.heartRate !== undefined && {
          id: `${patientId}-latest-heartRate`,
          type: 'heartRate',
          value: latest.heartRate,
          unit: 'bpm',
          patientId,
          sessionId: latest.sessionId,
          timestamp: latest.heartRateTimestamp
        }
      ].filter(Boolean);
    });

    return [...sessionReadings, ...currentReadings]
      .filter(reading => reading.value !== null && reading.value !== undefined)
      .sort((a, b) => {
        const timeA = new Date(a.timestamp || 0).getTime() || Number(a.timestamp) || 0;
        const timeB = new Date(b.timestamp || 0).getTime() || Number(b.timestamp) || 0;
        return timeB - timeA;
      });
  }, [firebasePatients, sessions]);

  const filteredReadings = readings.filter(reading => {
    const patientId = String(reading.patientId || '');
    const name = patientNames.get(patientId) || '';
    const term = searchTerm.trim().toLowerCase();
    return !term || patientId.toLowerCase().includes(term) || name.toLowerCase().includes(term);
  });

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <Header />
        <main className="dashboard-content">
          <section className="welcome-header">
            <div className="welcome-left">
              <h1>Patient vital readings</h1>
              <p className="welcome-subtitle">Live device readings from Firebase Realtime Database</p>
            </div>
            <input
              type="search"
              aria-label="Search patient readings"
              placeholder="Search patient ID or name"
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
            />
          </section>

          {error && <div className="message error" role="alert">{error}</div>}
          {loading ? (
            <div className="loading-container"><div className="loading-spinner"><p>Loading Firebase readings…</p></div></div>
          ) : filteredReadings.length === 0 ? (
            <section className="dashboard-panel"><p>No vital readings are currently available in Firebase.</p></section>
          ) : (
            <section className="dashboard-panel">
              <div className="realtime-table-wrap">
                <table className="realtime-table">
                  <thead>
                    <tr><th>Patient</th><th>Reading</th><th>Value</th><th>Session</th><th>Device</th><th>Recorded</th></tr>
                  </thead>
                  <tbody>
                    {filteredReadings.map(reading => {
                      const patientId = String(reading.patientId || '');
                      return (
                        <tr key={reading.id}>
                          <td>{patientNames.get(patientId) || patientId || '—'}</td>
                          <td>{displayType(reading.type)}</td>
                          <td>{reading.value} {reading.unit || ''}</td>
                          <td>{reading.sessionId || '—'}</td>
                          <td>{reading.deviceId || '—'}</td>
                          <td>{formatTimestamp(reading.timestamp)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

const normalizeReadingType = type => String(type || '')
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .replace(/[_-]/g, ' ')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, '');

const formatReadingValue = value => {
  if (Array.isArray(value)) return value.slice(-40).join(', ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return value;
};

const readingTime = value => {
  if (typeof value === 'number') return value < 1000000000000 ? value * 1000 : value;
  const parsed = new Date(value || 0).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

function VitalsSession({ patientId, sessionId }) {
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [patientLoading, setPatientLoading] = useState(true);
  const [patientError, setPatientError] = useState('');
  const [session, setSession] = useState(null);
  const [sessionStatus, setSessionStatus] = useState('connecting');
  const [latest, setLatest] = useState(null);
  const [sessionReadings, setSessionReadings] = useState({});
  const [connectionState, setConnectionState] = useState('connecting');
  const [firebaseError, setFirebaseError] = useState('');
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem('token');

    fetch(`${API_URL}/patients/${encodeURIComponent(patientId)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async response => {
        const data = await response.json();
        if (response.status === 404) throw new Error('Patient not found in the patient records.');
        if (response.status === 401 || response.status === 403) {
          throw new Error('Your clinic sign-in has expired. Sign in again to view this patient.');
        }
        if (!response.ok || !data.success || !data.patient) {
          throw new Error('Unable to load this patient record.');
        }
        if (!cancelled) setPatient(data.patient);
      })
      .catch(error => {
        console.error('Patient lookup error for vitals session:', error);
        if (!cancelled) {
          setPatientError(error instanceof TypeError
            ? 'Could not reach the patient records service. Check the backend connection.'
            : error.message || 'Unable to load this patient record.');
        }
      })
      .finally(() => {
        if (!cancelled) setPatientLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [patientId]);

  useEffect(() => {
    const handleFirebaseError = error => {
      console.error('Firebase session listener error:', error);
      setConnectionState('offline');
      setFirebaseError(
        String(error?.code || '').toLowerCase().replace(/_/g, '-').includes('permission-denied')
          ? 'Firebase access was denied. Ask an administrator to check the database permissions.'
          : 'Unable to connect to Firebase. Check the network and try again.'
      );
      setSessionStatus(current => current === 'connecting' ? 'error' : current);
    };

    const unsubscribeSession = subscribeToRealtimePath(
      `sessions/${sessionId}`,
      value => {
        if (!value) {
          setSession(null);
          setSessionStatus('missing');
          return;
        }
        setSession(value);
        setSessionStatus(String(value.status || '').toLowerCase());
        setFirebaseError('');
      },
      handleFirebaseError
    );
    const unsubscribeConnection = subscribeToRealtimePath(
      '.info/connected',
      connected => setConnectionState(connected ? 'connected' : 'offline'),
      handleFirebaseError
    );

    return () => {
      unsubscribeSession();
      unsubscribeConnection();
    };
  }, [sessionId]);

  useEffect(() => {
    if (sessionStatus !== 'active') return undefined;

    const handleFirebaseError = error => {
      console.error('Firebase vital listener error:', error);
      setConnectionState('offline');
      setFirebaseError(
        String(error?.code || '').toLowerCase().replace(/_/g, '-').includes('permission-denied')
          ? 'Firebase access was denied. Ask an administrator to check the database permissions.'
          : 'Unable to receive live readings from Firebase. Check the network and try again.'
      );
    };
    const unsubscribeLatest = subscribeToRealtimePath(
      `patients/${patientId}/latest`,
      value => setLatest(value || null),
      handleFirebaseError
    );
    const unsubscribeReadings = subscribeToRealtimePath(
      `sessions/${sessionId}/readings`,
      value => setSessionReadings(value || {}),
      handleFirebaseError
    );

    return () => {
      unsubscribeLatest();
      unsubscribeReadings();
    };
  }, [patientId, sessionId, sessionStatus]);

  const normalizedReadings = useMemo(() => {
    const fromSession = entries(sessionReadings).flatMap(([id, reading]) => {
      if (!reading || (reading.sessionId && String(reading.sessionId) !== sessionId)) return [];
      const type = normalizeReadingType(reading.type || reading.name || reading.sensor);
      const value = reading.value ?? reading.reading;
      if (!type || value === null || value === undefined) return [];
      return [{
        id,
        type,
        value,
        unit: reading.unit || '',
        timestamp: reading.timestamp || reading.recordedAt
      }];
    });

    if (!latest) return fromSession;
    const directLatest = [
      {
        type: 'temperature',
        value: latest.temperature ?? latest.bodyTemperature,
        unit: latest.temperatureUnit || '°C',
        timestamp: latest.temperatureTimestamp || latest.timestamp
      },
      {
        type: 'heartrate',
        value: latest.heartRate ?? latest.heart_rate,
        unit: latest.heartRateUnit || 'bpm',
        timestamp: latest.heartRateTimestamp || latest.timestamp
      },
      {
        type: 'ecg',
        value: latest.ecg ?? latest.ECG,
        unit: latest.ecgUnit || '',
        timestamp: latest.ecgTimestamp || latest.timestamp
      }
    ].filter(reading =>
      reading.value !== null &&
      reading.value !== undefined &&
      readingTime(reading.timestamp) >= readingTime(session?.startedAt)
    )
      .map((reading, index) => ({ ...reading, id: `latest-${index}` }));

    const newestByType = new Map();
    [...fromSession, ...directLatest].forEach(reading => {
      const current = newestByType.get(reading.type);
      if (!current || readingTime(reading.timestamp) >= readingTime(current.timestamp)) {
        newestByType.set(reading.type, reading);
      }
    });
    return Array.from(newestByType.values());
  }, [latest, session, sessionId, sessionReadings]);

  const vitalsByType = useMemo(() => {
    const map = new Map();
    normalizedReadings.forEach(reading => map.set(reading.type, reading));
    return map;
  }, [normalizedReadings]);

  const connectionLabel = connectionState === 'offline'
    ? 'OFFLINE'
    : connectionState !== 'connected'
      ? 'CONNECTING'
      : normalizedReadings.length
        ? 'LIVE'
        : 'WAITING FOR DATA';
  const patientName = patient
    ? [patient.first_name, patient.last_name].filter(Boolean).join(' ')
    : patientId;

  const handleEndSession = async () => {
    setEnding(true);
    setFirebaseError('');
    try {
      const completed = await endPatientSession(patientId, sessionId);
      setSession(current => ({ ...(current || {}), ...completed }));
      setSessionStatus('completed');
    } catch (error) {
      console.error('End vitals session error:', error);
      setFirebaseError(error.message || 'Unable to end the vitals session. Please try again.');
    } finally {
      setEnding(false);
    }
  };

  const renderVital = (type, label, defaultUnit) => {
    const reading = vitalsByType.get(type);
    return (
      <article className="vitals-session-card" key={type}>
        <h2>{label}</h2>
        {reading ? (
          <p className={`vitals-session-value ${type === 'ecg' ? 'ecg-value' : ''}`}>
            {formatReadingValue(reading.value)}{reading.unit || defaultUnit ? ` ${reading.unit || defaultUnit}` : ''}
          </p>
        ) : <p className="vitals-session-waiting">Waiting for sensor data…</p>}
        <p className="vitals-session-timestamp">
          {reading?.timestamp ? `Updated ${formatTimestamp(reading.timestamp)}` : 'No reading received'}
        </p>
      </article>
    );
  };

  const extraReadings = normalizedReadings.filter(
    reading => !['temperature', 'heartrate', 'ecg'].includes(reading.type)
  );

  return (
    <div className="vitals-container">
      <Sidebar />
      <div className="vitals-main">
        <Header />
        <main className="vitals-content">
          <section className="vitals-header">
            <div className="vitals-header-left">
              <h1>Vitals Session</h1>
              <p className="vitals-subtitle">Live patient readings from Firebase</p>
            </div>
            <div className="vitals-header-right">
              <span className={`vitals-session-connection ${connectionLabel.toLowerCase().replace(/\s/g, '-')}`}>
                {connectionLabel}
              </span>
              <button className="btn-secondary" onClick={() => navigate('/patients')}>
                Back to patients
              </button>
            </div>
          </section>

          {patientError && <div className="message error" role="alert">{patientError}</div>}
          {firebaseError && <div className="message error" role="alert">{firebaseError}</div>}
          {patientLoading ? (
            <section className="vitals-session-panel"><p>Loading patient record…</p></section>
          ) : !patientError ? (
            <>
              <section className="vitals-session-panel">
                <div><span>Patient</span><strong>{patientName}</strong></div>
                <div><span>Session</span><strong className={`vitals-session-status ${sessionStatus}`}>
                  {sessionStatus === 'connecting' ? 'CONNECTING' : sessionStatus.toUpperCase()}
                </strong></div>
                <div><span>Session ID</span><strong>{sessionId}</strong></div>
                <div><span>Started</span><strong>{formatTimestamp(session?.startedAt)}</strong></div>
              </section>

              {sessionStatus === 'missing' && (
                <div className="message error" role="alert">This vitals session could not be found in Firebase.</div>
              )}
              {sessionStatus === 'error' && (
                <section className="vitals-session-panel"><p>Unable to load this session from Firebase.</p></section>
              )}

              {sessionStatus !== 'missing' && sessionStatus !== 'error' && (
                <>
                  <section className="vitals-session-grid">
                    {renderVital('temperature', 'Body Temperature', '°C')}
                    {renderVital('heartrate', 'Heart Rate', 'BPM')}
                    {renderVital('ecg', 'ECG', '')}
                    {extraReadings.map(reading => renderVital(
                      reading.type,
                      displayType(reading.type),
                      reading.unit
                    ))}
                  </section>
                  {sessionStatus === 'active' ? (
                    <button
                      className="btn-danger vitals-session-end"
                      onClick={handleEndSession}
                      disabled={ending}
                    >
                      {ending ? 'Ending session…' : 'End Session'}
                    </button>
                  ) : sessionStatus === 'completed' ? (
                    <section className="vitals-session-panel">
                      <p>This session is completed. Live monitoring has stopped.</p>
                      <p>Ended: {formatTimestamp(session?.endedAt)}</p>
                    </section>
                  ) : null}
                </>
              )}
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function Vitals() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const patientId = params.get('patientId');
  const sessionId = params.get('sessionId');

  if (patientId && sessionId) {
    return <VitalsSession patientId={patientId} sessionId={sessionId} />;
  }
  return <VitalsReadings />;
}

export default Vitals;
