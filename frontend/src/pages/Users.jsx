import React, { useState, useEffect } from 'react';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';
import './styles/users.css';

function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [role, setRole] = useState('superadmin');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // ─── FORM STATE ───
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'nurse',
    facility_id: '',
    department_id: '',
    phone: '',
    password: '',
    status: 'active',
    face_verified: false,
    fingerprint_verified: false,
    mfa_enabled: false
  });

  // ─── DROPDOWN DATA ───
  const [facilities, setFacilities] = useState([]);
  const [departments, setDepartments] = useState([]);

  const roles = ['nurse'];

  const roleLabels = {
    nurse: 'Nurse',
  };

  // ─── FETCH DATA ───
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) setRole(user.role);
    fetchUsers();
    fetchFacilities();
    fetchDepartments();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setUsers((data.data || []).filter(user => user.role === 'nurse'));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFacilities = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/organizations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setFacilities(data.data);
      }
    } catch (error) {
      console.error('Error fetching facilities:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/departments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setDepartments(data.data);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  // ─── HANDLE FORM INPUT ───
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // ─── OPEN CREATE MODAL ───
  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      full_name: '',
      role: 'nurse',
      facility_id: '',
      department_id: '',
      phone: '',
      password: '',
      status: 'active',
      face_verified: false,
      fingerprint_verified: false,
      mfa_enabled: false
    });
    setShowModal(true);
  };

  // ─── OPEN EDIT MODAL ───
  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      facility_id: user.facility_id || '',
      department_id: user.department_id || '',
      phone: user.phone || '',
      password: '',
      status: user.status || 'active',
      face_verified: user.face_verified === 1,
      fingerprint_verified: user.fingerprint_verified === 1,
      mfa_enabled: user.mfa_enabled === 1
    });
    setShowModal(true);
  };

  // ─── SUBMIT FORM ───
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url = editingUser 
        ? `http://localhost:5000/api/users/${editingUser.user_id}`
        : 'http://localhost:5000/api/users';
      
      const method = editingUser ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setShowModal(false);
        fetchUsers();
        alert(editingUser ? 'User updated successfully!' : 'User created successfully!');
      } else {
        alert(data.message || 'Something went wrong');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Error saving user');
    }
  };

  // ─── RESET PASSWORD ───
  const handleResetPassword = async (userId, userName) => {
    const newPassword = prompt(`Enter new password for ${userName}:`);
    if (!newPassword) return;
    
    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Password reset successfully! User will be prompted to change on next login.');
      } else {
        alert(data.message || 'Something went wrong');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Error resetting password');
    }
  };

  // ─── DELETE USER ───
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.success) {
        fetchUsers();
        alert('User deleted successfully!');
      } else {
        alert(data.message || 'Something went wrong');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user');
    }
  };

  // ─── FILTER USERS ───
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="users-container">
      <Sidebar role={role} />
      <div className="users-main">
        <Header role={role} />
        <div className="users-content">
          
          {/* ─── HEADER ─── */}
          <div className="users-header">
            <div>
              <h1>👥 User Management</h1>
              <p className="users-subtitle">Manage all system users and their roles</p>
            </div>
            <button className="btn-primary" onClick={openCreateModal}>
              <i className="fas fa-plus"></i> Add User
            </button>
          </div>

          {/* ─── STATS ROW ─── */}
          <div className="users-stats-grid">
            <div className="users-stat-card">
              <div className="users-stat-icon purple"><i className="fas fa-users"></i></div>
              <div className="users-stat-info">
                <div className="users-stat-number">{users.length}</div>
                <div className="users-stat-label">Total Users</div>
              </div>
            </div>
            <div className="users-stat-card">
              <div className="users-stat-icon green"><i className="fas fa-check-circle"></i></div>
              <div className="users-stat-info">
                <div className="users-stat-number">{users.filter(u => u.status === 'active').length}</div>
                <div className="users-stat-label">Active</div>
              </div>
            </div>
            <div className="users-stat-card">
              <div className="users-stat-icon red"><i className="fas fa-times-circle"></i></div>
              <div className="users-stat-info">
                <div className="users-stat-number">{users.filter(u => u.status === 'inactive').length}</div>
                <div className="users-stat-label">Inactive</div>
              </div>
            </div>
            <div className="users-stat-card">
              <div className="users-stat-icon blue"><i className="fas fa-user-tie"></i></div>
              <div className="users-stat-info">
                <div className="users-stat-number">{users.filter(u => u.is_first_login === 1).length}</div>
                <div className="users-stat-label">Pending Password Change</div>
              </div>
            </div>
          </div>

          {/* ─── FILTERS ─── */}
          <div className="users-filters">
            <div className="users-search">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
              <option value="all">All Roles</option>
              {roles.map(r => (
                <option key={r} value={r}>{roleLabels[r] || r}</option>
              ))}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button className="btn-clear" onClick={() => {
              setSearchTerm('');
              setFilterRole('all');
              setFilterStatus('all');
            }}>
              <i className="fas fa-undo"></i> Clear
            </button>
          </div>

          {/* ─── TABLE ─── */}
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Facility</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr key={user.user_id}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar">
                            <i className="fas fa-user"></i>
                          </div>
                          <div>
                            <div className="user-name">{user.full_name}</div>
                            {user.is_first_login === 1 && (
                              <span className="pending-badge">First Login</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`role-badge ${user.role}`}>
                          {roleLabels[user.role] || user.role}
                        </span>
                      </td>
                      <td>{user.facility_name || '-'}</td>
                      <td>{user.department_name || '-'}</td>
                      <td>
                        <span className={`status-badge ${user.status}`}>
                          {user.status === 'active' ? '✅ Active' : '⛔ Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="user-actions">
                          <button className="btn-edit" onClick={() => openEditModal(user)}>
                            <i className="fas fa-edit"></i>
                          </button>
                          <button className="btn-reset" onClick={() => handleResetPassword(user.user_id, user.full_name)}>
                            <i className="fas fa-key"></i>
                          </button>
                          <button className="btn-delete" onClick={() => handleDelete(user.user_id, user.full_name)}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="users-empty">
                      <i className="fas fa-inbox"></i>
                      <p>No users found</p>
                      <button className="btn-primary" onClick={openCreateModal}>
                        <i className="fas fa-plus"></i> Add your first user
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ─── MODAL ─── */}
          {showModal && (
            <div className="users-modal-overlay" onClick={() => setShowModal(false)}>
              <div className="users-modal" onClick={(e) => e.stopPropagation()}>
                <div className="users-modal-header">
                  <h2>{editingUser ? '✏️ Edit User' : '👤 Add New User'}</h2>
                  <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="users-form-grid">
                    <div className="users-form-group">
                      <label>Full Name *</label>
                      <input
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="users-form-group">
                      <label>Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        disabled={!!editingUser}
                      />
                    </div>
                    <div className="users-form-group">
                      <label>Role *</label>
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select Role</option>
                        {roles.map(r => (
                          <option key={r} value={r}>{roleLabels[r] || r}</option>
                        ))}
                      </select>
                    </div>
                    <div className="users-form-group">
                      <label>Phone</label>
                      <input
                        type="text"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="users-form-group">
                      <label>Facility</label>
                      <select
                        name="facility_id"
                        value={formData.facility_id}
                        onChange={handleInputChange}
                      >
                        <option value="">Select Facility</option>
                        {facilities.map(f => (
                          <option key={f.facility_id} value={f.facility_id}>
                            {f.facility_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="users-form-group">
                      <label>Department</label>
                      <select
                        name="department_id"
                        value={formData.department_id}
                        onChange={handleInputChange}
                      >
                        <option value="">Select Department</option>
                        {departments.map(d => (
                          <option key={d.department_id} value={d.department_id}>
                            {d.department_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {!editingUser && (
                      <div className="users-form-group">
                        <label>Password *</label>
                        <input
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          required={!editingUser}
                          minLength="8"
                          placeholder="Min 8 characters"
                        />
                      </div>
                    )}
                    <div className="users-form-group">
                      <label>Status</label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="users-form-group full-width">
                      <label>Security Settings</label>
                      <div className="users-checkbox-group">
                        <label>
                          <input
                            type="checkbox"
                            name="face_verified"
                            checked={formData.face_verified}
                            onChange={handleInputChange}
                          />
                          Face Verified
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            name="fingerprint_verified"
                            checked={formData.fingerprint_verified}
                            onChange={handleInputChange}
                          />
                          Fingerprint Verified
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            name="mfa_enabled"
                            checked={formData.mfa_enabled}
                            onChange={handleInputChange}
                          />
                          MFA Enabled
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="users-modal-footer">
                    <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary">
                      {editingUser ? 'Update User' : 'Create User'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default Users;