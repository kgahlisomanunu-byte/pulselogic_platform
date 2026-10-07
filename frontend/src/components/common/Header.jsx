import React, { useState } from 'react';
import './header.css';

function Header({ role, onSearch }) {
  const [searchQuery, setSearchQuery] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const displayName = user?.full_name || user?.name || user?.email || 'Staff user';
  const displayRole = role || user?.role || 'Staff';

  const handleSearch = (e) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <h2>PulseLogic</h2>
        <span className="role-badge">{displayRole}</span>
      </div>

      <div className="header-center">
        <form onSubmit={handleSearch} className="search-form">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search patients, staff, facilities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>
      </div>

      <div className="header-right">
        <button className="icon-btn" title="Notifications">
          <i className="fas fa-bell"></i>
        </button>
        <button className="icon-btn" title="Messages">
          <i className="fas fa-envelope"></i>
        </button>
        <button className="icon-btn" title="Settings">
          <i className="fas fa-cog"></i>
        </button>
        <div className="user-profile">
          <div className="avatar">
            <i className="fas fa-user"></i>
          </div>
          <div className="user-details">
            <div className="name">{displayName}</div>
            <div className="role">{displayRole}</div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;