import React, { useState, useEffect } from 'react';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';
import WidgetCard from '../components/common/WidgetCard';
import './styles/dashboard.css';

function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('superadmin');
  
  // ─── STATE FOR REAL DATA ───
  const [stats, setStats] = useState([]);
  const [cardiovascularConditions, setCardiovascularConditions] = useState([]);
  const [chronicDiseases, setChronicDiseases] = useState([]);
  const [maternityConditions, setMaternityConditions] = useState([]);
  const [queueSnapshot, setQueueSnapshot] = useState([]);

  // ─── FETCH REAL DATA ───
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) setRole(user.role);
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Fetch stats
      const statsRes = await fetch('http://localhost:5000/api/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      
      if (statsData.success) {
        const statsArray = [
          { title: 'Patients Today', value: statsData.data.patientsToday, icon: 'fa-user-plus', color: 'blue' },
          { title: 'Critical', value: statsData.data.critical, icon: 'fa-exclamation-triangle', color: 'red' },
          { title: 'In Queue', value: statsData.data.inQueue, icon: 'fa-users', color: 'orange' },
          { title: 'Attended', value: statsData.data.attended, icon: 'fa-check-circle', color: 'green' },
          { title: 'Appointments', value: statsData.data.appointments, icon: 'fa-calendar-check', color: 'purple' },
          { title: 'Escalated (30+ min)', value: statsData.data.escalated, icon: 'fa-clock', color: 'orange' },
          { title: 'Overdue (60+ min)', value: statsData.data.overdue, icon: 'fa-hourglass-end', color: 'red' },
        ];
        setStats(statsArray);
      }

      // Fetch conditions
      const conditionsRes = await fetch('http://localhost:5000/api/dashboard/conditions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const conditionsData = await conditionsRes.json();
      
      if (conditionsData.success) {
        const allConditions = conditionsData.data;
        const cardio = allConditions.filter(c => 
          ['Hypertension', 'Hypotension', 'Heart Failure', 'Coronary Artery Disease', 
           'Cardiac Arrhythmias', 'Tachycardia', 'Bradycardia', 'Stroke Risk'].includes(c.name)
        );
        const chronic = allConditions.filter(c => 
          ['Asthma', 'Diabetes', 'Cardiac', 'Obesity', 'Pneumonia', 'HIV', 'TB', 'Anaemia'].includes(c.name)
        );
        setCardiovascularConditions(cardio);
        setChronicDiseases(chronic);
      }

      // Fetch maternity
      const maternityRes = await fetch('http://localhost:5000/api/dashboard/maternity', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const maternityData = await maternityRes.json();
      
      if (maternityData.success) {
        setMaternityConditions(maternityData.data);
      }

      // Fetch queue
      const queueRes = await fetch('http://localhost:5000/api/dashboard/queue', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const queueData = await queueRes.json();
      
      if (queueData.success) {
        setQueueSnapshot(queueData.data);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ─── DISEASE CARD COMPONENT (No Count) ───
  const DiseaseCard = ({ name, icon, color }) => (
    <div className="disease-card" style={{ borderColor: `${color}30` }}>
      <div className="disease-card-content">
        <div className="disease-icon-wrapper" style={{ background: `${color}15`, color: color }}>
          <i className={`fas ${icon}`}></i>
        </div>
        <div className="disease-name">{name}</div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'cardiovascular', label: '❤️ Cardiovascular' },
    { id: 'chronic', label: '🩺 Chronic Diseases' },
    { id: 'maternity', label: '👶 Maternity' },
    { id: 'queue', label: '📋 Queue' },
  ];

  return (
    <div className="dashboard-container">
      <Sidebar role={role} />
      <div className="dashboard-main">
        <Header role={role} />
        <div className="dashboard-content">
          
          {/* ─── TABS ─── */}
          <div className="tabs-container">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ─── STATS ROW ─── */}
          <div className="widget-grid">
            {stats.map((stat, index) => (
              <WidgetCard key={index} {...stat} />
            ))}
          </div>

          {/* ─── OVERVIEW TAB ─── */}
          {activeTab === 'overview' && (
            <>
              <div className="disease-grid-container">
                
                {/* Cardiovascular Section */}
                <div className="disease-section">
                  <div className="section-header">
                    <div className="section-header-left">
                      <span className="section-icon">❤️</span>
                      <div>
                        <h3>Cardiovascular Conditions</h3>
                        <p>Heart & Vascular Health</p>
                      </div>
                    </div>
                    <span className="section-count">Conditions</span>
                  </div>
                  <div className="disease-grid">
                    {cardiovascularConditions.map((condition, index) => (
                      <DiseaseCard key={index} {...condition} />
                    ))}
                  </div>
                </div>

                {/* Chronic Diseases Section */}
                <div className="disease-section">
                  <div className="section-header">
                    <div className="section-header-left">
                      <span className="section-icon">🩺</span>
                      <div>
                        <h3>Chronic Diseases</h3>
                        <p>Long-term Health Conditions</p>
                      </div>
                    </div>
                    <span className="section-count">Conditions</span>
                  </div>
                  <div className="disease-grid">
                    {chronicDiseases.map((condition, index) => (
                      <DiseaseCard key={index} {...condition} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Maternity + Queue Row */}
              <div className="disease-grid-container">
                
                {/* Maternity Section */}
                <div className="disease-section">
                  <div className="section-header">
                    <div className="section-header-left">
                      <span className="section-icon">👶</span>
                      <div>
                        <h3>Maternity Tracker</h3>
                        <p>Pregnancy & Postnatal Care</p>
                      </div>
                    </div>
                    <span className="section-count">Conditions</span>
                  </div>
                  <div className="disease-grid maternity-grid">
                    {maternityConditions.map((condition, index) => (
                      <DiseaseCard key={index} {...condition} />
                    ))}
                  </div>
                </div>

                {/* Queue Section */}
                <div className="disease-section">
                  <div className="section-header">
                    <div className="section-header-left">
                      <span className="section-icon">📋</span>
                      <div>
                        <h3>Queue Snapshot</h3>
                        <p>Real-time Patient Queue</p>
                      </div>
                    </div>
                    <span className="section-count">Updated</span>
                  </div>
                  <div className="queue-table-container">
                    <table className="queue-table">
                      <thead>
                        <tr>
                          <th>Patient</th>
                          <th>Score</th>
                          <th>Priority</th>
                          <th>Waiting</th>
                          <th>Condition</th>
                          <th>Tests</th>
                        </tr>
                      </thead>
                      <tbody>
                        {queueSnapshot.length > 0 ? (
                          queueSnapshot.map((item, index) => (
                            <tr key={index}>
                              <td className="patient-name">{item.patient}</td>
                              <td>
                                <span className={`score-badge ${parseInt(item.score) > 80 ? 'high' : parseInt(item.score) > 60 ? 'medium' : 'low'}`}>
                                  {item.score}
                                </span>
                              </td>
                              <td className={`priority-${item.priority?.toLowerCase() || 'normal'}`}>
                                {item.priority || 'Normal'}
                              </td>
                              <td>{item.waiting || '0 min'}</td>
                              <td>{item.condition || 'N/A'}</td>
                              <td><span className="test-badge">{item.tests || 'N/A'}</span></td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                              <i className="fas fa-inbox" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}></i>
                              No patients in queue
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ─── CARDIOVASCULAR TAB ─── */}
          {activeTab === 'cardiovascular' && (
            <div className="disease-section full-width">
              <div className="section-header">
                <div className="section-header-left">
                  <span className="section-icon">❤️</span>
                  <div>
                    <h3>Cardiovascular Conditions</h3>
                    <p>Heart & Vascular Health Monitoring</p>
                  </div>
                </div>
                <span className="section-count">Conditions</span>
              </div>
              <div className="disease-grid full-grid">
                {cardiovascularConditions.map((condition, index) => (
                  <DiseaseCard key={index} {...condition} />
                ))}
              </div>
            </div>
          )}

          {/* ─── CHRONIC DISEASES TAB ─── */}
          {activeTab === 'chronic' && (
            <div className="disease-section full-width">
              <div className="section-header">
                <div className="section-header-left">
                  <span className="section-icon">🩺</span>
                  <div>
                    <h3>Chronic Diseases</h3>
                    <p>Long-term Health Condition Monitoring</p>
                  </div>
                </div>
                <span className="section-count">Conditions</span>
              </div>
              <div className="disease-grid full-grid">
                {chronicDiseases.map((condition, index) => (
                  <DiseaseCard key={index} {...condition} />
                ))}
              </div>
            </div>
          )}

          {/* ─── MATERNITY TAB ─── */}
          {activeTab === 'maternity' && (
            <div className="disease-section full-width">
              <div className="section-header">
                <div className="section-header-left">
                  <span className="section-icon">👶</span>
                  <div>
                    <h3>Maternity Tracker</h3>
                    <p>Pregnancy & Postnatal Care Monitoring</p>
                  </div>
                </div>
                <span className="section-count">Conditions</span>
              </div>
              <div className="disease-grid full-grid">
                {maternityConditions.map((condition, index) => (
                  <DiseaseCard key={index} {...condition} />
                ))}
              </div>
            </div>
          )}

          {/* ─── QUEUE TAB ─── */}
          {activeTab === 'queue' && (
            <div className="disease-section full-width">
              <div className="section-header">
                <div className="section-header-left">
                  <span className="section-icon">📋</span>
                  <div>
                    <h3>Queue Snapshot</h3>
                    <p>Real-time Patient Queue Management</p>
                  </div>
                </div>
                <span className="section-count">Updated</span>
              </div>
              <div className="queue-table-container">
                <table className="queue-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Score</th>
                      <th>Priority</th>
                      <th>Waiting</th>
                      <th>Condition</th>
                      <th>Tests</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queueSnapshot.length > 0 ? (
                      queueSnapshot.map((item, index) => (
                        <tr key={index}>
                          <td className="patient-name">{item.patient}</td>
                          <td>
                            <span className={`score-badge ${parseInt(item.score) > 80 ? 'high' : parseInt(item.score) > 60 ? 'medium' : 'low'}`}>
                              {item.score}
                            </span>
                          </td>
                          <td className={`priority-${item.priority?.toLowerCase() || 'normal'}`}>
                            {item.priority || 'Normal'}
                          </td>
                          <td>{item.waiting || '0 min'}</td>
                          <td>{item.condition || 'N/A'}</td>
                          <td><span className="test-badge">{item.tests || 'N/A'}</span></td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                          <i className="fas fa-inbox" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}></i>
                          No patients in queue
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default Dashboard;