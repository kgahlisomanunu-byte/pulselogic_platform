import React from 'react';
import './activityfeed.css';

function ActivityFeed({ activities }) {
  const getIcon = (type) => {
    const icons = {
      critical: 'fa-exclamation-triangle',
      emergency: 'fa-siren',
      warning: 'fa-exclamation',
      patient: 'fa-user-plus',
      appointment: 'fa-calendar-check',
      prescription: 'fa-prescription',
      lab: 'fa-flask',
      imaging: 'fa-x-ray',
      referral: 'fa-ambulance',
      vitals: 'fa-heartbeat',
      discharge: 'fa-sign-out-alt',
      admission: 'fa-sign-in-alt',
      monitoring: 'fa-chart-line',
      completed: 'fa-check-circle',
      maternity: 'fa-baby'
    };
    return icons[type] || 'fa-clock';
  };

  const getColor = (type) => {
    const colors = {
      critical: '#EF4444',
      emergency: '#DC2626',
      warning: '#F59E0B',
      patient: '#534AB7',
      appointment: '#0EA5E9',
      prescription: '#10B981',
      lab: '#8B5CF6',
      imaging: '#EC4899',
      referral: '#EF4444',
      vitals: '#06B6D4',
      discharge: '#6B7280',
      admission: '#8B5CF6',
      monitoring: '#0EA5E9',
      completed: '#10B981',
      maternity: '#EC4899'
    };
    return colors[type] || '#6B7280';
  };

  return (
    <div className="activity-feed">
      <div className="activity-header">
        <h3>Recent Activities</h3>
        <button className="view-all">View All</button>
      </div>
      <div className="activity-list">
        {activities && activities.length > 0 ? (
          activities.map((activity, index) => (
            <div key={index} className="activity-item">
              <div className="activity-icon" style={{ background: getColor(activity.type) }}>
                <i className={`fas ${getIcon(activity.type)}`}></i>
              </div>
              <div className="activity-content">
                <div className="activity-message">{activity.message}</div>
                <div className="activity-time">{activity.time}</div>
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
            <i className="fas fa-inbox" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}></i>
            No recent activities
          </div>
        )}
      </div>
    </div>
  );
}

export default ActivityFeed;