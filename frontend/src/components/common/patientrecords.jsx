// src/pages/PatientRecords.jsx
import React, { useState, useEffect } from 'react';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';
import './styles/patientrecords.css';

function PatientRecords() {
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [role, setRole] = useState('reception');
  const [user, setUser] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [activeTab, setActiveTab] = useState('overview');
  const [patientHistory, setPatientHistory] = useState({
    vitals: [],
    diagnoses: [],
    prescriptions: [],
    referrals: [],
    visits: [],
    maternity: null,
    labResults: [],
    radiology: []
  });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [filters, setFilters] = useState({
    gender: '',
    province: '',
    status: 'active'
  });

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (userData) {
      setUser(userData);
      setRole(userData.role);
    }
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/patients`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setPatients(data.patients || data.data || []);
        setFilteredPatients(data.patients || data.data || []);
      } else {
        setError(data.message || 'Failed to fetch patients');
      }
    } catch (err) {
      setError('Error connecting to server');
      console.error('Fetch patients error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (term) => {
    setSearchTerm(term);

    if (!term.trim()) {
      applyFilters(patients);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/patients/search/${encodeURIComponent(term)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        applyFilters(data.patients || []);
      } else {
        setError(data.message || 'Search failed');
      }
    } catch (err) {
      console.error('Search error:', err);
      const localResults = patients.filter(p =>
        p.first_name?.toLowerCase().includes(term.toLowerCase()) ||
        p.last_name?.toLowerCase().includes(term.toLowerCase()) ||
        p.phone_number?.includes(term) ||
        p.id_number?.includes(term)
      );
      applyFilters(localResults);
    }
  };

  const applyFilters = (patientList) => {
    let filtered = [...patientList];

    if (filters.gender) {
      filtered = filtered.filter(p => p.gender === filters.gender);
    }

    if (filters.province) {
      filtered = filtered.filter(p => p.province === filters.province);
    }

    if (filters.status) {
      filtered = filtered.filter(p => (p.status || 'active') === filters.status);
    }

    setFilteredPatients(filtered);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const viewPatientDetails = async (patientId) => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch patient details
      const response = await fetch(`${API_URL}/patients/${patientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setSelectedPatient(data.patient || data.data);
        setShowPatientModal(true);
        setActiveTab('overview');
        // Fetch patient history
        await fetchPatientHistory(patientId);
      } else {
        setError(data.message || 'Failed to fetch patient details');
      }
    } catch (err) {
      console.error('View patient error:', err);
      setError('Error fetching patient details');
    }
  };

  const fetchPatientHistory = async (patientId) => {
    setHistoryLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Fetch all patient history in parallel
      const [
        vitalsRes,
        diagnosesRes,
        prescriptionsRes,
        referralsRes,
        visitsRes,
        maternityRes,
        labRes,
        radiologyRes
      ] = await Promise.all([
        fetch(`${API_URL}/patients/${patientId}/vitals`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/patients/${patientId}/diagnoses`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/patients/${patientId}/prescriptions`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/patients/${patientId}/referrals`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/patients/${patientId}/visits`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/patients/${patientId}/maternity`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/patients/${patientId}/lab-results`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/patients/${patientId}/radiology`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const [vitals, diagnoses, prescriptions, referrals, visits, maternity, labResults, radiology] = await Promise.all([
        vitalsRes.json(),
        diagnosesRes.json(),
        prescriptionsRes.json(),
        referralsRes.json(),
        visitsRes.json(),
        maternityRes.json(),
        labRes.json(),
        radiologyRes.json()
      ]);

      setPatientHistory({
        vitals: vitals.success ? vitals.data || vitals.vitals || [] : [],
        diagnoses: diagnoses.success ? diagnoses.data || diagnoses.diagnoses || [] : [],
        prescriptions: prescriptions.success ? prescriptions.data || prescriptions.prescriptions || [] : [],
        referrals: referrals.success ? referrals.data || referrals.referrals || [] : [],
        visits: visits.success ? visits.data || visits.visits || [] : [],
        maternity: maternity.success ? maternity.data || maternity.maternity : null,
        labResults: labResults.success ? labResults.data || labResults.results || [] : [],
        radiology: radiology.success ? radiology.data || radiology.images || [] : []
      });
    } catch (err) {
      console.error('Error fetching patient history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Administrator',
      doctor: 'Doctor',
      nurse: 'Nurse',
      reception: 'Receptionist',
      pharmacist: 'Pharmacist',
      patient: 'Patient'
    };
    return labels[role] || role;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUniqueProvinces = () => {
    const provinces = new Set();
    patients.forEach(p => {
      if (p.province) provinces.add(p.province);
    });
    return Array.from(provinces);
  };

  // ─── RENDER TABS ───
  const renderTabContent = () => {
    if (historyLoading) {
      return (
        <div className="history-loading">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading patient history...</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'vitals':
        return renderVitals();
      case 'diagnoses':
        return renderDiagnoses();
      case 'prescriptions':
        return renderPrescriptions();
      case 'referrals':
        return renderReferrals();
      case 'visits':
        return renderVisits();
      case 'maternity':
        return renderMaternity();
      case 'lab':
        return renderLabResults();
      case 'radiology':
        return renderRadiology();
      default:
        return renderOverview();
    }
  };

  // ─── OVERVIEW TAB ───
  const renderOverview = () => {
    const stats = {
      totalVisits: patientHistory.visits?.length || 0,
      totalPrescriptions: patientHistory.prescriptions?.length || 0,
      totalReferrals: patientHistory.referrals?.length || 0,
      totalDiagnoses: patientHistory.diagnoses?.length || 0,
      totalVitals: patientHistory.vitals?.length || 0,
    };

    return (
      <div className="overview-tab">
        <div className="stats-grid-small">
          <div className="stat-mini-card">
            <div className="stat-icon" style={{ background: '#534AB7' }}><i className="fas fa-stethoscope"></i></div>
            <div className="stat-info">
              <h4>{stats.totalVisits}</h4>
              <p>Total Visits</p>
            </div>
          </div>
          <div className="stat-mini-card">
            <div className="stat-icon" style={{ background: '#10B981' }}><i className="fas fa-prescription"></i></div>
            <div className="stat-info">
              <h4>{stats.totalPrescriptions}</h4>
              <p>Prescriptions</p>
            </div>
          </div>
          <div className="stat-mini-card">
            <div className="stat-icon" style={{ background: '#F59E0B' }}><i className="fas fa-ambulance"></i></div>
            <div className="stat-info">
              <h4>{stats.totalReferrals}</h4>
              <p>Referrals</p>
            </div>
          </div>
          <div className="stat-mini-card">
            <div className="stat-icon" style={{ background: '#EF4444' }}><i className="fas fa-heartbeat"></i></div>
            <div className="stat-info">
              <h4>{stats.totalVitals}</h4>
              <p>Vitals Recorded</p>
            </div>
          </div>
        </div>

        {patientHistory.visits?.length > 0 && (
          <div className="recent-activity">
            <h4>Recent Activity</h4>
            {patientHistory.visits.slice(0, 3).map((visit, index) => (
              <div key={index} className="activity-item">
                <div className="activity-icon"><i className="fas fa-calendar-check"></i></div>
                <div className="activity-content">
                  <p><strong>Visit on {formatDate(visit.visit_date)}</strong></p>
                  <p className="activity-detail">{visit.visit_type || 'General Visit'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ─── VITALS TAB ───
  const renderVitals = () => {
    const vitals = patientHistory.vitals || [];
    if (vitals.length === 0) {
      return (
        <div className="empty-history">
          <i className="fas fa-heartbeat"></i>
          <p>No vitals recorded for this patient</p>
        </div>
      );
    }

    return (
      <div className="vitals-tab">
        <div className="vitals-grid">
          {vitals.map((vital, index) => (
            <div key={index} className="vital-card">
              <div className="vital-date">{formatDateTime(vital.recorded_at || vital.created_at)}</div>
              <div className="vital-row">
                <span>Temperature</span>
                <span className="vital-value">{vital.temperature}°C</span>
              </div>
              <div className="vital-row">
                <span>Heart Rate</span>
                <span className="vital-value">{vital.heart_rate} bpm</span>
              </div>
              <div className="vital-row">
                <span>Blood Pressure</span>
                <span className="vital-value">{vital.blood_pressure_systolic}/{vital.blood_pressure_diastolic}</span>
              </div>
              <div className="vital-row">
                <span>Oxygen Saturation</span>
                <span className="vital-value">{vital.oxygen_saturation}%</span>
              </div>
              <div className="vital-row">
                <span>Blood Glucose</span>
                <span className="vital-value">{vital.blood_glucose} mmol/L</span>
              </div>
              <div className="vital-row">
                <span>Weight</span>
                <span className="vital-value">{vital.weight} kg</span>
              </div>
              <div className="vital-row">
                <span>Height</span>
                <span className="vital-value">{vital.height} cm</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── DIAGNOSES TAB ───
  const renderDiagnoses = () => {
    const diagnoses = patientHistory.diagnoses || [];
    if (diagnoses.length === 0) {
      return (
        <div className="empty-history">
          <i className="fas fa-notes-medical"></i>
          <p>No diagnoses recorded for this patient</p>
        </div>
      );
    }

    return (
      <div className="diagnoses-tab">
        {diagnoses.map((diagnosis, index) => (
          <div key={index} className="history-card">
            <div className="history-card-header">
              <span className="history-date">{formatDate(diagnosis.diagnosis_date || diagnosis.created_at)}</span>
              <span className="history-type diagnosis">Diagnosis</span>
            </div>
            <div className="history-card-body">
              <div className="history-row">
                <span className="history-label">ICD-10 Code:</span>
                <span>{diagnosis.icd10_code || 'N/A'}</span>
              </div>
              <div className="history-row">
                <span className="history-label">Diagnosis:</span>
                <span className="diagnosis-text">{diagnosis.diagnosis || diagnosis.description}</span>
              </div>
              {diagnosis.notes && (
                <div className="history-row">
                  <span className="history-label">Notes:</span>
                  <span>{diagnosis.notes}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ─── PRESCRIPTIONS TAB ───
  const renderPrescriptions = () => {
    const prescriptions = patientHistory.prescriptions || [];
    if (prescriptions.length === 0) {
      return (
        <div className="empty-history">
          <i className="fas fa-prescription-bottle"></i>
          <p>No prescriptions recorded for this patient</p>
        </div>
      );
    }

    return (
      <div className="prescriptions-tab">
        {prescriptions.map((prescription, index) => (
          <div key={index} className="history-card">
            <div className="history-card-header">
              <span className="history-date">{formatDate(prescription.created_at)}</span>
              <span className="history-type prescription">Prescription</span>
            </div>
            <div className="history-card-body">
              <div className="history-row">
                <span className="history-label">Medication:</span>
                <span className="medication-name">{prescription.medication}</span>
              </div>
              <div className="history-row">
                <span className="history-label">Dosage:</span>
                <span>{prescription.dosage}</span>
              </div>
              <div className="history-row">
                <span className="history-label">Frequency:</span>
                <span>{prescription.frequency}</span>
              </div>
              <div className="history-row">
                <span className="history-label">Quantity:</span>
                <span>{prescription.quantity}</span>
              </div>
              <div className="history-row">
                <span className="history-label">Status:</span>
                <span className={`status-badge ${prescription.status || 'pending'}`}>
                  {prescription.status || 'pending'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ─── REFERRALS TAB ───
  const renderReferrals = () => {
    const referrals = patientHistory.referrals || [];
    if (referrals.length === 0) {
      return (
        <div className="empty-history">
          <i className="fas fa-ambulance"></i>
          <p>No referrals recorded for this patient</p>
        </div>
      );
    }

    return (
      <div className="referrals-tab">
        {referrals.map((referral, index) => (
          <div key={index} className="history-card">
            <div className="history-card-header">
              <span className="history-date">{formatDate(referral.referral_date || referral.created_at)}</span>
              <span className="history-type referral">Referral</span>
            </div>
            <div className="history-card-body">
              <div className="history-row">
                <span className="history-label">From:</span>
                <span>{referral.from_facility_name || referral.from_facility}</span>
              </div>
              <div className="history-row">
                <span className="history-label">To:</span>
                <span>{referral.to_facility_name || referral.to_facility}</span>
              </div>
              <div className="history-row">
                <span className="history-label">Priority:</span>
                <span className={`priority-badge ${referral.priority}`}>
                  {referral.priority || 'normal'}
                </span>
              </div>
              <div className="history-row">
                <span className="history-label">Reason:</span>
                <span>{referral.reason}</span>
              </div>
              <div className="history-row">
                <span className="history-label">Status:</span>
                <span className={`status-badge ${referral.status}`}>
                  {referral.status || 'pending'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ─── VISITS TAB ───
  const renderVisits = () => {
    const visits = patientHistory.visits || [];
    if (visits.length === 0) {
      return (
        <div className="empty-history">
          <i className="fas fa-calendar-check"></i>
          <p>No visits recorded for this patient</p>
        </div>
      );
    }

    return (
      <div className="visits-tab">
        {visits.map((visit, index) => (
          <div key={index} className="history-card">
            <div className="history-card-header">
              <span className="history-date">{formatDate(visit.visit_date || visit.created_at)}</span>
              <span className="history-type visit">Visit</span>
            </div>
            <div className="history-card-body">
              <div className="history-row">
                <span className="history-label">Visit Type:</span>
                <span>{visit.visit_type || 'General'}</span>
              </div>
              <div className="history-row">
                <span className="history-label">Status:</span>
                <span className={`status-badge ${visit.status}`}>
                  {visit.status || 'completed'}
                </span>
              </div>
              {visit.notes && (
                <div className="history-row">
                  <span className="history-label">Notes:</span>
                  <span>{visit.notes}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ─── MATERNITY TAB ───
  const renderMaternity = () => {
    const maternity = patientHistory.maternity;
    if (!maternity) {
      return (
        <div className="empty-history">
          <i className="fas fa-baby"></i>
          <p>No maternity records for this patient</p>
        </div>
      );
    }

    return (
      <div className="maternity-tab">
        <div className="maternity-grid">
          <div className="maternity-card">
            <h4><i className="fas fa-calendar"></i> Pregnancy Details</h4>
            <div className="maternity-row">
              <span>Expected Due Date:</span>
              <span>{formatDate(maternity.expected_due_date)}</span>
            </div>
            <div className="maternity-row">
              <span>Gestational Weeks:</span>
              <span>{maternity.gestational_weeks || 'N/A'}</span>
            </div>
            <div className="maternity-row">
              <span>Gravida:</span>
              <span>{maternity.gravida || 'N/A'}</span>
            </div>
            <div className="maternity-row">
              <span>Para:</span>
              <span>{maternity.para || 'N/A'}</span>
            </div>
            <div className="maternity-row">
              <span>Living Children:</span>
              <span>{maternity.living_children || 'N/A'}</span>
            </div>
          </div>

          <div className="maternity-card">
            <h4><i className="fas fa-heart"></i> Health Indicators</h4>
            <div className="maternity-row">
              <span>Blood Pressure:</span>
              <span>{maternity.blood_pressure || 'N/A'}</span>
            </div>
            <div className="maternity-row">
              <span>Protein in Urine:</span>
              <span>{maternity.protein_in_urine || 'N/A'}</span>
            </div>
            <div className="maternity-row">
              <span>Swelling:</span>
              <span>{maternity.swelling || 'N/A'}</span>
            </div>
            <div className="maternity-row">
              <span>Blurred Vision:</span>
              <span>{maternity.blurred_vision ? 'Yes' : 'No'}</span>
            </div>
            <div className="maternity-row">
              <span>Vaginal Bleeding:</span>
              <span>{maternity.vaginal_bleeding ? 'Yes' : 'No'}</span>
            </div>
          </div>

          <div className="maternity-card">
            <h4><i className="fas fa-baby"></i> Delivery Information</h4>
            <div className="maternity-row">
              <span>Delivery Date:</span>
              <span>{formatDate(maternity.delivery_date)}</span>
            </div>
            <div className="maternity-row">
              <span>Delivery Type:</span>
              <span>{maternity.delivery_type || 'N/A'}</span>
            </div>
            <div className="maternity-row">
              <span>Delivery Outcome:</span>
              <span>{maternity.delivery_outcome || 'N/A'}</span>
            </div>
            <div className="maternity-row">
              <span>Baby Weight:</span>
              <span>{maternity.baby_weight ? `${maternity.baby_weight} kg` : 'N/A'}</span>
            </div>
            <div className="maternity-row">
              <span>Baby Gender:</span>
              <span>{maternity.baby_gender || 'N/A'}</span>
            </div>
            <div className="maternity-row">
              <span>Apgar Score:</span>
              <span>{maternity.baby_apgar_score || 'N/A'}</span>
            </div>
          </div>

          <div className="maternity-card">
            <h4><i className="fas fa-exclamation-triangle"></i> Risk & Complications</h4>
            <div className="maternity-row">
              <span>Risk Factors:</span>
              <span>{maternity.risk_factors || 'None'}</span>
            </div>
            <div className="maternity-row">
              <span>Complications:</span>
              <span>{maternity.complications || 'None'}</span>
            </div>
            <div className="maternity-row">
              <span>Referral Alert:</span>
              <span>{maternity.referral_alert ? 'Yes' : 'No'}</span>
            </div>
            {maternity.referral_alert_reason && (
              <div className="maternity-row">
                <span>Referral Reason:</span>
                <span className="alert-text">{maternity.referral_alert_reason}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─── LAB RESULTS TAB ───
  const renderLabResults = () => {
    const labResults = patientHistory.labResults || [];
    if (labResults.length === 0) {
      return (
        <div className="empty-history">
          <i className="fas fa-flask"></i>
          <p>No laboratory results for this patient</p>
        </div>
      );
    }

    return (
      <div className="lab-results-tab">
        {labResults.map((result, index) => (
          <div key={index} className="history-card">
            <div className="history-card-header">
              <span className="history-date">{formatDate(result.test_date || result.created_at)}</span>
              <span className="history-type lab">Lab Test</span>
            </div>
            <div className="history-card-body">
              <div className="history-row">
                <span className="history-label">Test Name:</span>
                <span>{result.test_name}</span>
              </div>
              <div className="history-row">
                <span className="history-label">Result:</span>
                <span className={result.result_status === 'abnormal' ? 'abnormal-result' : 'normal-result'}>
                  {result.result}
                </span>
              </div>
              <div className="history-row">
                <span className="history-label">Reference Range:</span>
                <span>{result.reference_range || 'N/A'}</span>
              </div>
              <div className="history-row">
                <span className="history-label">Status:</span>
                <span className={`status-badge ${result.status || 'pending'}`}>
                  {result.status || 'pending'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ─── RADIOLOGY TAB ───
  const renderRadiology = () => {
    const radiology = patientHistory.radiology || [];
    if (radiology.length === 0) {
      return (
        <div className="empty-history">
          <i className="fas fa-x-ray"></i>
          <p>No radiology/imaging records for this patient</p>
        </div>
      );
    }

    return (
      <div className="radiology-tab">
        {radiology.map((image, index) => (
          <div key={index} className="history-card">
            <div className="history-card-header">
              <span className="history-date">{formatDate(image.image_date || image.created_at)}</span>
              <span className="history-type radiology">Imaging</span>
            </div>
            <div className="history-card-body">
              <div className="history-row">
                <span className="history-label">Imaging Type:</span>
                <span>{image.image_type}</span>
              </div>
              <div className="history-row">
                <span className="history-label">Findings:</span>
                <span>{image.findings || 'N/A'}</span>
              </div>
              <div className="history-row">
                <span className="history-label">Report:</span>
                <span>{image.report || 'N/A'}</span>
              </div>
              <div className="history-row">
                <span className="history-label">Status:</span>
                <span className={`status-badge ${image.status || 'completed'}`}>
                  {image.status || 'completed'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading patient records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="patient-records-container">
      <Sidebar role={role} />
      <div className="patient-records-main">
        <Header role={role} />
        <div className="patient-records-content">
          {/* ─── HEADER ─── */}
          <div className="records-header">
            <div className="records-header-left">
              <h1>📋 Patient Records</h1>
              <p className="records-subtitle">
                {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''} found
              </p>
            </div>
            <div className="records-header-right">
              <button 
                className={`view-toggle ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List View"
              >
                <i className="fas fa-list"></i>
              </button>
              <button 
                className={`view-toggle ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                <i className="fas fa-th-large"></i>
              </button>
              <button className="btn-primary" onClick={fetchPatients}>
                <i className="fas fa-sync-alt"></i> Refresh
              </button>
            </div>
          </div>

          {/* ─── SEARCH & FILTERS ─── */}
          <div className="search-filters">
            <div className="search-bar">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Search by name, ID, or phone..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="filters">
              <select
                className="filter-select"
                value={filters.gender}
                onChange={(e) => handleFilterChange('gender', e.target.value)}
              >
                <option value="">All Genders</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              <select
                className="filter-select"
                value={filters.province}
                onChange={(e) => handleFilterChange('province', e.target.value)}
              >
                <option value="">All Provinces</option>
                {getUniqueProvinces().map(province => (
                  <option key={province} value={province}>{province}</option>
                ))}
              </select>
              <select
                className="filter-select"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="deceased">Deceased</option>
                <option value="">All Status</option>
              </select>
              {Object.values(filters).some(v => v) && (
                <button 
                  className="clear-filters"
                  onClick={() => {
                    setFilters({ gender: '', province: '', status: 'active' });
                    applyFilters(patients);
                  }}
                >
                  <i className="fas fa-times"></i> Clear
                </button>
              )}
            </div>
          </div>

          {/* ─── ERROR MESSAGE ─── */}
          {error && (
            <div className="alert alert-error">
              <i className="fas fa-exclamation-circle"></i>
              <span>{error}</span>
            </div>
          )}

          {/* ─── PATIENTS LIST ─── */}
          {filteredPatients.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-users" style={{ fontSize: '48px', color: '#ccc' }}></i>
              <h3>No patients found</h3>
              <p>Try adjusting your search or filters</p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="patients-table-wrapper">
              <table className="patients-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>ID Number</th>
                    <th>Phone</th>
                    <th>Gender</th>
                    <th>Province</th>
                    <th>Registered</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((patient) => (
                    <tr key={patient.patient_id}>
                      <td>
                        <div className="patient-cell">
                          <div className="patient-avatar">
                            <i className="fas fa-user"></i>
                          </div>
                          <div>
                            <div className="patient-name">
                              {patient.first_name} {patient.last_name}
                            </div>
                            <div className="patient-dob">
                              {formatDate(patient.date_of_birth)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>{patient.id_number || 'N/A'}</td>
                      <td>{patient.phone_number || patient.phone || 'N/A'}</td>
                      <td>
                        <span className={`gender-badge ${patient.gender}`}>
                          {patient.gender || 'N/A'}
                        </span>
                      </td>
                      <td>{patient.province || 'N/A'}</td>
                      <td>{formatDate(patient.created_at)}</td>
                      <td>
                        <span className={`status-badge ${patient.status || 'active'}`}>
                          {patient.status || 'active'}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn-view-patient"
                          onClick={() => viewPatientDetails(patient.patient_id)}
                          title="View Details"
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="patients-grid">
              {filteredPatients.map((patient) => (
                <div key={patient.patient_id} className="patient-card">
                  <div className="patient-card-header">
                    <div className="patient-card-avatar">
                      {patient.first_name?.charAt(0)}{patient.last_name?.charAt(0)}
                    </div>
                    <span className={`status-badge ${patient.status || 'active'}`}>
                      {patient.status || 'active'}
                    </span>
                  </div>
                  <div className="patient-card-body">
                    <h3>{patient.first_name} {patient.last_name}</h3>
                    <p><i className="fas fa-phone"></i> {patient.phone_number || patient.phone || 'N/A'}</p>
                    <p><i className="fas fa-id-card"></i> {patient.id_number || 'N/A'}</p>
                    <p><i className="fas fa-venus-mars"></i> {patient.gender || 'N/A'}</p>
                    <p><i className="fas fa-map-marker-alt"></i> {patient.province || 'N/A'}</p>
                    <p><i className="fas fa-calendar"></i> {formatDate(patient.created_at)}</p>
                  </div>
                  <div className="patient-card-footer">
                    <button 
                      className="btn-view-patient"
                      onClick={() => viewPatientDetails(patient.patient_id)}
                    >
                      <i className="fas fa-eye"></i> View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── PATIENT DETAILS MODAL ─── */}
      {showPatientModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowPatientModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <i className="fas fa-user" style={{ color: '#534AB7' }}></i>
                {selectedPatient.first_name} {selectedPatient.last_name}
              </h2>
              <button className="modal-close" onClick={() => setShowPatientModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* ─── TABS ─── */}
            <div className="modal-tabs">
              <button 
                className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <i className="fas fa-home"></i> Overview
              </button>
              <button 
                className={`tab-btn ${activeTab === 'vitals' ? 'active' : ''}`}
                onClick={() => setActiveTab('vitals')}
              >
                <i className="fas fa-heartbeat"></i> Vitals
              </button>
              <button 
                className={`tab-btn ${activeTab === 'diagnoses' ? 'active' : ''}`}
                onClick={() => setActiveTab('diagnoses')}
              >
                <i className="fas fa-notes-medical"></i> Diagnoses
              </button>
              <button 
                className={`tab-btn ${activeTab === 'prescriptions' ? 'active' : ''}`}
                onClick={() => setActiveTab('prescriptions')}
              >
                <i className="fas fa-prescription"></i> Prescriptions
              </button>
              <button 
                className={`tab-btn ${activeTab === 'referrals' ? 'active' : ''}`}
                onClick={() => setActiveTab('referrals')}
              >
                <i className="fas fa-ambulance"></i> Referrals
              </button>
              <button 
                className={`tab-btn ${activeTab === 'visits' ? 'active' : ''}`}
                onClick={() => setActiveTab('visits')}
              >
                <i className="fas fa-calendar-check"></i> Visits
              </button>
              <button 
                className={`tab-btn ${activeTab === 'maternity' ? 'active' : ''}`}
                onClick={() => setActiveTab('maternity')}
              >
                <i className="fas fa-baby"></i> Maternity
              </button>
              <button 
                className={`tab-btn ${activeTab === 'lab' ? 'active' : ''}`}
                onClick={() => setActiveTab('lab')}
              >
                <i className="fas fa-flask"></i> Lab
              </button>
              <button 
                className={`tab-btn ${activeTab === 'radiology' ? 'active' : ''}`}
                onClick={() => setActiveTab('radiology')}
              >
                <i className="fas fa-x-ray"></i> Radiology
              </button>
            </div>

            <div className="modal-body">
              {renderTabContent()}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowPatientModal(false)}>
                Close
              </button>
              <button className="btn-primary" onClick={() => {
                alert('Edit patient functionality coming soon!');
              }}>
                <i className="fas fa-edit"></i> Edit Patient
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PatientRecords;