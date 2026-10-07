import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';
import { API_URL } from '../config';
import { subscribeToRealtimePath } from '../firebase';
import './styles/vitals.css';

const entries = value => Object.entries(value || {});

const formatTimestamp = value => {
  if (!value) return '—';
  const date = typeof value === 'number' ? new Date(value) : new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

const displayType = type => String(type || 'Vital').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ');

function Vitals() {
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

export default Vitals;
