import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { login, isAuthenticated } from '../services/auth';
import LanguageSwitcher from '../components/LanguageSwitcher';
import './LoginPage.css';

interface LoginPageProps {
  onLoginSuccess: () => Promise<void>;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Check if user is already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard');
    }
    
    // Load remembered credentials if they exist
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    const rememberedPassword = localStorage.getItem('rememberedPassword');
    
    if (rememberedEmail && rememberedPassword) {
      setEmail(rememberedEmail);
      // Decrypt password (simple base64 for demo - use better encryption in production)
      try {
        setPassword(atob(rememberedPassword));
        setRememberMe(true);
      } catch (e) {
        // If decryption fails, clear stored data
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
      }
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Attempting login with:', { email });
      const response = await login({ email, password });
      console.log('Login response received:', response);
      
      if (response.token) {
        console.log('Login successful, refreshing user data');
        
        // Handle Remember Me
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
          // Simple base64 encoding (use better encryption in production)
          localStorage.setItem('rememberedPassword', btoa(password));
        } else {
          // Clear remembered credentials if unchecked
          localStorage.removeItem('rememberedEmail');
          localStorage.removeItem('rememberedPassword');
        }
        
        try {
          await onLoginSuccess();
        } catch (userError) {
          console.error('Failed to refresh user data:', userError);
        }
        
        // Role-based navigation after successful login
        if (response.user?.role) {
          switch (response.user.role) {
            case 'student':
              navigate('/student/dashboard', { replace: true });
              break;
            case 'admin':
              navigate('/admin/dashboard', { replace: true });
              break;
            case 'doctor':
              navigate('/doctor/dashboard', { replace: true });
              break;
            case 'clinical_staff':
              navigate('/clinical/dashboard', { replace: true });
              break;
            case 'academic_staff':
              navigate('/academic-staff/dashboard', { replace: true });
              break;
            case 'superadmin':
              navigate('/superadmin/dashboard', { replace: true });
              break;
            default:
              navigate('/dashboard', { replace: true });
          }
        } else {
          navigate('/dashboard', { replace: true });
        }
      } else {
        setError(t('error.login_failed'));
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || t('error.login_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wehealth-container">
      <LanguageSwitcher className="language-switcher" />

      <div className="wehealth-card">
        <div className="login-panel">
          <div className="logo-section">
            <img src="/logo6.png" alt="Final International University" className="brand-logo" />
            <h2 className="brand-name">{t('login.brand_name')}</h2>
          </div>

          <div className="login-form-container">
            <h3 className="form-title">{t('login.title')}</h3>
            <p className="form-subtitle">{t('login.subtitle')}</p>

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
                  placeholder={t('login.email')}
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
                    placeholder={t('login.password')}
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
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  {t('login.remember_me')}
                </label>
                
                <Link to="/forgot-password" className="forgot-password-link">
                  {t('login.forgot_password')}
                </Link>
              </div>

              <button type="submit" disabled={loading} className="login-button">
                {loading && (
                  <span className="spinner"></span>
                )}
                {loading ? t('login.signing_in') : t('login.sign_in')}
              </button>
            </form>
          </div>
        </div>

        <div className="doctor-panel">
          <div className="doctor-section">
            <div className="doctor-image-container">
              <img src="/female-doctor-hospital-with-stethoscope.png" alt="Healthcare Professional" className="doctor-image" />
            </div>
            
            <div className="info-bubble">
              <div className="bubble-icon">
                <i className="fas fa-stethoscope"></i>
              </div>
              <div className="bubble-content">
                <h4>{t('login.connect_doctor')}</h4>
                <p>{t('login.licensed_professionals')}</p>
              </div>
            </div>
          </div>
          
          <div className="signup-section">
            <p>{t('login.no_account')}</p>
            <Link to="/register" className="signup-link">{t('login.create_account')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;