import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { resetPassword } from '../services/auth';
import LanguageSwitcher from '../components/LanguageSwitcher';
import './ForgotPasswordPage.css';

const ResetPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const emailFromUrl = searchParams.get('email'); // ADD THIS

  const [email, setEmail] = useState(emailFromUrl || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Password strength calculation
  const getPasswordStrength = (pwd: string): 'weak' | 'medium' | 'strong' | null => {
    if (!pwd) return null;
    if (pwd.length < 8) return 'weak';
    
    let strength = 0;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;
    
    if (strength <= 1) return 'weak';
    if (strength <= 2) return 'medium';
    return 'strong';
  };

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('error.passwords_dont_match'));
      return;
    }

    if (password.length < 8) {
      setError(t('error.password_too_short'));
      return;
    }

    if (!token || !email) { // UPDATE THIS
      setError(t('error.invalid_reset_token'));
      return;
    }

    setLoading(true);

    try {
      await resetPassword(token, email, password); // UPDATE THIS
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || t('error.password_reset_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wehealth-container">
      <LanguageSwitcher className="language-switcher" />

      <div className="forgot-password-card">
        <div className="forgot-password-content">
          <div className="logo-section">
            <img src="/logo6.png" alt="Final International University" className="brand-logo" />
            <h2 className="brand-name">{t('login.brand_name')}</h2>
          </div>

          {!success ? (
            <>
              <div className="icon-container">
                <i className="fas fa-lock"></i>
              </div>
              
              <h3 className="form-title">{t('reset_password.title')}</h3>
              <p className="form-subtitle">{t('reset_password.subtitle')}</p>

              {error && (
                <div className="error-alert">
                  <i className="fas fa-exclamation-circle"></i>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="forgot-password-form">
                <div className="form-group">
                  <div className="password-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder={t('reset_password.new_password')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
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
                  
                  {password && (
                    <div className="password-strength">
                      <div className={`password-strength-bar ${passwordStrength}`}></div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <div className="password-wrapper">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder={t('reset_password.confirm_password')}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="form-input"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                </div>

                <div className="password-requirements">
                  <p><strong>{t('reset_password.password_requirements')}</strong></p>
                  <ul>
                    <li className={password.length >= 8 ? 'valid' : 'invalid'}>
                      <i className={`fas ${password.length >= 8 ? 'fa-check-circle' : 'fa-circle'}`}></i>
                      {t('reset_password.min_8_characters')}
                    </li>
                    <li className={/[A-Z]/.test(password) ? 'valid' : 'invalid'}>
                      <i className={`fas ${/[A-Z]/.test(password) ? 'fa-check-circle' : 'fa-circle'}`}></i>
                      {t('reset_password.one_uppercase')}
                    </li>
                    <li className={/[0-9]/.test(password) ? 'valid' : 'invalid'}>
                      <i className={`fas ${/[0-9]/.test(password) ? 'fa-check-circle' : 'fa-circle'}`}></i>
                      {t('reset_password.one_number')}
                    </li>
                  </ul>
                </div>

                <button type="submit" disabled={loading} className="submit-button">
                  {loading && <span className="spinner"></span>}
                  {loading ? t('reset_password.resetting') : t('reset_password.reset_password')}
                </button>

                <Link to="/login" className="back-to-login">
                  <i className="fas fa-arrow-left"></i>
                  {t('forgot_password.back_to_login')}
                </Link>
              </form>
            </>
          ) : (
            <div className="success-message">
              <div className="success-icon">
                <i className="fas fa-check-circle"></i>
              </div>
              <h3>{t('reset_password.success_title')}</h3>
              <p>{t('reset_password.success_message')}</p>
              <p className="note">{t('reset_password.redirecting')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;