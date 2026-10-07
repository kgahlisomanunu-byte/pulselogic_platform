import React from 'react';
import './widgetcard.css';

function WidgetCard({ title, value, icon, color, trend, trendValue, onClick }) {
  return (
    <div className={`widget-card ${color}`} onClick={onClick}>
      <div className="widget-icon">
        <i className={`fas ${icon}`}></i>
      </div>
      <div className="widget-content">
        <div className="widget-value">{value || 0}</div>
        <div className="widget-title">{title}</div>
        {trend && (
          <div className={`widget-trend ${trend}`}>
            <i className={`fas fa-arrow-${trend === 'up' ? 'up' : 'down'}`}></i>
            <span>{trendValue}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default WidgetCard;