import React, { useState, useEffect } from 'react';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';
import './styles/organizations.css';

function Organizations() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [role, setRole] = useState('superadmin');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterProvince, setFilterProvince] = useState('all');

  // ─── FORM STATE ───
  const [formData, setFormData] = useState({
    facility_name: '',
    facility_type: '',
    facility_code: '',
    district: '',
    province: '',
    contact_number: '',
    address: '',
    status: 'active'
  });

  const provinces = [
    'All', 'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal',
    'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape'
  ];

  const facilityTypes = [
    'All', 'Hospital', 'Clinic', 'Health Centre', 'Pharmacy', 'Laboratory'
  ];

  // ─── FETCH ORGANIZATIONS ───
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) setRole(user.role);
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/organizations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setOrganizations(data.data);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  // ─── HANDLE FORM INPUT ───
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // ─── OPEN CREATE MODAL ───
  const openCreateModal = () => {
    setEditingOrg(null);
    setFormData({
      facility_name: '',
      facility_type: '',
      facility_code: '',
      district: '',
      province: '',
      contact_number: '',
      address: '',
      status: 'active'
    });
    setShowModal(true);
  };

  // ─── OPEN EDIT MODAL ───
  const openEditModal = (org) => {
    setEditingOrg(org);
    setFormData({
      facility_name: org.facility_name,
      facility_type: org.facility_type,
      facility_code: org.facility_code,
      district: org.district || '',
      province: org.province || '',
      contact_number: org.contact_number || '',
      address: org.address || '',
      status: org.status || 'active'
    });
    setShowModal(true);
  };

  // ─── SUBMIT FORM ───
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url = editingOrg 
        ? `http://localhost:5000/api/organizations/${editingOrg.facility_id}`
        : 'http://localhost:5000/api/organizations';
      
      const method = editingOrg ? 'PUT' : 'POST';
      
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
        fetchOrganizations();
        alert(editingOrg ? 'Organization updated successfully!' : 'Organization created successfully!');
      } else {
        alert(data.message || 'Something went wrong');
      }
    } catch (error) {
      console.error('Error saving organization:', error);
      alert('Error saving organization');
    }
  };

  // ─── DELETE ORGANIZATION ───
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/organizations/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.success) {
        fetchOrganizations();
        alert('Organization deleted successfully!');
      } else {
        alert(data.message || 'Something went wrong');
      }
    } catch (error) {
      console.error('Error deleting organization:', error);
      alert('Error deleting organization');
    }
  };

  // ─── FILTER ORGANIZATIONS ───
  const filteredOrgs = organizations.filter(org => {
    const matchesSearch = org.facility_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          org.facility_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          org.district?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || org.facility_type === filterType;
    const matchesProvince = filterProvince === 'all' || org.province === filterProvince;
    return matchesSearch && matchesType && matchesProvince;
  });

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading organizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="org-container">
      <Sidebar role={role} />
      <div className="org-main">
        <Header role={role} />
        <div className="org-content">
          
          {/* ─── HEADER ─── */}
          <div className="org-header">
            <div>
              <h1>🏥 Organization Management</h1>
              <p className="org-subtitle">Manage all healthcare facilities in the PulseLogic network</p>
            </div>
            <button className="btn-primary" onClick={openCreateModal}>
              <i className="fas fa-plus"></i> Add Organization
            </button>
          </div>

          {/* ─── STATS ROW ─── */}
          <div className="org-stats-grid">
            <div className="org-stat-card">
              <div className="org-stat-icon blue"><i className="fas fa-hospital"></i></div>
              <div className="org-stat-info">
                <div className="org-stat-number">{organizations.length}</div>
                <div className="org-stat-label">Total Organizations</div>
              </div>
            </div>
            <div className="org-stat-card">
              <div className="org-stat-icon green"><i className="fas fa-check-circle"></i></div>
              <div className="org-stat-info">
                <div className="org-stat-number">{organizations.filter(o => o.status === 'active').length}</div>
                <div className="org-stat-label">Active</div>
              </div>
            </div>
            <div className="org-stat-card">
              <div className="org-stat-icon red"><i className="fas fa-times-circle"></i></div>
              <div className="org-stat-info">
                <div className="org-stat-number">{organizations.filter(o => o.status === 'inactive').length}</div>
                <div className="org-stat-label">Inactive</div>
              </div>
            </div>
            <div className="org-stat-card">
              <div className="org-stat-icon purple"><i className="fas fa-users"></i></div>
              <div className="org-stat-info">
                <div className="org-stat-number">{organizations.reduce((sum, o) => sum + (o.total_staff || 0), 0)}</div>
                <div className="org-stat-label">Total Staff</div>
              </div>
            </div>
          </div>

          {/* ─── FILTERS ─── */}
          <div className="org-filters">
            <div className="org-search">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Search organizations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              {facilityTypes.map(type => (
                <option key={type} value={type === 'All' ? 'all' : type}>
                  {type}
                </option>
              ))}
            </select>
            <select value={filterProvince} onChange={(e) => setFilterProvince(e.target.value)}>
              {provinces.map(province => (
                <option key={province} value={province === 'All' ? 'all' : province}>
                  {province}
                </option>
              ))}
            </select>
            <button className="btn-clear" onClick={() => {
              setSearchTerm('');
              setFilterType('all');
              setFilterProvince('all');
            }}>
              <i className="fas fa-undo"></i> Clear
            </button>
          </div>

          {/* ─── TABLE ─── */}
          <div className="org-table-container">
            <table className="org-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Type</th>
                  <th>District</th>
                  <th>Province</th>
                  <th>Staff</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrgs.length > 0 ? (
                  filteredOrgs.map((org) => (
                    <tr key={org.facility_id}>
                      <td><strong>{org.facility_name}</strong></td>
                      <td><span className="org-code">{org.facility_code}</span></td>
                      <td>{org.facility_type}</td>
                      <td>{org.district || '-'}</td>
                      <td>{org.province || '-'}</td>
                      <td>{org.total_staff || 0}</td>
                      <td>
                        <span className={`status-badge ${org.status}`}>
                          {org.status === 'active' ? '✅ Active' : '⛔ Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="org-actions">
                          <button className="btn-edit" onClick={() => openEditModal(org)}>
                            <i className="fas fa-edit"></i>
                          </button>
                          <button className="btn-delete" onClick={() => handleDelete(org.facility_id, org.facility_name)}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="org-empty">
                      <i className="fas fa-inbox"></i>
                      <p>No organizations found</p>
                      <button className="btn-primary" onClick={openCreateModal}>
                        <i className="fas fa-plus"></i> Add your first organization
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ─── MODAL ─── */}
          {showModal && (
            <div className="org-modal-overlay" onClick={() => setShowModal(false)}>
              <div className="org-modal" onClick={(e) => e.stopPropagation()}>
                <div className="org-modal-header">
                  <h2>{editingOrg ? '✏️ Edit Organization' : '🏥 Add New Organization'}</h2>
                  <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="org-form-grid">
                    <div className="org-form-group">
                      <label>Facility Name *</label>
                      <input
                        type="text"
                        name="facility_name"
                        value={formData.facility_name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="org-form-group">
                      <label>Facility Code *</label>
                      <input
                        type="text"
                        name="facility_code"
                        value={formData.facility_code}
                        onChange={handleInputChange}
                        required
                        disabled={!!editingOrg}
                      />
                    </div>
                    <div className="org-form-group">
                      <label>Facility Type *</label>
                      <select
                        name="facility_type"
                        value={formData.facility_type}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select Type</option>
                        <option value="Hospital">Hospital</option>
                        <option value="Clinic">Clinic</option>
                        <option value="Health Centre">Health Centre</option>
                        <option value="Pharmacy">Pharmacy</option>
                        <option value="Laboratory">Laboratory</option>
                      </select>
                    </div>
                    <div className="org-form-group">
                      <label>District</label>
                      <input
                        type="text"
                        name="district"
                        value={formData.district}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="org-form-group">
                      <label>Province</label>
                      <select
                        name="province"
                        value={formData.province}
                        onChange={handleInputChange}
                      >
                        <option value="">Select Province</option>
                        {provinces.filter(p => p !== 'All').map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div className="org-form-group">
                      <label>Contact Number</label>
                      <input
                        type="text"
                        name="contact_number"
                        value={formData.contact_number}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="org-form-group full-width">
                      <label>Address</label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="org-form-group">
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
                  </div>
                  <div className="org-modal-footer">
                    <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary">
                      {editingOrg ? 'Update Organization' : 'Create Organization'}
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

export default Organizations;