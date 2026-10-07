// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PatientRecords from './pages/PatientRecords';
import PatientRegistration from './pages/PatientRegistration';
import Vitals from './pages/Vitals';
import Users from './pages/Users';

const PrivateRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    return token ? children : <Navigate to="/login" replace />;
};

function App() {
    return (
        <Router>
            <div className="App">
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                    <Route path="/patients" element={<PrivateRoute><PatientRecords /></PrivateRoute>} />
                    <Route path="/patients/register" element={<PrivateRoute><PatientRegistration /></PrivateRoute>} />
                    <Route path="/vitals" element={<PrivateRoute><Vitals /></PrivateRoute>} />
                    <Route path="/users" element={<PrivateRoute><Users /></PrivateRoute>} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;