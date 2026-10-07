import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';
import { subscribeToRealtimePath } from '../firebase';
import './styles/dashboard.css';

const asEntries = value => Object.entries(value || {});

function Dashboard() {
  const [devices, setDevices] = useState({});
  const [queue, setQueue] = useState({});
  const [activeSession, setActiveSession] = useState(null);
  const [patients, setPatients] = useState({});
  const [sessions, setSessions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadedPaths, setLoadedPaths] = useState(0);

  useEffect(() => {
    const handleError = databaseError => {
      console.error('Firebase Realtime Database error:', databaseError);
      setError(databaseError.message || 'Unable to read live Firebase data.');
      setLoading(false);
    };
    const update = setter => value => {
      setter(value || {});
      setLoadedPaths(count => count + 1);
    };
    const unsubscribers = [
      subscribeToRealtimePath('devices', update(setDevices), handleError),
      subscribeToRealtimePath('sessionQueue', update(setQueue), handleError),
      subscribeToRealtimePath('activeSession', value => {
        setActiveSession(value);
        setLoadedPaths(count => count + 1);
      }, handleError),
      subscribeToRealtimePath('patients', update(setPatients), handleError),
      subscribeToRealtimePath('sessions', update(setSessions), handleError)
    ];

    return () => unsubscribers.forEach(unsubscribe => unsubscribe());
  }, []);

  useEffect(() => {
    if (loadedPaths >= 5) setLoading(false);
  }, [loadedPaths]);

  const devicesList = asEntries(devices);
  const queueList = asEntries(queue);
  const patientList = asEntries(patients);
  const sessionsList = asEntries(sessions)
    .map(([id, session]) => ({ id, ...session }))
    .sort((a, b) => (Number(b.startedAt) || 0) - (Number(a.startedAt) || 0))
    .slice(0, 8);

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <Header />
        <main className="dashboard-content">
          <section className="welcome-header">
            <div className="welcome-left">
              <h1>Device and patient monitoring</h1>
              <p className="welcome-subtitle">Live records from Firebase Realtime Database</p>
            </div>
            <Link to="/vitals" className="quick-action-btn primary">View vital readings</Link>
          </section>

          {error && <div className="message error" role="alert">{error}</div>}
          {loading ? (
            <div className="loading-container"><div className="loading-spinner"><p>Connecting to Firebase…</p></div></div>
          ) : (
            <>
              <section className="widget-grid">
                <article className="widget-card"><h3>Devices</h3><strong>{devicesList.length}</strong></article>
                <article className="widget-card"><h3>Patients in queue</h3><strong>{queueList.length}</strong></article>
                <article className="widget-card"><h3>Patients with readings</h3><strong>{patientList.length}</strong></article>
                <article className="widget-card"><h3>Recorded sessions</h3><strong>{asEntries(sessions).length}</strong></article>
              </section>

              <section className="dashboard-panel">
                <h2>Active session</h2>
                {String(activeSession?.status || '').toLowerCase() === 'active' ? (
                  <dl className="realtime-details">
                    <div><dt>Session</dt><dd>{activeSession.sessionId || '—'}</dd></div>
                    <div><dt>Patient</dt><dd>{activeSession.patientId || '—'}</dd></div>
                    <div><dt>Device</dt><dd>{activeSession.deviceId || '—'}</dd></div>
                    <div><dt>Status</dt><dd>{activeSession.status || '—'}</dd></div>
                  </dl>
                ) : <p>No active session.</p>}
              </section>

              <section className="dashboard-panel">
                <h2>Devices</h2>
                {devicesList.length === 0 ? <p>No device records.</p> : (
                  <div className="realtime-grid">
                    {devicesList.map(([id, device]) => (
                      <article className="realtime-card" key={id}>
                        <h3>{device.deviceId || id}</h3>
                        <p>Status: {device.status || '—'}</p>
                        <p>Firmware: {device.firmwareVersion || '—'}</p>
                        <p>Last seen: {device.lastSeen || '—'}</p>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="dashboard-panel">
                <h2>Session queue</h2>
                {queueList.length === 0 ? <p>No queued patients.</p> : (
                  <div className="realtime-table-wrap">
                    <table className="realtime-table">
                      <thead><tr><th>Patient</th><th>Status</th><th>Queued at</th><th>Device</th></tr></thead>
                      <tbody>
                        {queueList.map(([id, item]) => (
                          <tr key={id}>
                            <td>{id}</td><td>{item.status || '—'}</td>
                            <td>{item.queuedAt || '—'}</td><td>{item.deviceId || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="dashboard-panel">
                <h2>Recent sessions</h2>
                {sessionsList.length === 0 ? <p>No recorded sessions.</p> : (
                  <div className="realtime-table-wrap">
                    <table className="realtime-table">
                      <thead><tr><th>Session</th><th>Patient</th><th>Device</th><th>Status</th><th>Started</th></tr></thead>
                      <tbody>
                        {sessionsList.map(session => (
                          <tr key={session.id}>
                            <td>{session.sessionId || session.id}</td><td>{session.patientId || '—'}</td>
                            <td>{session.deviceId || '—'}</td><td>{session.status || '—'}</td>
                            <td>{session.startedAt || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
