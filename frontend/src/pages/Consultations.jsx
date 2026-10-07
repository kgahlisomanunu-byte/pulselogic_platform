// src/pages/Consultations.jsx
import React, { useState, useEffect } from 'react';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';
import './styles/consultations.css';

function Consultations() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [role, setRole] = useState('doctor');
  const [user, setUser] = useState(null);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [consultationForm, setConsultationForm] = useState({
    patient_id: '',
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    diagnosis: '',
    final_diagnosis: '',
    treatment_decision: '',
    notes: '',
    lab_requests: [],
    radiology_requests: [],
    other_investigations: []
  });
  const [prescriptions, setPrescriptions] = useState([]);
  const [prescriptionForm, setPrescriptionForm] = useState({
    medication: '',
    dosage: '',
    frequency: '',
    quantity: '',
    duration: '',
    instructions: ''
  });
  const [selectedLabTests, setSelectedLabTests] = useState([]);
  const [selectedRadiology, setSelectedRadiology] = useState([]);
  const [selectedInvestigations, setSelectedInvestigations] = useState([]);
  const [consultationComplete, setConsultationComplete] = useState(false);
  const [patientVitals, setPatientVitals] = useState([]);
  const [latestVitals, setLatestVitals] = useState(null);
  const [patientDiagnoses, setPatientDiagnoses] = useState([]);
  const [patientPrescriptions, setPatientPrescriptions] = useState([]);
  const [patientReferrals, setPatientReferrals] = useState([]);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const labRequests = [
    { name: 'Complete Blood Count (CBC)', level: 'hospital' },
    { name: 'Blood Culture', level: 'hospital' },
    { name: 'C-Reactive Protein (CRP)', level: 'clinic' },
    { name: 'Lipid Profile', level: 'clinic' },
    { name: 'Renal Function Test', level: 'hospital' },
    { name: 'Liver Function Test', level: 'hospital' },
    { name: 'Thyroid Function Test', level: 'hospital' },
    { name: 'Blood Glucose', level: 'clinic' },
    { name: 'HbA1c', level: 'clinic' },
    { name: 'Urinalysis', level: 'clinic' },
    { name: 'HIV Test', level: 'clinic' },
    { name: 'TB Test', level: 'clinic' },
    { name: 'COVID-19 Test', level: 'clinic' },
    { name: 'Pregnancy Test', level: 'clinic' }
  ];

  const radiologyRequests = [
    { name: 'Chest X-Ray', level: 'hospital' },
    { name: 'CT Scan', level: 'hospital' },
    { name: 'MRI Scan', level: 'hospital' },
    { name: 'Ultrasound', level: 'hospital' },
    { name: 'ECG', level: 'clinic' },
    { name: 'Echocardiogram', level: 'hospital' }
  ];

  const investigations = [
    { name: 'Neurological Examination', level: 'clinic' },
    { name: 'Cardiac Assessment', level: 'clinic' },
    { name: 'Respiratory Assessment', level: 'clinic' },
    { name: 'Abdominal Examination', level: 'clinic' },
    { name: 'Musculoskeletal Examination', level: 'clinic' }
  ];

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
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/patients`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setPatients(data.patients || data.data || []);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      setError('Failed to fetch patients');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientData = async (patientId) => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch vitals
      const vitalsRes = await fetch(`${API_URL}/vitals/patient/${patientId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const vitalsData = await vitalsRes.json();
      if (vitalsData.success) {
        setPatientVitals(vitalsData.vitals || []);
        setLatestVitals(vitalsData.vitals?.[0] || null);
      }

      // Fetch diagnoses
      const diagnosesRes = await fetch(`${API_URL}/patients/${patientId}/diagnoses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const diagnosesData = await diagnosesRes.json();
      if (diagnosesData.success) {
        setPatientDiagnoses(diagnosesData.diagnoses || []);
      }

      // Fetch prescriptions
      const prescriptionsRes = await fetch(`${API_URL}/patients/${patientId}/prescriptions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const prescriptionsData = await prescriptionsRes.json();
      if (prescriptionsData.success) {
        setPatientPrescriptions(prescriptionsData.prescriptions || []);
      }

      // Fetch referrals
      const referralsRes = await fetch(`${API_URL}/patients/${patientId}/referrals`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const referralsData = await referralsRes.json();
      if (referralsData.success) {
        setPatientReferrals(referralsData.referrals || []);
      }

    } catch (error) {
      console.error('Error fetching patient data:', error);
    }
  };

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setConsultationForm(prev => ({ ...prev, patient_id: patient.patient_id }));
    fetchPatientData(patient.patient_id);
    setConsultationComplete(false);
    setPrescriptions([]);
    setSelectedLabTests([]);
    setSelectedRadiology([]);
    setSelectedInvestigations([]);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setConsultationForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePrescriptionChange = (e) => {
    const { name, value } = e.target;
    setPrescriptionForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAddPrescription = () => {
    if (prescriptionForm.medication && prescriptionForm.dosage) {
      setPrescriptions([...prescriptions, { ...prescriptionForm, id: Date.now() }]);
      setPrescriptionForm({
        medication: '',
        dosage: '',
        frequency: '',
        quantity: '',
        duration: '',
        instructions: ''
      });
    }
  };

  const handleRemovePrescription = (id) => {
    setPrescriptions(prescriptions.filter(p => p.id !== id));
  };

  const toggleLabTest = (test) => {
    if (selectedLabTests.includes(test.name)) {
      setSelectedLabTests(selectedLabTests.filter(t => t !== test.name));
    } else {
      setSelectedLabTests([...selectedLabTests, test.name]);
    }
  };

  const toggleRadiology = (test) => {
    if (selectedRadiology.includes(test.name)) {
      setSelectedRadiology(selectedRadiology.filter(t => t !== test.name));
    } else {
      setSelectedRadiology([...selectedRadiology, test.name]);
    }
  };

  const toggleInvestigation = (investigation) => {
    if (selectedInvestigations.includes(investigation.name)) {
      setSelectedInvestigations(selectedInvestigations.filter(i => i !== investigation.name));
    } else {
      setSelectedInvestigations([...selectedInvestigations, investigation.name]);
    }
  };

  const handleSubmitConsultation = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      const consultationData = {
        ...consultationForm,
        lab_requests: selectedLabTests,
        radiology_requests: selectedRadiology,
        other_investigations: selectedInvestigations,
        doctor_id: user?.id || 1,
        patient_id: selectedPatient.patient_id
      };

      const response = await fetch(`${API_URL}/consultations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(consultationData)
      });

      const data = await response.json();

      if (data.success) {
        // Save prescriptions
        if (prescriptions.length > 0) {
          for (const prescription of prescriptions) {
            await fetch(`${API_URL}/prescriptions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                patient_id: selectedPatient.patient_id,
                doctor_id: user?.id || 1,
                consultation_id: data.consultation_id,
                medication: prescription.medication,
                dosage: prescription.dosage,
                frequency: prescription.frequency,
                quantity: prescription.quantity,
                duration: prescription.duration,
                instructions: prescription.instructions,
                status: 'prescribed'
              })
            });
          }
        }

        setConsultationComplete(true);
        alert('✅ Consultation completed successfully!');
        setShowConsultationModal(false);
        
        // Reset form
        setConsultationForm({
          patient_id: '',
          subjective: '',
          objective: '',
          assessment: '',
          plan: '',
          diagnosis: '',
          final_diagnosis: '',
          treatment_decision: '',
          notes: '',
          lab_requests: [],
          radiology_requests: [],
          other_investigations: []
        });
        setPrescriptions([]);
        setSelectedLabTests([]);
        setSelectedRadiology([]);
        setSelectedInvestigations([]);

      } else {
        setError(data.message || 'Failed to save consultation');
      }
    } catch (err) {
      setError('Error saving consultation');
      console.error('Consultation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
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

  const getVitalRisk = (vital) => {
    let riskScore = 0;
    if (vital?.temperature > 38) riskScore++;
    if (vital?.heart_rate > 100) riskScore++;
    if (vital?.blood_pressure_systolic > 140) riskScore++;
    if (vital?.oxygen_saturation < 95) riskScore++;
    if (vital?.blood_glucose > 7) riskScore++;

    if (riskScore >= 3) return { level: 'emergency', label: '🚨 Emergency', color: '#EF4444' };
    if (riskScore >= 2) return { level: 'warning', label: '⚠️ Warning', color: '#F59E0B' };
    return { level: 'normal', label: '✅ Normal', color: '#10B981' };
  };

  const filteredPatients = patients.filter(p =>
    p.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone_number?.includes(searchTerm) ||
    p.id_number?.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading consultations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="consultations-container">
      <Sidebar role={role} />
      <div className="consultations-main">
        <Header role={role} />
        <div className="consultations-content">
          {/* ─── HEADER ─── */}
          <div className="consultations-header">
            <div className="consultations-header-left">
              <h1>🩺 Consultations</h1>
              <p className="consultations-subtitle">
                {selectedPatient ? `Consulting: ${selectedPatient.first_name} ${selectedPatient.last_name}` : 'Select a patient to begin'}
              </p>
            </div>
            <div className="consultations-header-right">
              {selectedPatient && !consultationComplete && (
                <button 
                  className="btn-primary"
                  onClick={() => setShowConsultationModal(true)}
                >
                  <i className="fas fa-notes-medical"></i> Start Consultation
                </button>
              )}
            </div>
          </div>

          {/* ─── SEARCH ─── */}
          <div className="search-bar">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Search patients by name, ID, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          {error && (
            <div className="alert alert-error">
              <i className="fas fa-exclamation-circle"></i>
              <span>{error}</span>
            </div>
          )}

          <div className="consultations-layout">
            {/* ─── PATIENT LIST ─── */}
            <div className="patient-list">
              <h3>Patients</h3>
              {filteredPatients.length === 0 ? (
                <div className="empty-state-small">
                  <p>No patients found</p>
                </div>
              ) : (
                filteredPatients.map(patient => (
                  <div 
                    key={patient.patient_id}
                    className={`patient-list-item ${selectedPatient?.patient_id === patient.patient_id ? 'active' : ''}`}
                    onClick={() => handleSelectPatient(patient)}
                  >
                    <div className="patient-list-avatar">
                      {patient.first_name?.charAt(0)}{patient.last_name?.charAt(0)}
                    </div>
                    <div className="patient-list-info">
                      <div className="patient-list-name">
                        {patient.first_name} {patient.last_name}
                      </div>
                      <div className="patient-list-detail">
                        {patient.phone_number || patient.phone}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* ─── PATIENT DETAILS ─── */}
            {selectedPatient ? (
              <div className="patient-details">
                {/* ─── PATIENT INFO ─── */}
                <div className="patient-info-card">
                  <div className="patient-info-header">
                    <div className="patient-info-avatar-large">
                      {selectedPatient.first_name?.charAt(0)}{selectedPatient.last_name?.charAt(0)}
                    </div>
                    <div>
                      <h2>{selectedPatient.first_name} {selectedPatient.last_name}</h2>
                      <p>{selectedPatient.id_number || 'No ID'}</p>
                      <p>{selectedPatient.phone_number || selectedPatient.phone}</p>
                    </div>
                  </div>
                </div>

                {/* ─── LATEST VITALS ─── */}
                <div className="section-card">
                  <h3><i className="fas fa-heartbeat"></i> Latest Vitals</h3>
                  {latestVitals ? (
                    <div className="vitals-summary">
                      <div className="vital-summary-item">
                        <span>Temperature</span>
                        <span className={latestVitals.temperature > 38 ? 'abnormal' : 'normal'}>
                          {latestVitals.temperature}°C
                        </span>
                      </div>
                      <div className="vital-summary-item">
                        <span>Heart Rate</span>
                        <span className={latestVitals.heart_rate > 100 ? 'abnormal' : 'normal'}>
                          {latestVitals.heart_rate} bpm
                        </span>
                      </div>
                      <div className="vital-summary-item">
                        <span>Blood Pressure</span>
                        <span className={latestVitals.blood_pressure_systolic > 140 ? 'abnormal' : 'normal'}>
                          {latestVitals.blood_pressure_systolic}/{latestVitals.blood_pressure_diastolic}
                        </span>
                      </div>
                      <div className="vital-summary-item">
                        <span>O₂ Sat</span>
                        <span className={latestVitals.oxygen_saturation < 95 ? 'abnormal' : 'normal'}>
                          {latestVitals.oxygen_saturation}%
                        </span>
                      </div>
                      <div className="vital-summary-item">
                        <span>Blood Glucose</span>
                        <span className={latestVitals.blood_glucose > 7 ? 'abnormal' : 'normal'}>
                          {latestVitals.blood_glucose} mmol/L
                        </span>
                      </div>
                      <div className="vital-summary-item">
                        <span>Recorded</span>
                        <span>{formatDate(latestVitals.recorded_at)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="no-data">No vitals recorded</p>
                  )}
                </div>

                {/* ─── MEDICAL HISTORY ─── */}
                <div className="section-card">
                  <h3><i className="fas fa-notes-medical"></i> Medical History</h3>
                  
                  <div className="history-section">
                    <h4>Diagnoses</h4>
                    {patientDiagnoses.length > 0 ? (
                      patientDiagnoses.map((d, i) => (
                        <div key={i} className="history-item">
                          <span className="history-date">{formatDate(d.created_at)}</span>
                          <span className="history-text">{d.diagnosis}</span>
                          {d.icd10_code && <span className="history-code">ICD-10: {d.icd10_code}</span>}
                        </div>
                      ))
                    ) : (
                      <p className="no-data">No diagnoses recorded</p>
                    )}
                  </div>

                  <div className="history-section">
                    <h4>Prescriptions</h4>
                    {patientPrescriptions.length > 0 ? (
                      patientPrescriptions.map((p, i) => (
                        <div key={i} className="history-item">
                          <span className="history-date">{formatDate(p.created_at)}</span>
                          <span className="history-text">{p.medication} - {p.dosage}</span>
                          <span className="history-status">{p.status}</span>
                        </div>
                      ))
                    ) : (
                      <p className="no-data">No prescriptions recorded</p>
                    )}
                  </div>

                  <div className="history-section">
                    <h4>Referrals</h4>
                    {patientReferrals.length > 0 ? (
                      patientReferrals.map((r, i) => (
                        <div key={i} className="history-item">
                          <span className="history-date">{formatDate(r.created_at)}</span>
                          <span className="history-text">{r.reason}</span>
                          <span className={`history-status ${r.status}`}>{r.status}</span>
                        </div>
                      ))
                    ) : (
                      <p className="no-data">No referrals recorded</p>
                    )}
                  </div>
                </div>

                {consultationComplete && (
                  <div className="consultation-complete-banner">
                    <i className="fas fa-check-circle"></i>
                    <span>Consultation completed successfully!</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="no-patient-selected">
                <i className="fas fa-user-md" style={{ fontSize: '48px', color: '#ccc' }}></i>
                <h3>Select a patient</h3>
                <p>Choose a patient from the list to start consultation</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── CONSULTATION MODAL ─── */}
      {showConsultationModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowConsultationModal(false)}>
          <div className="modal-content consultation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <i className="fas fa-notes-medical" style={{ color: '#534AB7' }}></i>
                Consultation - {selectedPatient.first_name} {selectedPatient.last_name}
              </h2>
              <button className="modal-close" onClick={() => setShowConsultationModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <form>
                {/* ─── SUBJECTIVE ─── */}
                <div className="form-group">
                  <label>Subjective <span className="mandatory">*</span></label>
                  <textarea
                    name="subjective"
                    value={consultationForm.subjective}
                    onChange={handleInputChange}
                    placeholder="Patient's complaints, symptoms, history of present illness..."
                    rows="3"
                    required
                  />
                </div>

                {/* ─── OBJECTIVE ─── */}
                <div className="form-group">
                  <label>Objective <span className="mandatory">*</span></label>
                  <textarea
                    name="objective"
                    value={consultationForm.objective}
                    onChange={handleInputChange}
                    placeholder="Physical examination findings, observations..."
                    rows="3"
                    required
                  />
                </div>

                {/* ─── DIAGNOSIS ─── */}
                <div className="form-group">
                  <label>Preliminary Diagnosis <span className="mandatory">*</span></label>
                  <input
                    type="text"
                    name="diagnosis"
                    value={consultationForm.diagnosis}
                    onChange={handleInputChange}
                    placeholder="Enter preliminary diagnosis"
                    required
                  />
                </div>

                {/* ─── FINAL DIAGNOSIS ─── */}
                <div className="form-group">
                  <label>Final Diagnosis</label>
                  <input
                    type="text"
                    name="final_diagnosis"
                    value={consultationForm.final_diagnosis}
                    onChange={handleInputChange}
                    placeholder="Enter final diagnosis (if confirmed)"
                  />
                </div>

                {/* ─── ASSESSMENT ─── */}
                <div className="form-group">
                  <label>Assessment <span className="mandatory">*</span></label>
                  <textarea
                    name="assessment"
                    value={consultationForm.assessment}
                    onChange={handleInputChange}
                    placeholder="Clinical assessment, severity, complications..."
                    rows="3"
                    required
                  />
                </div>

                {/* ─── TREATMENT DECISION ─── */}
                <div className="form-group">
                  <label>Treatment Decision <span className="mandatory">*</span></label>
                  <select
                    name="treatment_decision"
                    value={consultationForm.treatment_decision}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select treatment decision</option>
                    <option value="admit">Admit to Hospital</option>
                    <option value="discharge">Discharge with Medication</option>
                    <option value="refer">Refer to Specialist</option>
                    <option value="follow_up">Follow-up Outpatient</option>
                    <option value="surgery">Refer for Surgery</option>
                    <option value="home_care">Home Care</option>
                    <option value="emergency">🚨 Emergency Transfer</option>
                  </select>
                </div>

                {/* ─── PLAN ─── */}
                <div className="form-group">
                  <label>Management Plan <span className="mandatory">*</span></label>
                  <textarea
                    name="plan"
                    value={consultationForm.plan}
                    onChange={handleInputChange}
                    placeholder="Treatment plan, follow-up, referrals..."
                    rows="3"
                    required
                  />
                </div>

                {/* ─── PRESCRIPTIONS ─── */}
                <div className="form-group">
                  <label>Prescriptions</label>
                  <div className="prescription-input-group">
                    <input
                      type="text"
                      name="medication"
                      value={prescriptionForm.medication}
                      onChange={handlePrescriptionChange}
                      placeholder="Medication name"
                    />
                    <input
                      type="text"
                      name="dosage"
                      value={prescriptionForm.dosage}
                      onChange={handlePrescriptionChange}
                      placeholder="Dosage"
                    />
                    <input
                      type="text"
                      name="frequency"
                      value={prescriptionForm.frequency}
                      onChange={handlePrescriptionChange}
                      placeholder="Frequency"
                    />
                    <input
                      type="text"
                      name="quantity"
                      value={prescriptionForm.quantity}
                      onChange={handlePrescriptionChange}
                      placeholder="Quantity"
                    />
                    <button type="button" className="btn-add-prescription" onClick={handleAddPrescription}>
                      <i className="fas fa-plus"></i> Add
                    </button>
                  </div>
                  {prescriptions.length > 0 && (
                    <div className="prescription-list">
                      {prescriptions.map((p) => (
                        <div key={p.id} className="prescription-item">
                          <span>{p.medication} - {p.dosage} ({p.frequency})</span>
                          <button onClick={() => handleRemovePrescription(p.id)}>
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ─── LABORATORY REQUESTS ─── */}
                <div className="form-group">
                  <label>Laboratory Tests</label>
                  <div className="test-grid">
                    {labRequests.map(test => (
                      <label key={test.name} className="test-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedLabTests.includes(test.name)}
                          onChange={() => toggleLabTest(test)}
                        />
                        <span>{test.name}</span>
                        {test.level === 'hospital' && (
                          <span className="level-badge hospital">🏥 Hospital</span>
                        )}
                        {test.level === 'clinic' && (
                          <span className="level-badge clinic">🏥 Clinic</span>
                        )}
                      </label>
                    ))}
                  </div>
                  {selectedLabTests.length > 0 && (
                    <div className="selected-tests">
                      <span>Selected: {selectedLabTests.join(', ')}</span>
                    </div>
                  )}
                </div>

                {/* ─── RADIOLOGY REQUESTS ─── */}
                <div className="form-group">
                  <label>Radiology / Imaging</label>
                  <div className="test-grid">
                    {radiologyRequests.map(test => (
                      <label key={test.name} className="test-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedRadiology.includes(test.name)}
                          onChange={() => toggleRadiology(test)}
                        />
                        <span>{test.name}</span>
                        {test.level === 'hospital' && (
                          <span className="level-badge hospital">🏥 Hospital</span>
                        )}
                        {test.level === 'clinic' && (
                          <span className="level-badge clinic">🏥 Clinic</span>
                        )}
                      </label>
                    ))}
                  </div>
                  {selectedRadiology.length > 0 && (
                    <div className="selected-tests">
                      <span>Selected: {selectedRadiology.join(', ')}</span>
                    </div>
                  )}
                </div>

                {/* ─── OTHER INVESTIGATIONS ─── */}
                <div className="form-group">
                  <label>Other Investigations</label>
                  <div className="test-grid">
                    {investigations.map(inv => (
                      <label key={inv.name} className="test-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedInvestigations.includes(inv.name)}
                          onChange={() => toggleInvestigation(inv)}
                        />
                        <span>{inv.name}</span>
                      </label>
                    ))}
                  </div>
                  {selectedInvestigations.length > 0 && (
                    <div className="selected-tests">
                      <span>Selected: {selectedInvestigations.join(', ')}</span>
                    </div>
                  )}
                </div>

                {/* ─── NOTES ─── */}
                <div className="form-group">
                  <label>Additional Notes</label>
                  <textarea
                    name="notes"
                    value={consultationForm.notes}
                    onChange={handleInputChange}
                    placeholder="Any additional notes..."
                    rows="2"
                  />
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowConsultationModal(false)}>
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleSubmitConsultation}
                disabled={loading || !consultationForm.subjective || !consultationForm.objective || !consultationForm.diagnosis || !consultationForm.assessment || !consultationForm.treatment_decision || !consultationForm.plan}
              >
                {loading ? (
                  <><i className="fas fa-spinner fa-spin"></i> Saving...</>
                ) : (
                  <><i className="fas fa-save"></i> Complete Consultation</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Consultations;