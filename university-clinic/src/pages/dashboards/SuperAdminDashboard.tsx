import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Settings, Activity, CheckCircle, Clock, Calendar,
  AlertTriangle, Trash2, User, X, Upload, LogOut, UserCog, 
  LayoutGrid, Image as ImageIcon, Globe
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n from "../../services/i18n";
import api from "../../services/api";

// Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// Type Definitions
interface User {
  id: string | number;
  name: string;
  email: string;
  role?: 'doctor' | 'admin' | 'clinical_staff' | 'superadmin';
  status?: 'active' | 'inactive';
  created_at?: string;
}

interface UserForm {
  name: string;
  email: string;
  password: string;
  role: 'doctor' | 'admin' | 'clinical_staff';
}

interface SuperAdminDashboardProps {
  user: User | null;
  onLogout: () => void;
}

interface ApiResponse<T> {
  data: T;
  message?: string;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
    status?: number;
  };
  message?: string;
}

const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ user, onLogout }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState<UserForm>({ 
    name: "", 
    email: "", 
    password: "", 
    role: "doctor" 
  });
  const [message, setMessage] = useState<string>("");
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [loading, setLoading] = useState<boolean>(false);
  const [deletingUserId, setDeletingUserId] = useState<string | number | null>(null);

  // University theme colors
  const universityTheme = {
    primary: '#1e40af',
    secondary: '#059669',
    accent: '#dc2626',
    light: '#e0f2fe',
    gradient: 'linear-gradient(135deg, #af1e1eff 0%, #c33939ff 100%)'
  };

  // Enhanced logout function with translation
  const handleLogout = (): void => {
    if (onLogout) {
      onLogout();
    }
    navigate("/login", { replace: true });
  };

  // Fetch users with translated error messages
  const fetchUsers = async (): Promise<void> => {
    setLoading(true);
    try {
      console.log("Fetching users...");
      const res = await api.get("/superadmin/users");
      const usersData = Array.isArray(res) ? res : (res.data || res);
      setUsers(usersData);
      setMessage("");
      console.log("Users set successfully:", usersData);
    } catch (err) {
      console.log("Fetch users error:", err);
      const error = err as ApiError;
      const errorMsg = error.response?.data?.message || t('admin.failed_fetch_users');
      setMessage(errorMsg);
      setMessageType('error');

      if (error.response?.status === 401 || error.response?.status === 403) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  // Create user with translations
  const createUser = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post<ApiResponse<User>>("/superadmin/users", form);
      setForm({ name: "", email: "", password: "", role: "doctor" });
      setMessage(t('admin.user_created'));
      setMessageType('success');
      fetchUsers();
    } catch (err) {
      const error = err as ApiError;
      setMessage(error.response?.data?.message || t('admin.failed_create_user'));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Delete user with translations
  const deleteUser = async (id: string | number): Promise<void> => {
    if (!window.confirm(t('superadmin.confirm_delete_user'))) return;
    setDeletingUserId(id);
    setLoading(true);
    try {
      await api.delete<ApiResponse<void>>(`/superadmin/users/${id}`);
      setMessage(t('admin.user_deleted'));
      setMessageType('success');
      fetchUsers();
    } catch (err) {
      const error = err as ApiError;
      setMessage(error.response?.data?.message || t('admin.failed_delete_user'));
      setMessageType('error');
    } finally {
      setLoading(false);
      setDeletingUserId(null);
    }
  };

  // Handle form input changes
  const handleFormChange = (field: keyof UserForm, value: string): void => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Get role badge class
  const getRoleBadgeClass = (role?: string): string => {
    switch (role) {
      case 'doctor': return 'bg-success';
      case 'admin': return 'bg-primary';
      case 'clinical_staff': return 'bg-info';
      case 'superadmin': return 'bg-dark';
      default: return 'bg-secondary';
    }
  };

  // Format role display text with translations
  const formatRoleText = (role?: string): string => {
    if (!role) return t('superadmin.unknown');
    switch (role) {
      case 'doctor': return t('admin.doctor');
      case 'admin': return t('admin.admin');
      case 'clinical_staff': return t('superadmin.clinical_staff');
      case 'student': return t('admin.student');
      default: return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  // Format date with translations
  const formatDate = (dateString?: string): string => {
    if (!dateString) return t('superadmin.na');
    try {
      return new Date(dateString).toLocaleDateString(i18n.language);
    } catch {
      return t('superadmin.invalid_date');
    }
  };

  // Change language handler
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="min-vh-100" style={{ backgroundColor: '#f8f9fa', paddingTop: '90px' }}>
      {/* Header with University Branding and Language Support - Updated for White Background */}
      <nav 
  className="navbar navbar-expand-lg navbar-light mb-4" 
  style={{ 
    background: 'white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1030,
    height: '80px',
    borderBottom: '1px solid #e9ecef'
  }}
>
  <div className="container-fluid">
    <div 
      className="navbar-brand d-flex align-items-center"
      style={{
        display: 'flex',
        alignItems: 'center'
      }}
    >
      <img
        src="/logo6.png"
        alt="Final International University"
        style={{
          width: '50px',
          height: '50px',
          borderRadius: '8px',
          objectFit: 'cover',
          marginRight: '15px'
        }}
      />
      <div>
        <div 
          className="fw-bold" 
          style={{ 
            lineHeight: 1,
            color: '#212529', // Dark text for white background
            fontSize: '1.25rem',
            marginBottom: 0
          }}
        >
          Final International University
        </div>
        <small 
          style={{
            color: '#6c757d', // Muted text
            fontSize: '0.875rem'
          }}
        >
          {t('superadmin.portal')}
        </small>
      </div>
    </div>
    
    <div className="d-flex align-items-center gap-3">
      {/* Language Switcher */}
      <div className="dropdown">
        <button 
          className="btn btn-outline-secondary dropdown-toggle" 
          data-bs-toggle="dropdown"
          style={{ 
            borderRadius: '25px',
            borderColor: '#6c757d', // Neutral border for white background
            color: '#495057', // Dark text for visibility
            backgroundColor: 'transparent'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f8f9fa';
            e.currentTarget.style.borderColor = '#6c757d';
            e.currentTarget.style.color = '#212529';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = '#6c757d';
            e.currentTarget.style.color = '#495057';
          }}
          aria-label={t('common.select_language')}
        >
          <Globe size={16} className="me-1" />
          {i18n.language === 'tr' ? 'TR' : 'EN'}
        </button>
        <ul 
          className="dropdown-menu"
          style={{
            border: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            borderRadius: '12px',
            padding: '8px 0'
          }}
        >
          <li>
            <button 
              className="dropdown-item" 
              onClick={() => changeLanguage('en')}
              style={{
                padding: '12px 20px',
                transition: 'background-color 0.2s ease',
                color: '#212529' // Dark text for dropdown items
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              🇺🇸 English
            </button>
          </li>
          <li>
            <button 
              className="dropdown-item" 
              onClick={() => changeLanguage('tr')}
              style={{
                padding: '12px 20px',
                transition: 'background-color 0.2s ease',
                color: '#212529' // Dark text for dropdown items
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              🇹🇷 Türkçe
            </button>
          </li>
        </ul>
      </div>

      {/* User Profile Dropdown */}
      <div className="dropdown">
        <button 
          className="btn btn-light dropdown-toggle d-flex align-items-center" 
          data-bs-toggle="dropdown"
          style={{ 
            borderRadius: '25px',
            border: '2px solid #dee2e6',
            padding: '8px 16px',
            background: '#f8f9fa', // Light background for contrast
            color: '#212529' // Dark text for visibility
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e9ecef';
            e.currentTarget.style.borderColor = '#ced4da';
            e.currentTarget.style.color = '#212529';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f8f9fa';
            e.currentTarget.style.borderColor = '#dee2e6';
            e.currentTarget.style.color = '#212529';
          }}
        >
          <div 
            className="rounded-circle me-2 d-flex align-items-center justify-content-center"
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#dc3545', // Keep brand color for avatar
              color: 'white'
            }}
          >
            <UserCog size={18} />
          </div>
          <span className="fw-semibold" style={{ color: '#212529' }}>
            {user?.name || 'SuperAdmin'}
          </span>
        </button>
        <ul 
          className="dropdown-menu dropdown-menu-end" 
          style={{ 
            minWidth: '280px',
            border: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            borderRadius: '12px',
            padding: '8px 0'
          }}
        >
          {/* User Info Header */}
          <li 
            className="dropdown-header"
            style={{
              padding: '16px 20px 16px 20px',
              backgroundColor: '#f8f9fa',
              borderBottom: '1px solid #e9ecef',
              marginBottom: '8px',
              borderTopLeftRadius: '12px',
              borderTopRightRadius: '12px'
            }}
          >
            <div className="d-flex align-items-center">
              <div 
                className="rounded-circle me-3 d-flex align-items-center justify-content-center"
                style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: '#dc3545', // Keep brand color for avatar
                  color: 'white'
                }}
              >
                <UserCog size={20} />
              </div>
              <div>
                <div className="fw-semibold" style={{ color: '#212529' }}>
                  {user?.name || 'SuperAdmin'}
                </div>
                <small className="text-muted">{user?.email}</small>
                <div>
                  <small className="text-muted">Super Administrator</small>
                </div>
              </div>
            </div>
          </li>
          
          <li><hr className="dropdown-divider" style={{ margin: '8px 0' }} /></li>
          
          {/* Logout */}
          <li>
            <button 
              className="dropdown-item d-flex align-items-center text-danger" 
              onClick={handleLogout}
              style={{
                padding: '12px 20px',
                transition: 'background-color 0.2s ease',
                color: '#dc3545' // Red color for logout
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <LogOut size={16} className="me-3" />
              {t('admin.logout')}
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</nav>

      <div className="container-fluid px-4">
        {/* Welcome Section */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card shadow-sm border-0" style={{ borderRadius: '1rem', background: universityTheme.gradient }}>
              <div className="card-body p-4 text-white">
                <div className="row align-items-center">
                  <div className="col-md-8">
                    <h2 className="mb-2">{t('superadmin.dashboard')}</h2>
                    <p className="mb-1 opacity-90">{t('superadmin.welcome_back', { name: user?.name || 'SuperAdmin' })}</p>
                    <p className="mb-0 opacity-75">{t('superadmin.manage_users')}</p>
                  </div>
                  <div className="col-md-4 text-end">
                    <div className="d-inline-flex align-items-center justify-content-center" 
                         style={{ width: '80px', height: '80px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '50%' }}>
                      <UserCog size={40} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Alert Messages */}
        {message && (
          <div className="row mb-4">
            <div className="col-12">
              <div className={`alert alert-${messageType === 'success' ? 'success' : 'danger'} alert-dismissible`} style={{ borderRadius: '1rem' }}>
                {message}
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setMessage("")}
                  aria-label={t('common.close')}
                ></button>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Cards with translations */}
        <div className="row g-4 mb-4">
          <div className="col-md-3 col-sm-6">
            <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1rem' }}>
              <div className="card-body p-4 text-center">
                <div className="d-inline-flex align-items-center justify-content-center mb-3" 
                     style={{ width: '60px', height: '60px', backgroundColor: universityTheme.light, borderRadius: '50%' }}>
                  <Users size={30} color={universityTheme.primary} />
                </div>
                <h4 className="fw-bold mb-1" style={{ color: universityTheme.primary }}>{users?.length || 0}</h4>
                <p className="text-muted mb-0">{t('admin.total_users')}</p>
              </div>
            </div>
          </div>

          <div className="col-md-3 col-sm-6">
            <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1rem' }}>
              <div className="card-body p-4 text-center">
                <div className="d-inline-flex align-items-center justify-content-center mb-3" 
                     style={{ width: '60px', height: '60px', backgroundColor: '#dcfdf7', borderRadius: '50%' }}>
                  <Activity size={30} color={universityTheme.secondary} />
                </div>
                <h4 className="fw-bold mb-1" style={{ color: universityTheme.secondary }}>
                  {users?.filter(u => u.role === 'doctor').length || 0}
                </h4>
                <p className="text-muted mb-0">{t('superadmin.doctors')}</p>
              </div>
            </div>
          </div>

          <div className="col-md-3 col-sm-6">
            <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1rem' }}>
              <div className="card-body p-4 text-center">
                <div className="d-inline-flex align-items-center justify-content-center mb-3" 
                     style={{ width: '60px', height: '60px', backgroundColor: '#fef3c7', borderRadius: '50%' }}>
                  <Settings size={30} color="#d97706" />
                </div>
                <h4 className="fw-bold mb-1" style={{ color: '#d97706' }}>
                  {users?.filter(u => u.role === 'admin').length || 0}
                </h4>
                <p className="text-muted mb-0">{t('superadmin.admins')}</p>
              </div>
            </div>
          </div>

          <div className="col-md-3 col-sm-6">
            <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1rem' }}>
              <div className="card-body p-4 text-center">
                <div className="d-inline-flex align-items-center justify-content-center mb-3" 
                     style={{ width: '60px', height: '60px', backgroundColor: '#fee2e2', borderRadius: '50%' }}>
                  <User size={30} color={universityTheme.accent} />
                </div>
                <h4 className="fw-bold mb-1" style={{ color: universityTheme.accent }}>
                  {users?.filter(u => u.role === 'clinical_staff').length || 0}
                </h4>
                <p className="text-muted mb-0">{t('superadmin.clinical_staff')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Create User Form with translations */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
              <div className="card-header border-0" style={{ background: universityTheme.gradient, borderRadius: '1rem 1rem 0 0' }}>
                <h5 className="card-title mb-0 text-white d-flex align-items-center">
                  <User className="me-2" size={20} />
                  {t('superadmin.create_new_user')}
                </h5>
              </div>
              <div className="card-body p-4">
                <form onSubmit={createUser}>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        {t('superadmin.name')} <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder={t('superadmin.enter_full_name')}
                        value={form.name}
                        onChange={(e) => handleFormChange('name', e.target.value)}
                        required
                        disabled={loading}
                        style={{ borderRadius: '0.5rem' }}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        {t('superadmin.email')} <span className="text-danger">*</span>
                      </label>
                      <input
                        type="email"
                        className="form-control"
                        placeholder={t('superadmin.enter_email')}
                        value={form.email}
                        onChange={(e) => handleFormChange('email', e.target.value)}
                        required
                        disabled={loading}
                        style={{ borderRadius: '0.5rem' }}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        {t('superadmin.password')} <span className="text-danger">*</span>
                      </label>
                      <input
                        type="password"
                        className="form-control"
                        placeholder={t('superadmin.enter_password')}
                        value={form.password}
                        onChange={(e) => handleFormChange('password', e.target.value)}
                        minLength={6}
                        required
                        disabled={loading}
                        style={{ borderRadius: '0.5rem' }}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        {t('superadmin.role')} <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        value={form.role}
                        onChange={(e) => handleFormChange('role', e.target.value as UserForm['role'])}
                        disabled={loading}
                        style={{ borderRadius: '0.5rem' }}
                      >
                        <option value="doctor">{t('admin.doctor')}</option>
                        <option value="admin">{t('admin.admin')}</option>
                        <option value="clinical_staff">{t('superadmin.clinical_staff')}</option>
                      </select>
                    </div>
                  </div>
                  <div className="row mt-4">
                    <div className="col-12">
                      <button
                        type="submit"
                        className="btn btn-primary px-4 py-2"
                        disabled={loading || !form.name.trim() || !form.email.trim() || !form.password.trim()}
                        style={{ 
                          background: universityTheme.gradient,
                          border: 'none',
                          borderRadius: '0.5rem'
                        }}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            {t('superadmin.creating')}
                          </>
                        ) : (
                          t('superadmin.create_user')
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table with translations */}
        <div className="row">
          <div className="col-12">
            <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
              <div className="card-header border-0" style={{ background: universityTheme.gradient, borderRadius: '1rem 1rem 0 0' }}>
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0 text-white d-flex align-items-center">
                    <Users className="me-2" size={20} />
                    {t('superadmin.system_users')}
                  </h5>
                  <small className="text-white opacity-75">
                    {t('admin.total', { count: users?.length || 0 })}
                  </small>
                </div>
              </div>
              <div className="card-body p-4">
                {loading && users.length === 0 ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary mb-3" role="status">
                      <span className="visually-hidden">{t('admin.loading')}</span>
                    </div>
                    <p className="text-muted">{t('superadmin.loading_users')}</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th scope="col" className="fw-semibold">{t('superadmin.id')}</th>
                          <th scope="col" className="fw-semibold">{t('superadmin.name')}</th>
                          <th scope="col" className="fw-semibold">{t('superadmin.email')}</th>
                          <th scope="col" className="fw-semibold">{t('superadmin.role')}</th>
                          <th scope="col" className="fw-semibold">{t('admin.status')}</th>
                          <th scope="col" className="fw-semibold">{t('superadmin.created')}</th>
                          <th scope="col" className="fw-semibold">{t('superadmin.actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!users || users.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-5 text-muted">
                              <Users size={48} className="mb-3 opacity-50" />
                              <div>{t('superadmin.no_users_found')}</div>
                            </td>
                          </tr>
                        ) : (
                          (users || []).map((u: User) => (
                            <tr key={u.id}>
                              <td>
                                <code className="text-muted small bg-light px-2 py-1 rounded">{u.id}</code>
                              </td>
                              <td>
                                <div className="fw-semibold">{u.name}</div>
                              </td>
                              <td>
                                <div className="text-muted">{u.email}</div>
                              </td>
                              <td>
                                <span className={`badge ${getRoleBadgeClass(u.role)}`}>
                                  {formatRoleText(u.role)}
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${u.status === 'active' ? 'bg-success' : 'bg-warning text-dark'}`}>
                                  {u.status === 'active' ? t('admin.active') : (u.status || t('superadmin.unknown'))}
                                </span>
                              </td>
                              <td>
                                <small className="text-muted">{formatDate(u.created_at)}</small>
                              </td>
                              <td>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => deleteUser(u.id)}
                                  disabled={deletingUserId === u.id}
                                  title={t('superadmin.delete_user', { name: u.name })}
                                  style={{ borderRadius: '0.5rem' }}
                                >
                                  {deletingUserId === u.id ? (
                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                  ) : (
                                    <Trash2 size={16} />
                                  )}
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;