import React from 'react';
import './conditionicon.css';

function ConditionIcon({ condition, status, onClick }) {
  const getStatusColor = (status) => {
    const colors = {
      'normal': '#10B981',
      'warning': '#F59E0B',
      'critical': '#EF4444',
      'emergency': '#DC2626',
      'monitoring': '#0EA5E9',
      'pending': '#8B5CF6',
      'completed': '#10B981',
    };
    return colors[status] || '#6B7280';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'normal': '✅ Normal',
      'warning': '⚠️ Warning',
      'critical': '🔴 Critical',
      'emergency': '🚨 Emergency',
      'monitoring': '📊 Monitoring',
      'pending': '⏳ Pending',
      'completed': '✅ Completed',
    };
    return labels[status] || status;
  };

  const getStatusBg = (status) => {
    const colors = {
      'normal': 'rgba(16, 185, 129, 0.1)',
      'warning': 'rgba(245, 158, 11, 0.1)',
      'critical': 'rgba(239, 68, 68, 0.1)',
      'emergency': 'rgba(220, 38, 38, 0.15)',
      'monitoring': 'rgba(14, 165, 233, 0.1)',
      'pending': 'rgba(139, 92, 246, 0.1)',
      'completed': 'rgba(16, 185, 129, 0.1)',
    };
    return colors[status] || 'rgba(107, 114, 128, 0.1)';
  };

  return (
    <div className={`condition-icon ${status}`} onClick={onClick}>
      <div className="condition-icon-wrapper" style={{ background: getStatusBg(status) }}>
        <i className="fas fa-circle"></i>
      </div>
      <div className="condition-details">
        <div className="condition-name"><strong>{condition}</strong></div>
        <div className="condition-status" style={{ color: getStatusColor(status) }}>
          {getStatusLabel(status)}
        </div>
      </div>
    </div>
  );
}

export default ConditionIcon;