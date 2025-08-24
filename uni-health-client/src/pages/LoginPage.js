// src/pages/LoginPage.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login, isAuthenticated } from '../services/auth';
import './LoginPage.css';
import doctor from '../female-doctor-hospital-with-stethoscope.png';
const LoginPage = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Check if user is already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard');
    }
  }, [navigate]);

  // Simplified error handling in the handleLogin function
const handleLogin = async (e) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  try {
    console.log('Attempting login with:', { email });
    const response = await login({ email, password });
    console.log('Login response received:', response);
    
    if (response.token) {
      console.log('Login successful, refreshing user data');
      
      if (onLoginSuccess) {
        try {
          await onLoginSuccess();
        } catch (userError) {
          console.error('Failed to refresh user data:', userError);
        }
      }
      
      navigate('/dashboard', { replace: true });
    } else {
      setError('Login failed - no token received');
    }
  } catch (err) {
    console.error('Login error:', err);
    
    let errorMessage = 'An error occurred during login';
    
    // Extract clean message from Laravel validation errors
    if (err.response && err.response.data) {
      const errorData = err.response.data;
      
      if (errorData.password && Array.isArray(errorData.password)) {
        errorMessage = errorData.password[0];
      } else if (errorData.email && Array.isArray(errorData.email)) {
        errorMessage = errorData.email[0];
      }
    }
    
    setError(errorMessage);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="wehealth-container">
      <div className="wehealth-card">
        {/* Left Panel - Login Form */}
        <div className="login-panel">
          <div className="logo-section">
            <img src="logo6.png" alt="Final International University" className="brand-logo" />
            <h2 className="brand-name">FIU Clinical Management</h2>
          </div>

          <div className="login-form-container">
            <h3 className="form-title">Sign In</h3>
            <p className="form-subtitle">Access your health dashboard</p>

            {/* Error Alert */}
            {error && (
              <div className="error-alert">
                <i className="fas fa-exclamation-circle"></i>
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="login-form">
              <div className="form-group">
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <div className="password-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="form-input"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>

              <div className="form-options">
                <label className="checkbox-container">
                  <input type="checkbox" />
                  <span className="checkmark"></span>
                  Remember me
                </label>
              </div>

              <button type="submit" disabled={loading} className="login-button">
                {loading && (
                  <span className="spinner"></span>
                )}
                {loading ? 'Signing in...' : 'Log In'}
              </button>

              <Link to="/forgot-password" className="forgot-password">
                Don't access your account?
              </Link>
            </form>
          </div>
        </div>

        {/* Right Panel - Doctor Image and Info */}
        <div className="doctor-panel">
          <div className="doctor-section">
            <div className="doctor-image-container">
              <img src={doctor} alt="Healthcare Professional" className="doctor-image" />
            </div>
            
            <div className="info-bubble">
              <div className="bubble-icon">
                <i className="fas fa-stethoscope"></i>
              </div>
              <div className="bubble-content">
                <h4>Connect with a Doctor</h4>
                <p>Licensed professionals at your service</p>
              </div>
            </div>
          </div>
          
          <div className="signup-section">
            <p>Don't have an account?</p>
            <Link to="/register" className="signup-link">Create Account</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;