import React from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function ChartWidget({ title, type, data, colors, xKey, yKey }) {
  const chartColors = colors || ['#534AB7', '#7C3AED', '#10B981', '#F59E0B', '#EF4444'];

  if (!data || data.length === 0) {
    return (
      <div className="chart-widget">
        <div className="chart-header">
          <h3>{title}</h3>
        </div>
        <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
          <div style={{ textAlign: 'center' }}>
            <i className="fas fa-chart-simple" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}></i>
            No data available
          </div>
        </div>
      </div>
    );
  }

  const renderChart = () => {
    switch(type) {
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7" />
            <XAxis dataKey={xKey || 'name'} stroke="#9ca3af" fontSize={11} />
            <YAxis stroke="#9ca3af" fontSize={11} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey={yKey || 'value'} stroke={chartColors[0]} strokeWidth={2} dot={{ fill: chartColors[0] }} />
          </LineChart>
        );
      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7" />
            <XAxis dataKey={xKey || 'name'} stroke="#9ca3af" fontSize={11} />
            <YAxis stroke="#9ca3af" fontSize={11} />
            <Tooltip />
            <Legend />
            <Bar dataKey={yKey || 'value'} fill={chartColors[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey={yKey || 'value'}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        );
      default:
        return <div>Chart type not supported</div>;
    }
  };

  return (
    <div className="chart-widget">
      <div className="chart-header">
        <h3>{title}</h3>
      </div>
      <div className="chart-body">
        <ResponsiveContainer width="100%" height={250}>
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default ChartWidget;