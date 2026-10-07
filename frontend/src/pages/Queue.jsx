// src/pages/Queue.jsx
import React, { useState, useEffect } from 'react';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';
import './styles/queue.css';

function Queue() {
  const [queue, setQueue] = useState([]);
  const [filteredQueue, setFilteredQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [role, setRole] = useState('nurse');
  const [user, setUser] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [showAssignDepartment, setShowAssignDepartment] = useState(false);
  const [selectedQueueId, setSelectedQueueId] = useState(null);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    emergency: 0,
    critical: 0,
    waiting: 0,
    inProgress: 0,
    completed: 0,
    departments: {}
  });

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // ─── DEPARTMENTS ───
  const departments = [
    { id: 'general', name: 'General', icon: 'fa-stethoscope', color: '#4F46E5' },
    { id: 'emergency', name: 'Emergency', icon: 'fa-ambulance', color: '#EF4444' },
    { id: 'maternity', name: 'Maternity', icon: 'fa-baby', color: '#EC4899' },
    { id: 'pediatrics', name: 'Pediatrics', icon: 'fa-child', color: '#F59E0B' },
    { id: 'cardiology', name: 'Cardiology', icon: 'fa-heart', color: '#EF4444' },
    { id: 'orthopedics', name: 'Orthopedics', icon: 'fa-bone', color: '#8B5CF6' },
    { id: 'neurology', name: 'Neurology', icon: 'fa-brain', color: '#6366F1' },
    { id: 'ophthalmology', name: 'Ophthalmology', icon: 'fa-eye', color: '#0EA5E9' },
    { id: 'dermatology', name: 'Dermatology', icon: 'fa-hand', color: '#EC4899' },
    { id: 'psychiatry', name: 'Psychiatry', icon: 'fa-head-side', color: '#8B5CF6' },
    { id: 'laboratory', name: 'Laboratory', icon: 'fa-flask', color: '#10B981' },
    { id: 'radiology', name: 'Radiology', icon: 'fa-x-ray', color: '#6366F1' },
    { id: 'pharmacy', name: 'Pharmacy', icon: 'fa-prescription', color: '#14B8A6' },
    { id: 'surgery', name: 'Surgery', icon: 'fa-scalpel', color: '#DC2626' },
    { id: 'physiotherapy', name: 'Physiotherapy', icon: 'fa-notes-medical', color: '#F59E0B' }
  ];

  const getDepartmentInfo = (deptId) => {
    return departments.find(d => d.id === deptId) || departments[0];
  };

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (userData) {
      setUser(userData);
      setRole(userData.role);
    }
    fetchQueue();
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchQueue = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/queue`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setQueue(data.queue || data.data || []);
        setFilteredQueue(data.queue || data.data || []);
        updateStats(data.queue || data.data || []);
      } else {
        setError(data.message || 'Failed to fetch queue');
      }
    } catch (err) {
      console.error('Fetch queue error:', err);
      setError('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  const updateStats = (queueData) => {
    const deptCounts = {};
    queueData.forEach(q => {
      const dept = q.department || 'general';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });

    const stats = {
      total: queueData.length,
      emergency: queueData.filter(q => q.priority_level === 'emergency' || q.priority_score >= 80).length,
      critical: queueData.filter(q => q.priority_level === 'critical' || q.priority_score >= 60).length,
      waiting: queueData.filter(q => q.status === 'waiting').length,
      inProgress: queueData.filter(q => q.status === 'in_progress').length,
      completed: queueData.filter(q => q.status === 'completed').length,
      departments: deptCounts
    };
    setStats(stats);
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    applyFilters(term, departmentFilter);
  };

  const handleDepartmentFilter = (dept) => {
    setDepartmentFilter(dept);
    applyFilters(searchTerm, dept);
  };

  const applyFilters = (term, dept) => {
    let results = queue;

    if (term.trim()) {
      results = results.filter(q =>
        q.patient_name?.toLowerCase().includes(term.toLowerCase()) ||
        q.patient_id?.toString().includes(term) ||
        q.priority_level?.toLowerCase().includes(term.toLowerCase())
      );
    }

    if (dept !== 'all') {
      results = results.filter(q => (q.department || 'general') === dept);
    }

    setFilteredQueue(results);
  };

  const handleAssignDepartment = async (queueId, department) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/queue/${queueId}/department`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ department })
      });

      const data = await response.json();

      if (data.success) {
        const deptInfo = getDepartmentInfo(department);
        alert(`✅ Patient assigned to ${deptInfo.name} Department`);
        setShowAssignDepartment(false);
        fetchQueue();
      } else {
        setError(data.message || 'Failed to assign department');
      }
    } catch (err) {
      setError('Error assigning department');
      console.error('Department assignment error:', err);
    }
  };

  const handleStatusUpdate = async (queueId, status) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/queue/${queueId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      const data = await response.json();

      if (data.success) {
        const statusMessages = {
          'in_progress': '🔄 Patient is now being attended to',
          'completed': '✅ Patient has been attended to and completed',
          'cancelled': '❌ Patient has been removed from queue'
        };
        alert(statusMessages[status] || `✅ Patient status updated to ${status}`);
        fetchQueue();
      } else {
        setError(data.message || 'Failed to update status');
      }
    } catch (err) {
      setError('Error updating status');
      console.error('Status update error:', err);
    }
  };

  const viewPatientDetails = async (patientId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/patients/${patientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setSelectedPatient(data.patient || data.data);
        setShowPatientModal(true);
      } else {
        setError(data.message || 'Failed to fetch patient details');
      }
    } catch (err) {
      console.error('View patient error:', err);
      setError('Error fetching patient details');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'emergency': return '#EF4444';
      case 'critical': return '#F59E0B';
      case 'high': return '#F59E0B';
      case 'normal': return '#10B981';
      case 'low': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'emergency': return '🚨 Emergency';
      case 'critical': return '⚠️ Critical';
      case 'high': return '🔴 High';
      case 'normal': return '🟢 Normal';
      case 'low': return '🔵 Low';
      default: return 'Normal';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'waiting': return '#F59E0B';
      case 'in_progress': return '#3B82F6';
      case 'completed': return '#10B981';
      case 'cancelled': return '#EF4444';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'waiting': return '⏳ Waiting';
      case 'in_progress': return '🔄 In Progress';
      case 'completed': return '✅ Completed';
      case 'cancelled': return '❌ Cancelled';
      default: return status || 'Unknown';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) { return 'N/A'; }
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getWaitTimeColor = (minutes) => {
    if (minutes > 60) return '#EF4444';
    if (minutes > 30) return '#F59E0B';
    return '#10B981';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading queue...</p>
        </div>
      </div>
    );
  }

  // ─── DEPARTMENT STATS COMPONENT ───
  const DepartmentStat = ({ deptId }) => {
    const dept = getDepartmentInfo(deptId);
    const count = stats.departments[deptId] || 0;
    if (count === 0) return null;
    return (
      <span 
        className="dept-stat-badge"
        style={{ 
          background: dept.color + '20', 
          color: dept.color,
          border: `1px solid ${dept.color}40`
        }}
      >
        <i className={`fas ${dept.icon}`}></i>
        {dept.name}: {count}
      </span>
    );
  };

  return (
    <div className="queue-container">
      <Sidebar role={role} />
      <div className="queue-main">
        <Header role={role} />
        <div className="queue-content">
          {/* ─── HEADER ─── */}
          <div className="queue-header">
            <div className="queue-header-left">
              <h1>📋 Patient Queue</h1>
              <p className="queue-subtitle">
                {filteredQueue.length} patient{filteredQueue.length !== 1 ? 's' : ''} in queue
              </p>
            </div>
            <div className="queue-header-right">
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
              <button className="btn-secondary" onClick={fetchQueue}>
                <i className="fas fa-sync-alt"></i> Refresh
              </button>
            </div>
          </div>

          {/* ─── STATS ─── */}
          <div className="queue-stats">
            <div className="stat-item">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-item emergency">
              <span className="stat-value">{stats.emergency}</span>
              <span className="stat-label">🚨 Emergency</span>
            </div>
            <div className="stat-item critical">
              <span className="stat-value">{stats.critical}</span>
              <span className="stat-label">⚠️ Critical</span>
            </div>
            <div className="stat-item waiting">
              <span className="stat-value">{stats.waiting}</span>
              <span className="stat-label">⏳ Waiting</span>
            </div>
            <div className="stat-item in-progress">
              <span className="stat-value">{stats.inProgress}</span>
              <span className="stat-label">🔄 In Progress</span>
            </div>
            <div className="stat-item completed">
              <span className="stat-value">{stats.completed}</span>
              <span className="stat-label">✅ Completed</span>
            </div>
          </div>

          {/* ─── DEPARTMENT STATS ─── */}
          <div className="department-stats">
            <span className="dept-stats-label">📊 Departments:</span>
            {Object.keys(stats.departments).map(deptId => (
              <DepartmentStat key={deptId} deptId={deptId} />
            ))}
          </div>

          {/* ─── SEARCH & FILTERS ─── */}
          <div className="search-filters">
            <div className="search-bar">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Search by patient name or priority..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="filter-buttons">
              <button 
                className={`filter-btn ${departmentFilter === 'all' ? 'active' : ''}`}
                onClick={() => handleDepartmentFilter('all')}
              >
                All
              </button>
              {departments.map(dept => (
                <button 
                  key={dept.id}
                  className={`filter-btn ${departmentFilter === dept.id ? 'active' : ''}`}
                  onClick={() => handleDepartmentFilter(dept.id)}
                  style={{ 
                    borderColor: departmentFilter === dept.id ? dept.color : 'transparent',
                    color: departmentFilter === dept.id ? dept.color : '#6b7280'
                  }}
                >
                  <i className={`fas ${dept.icon}`}></i>
                  {dept.name}
                </button>
              ))}
            </div>
          </div>

          {/* ─── ERROR MESSAGE ─── */}
          {error && (
            <div className="alert alert-error">
              <i className="fas fa-exclamation-circle"></i>
              <span>{error}</span>
            </div>
          )}

          {/* ─── QUEUE LIST ─── */}
          {filteredQueue.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-users" style={{ fontSize: '48px', color: '#ccc' }}></i>
              <h3>Queue is empty</h3>
              <p>No patients currently in the queue</p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="queue-table-wrapper">
              <table className="queue-table">
                <thead>
                  <tr>
                    <th>Position</th>
                    <th>Patient</th>
                    <th>Priority</th>
                    <th>Department</th>
                    <th>Wait Time</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQueue.map((item, index) => {
                    const deptInfo = getDepartmentInfo(item.department || 'general');
                    return (
                      <tr key={item.queue_id} className={item.priority_level === 'emergency' ? 'emergency-row' : ''}>
                        <td>
                          <span className="position-badge">{index + 1}</span>
                        </td>
                        <td>
                          <div className="patient-cell">
                            <div className="patient-avatar">
                              {item.patient_name?.charAt(0) || 'P'}
                            </div>
                            <div>
                              <div className="patient-name">{item.patient_name || `Patient #${item.patient_id}`}</div>
                              <div className="patient-detail">{item.condition || 'General'}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span 
                            className="priority-badge"
                            style={{ background: getPriorityColor(item.priority_level) + '20', color: getPriorityColor(item.priority_level) }}
                          >
                            {getPriorityLabel(item.priority_level)}
                          </span>
                          <span className="score-value-small">Score: {item.priority_score || 0}</span>
                        </td>
                        <td>
                          {item.department ? (
                            <span 
                              className="dept-badge"
                              style={{ 
                                background: deptInfo.color + '20', 
                                color: deptInfo.color,
                                border: `1px solid ${deptInfo.color}40`
                              }}
                            >
                              <i className={`fas ${deptInfo.icon}`}></i>
                              {deptInfo.name}
                            </span>
                          ) : (
                            <button 
                              className="btn-assign-dept"
                              onClick={() => {
                                setSelectedQueueId(item.queue_id);
                                setShowAssignDepartment(true);
                              }}
                            >
                              <i className="fas fa-plus"></i> Assign
                            </button>
                          )}
                        </td>
                        <td>
                          <span style={{ color: getWaitTimeColor(item.waiting_time_minutes || 0) }}>
                            {item.waiting_time_minutes || 0} min
                          </span>
                        </td>
                        <td>
                          <span 
                            className="status-badge"
                            style={{ background: getStatusColor(item.status) + '20', color: getStatusColor(item.status) }}
                          >
                            {getStatusLabel(item.status)}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            {item.status === 'waiting' && (
                              <>
                                <button 
                                  className="btn-attend"
                                  onClick={() => handleStatusUpdate(item.queue_id, 'in_progress')}
                                  title="Attend Patient"
                                >
                                  <i className="fas fa-user-check"></i> Attend
                                </button>
                                <button 
                                  className="btn-cancel"
                                  onClick={() => handleStatusUpdate(item.queue_id, 'cancelled')}
                                  title="Cancel"
                                >
                                  <i className="fas fa-times"></i>
                                </button>
                              </>
                            )}
                            {item.status === 'in_progress' && (
                              <button 
                                className="btn-complete"
                                onClick={() => handleStatusUpdate(item.queue_id, 'completed')}
                                title="Complete"
                              >
                                <i className="fas fa-check"></i> Complete
                              </button>
                            )}
                            <button 
                              className="btn-view"
                              onClick={() => viewPatientDetails(item.patient_id)}
                              title="View Patient"
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="queue-grid">
              {filteredQueue.map((item, index) => {
                const deptInfo = getDepartmentInfo(item.department || 'general');
                return (
                  <div key={item.queue_id} className={`queue-card ${item.priority_level === 'emergency' ? 'emergency-card' : ''}`}>
                    <div className="queue-card-header">
                      <span className="position-number">#{index + 1}</span>
                      <span 
                        className="priority-badge"
                        style={{ background: getPriorityColor(item.priority_level) + '20', color: getPriorityColor(item.priority_level) }}
                      >
                        {getPriorityLabel(item.priority_level)}
                      </span>
                    </div>
                    <div className="queue-card-body">
                      <div className="patient-info">
                        <div className="patient-avatar-large">
                          {item.patient_name?.charAt(0) || 'P'}
                        </div>
                        <div>
                          <h4>{item.patient_name || `Patient #${item.patient_id}`}</h4>
                          <p className="patient-condition">{item.condition || 'General'}</p>
                          <p className="patient-score">Score: {item.priority_score || 0}</p>
                        </div>
                      </div>
                      <div className="queue-details">
                        <div className="detail-item">
                          <span className="detail-label">Department</span>
                          {item.department ? (
                            <span 
                              className="dept-badge-small"
                              style={{ 
                                background: deptInfo.color + '20', 
                                color: deptInfo.color,
                                border: `1px solid ${deptInfo.color}40`
                              }}
                            >
                              <i className={`fas ${deptInfo.icon}`}></i>
                              {deptInfo.name}
                            </span>
                          ) : (
                            <button 
                              className="btn-assign-dept-small"
                              onClick={() => {
                                setSelectedQueueId(item.queue_id);
                                setShowAssignDepartment(true);
                              }}
                            >
                              Assign
                            </button>
                          )}
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Wait Time</span>
                          <span className="detail-value" style={{ color: getWaitTimeColor(item.waiting_time_minutes || 0) }}>
                            {item.waiting_time_minutes || 0} min
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Status</span>
                          <span 
                            className="status-badge-small"
                            style={{ background: getStatusColor(item.status) + '20', color: getStatusColor(item.status) }}
                          >
                            {getStatusLabel(item.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="queue-card-footer">
                      {item.status === 'waiting' && (
                        <>
                          <button 
                            className="btn-attend"
                            onClick={() => handleStatusUpdate(item.queue_id, 'in_progress')}
                          >
                            <i className="fas fa-user-check"></i> Attend
                          </button>
                          <button 
                            className="btn-cancel"
                            onClick={() => handleStatusUpdate(item.queue_id, 'cancelled')}
                          >
                            <i className="fas fa-times"></i> Cancel
                          </button>
                        </>
                      )}
                      {item.status === 'in_progress' && (
                        <button 
                          className="btn-complete"
                          onClick={() => handleStatusUpdate(item.queue_id, 'completed')}
                        >
                          <i className="fas fa-check"></i> Complete
                        </button>
                      )}
                      <button 
                        className="btn-view"
                        onClick={() => viewPatientDetails(item.patient_id)}
                      >
                        <i className="fas fa-eye"></i> View
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── ASSIGN DEPARTMENT MODAL ─── */}
      {showAssignDepartment && (
        <div className="modal-overlay" onClick={() => setShowAssignDepartment(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fas fa-building" style={{ color: '#534AB7' }}></i> Assign Department</h2>
              <button className="modal-close" onClick={() => setShowAssignDepartment(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
                Select the department for this patient:
              </p>
              <div className="department-grid">
                {departments.map(dept => (
                  <button
                    key={dept.id}
                    className="department-option"
                    onClick={() => handleAssignDepartment(selectedQueueId, dept.id)}
                    style={{
                      borderColor: dept.color,
                      background: dept.color + '10'
                    }}
                  >
                    <i className={`fas ${dept.icon}`} style={{ color: dept.color }}></i>
                    <span>{dept.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAssignDepartment(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
            <div className="modal-body">
              <div className="patient-details-grid">
                <div className="detail-section">
                  <h4><i className="fas fa-user"></i> Personal Information</h4>
                  <div className="detail-row">
                    <span className="detail-label">Name:</span>
                    <span>{selectedPatient.first_name} {selectedPatient.last_name}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Date of Birth:</span>
                    <span>{formatDate(selectedPatient.date_of_birth)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Gender:</span>
                    <span>{selectedPatient.gender || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Phone:</span>
                    <span>{selectedPatient.phone_number || selectedPatient.phone || 'N/A'}</span>
                  </div>
                </div>

                <div className="detail-section">
                  <h4><i className="fas fa-phone"></i> Contact Information</h4>
                  <div className="detail-row">
                    <span className="detail-label">Email:</span>
                    <span>{selectedPatient.email || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Address:</span>
                    <span>{selectedPatient.street_address || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">City:</span>
                    <span>{selectedPatient.city || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Province:</span>
                    <span>{selectedPatient.province || 'N/A'}</span>
                  </div>
                </div>

                <div className="detail-section">
                  <h4><i className="fas fa-heart"></i> Medical Information</h4>
                  <div className="detail-row">
                    <span className="detail-label">Blood Group:</span>
                    <span>{selectedPatient.blood_group || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Allergies:</span>
                    <span>{selectedPatient.allergies || 'None'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Chronic Conditions:</span>
                    <span>{selectedPatient.chronic_conditions || 'None'}</span>
                  </div>
                </div>

                <div className="detail-section">
                  <h4><i className="fas fa-clock"></i> Registration Info</h4>
                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span className={`status-badge ${selectedPatient.status || 'active'}`}>
                      {selectedPatient.status || 'active'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Registered:</span>
                    <span>{formatDate(selectedPatient.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowPatientModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Queue;