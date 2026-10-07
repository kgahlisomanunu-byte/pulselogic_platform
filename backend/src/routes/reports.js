// frontend/src/pages/Reports.js
import React, { useState, useEffect } from 'react';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';
import './styles/reports.css';

function Reports() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [role, setRole] = useState('admin');
  const [activeReport, setActiveReport] = useState('overview');

  // ─── FILTERS ───
  const [timeRange, setTimeRange] = useState('3');
  const [region, setRegion] = useState('all');
  const [facility, setFacility] = useState('all');
  const [facilities, setFacilities] = useState([]);

  // ─── DATA STATES ───
  const [overviewData, setOverviewData] = useState({
    total_patients: 0, total_appointments: 0, completed_appointments: 0,
    cancelled_appointments: 0, scheduled_appointments: 0, total_visits: 0,
    completed_visits: 0, missed_visits: 0, total_deliveries: 0,
    mothers_alive: 0, mothers_deceased: 0, babies_alive: 0,
    stillborn_babies: 0, babies_deceased: 0, total_records: 0,
    active_pregnancies: 0, completed_pregnancies: 0, high_risk_pregnancies: 0,
    total_medications: 0, chronic_diseases: 0,
    chronic_disease_breakdown: [], medication_breakdown: [], supplement_breakdown: []
  });

  const [maternityData, setMaternityData] = useState({
    total_records: 0, by_status: [], by_risk: [],
    by_trimester: { first: 0, second: 0, third: 0 },
    avg_gestational_weeks: 0, total_referrals: 0
  });

  const [medicationData, setMedicationData] = useState({
    total_medications: 0, by_medication: [], by_supplement: [],
    most_prescribed: [], most_prescribed_supplements: []
  });

  const [chronicData, setChronicData] = useState({
    total_chronic_diseases: 0, disease_breakdown: [], by_severity: []
  });

  const [deliveryData, setDeliveryData] = useState({
    total: 0, by_method: [], by_sex: { male: 0, female: 0, unknown: 0 },
    avg_birth_weight: 0, stillborn_babies: 0, babies_alive: 0,
    mothers_alive: 0, maternal_complications: 0, stillborn_details: []
  });

  const [appointmentData, setAppointmentData] = useState({
    total: 0, scheduled: 0, confirmed: 0, completed: 0, cancelled: 0, by_department: []
  });

  const [visitData, setVisitData] = useState({
    total: 0, completed: 0, missed: 0, scheduled: 0, by_type: []
  });

  const [queueData, setQueueData] = useState({
    total: 0, emergency: 0, critical: 0, urgent: 0, normal: 0,
    waiting: 0, in_progress: 0, completed: 0, cancelled: 0, avg_wait_time: 0
  });

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // ─── REGION → FACILITIES MAP ───
  const regionFacilities = {
    'gert-sibande': [
      { id: 1, name: 'Gert Sibande District Hospital', type: 'hospital' },
      { id: 2, name: 'Standerton Hospital', type: 'hospital' },
      { id: 3, name: 'Ermelo Hospital', type: 'hospital' },
      { id: 4, name: 'Piet Retief Hospital', type: 'hospital' },
      { id: 5, name: 'Carolina Clinic', type: 'clinic' },
      { id: 6, name: 'Secunda Clinic', type: 'clinic' },
      { id: 7, name: 'Morgenzon Clinic', type: 'clinic' },
      { id: 8, name: 'Volksrust Clinic', type: 'clinic' },
      { id: 9, name: 'Amsterdam Clinic', type: 'clinic' },
      { id: 10, name: 'Balfour Clinic', type: 'clinic' },
    ],
    'ehlanzeni': [
      { id: 11, name: 'Rob Ferreira Hospital', type: 'hospital' },
      { id: 12, name: 'Themba Hospital', type: 'hospital' },
      { id: 13, name: 'Mapulaneng Hospital', type: 'hospital' },
      { id: 14, name: 'Matibidi Hospital', type: 'hospital' },
      { id: 15, name: 'Sabie Clinic', type: 'clinic' },
      { id: 16, name: 'Bushbuckridge Clinic', type: 'clinic' },
      { id: 17, name: 'Acornhoek Clinic', type: 'clinic' },
      { id: 18, name: 'Komatipoort Clinic', type: 'clinic' },
      { id: 19, name: 'Barberton Clinic', type: 'clinic' },
      { id: 20, name: 'Lydenburg Clinic', type: 'clinic' },
    ],
    'nkangala': [
      { id: 21, name: 'Witbank Hospital', type: 'hospital' },
      { id: 22, name: 'Middelburg Hospital', type: 'hospital' },
      { id: 23, name: 'Delmas Hospital', type: 'hospital' },
      { id: 24, name: 'Bethal Hospital', type: 'hospital' },
      { id: 25, name: 'Kriel Clinic', type: 'clinic' },
      { id: 26, name: 'Hendrina Clinic', type: 'clinic' },
      { id: 27, name: 'Groblersdal Clinic', type: 'clinic' },
      { id: 28, name: 'Moutse Clinic', type: 'clinic' },
    ]
  };

  useEffect(() => {
    if (region === 'gert-sibande' || region === 'ehlanzeni' || region === 'nkangala') {
      setFacilities(regionFacilities[region] || []);
    } else {
      setFacilities([]);
    }
    setFacility('all');
  }, [region]);

  const getDateRange = () => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - parseInt(timeRange));
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  };

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (userData) setRole(userData.role);
    fetchAllReports();
  }, [timeRange, region, facility]);

  const fetchAllReports = async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([
        fetchOverviewData(),
        fetchMaternityData(),
        fetchMedicationData(),
        fetchChronicData(),
        fetchDeliveryData(),
        fetchAppointmentData(),
        fetchVisitData(),
        fetchQueueData()
      ]);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Failed to fetch reports data');
    } finally {
      setLoading(false);
    }
  };

  const authFetch = async (url) => {
    const token = localStorage.getItem('token');
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return await response.json();
  };

  const buildQuery = () => {
    const { start, end } = getDateRange();
    const params = new URLSearchParams({ start, end, region, facility });
    return params.toString();
  };

  const fetchOverviewData = async () => {
    try {
      const data = await authFetch(`${API_URL}/reports/overview?${buildQuery()}`);
      if (data.success) setOverviewData(data.data);
    } catch (err) { console.error('Overview error:', err); }
  };

  const fetchMaternityData = async () => {
    try {
      const data = await authFetch(`${API_URL}/reports/maternity?${buildQuery()}`);
      if (data.success) setMaternityData(data.data);
    } catch (err) { console.error('Maternity error:', err); }
  };

  const fetchMedicationData = async () => {
    try {
      const data = await authFetch(`${API_URL}/reports/medications?${buildQuery()}`);
      if (data.success) setMedicationData(data.data);
    } catch (err) { console.error('Medications error:', err); }
  };

  const fetchChronicData = async () => {
    try {
      const data = await authFetch(`${API_URL}/reports/chronic-diseases?${buildQuery()}`);
      if (data.success) setChronicData(data.data);
    } catch (err) { console.error('Chronic error:', err); }
  };

  const fetchDeliveryData = async () => {
    try {
      const data = await authFetch(`${API_URL}/reports/deliveries?${buildQuery()}`);
      if (data.success) setDeliveryData(data.data);
    } catch (err) { console.error('Deliveries error:', err); }
  };

  const fetchAppointmentData = async () => {
    try {
      const data = await authFetch(`${API_URL}/reports/appointments?${buildQuery()}`);
      if (data.success) setAppointmentData(data.data);
    } catch (err) { console.error('Appointments error:', err); }
  };

  const fetchVisitData = async () => {
    try {
      const data = await authFetch(`${API_URL}/reports/visits?${buildQuery()}`);
      if (data.success) setVisitData(data.data);
    } catch (err) { console.error('Visits error:', err); }
  };

  const fetchQueueData = async () => {
    try {
      const data = await authFetch(`${API_URL}/reports/queue?${buildQuery()}`);
      if (data.success) setQueueData(data.data);
    } catch (err) { console.error('Queue error:', err); }
  };

  if (!localStorage.getItem('token')) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Please Login First</h2>
        <button onClick={() => (window.location.href = '/')}>Go to Login</button>
      </div>
    );
  }

  const getRegionLabel = () => {
    const labels = {
      'all': 'All Regions',
      'ehlanzeni': 'Ehlanzeni',
      'nkangala': 'Nkangala',
      'gert-sibande': 'Gert Sibande'
    };
    return labels[region] || 'All Regions';
  };

  return (
    <div className="reports-container">
      <Sidebar role={role} />
      <div className="reports-main">
        <Header role={role} />
        <div className="reports-content">
          {/* HEADER */}
          <div className="reports-header">
            <div>
              <h1>📊 Reports & Analytics</h1>
              <p className="reports-subtitle">
                {getRegionLabel()}
                {facility !== 'all' && ` → ${facilities.find(f => f.id === parseInt(facility))?.name || ''}`}
                {' • Last '}{timeRange} Months
              </p>
            </div>
            <button className="btn-refresh" onClick={fetchAllReports}>
              <i className="fas fa-sync-alt"></i> Refresh
            </button>
          </div>

          {/* FILTER BAR */}
          <div className="filter-bar">
            <div className="filter-group">
              <label><i className="fas fa-clock"></i> Time Range</label>
              <div className="button-group">
                <button className={`filter-btn ${timeRange === '3' ? 'active' : ''}`} onClick={() => setTimeRange('3')}>3 Months</button>
                <button className={`filter-btn ${timeRange === '6' ? 'active' : ''}`} onClick={() => setTimeRange('6')}>6 Months</button>
                <button className={`filter-btn ${timeRange === '12' ? 'active' : ''}`} onClick={() => setTimeRange('12')}>12 Months</button>
              </div>
            </div>

            <div className="filter-group">
              <label><i className="fas fa-map-marker-alt"></i> Region</label>
              <div className="button-group">
                <button className={`filter-btn ${region === 'all' ? 'active' : ''}`} onClick={() => setRegion('all')}>All</button>
                <button className={`filter-btn ${region === 'ehlanzeni' ? 'active' : ''}`} onClick={() => setRegion('ehlanzeni')}>Ehlanzeni</button>
                <button className={`filter-btn ${region === 'nkangala' ? 'active' : ''}`} onClick={() => setRegion('nkangala')}>Nkangala</button>
                <button className={`filter-btn ${region === 'gert-sibande' ? 'active' : ''}`} onClick={() => setRegion('gert-sibande')}>Gert Sibande</button>
              </div>
            </div>

            {region !== 'all' && facilities.length > 0 && (
              <div className="filter-group">
                <label><i className="fas fa-hospital"></i> Facility</label>
                <select className="facility-select" value={facility} onChange={(e) => setFacility(e.target.value)}>
                  <option value="all">All Facilities</option>
                  <optgroup label="🏥 Hospitals">
                    {facilities.filter(f => f.type === 'hospital').map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="🏥 Clinics">
                    {facilities.filter(f => f.type === 'clinic').map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            )}
          </div>

          {/* ACTIVE FILTERS */}
          <div className="active-filters">
            <span className="filter-pill"><i className="fas fa-clock"></i> {timeRange} Months</span>
            <span className="filter-pill"><i className="fas fa-map-marker-alt"></i> {getRegionLabel()}</span>
            {facility !== 'all' && (
              <span className="filter-pill">
                <i className="fas fa-hospital"></i> {facilities.find(f => f.id === parseInt(facility))?.name}
                <button className="pill-close" onClick={() => setFacility('all')}><i className="fas fa-times"></i></button>
              </span>
            )}
          </div>

          {/* TABS */}
          <div className="report-tabs">
            {[
              { id: 'overview', icon: 'fa-chart-pie', label: 'Overview' },
              { id: 'maternity', icon: 'fa-baby', label: 'Maternity' },
              { id: 'medications', icon: 'fa-pills', label: 'Medications' },
              { id: 'chronic', icon: 'fa-heartbeat', label: 'Chronic Diseases' },
              { id: 'deliveries', icon: 'fa-baby-carriage', label: 'Deliveries' },
              { id: 'appointments', icon: 'fa-calendar-check', label: 'Appointments' },
              { id: 'visits', icon: 'fa-user-md', label: 'Visits' },
              { id: 'queue', icon: 'fa-users', label: 'Queue' }
            ].map(tab => (
              <button key={tab.id} className={`tab ${activeReport === tab.id ? 'active' : ''}`} onClick={() => setActiveReport(tab.id)}>
                <i className={`fas ${tab.icon}`}></i> {tab.label}
              </button>
            ))}
          </div>

          {/* CONTENT */}
          {loading ? (
            <div className="loading-spinner">
              <i className="fas fa-spinner fa-spin"></i>
              <p>Loading reports...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <i className="fas fa-exclamation-circle"></i>
              <h3>{error}</h3>
              <p>Please try refreshing the page</p>
            </div>
          ) : (
            <div className="report-content">
              {/* OVERVIEW */}
              {activeReport === 'overview' && (
                <div className="overview-report">
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-icon blue"><i className="fas fa-users"></i></div>
                      <div className="stat-info"><h3>{overviewData.total_patients}</h3><p>Total Patients</p></div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon purple"><i className="fas fa-calendar-check"></i></div>
                      <div className="stat-info"><h3>{overviewData.total_appointments}</h3><p>Appointments</p></div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon green"><i className="fas fa-baby"></i></div>
                      <div className="stat-info"><h3>{overviewData.total_deliveries}</h3><p>Deliveries</p></div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon pink"><i className="fas fa-pills"></i></div>
                      <div className="stat-info"><h3>{overviewData.total_medications}</h3><p>Medications</p></div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon orange"><i className="fas fa-heartbeat"></i></div>
                      <div className="stat-info"><h3>{overviewData.chronic_diseases}</h3><p>Chronic Diseases</p></div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon red"><i className="fas fa-exclamation-triangle"></i></div>
                      <div className="stat-info"><h3>{overviewData.cancelled_appointments}</h3><p>Missed</p></div>
                    </div>
                  </div>

                  <div className="charts-grid">
                    <div className="chart-card">
                      <h4><i className="fas fa-heartbeat"></i> Chronic Disease Breakdown</h4>
                      <div className="disease-list">
                        {overviewData.chronic_disease_breakdown?.length > 0 ? (
                          overviewData.chronic_disease_breakdown.slice(0, 10).map((d, i) => (
                            <div key={i} className="disease-item">
                              <span className="disease-name">{d.disease_category}</span>
                              <div className="disease-bar">
                                <div className="disease-fill" style={{
                                  width: `${overviewData.chronic_diseases > 0 ? (d.count / overviewData.chronic_diseases) * 100 : 0}%`,
                                  backgroundColor: ['#6366f1','#8b5cf6','#a855f7','#d946ef','#ec4899','#f43f5e','#ef4444','#f97316','#f59e0b','#84cc16'][i % 10]
                                }}></div>
                              </div>
                              <span className="disease-value">{d.count}</span>
                            </div>
                          ))
                        ) : <p className="empty-text">No data for this period</p>}
                      </div>
                    </div>
                    <div className="chart-card">
                      <h4><i className="fas fa-pills"></i> Medication Breakdown</h4>
                      <div className="disease-list">
                        {overviewData.medication_breakdown?.length > 0 ? (
                          overviewData.medication_breakdown.slice(0, 10).map((m, i) => (
                            <div key={i} className="disease-item">
                              <span className="disease-name">{m.medication_name || 'Unnamed'}</span>
                              <div className="disease-bar">
                                <div className="disease-fill" style={{
                                  width: `${overviewData.total_medications > 0 ? (m.count / overviewData.total_medications) * 100 : 0}%`,
                                  backgroundColor: ['#6366f1','#8b5cf6','#a855f7','#d946ef','#ec4899'][i % 5]
                                }}></div>
                              </div>
                              <span className="disease-value">{m.count}</span>
                            </div>
                          ))
                        ) : <p className="empty-text">No data for this period</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MATERNITY */}
              {activeReport === 'maternity' && (
                <div className="maternity-report">
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-icon purple"><i className="fas fa-baby"></i></div>
                      <div className="stat-info"><h3>{maternityData.total_records}</h3><p>Total Records</p></div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon blue"><i className="fas fa-check-circle"></i></div>
                      <div className="stat-info"><h3>{maternityData.by_status?.find(s => s.status === 'active')?.count || 0}</h3><p>Active</p></div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon green"><i className="fas fa-check-double"></i></div>
                      <div className="stat-info"><h3>{maternityData.by_status?.find(s => s.status === 'completed')?.count || 0}</h3><p>Completed</p></div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon yellow"><i className="fas fa-ambulance"></i></div>
                      <div className="stat-info"><h3>{maternityData.total_referrals}</h3><p>Referred</p></div>
                    </div>
                  </div>
                  <div className="charts-grid">
                    <div className="chart-card">
                      <h4>By Trimester</h4>
                      <div className="disease-list">
                        {[
                          { name: '1st Trimester', value: maternityData.by_trimester.first, color: '#6366f1' },
                          { name: '2nd Trimester', value: maternityData.by_trimester.second, color: '#8b5cf6' },
                          { name: '3rd Trimester', value: maternityData.by_trimester.third, color: '#ec4899' }
                        ].map((item, i) => (
                          <div key={i} className="disease-item">
                            <span className="disease-name">{item.name}</span>
                            <div className="disease-bar">
                              <div className="disease-fill" style={{
                                width: `${maternityData.total_records > 0 ? (item.value / maternityData.total_records) * 100 : 0}%`,
                                backgroundColor: item.color
                              }}></div>
                            </div>
                            <span className="disease-value">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="chart-card">
                      <h4>By Risk Level</h4>
                      <div className="disease-list">
                        {maternityData.by_risk?.length > 0 ? (
                          maternityData.by_risk.map((item, i) => (
                            <div key={i} className="disease-item">
                              <span className="disease-name">{item.risk_level || 'Unknown'}</span>
                              <div className="disease-bar">
                                <div className="disease-fill" style={{
                                  width: `${maternityData.total_records > 0 ? (item.count / maternityData.total_records) * 100 : 0}%`,
                                  backgroundColor: item.risk_level === 'critical' ? '#dc2626' :
                                                   item.risk_level === 'high' ? '#ef4444' :
                                                   item.risk_level === 'moderate' ? '#f59e0b' : '#10b981'
                                }}></div>
                              </div>
                              <span className="disease-value">{item.count}</span>
                            </div>
                          ))
                        ) : <p className="empty-text">No data for this period</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MEDICATIONS */}
              {activeReport === 'medications' && (
                <div className="medications-report">
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-icon pink"><i className="fas fa-pills"></i></div>
                      <div className="stat-info"><h3>{medicationData.total_medications}</h3><p>Total Prescriptions</p></div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon purple"><i className="fas fa-prescription-bottle"></i></div>
                      <div className="stat-info"><h3>{medicationData.by_medication?.length || 0}</h3><p>Unique Medications</p></div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon green"><i className="fas fa-vitamins"></i></div>
                      <div className="stat-info"><h3>{medicationData.by_supplement?.length || 0}</h3><p>Unique Supplements</p></div>
                    </div>
                  </div>
                  <div className="charts-grid">
                    <div className="chart-card">
                      <h4>Most Prescribed Medications</h4>
                      <div className="disease-list">
                        {medicationData.most_prescribed?.length > 0 ? (
                          medicationData.most_prescribed.map((m, i) => (
                            <div key={i} className="disease-item">
                              <span className="disease-name">{m.medication_name || 'Unnamed'}</span>
                              <div className="disease-bar">
                                <div className="disease-fill" style={{
                                  width: `${medicationData.total_medications > 0 ? (m.count / medicationData.total_medications) * 100 : 0}%`,
                                  backgroundColor: ['#6366f1','#8b5cf6','#a855f7','#d946ef','#ec4899'][i % 5]
                                }}></div>
                              </div>
                              <span className="disease-value">{m.count}</span>
                            </div>
                          ))
                        ) : <p className="empty-text">No data for this period</p>}
                      </div>
                    </div>
                    <div className="chart-card">
                      <h4>Most Prescribed Supplements</h4>
                      <div className="disease-list">
                        {medicationData.most_prescribed_supplements?.length > 0 ? (
                          medicationData.most_prescribed_supplements.map((s, i) => (
                            <div key={i} className="disease-item">
                              <span className="disease-name">{s.supplement_name || 'Unnamed'}</span>
                              <div className="disease-bar">
                                <div className="disease-fill" style={{
                                  width: `${medicationData.total_medications > 0 ? (s.count / medicationData.total_medications) * 100 : 0}%`,
                                  backgroundColor: ['#10b981','#34d399','#6ee7b7','#a7f3d0','#d1fae5'][i % 5]
                                }}></div>
                              </div>
                              <span className="disease-value">{s.count}</span>
                            </div>
                          ))
                        ) : <p className="empty-text">No data for this period</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CHRONIC */}
              {activeReport === 'chronic' && (
                <div className="chronic-report">
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-icon red"><i className="fas fa-heartbeat"></i></div>
                      <div className="stat-info"><h3>{chronicData.total_chronic_diseases}</h3><p>Total Chronic Cases</p></div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon orange"><i className="fas fa-list"></i></div>
                      <div className="stat-info"><h3>{chronicData.disease_breakdown?.length || 0}</h3><p>Unique Conditions</p></div>
                    </div>
                  </div>
                  <div className="charts-grid">
                    <div className="chart-card full-width">
                      <h4>Chronic Disease Distribution</h4>
                      <div className="disease-list">
                        {chronicData.disease_breakdown?.length > 0 ? (
                          chronicData.disease_breakdown.map((d, i) => (
                            <div key={i} className="disease-item">
                              <span className="disease-name">{d.disease_category}</span>
                              <div className="disease-bar">
                                <div className="disease-fill" style={{
                                  width: `${chronicData.total_chronic_diseases > 0 ? (d.count / chronicData.total_chronic_diseases) * 100 : 0}%`,
                                  backgroundColor: ['#6366f1','#8b5cf6','#a855f7','#d946ef','#ec4899','#f43f5e','#ef4444','#f97316','#f59e0b','#84cc16','#06b6d4','#10b981'][i % 12]
                                }}></div>
                              </div>
                              <span className="disease-value">{d.count}</span>
                            </div>
                          ))
                        ) : <p className="empty-text">No data for this period</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* DELIVERIES */}
              {activeReport === 'deliveries' && (
                <div className="deliveries-report">
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-icon green"><i className="fas fa-baby-carriage"></i></div>
                      <div className="stat-info"><h3>{deliveryData.total}</h3><p>Total Deliveries</p></div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon blue"><i className="fas fa-male"></i></div>
                      <div className="stat-info"><h3>{deliveryData.by_sex?.male || 0}</h3><p>Male Babies</p></div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon pink"><i className="fas fa-female"></i></div>
                      <div className="stat-info"><h3>{deliveryData.by_sex?.female || 0}</h3><p>Female Babies</p></div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon yellow"><i className="fas fa-weight"></i></div>
                      <div className="stat-info"><h3>{deliveryData.avg_birth_weight} kg</h3><p>Avg Birth Weight</p></div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon red"><i className="fas fa-exclamation-triangle"></i></div>
                      <div className="stat-info"><h3>{deliveryData.stillborn_babies}</h3><p>Stillborn</p></div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon orange"><i className="fas fa-heart"></i></div>
                      <div className="stat-info"><h3>{deliveryData.maternal_complications}</h3><p>Maternal Complications</p></div>
                    </div>
                  </div>
                  <div className="charts-grid">
                    <div className="chart-card">
                      <h4>Delivery Methods</h4>
                      <div className="disease-list">
                        {deliveryData.by_method?.length > 0 ? (
                          deliveryData.by_method.map((m, i) => (
                            <div key={i} className="disease-item">
                              <span className="disease-name">{m.delivery_method || 'Unknown'}</span>
                              <div className="disease-bar">
                                <div className="disease-fill" style={{
                                  width: `${deliveryData.total > 0 ? (m.count / deliveryData.total) * 100 : 0}%`,
                                  backgroundColor: ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981'][i % 5]
                                }}></div>
                              </div>
                              <span className="disease-value">{m.count}</span>
                            </div>
                          ))
                        ) : <p className="empty-text">No data for this period</p>}
                      </div>
                    </div>
                  </div>

                  {deliveryData.stillborn_details?.length > 0 && (
                    <div className="chart-card full-width stillborn-section">
                      <h4>⚠️ Stillborn Cases</h4>
                      <div className="stillborn-list">
                        <table className="details-table">
                          <thead>
                            <tr>
                              <th>Patient</th><th>Date</th><th>Gestational Age</th>
                              <th>Birth Weight</th><th>Reason</th><th>Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {deliveryData.stillborn_details.map((c, i) => (
                              <tr key={i}>
                                <td>{c.patient_name || 'N/A'}</td>
                                <td>{c.delivery_date}</td>
                                <td>{c.gestational_age || 'N/A'} weeks</td>
                                <td>{c.birth_weight || 'N/A'} kg</td>
                                <td>{c.stillborn_reason || 'Not specified'}</td>
                                <td>{c.clinician_notes || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* APPOINTMENTS */}
              {activeReport === 'appointments' && (
                <div className="appointments-report">
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-icon purple"><i className="fas fa-calendar-check"></i></div>
                      <div className="stat-info"><h3>{appointmentData.total}</h3><p>Total</p></div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon blue"><i className="fas fa-clock"></i></div>
                      <div className="stat-info"><h3>{appointmentData.scheduled}</h3><p>Scheduled</p></div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon green"><i className="fas fa-check-circle"></i></div>
                      <div className="stat-info"><h3>{appointmentData.completed}</h3><p>Completed</p></div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon red"><i className="fas fa-times-circle"></i></div>
                      <div className="stat-info"><h3>{appointmentData.cancelled}</h3><p>Cancelled</p></div>
                    </div>
                  </div>
                  <div className="charts-grid">
                    <div className="chart-card">
                      <h4>Appointment Status</h4>
                      <div className="disease-list">
                        {[
                          { label: 'Scheduled', value: appointmentData.scheduled, color: '#3b82f6' },
                          { label: 'Confirmed', value: appointmentData.confirmed, color: '#f59e0b' },
                          { label: 'Completed', value: appointmentData.completed, color: '#10b981' },
                          { label: 'Cancelled', value: appointmentData.cancelled, color: '#ef4444' }
                        ].map((item, i) => (
                          <div key={i} className="disease-item">
                            <span className="disease-name">{item.label}</span>
                            <div className="disease-bar">
                              <div className="disease-fill" style={{
                                width: `${appointmentData.total > 0 ? (item.value / appointmentData.total) * 100 : 0}%`,
                                backgroundColor: item.color
                              }}></div>
                            </div>
                            <span className="disease-value">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* VISITS */}
              {activeReport === 'visits' && (
                <div className="visits-report">
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-icon blue"><i className="fas fa-user-md"></i></div>
                      <div className="stat-info"><h3>{visitData.total}</h3><p>Total Visits</p></div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon green"><i className="fas fa-check-circle"></i></div>
                      <div className="stat-info"><h3>{visitData.completed}</h3><p>Completed</p></div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon red"><i className="fas fa-times-circle"></i></div>
                      <div className="stat-info"><h3>{visitData.missed}</h3><p>Missed</p></div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon yellow"><i className="fas fa-clock"></i></div>
                      <div className="stat-info"><h3>{visitData.scheduled}</h3><p>Scheduled</p></div>
                    </div>
                  </div>
                  <div className="charts-grid">
                    <div className="chart-card">
                      <h4>Visit Status</h4>
                      <div className="disease-list">
                        {[
                          { label: 'Completed', value: visitData.completed, color: '#10b981' },
                          { label: 'Missed', value: visitData.missed, color: '#ef4444' },
                          { label: 'Scheduled', value: visitData.scheduled, color: '#f59e0b' }
                        ].map((item, i) => (
                          <div key={i} className="disease-item">
                            <span className="disease-name">{item.label}</span>
                            <div className="disease-bar">
                              <div className="disease-fill" style={{
                                width: `${visitData.total > 0 ? (item.value / visitData.total) * 100 : 0}%`,
                                backgroundColor: item.color
                              }}></div>
                            </div>
                            <span className="disease-value">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* QUEUE */}
              {activeReport === 'queue' && (
                <div className="queue-report">
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-icon blue"><i className="fas fa-users"></i></div>
                      <div className="stat-info"><h3>{queueData.total}</h3><p>Total</p></div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon red"><i className="fas fa-exclamation-circle"></i></div>
                      <div className="stat-info"><h3>{queueData.emergency}</h3><p>Emergency</p></div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon orange"><i className="fas fa-exclamation-triangle"></i></div>
                      <div className="stat-info"><h3>{queueData.critical}</h3><p>Critical</p></div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon yellow"><i className="fas fa-clock"></i></div>
                      <div className="stat-info"><h3>{queueData.avg_wait_time} min</h3><p>Avg Wait</p></div>
                    </div>
                  </div>
                  <div className="charts-grid">
                    <div className="chart-card">
                      <h4>Status Distribution</h4>
                      <div className="disease-list">
                        {[
                          { label: 'Waiting', value: queueData.waiting, color: '#f59e0b' },
                          { label: 'In Progress', value: queueData.in_progress, color: '#3b82f6' },
                          { label: 'Completed', value: queueData.completed, color: '#10b981' },
                          { label: 'Cancelled', value: queueData.cancelled, color: '#ef4444' }
                        ].map((item, i) => (
                          <div key={i} className="disease-item">
                            <span className="disease-name">{item.label}</span>
                            <div className="disease-bar">
                              <div className="disease-fill" style={{
                                width: `${queueData.total > 0 ? (item.value / queueData.total) * 100 : 0}%`,
                                backgroundColor: item.color
                              }}></div>
                            </div>
                            <span className="disease-value">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Reports;