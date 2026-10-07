import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import './styles/login.css';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const storeSession = (sessionToken, sessionUser) => {
    localStorage.setItem('token', sessionToken);
    localStorage.setItem('user', JSON.stringify(sessionUser));
    localStorage.setItem('userId', sessionUser.user_id || sessionUser.id);
    localStorage.setItem('userRole', sessionUser.role);
    navigate('/dashboard', { replace: true });
  };

  const handleLogin = async event => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to sign in with those credentials.');
      }

      if (!data.token || !data.user) {
        throw new Error('The server returned an incomplete login response.');
      }

      if (data.isFirstLogin || data.requiresPasswordChange) {
        setUser(data.user);
        setRequiresPasswordChange(true);
      } else {
        storeSession(data.token, data.user);
      }
    } catch (loginError) {
      setError(loginError.message || 'Unable to connect to the login service.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async event => {
    event.preventDefault();
    setLoading(true);
    setError('');

    if (newPassword.length < 8) {
      setError('Your new password must be at least 8 characters long.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/change-password-first-time`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.user_id || user.id,
          currentPassword: password,
          newPassword
        })
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to update your password.');
      }

      const loginResponse = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: newPassword })
      });
      const loginData = await loginResponse.json();

      if (!loginResponse.ok || !loginData.success || !loginData.token || !loginData.user) {
        throw new Error(loginData.message || 'Password changed, but signing in again failed.');
      }

      storeSession(loginData.token, loginData.user);
    } catch (passwordError) {
      setError(passwordError.message || 'Unable to update your password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-container">
        <div className="bg-decoration" aria-hidden="true">
          <div className="circle circle-1" />
          <div className="circle circle-2" />
          <div className="circle circle-3" />
        </div>
        <div className="login-card">
          <div className="brand-section">
            <div className="logo-container">
              <div className="logo-icon"><i className="fas fa-heartbeat" /></div>
            </div>
            <h1>Pulse<span>Logic</span></h1>
            <p className="tagline">Patient and device monitoring</p>
          </div>

          <h2>{requiresPasswordChange ? 'Set a new password' : 'Staff sign in'}</h2>
          <p>Sign in with your MySQL staff account.</p>

          {error && (
            <div className="message error" role="alert">
              <i className="fas fa-exclamation-circle" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={requiresPasswordChange ? handlePasswordChange : handleLogin} className="login-form">
            <div className="form-group">
              <label htmlFor="login-email">Email Address</label>
              <div className="input-field">
                <input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  required
                  disabled={requiresPasswordChange}
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="login-password">Current Password</label>
              <div className="input-field">
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  required
                />
              </div>
            </div>
            {requiresPasswordChange && (
              <div className="form-group">
                <label htmlFor="new-password">New Password</label>
                <div className="input-field">
                  <input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    minLength="8"
                    value={newPassword}
                    onChange={event => setNewPassword(event.target.value)}
                    required
                  />
                </div>
              </div>
            )}
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Please waitâ€¦' : requiresPasswordChange ? 'Update password' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;

