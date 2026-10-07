// frontend/src/pages/Appointments.jsx
import React, { useState, useEffect } from 'react';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';
import './styles/appointments.css';

function Appointments() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [role, setRole] = useState('admin');
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [formData, setFormData] = useState({
    patient_id: '',
    appointment_date: '',
    appointment_time: '',
    symptoms: '',
    notes: ''
  });

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (userData) {
      setRole(userData.role);
    }
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    await Promise.all([
      fetchAppointments(),
      fetchPatients()
    ]);
  };

  const fetchAppointments = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      console.log('📋 Fetching appointments...');
      console.log('📋 Token:', token ? 'Present' : 'Missing');

      const response = await fetch(`${API_URL}/appointments/date/${selectedDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log('📋 Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📋 Appointments data:', data);

      if (data.success) {
        setAppointments(data.data || []);
      } else {
        setError(data.message || 'Failed to fetch appointments');
      }
    } catch (error) {
      console.error('❌ Error fetching appointments:', error);
      setError('Failed to fetch appointments: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/patients`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setPatients(data.patients || []);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const token = localStorage.getItem('token');
      console.log('📋 Creating appointment:', formData);
      
      const response = await fetch(`${API_URL}/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          facility_id: 1
        })
      });

      const data = await response.json();
      console.log('📋 Create appointment response:', data);

      if (data.success) {
        setSuccess(true);
        setShowModal(false);
        setFormData({
          patient_id: '',
          appointment_date: '',
          appointment_time: '',
          symptoms: '',
          notes: ''
        });
        await fetchAppointments();
        alert('✅ Appointment created successfully!');
      } else {
        setError(data.message || 'Failed to create appointment');
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      setError('Failed to create appointment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateAppointmentStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/appointments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      const data = await response.json();

      if (data.success) {
        await fetchAppointments();
        alert(`✅ Appointment ${status} successfully!`);
      } else {
        setError(data.message || 'Failed to update appointment');
      }
    } catch (error) {
      console.error('Error updating appointment:', error);
      setError('Failed to update appointment');
    }
  };

  const deleteAppointment = async (id) => {
    if (!window.confirm('Are you sure you want to delete this appointment?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/appointments/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        await fetchAppointments();
        alert('✅ Appointment deleted successfully!');
      } else {
        setError(data.message || 'Failed to delete appointment');
      }
    } catch (error) {
      console.error('Error deleting appointment:', error);
      setError('Failed to delete appointment');
    }
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    fetchAppointments();
  };

  const getStatusBadge = (status) => {
    const badges = {
      scheduled: { color: '#3B82F6', bg: '#DBEAFE', label: 'Scheduled' },
      confirmed: { color: '#10B981', bg: '#D1FAE5', label: 'Confirmed' },
      in_progress: { color: '#F59E0B', bg: '#FEF3C7', label: 'In Progress' },
      completed: { color: '#6B7280', bg: '#F3F4F6', label: 'Completed' },
      cancelled: { color: '#EF4444', bg: '#FEE2E2', label: 'Cancelled' }
    };
    const badge = badges[status] || badges.scheduled;
    return (
      <span className="status-badge" style={{ background: badge.bg, color: badge.color }}>
        {badge.label}
      </span>
    );
  };

  if (!localStorage.getItem('token')) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Please Login First</h2>
        <button onClick={() => window.location.href = '/'}>Go to Login</button>
      </div>
    );
  }

  return (
    <div className="appointments-container">
      <Sidebar role={role} />
      <div className="appointments-main">
        <Header role={role} />
        <div className="appointments-content">
          <div className="appointments-header">
            <div>
              <h1>📅 Appointments</h1>
              <p className="appointments-subtitle">Manage patient appointments</p>
            </div>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <i className="fas fa-plus"></i> New Appointment
            </button>
          </div>

          <div className="date-filter">
            <label><i className="fas fa-calendar-day"></i> Select Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="date-input"
            />
            <span className="appointment-count">{appointments.length} appointments</span>
          </div>

          {error && (
            <div className="alert alert-error">
              <i className="fas fa-exclamation-circle"></i>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              <i className="fas fa-check-circle"></i>
              <span>✅ Appointment created successfully!</span>
            </div>
          )}

          <div className="appointments-stats">
            <div className="stat-card">
              <div className="stat-icon blue">
                <i className="fas fa-calendar-day"></i>
              </div>
              <div className="stat-info">
                <h3>{appointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length}</h3>
                <p>Scheduled</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">
                <i className="fas fa-check-circle"></i>
              </div>
              <div className="stat-info">
                <h3>{appointments.filter(a => a.status === 'completed').length}</h3>
                <p>Completed</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon yellow">
                <i className="fas fa-clock"></i>
              </div>
              <div className="stat-info">
                <h3>{appointments.filter(a => a.status === 'in_progress').length}</h3>
                <p>In Progress</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon red">
                <i className="fas fa-times-circle"></i>
              </div>
              <div className="stat-info">
                <h3>{appointments.filter(a => a.status === 'cancelled').length}</h3>
                <p>Cancelled</p>
              </div>
            </div>
          </div>

          <div className="appointments-table-container">
            {loading ? (
              <div className="loading-spinner">
                <i className="fas fa-spinner fa-spin"></i>
                <p>Loading appointments...</p>
              </div>
            ) : appointments.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-calendar-plus"></i>
                <h3>No Appointments</h3>
                <p>Click "New Appointment" to schedule one</p>
              </div>
            ) : (
              <table className="appointments-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment) => (
                    <tr key={appointment.appointment_id}>
                      <td>{appointment.patient_name || `Patient #${appointment.patient_id}`}</td>
                      <td>{appointment.appointment_date}</td>
                      <td>{appointment.appointment_time}</td>
                      <td>{getStatusBadge(appointment.status)}</td>
                      <td>
                        <div className="action-buttons">
                          {appointment.status === 'scheduled' && (
                            <button className="btn-confirm" onClick={() => updateAppointmentStatus(appointment.appointment_id, 'confirmed')}>
                              <i className="fas fa-check"></i>
                            </button>
                          )}
                          {appointment.status === 'confirmed' && (
                            <button className="btn-start" onClick={() => updateAppointmentStatus(appointment.appointment_id, 'in_progress')}>
                              <i className="fas fa-play"></i>
                            </button>
                          )}
                          {appointment.status === 'in_progress' && (
                            <button className="btn-complete" onClick={() => updateAppointmentStatus(appointment.appointment_id, 'completed')}>
                              <i className="fas fa-check-double"></i>
                            </button>
                          )}
                          {(appointment.status === 'scheduled' || appointment.status === 'confirmed') && (
                            <button className="btn-cancel" onClick={() => updateAppointmentStatus(appointment.appointment_id, 'cancelled')}>
                              <i className="fas fa-times"></i>
                            </button>
                          )}
                          <button className="btn-delete" onClick={() => deleteAppointment(appointment.appointment_id)}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ─── MODAL ─── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fas fa-calendar-plus"></i> Book Appointment</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Patient *</label>
                  <select
                    name="patient_id"
                    value={formData.patient_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">-- Select Patient --</option>
                    {patients.map((patient) => (
                      <option key={patient.patient_id} value={patient.patient_id}>
                        {patient.first_name} {patient.last_name} - {patient.patient_code}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    name="appointment_date"
                    value={formData.appointment_date}
                    onChange={handleInputChange}
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="form-group">
                  <label>Time *</label>
                  <input
                    type="time"
                    name="appointment_time"
                    value={formData.appointment_time}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group full-width">
                  <label>Symptoms / Reason</label>
                  <textarea
                    name="symptoms"
                    value={formData.symptoms}
                    onChange={handleInputChange}
                    placeholder="Describe symptoms..."
                    rows="3"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Additional Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Additional notes..."
                    rows="2"
                  />
                </div>
              </div>
              {error && (
                <div className="form-error">
                  <i className="fas fa-exclamation-circle"></i>
                  <span>{error}</span>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? (
                    <><i className="fas fa-spinner fa-spin"></i> Booking...</>
                  ) : (
                    <><i className="fas fa-save"></i> Book & Add to Queue</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Appointments;