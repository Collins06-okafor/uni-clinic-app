import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { requestPasswordReset } from '../services/auth';
import LanguageSwitcher from '../components/LanguageSwitcher';
import './ForgotPasswordPage.css';

const ForgotPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await requestPasswordReset(email);
      setSuccess(true);
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
                <i className="fas fa-key"></i>
              </div>
              
              <h3 className="form-title">{t('forgot_password.title')}</h3>
              <p className="form-subtitle">{t('forgot_password.subtitle')}</p>

              {error && (
                <div className="error-alert">
                  <i className="fas fa-exclamation-circle"></i>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="forgot-password-form">
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

                <button type="submit" disabled={loading} className="submit-button">
                  {loading && <span className="spinner"></span>}
                  {loading ? t('forgot_password.sending') : t('forgot_password.send_reset_link')}
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
              <h3>{t('forgot_password.check_email')}</h3>
              <p>{t('forgot_password.reset_link_sent', { email })}</p>
              <p className="note">{t('forgot_password.check_spam')}</p>
              <Link to="/login" className="back-button">
                {t('forgot_password.back_to_login')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;