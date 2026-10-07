// src/components/FaceVerification/FaceLogin.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FaceVerification from './faceverification';
import './styles/FaceLogin.css';

const FaceLogin = () => {
    const [email, setEmail] = useState('');
    const [mode, setMode] = useState('verify');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSuccess = (userData) => {
        console.log('✅ Face login successful:', userData);
        if (userData.token) {
            localStorage.setItem('token', userData.token);
        }
        if (userData) {
            localStorage.setItem('user', JSON.stringify(userData));
        }
        const redirectUrl = userData?.redirectUrl || '/dashboard';
        navigate(redirectUrl);
    };

    const handleError = (errorMessage) => {
        setError(errorMessage);
        setTimeout(() => setError(''), 5000);
    };

    return (
        <div className="face-login-container">
            <h1 className="face-login-title">🔐 Face Authentication</h1>

            {error && (
                <div className="error-message">
                    ❌ {error}
                </div>
            )}

            <div className="email-input-container">
                <div className="input-group">
                    <label className="input-label">Email Address</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="email-input"
                    />
                </div>

                <div className="mode-selector">
                    <button
                        onClick={() => setMode('verify')}
                        className={`mode-btn ${mode === 'verify' ? 'mode-active-verify' : 'mode-inactive'}`}
                    >
                        🔐 Verify Face
                    </button>
                    <button
                        onClick={() => setMode('register')}
                        className={`mode-btn ${mode === 'register' ? 'mode-active-register' : 'mode-inactive'}`}
                    >
                        📸 Register Face
                    </button>
                </div>
            </div>

            {email ? (
                <FaceVerification
                    email={email}
                    mode={mode}
                    onSuccess={handleSuccess}
                    onError={handleError}
                />
            ) : (
                <div className="placeholder-message">
                    Please enter your email above to continue
                </div>
            )}

            <div className="back-button-container">
                <button
                    onClick={() => navigate('/login')}
                    className="back-btn"
                >
                    ← Back to Password Login
                </button>
            </div>
        </div>
    );
};

export default FaceLogin;