// src/pages/dashboards/AdminDashboard.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  Users, Settings, Activity, CheckCircle, Clock, Calendar,
  AlertTriangle, Trash2, User, X, Upload, LogOut, UserCog, LayoutGrid, Globe, Image as ImageIcon
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n from '../../services/i18n';
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";


// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const ADMIN_API_BASE = `${API_BASE_URL}/api/admin`;
const PROFILE_API_BASE = `${API_BASE_URL}/api`;
const PROFILE_ENDPOINT = '/profile';

// Type definitions
interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  avatar_url?: string;
  role: string;
  status: string;
  phone?: string;
  department?: string;
  bio?: string;
}

interface DashboardData {
  admin?: {
    last_login: string;
  };
  system_overview?: {
    total_users: number;
    active_users: number;
    new_registrations_today: number;
    pending_verifications: number;
  };
}

interface SystemSettings {
  general?: {
    site_name: string;
    default_language: string;
    site_description: string;
    timezone: string;
    maintenance_mode: boolean;
    registration_enabled: boolean;
    email_verification_required: boolean;
  };
  authentication?: {
    password_min_length: number;
    password_require_uppercase: boolean;
    password_require_lowercase: boolean;
    password_require_numbers: boolean;
    password_require_symbols: boolean;
    two_factor_enabled: boolean;
    session_timeout: number;
    max_login_attempts: number;
    lockout_duration: number;
  };
  email?: {
    smtp_host: string;
    smtp_port: number;
    smtp_encryption: string;
    from_address: string;
    from_name: string;
    smtp_username: string;
    smtp_password: string;
  };
}

interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AdminDashboardProps {
  user: User | null;
  onLogout: () => void;
  apiBaseUrl?: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  onLogout,
  apiBaseUrl = ADMIN_API_BASE
}) => {

  const { t } = useTranslation();

  // Handle null user case - provide default values
  const currentUser = user || { 
  id: '', 
  name: 'Admin User', 
  email: 'admin@university.edu', 
  role: 'admin', 
  status: 'active' 
};


  // ---- Tabs ----
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'users' | 'config'>('dashboard');

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ---- Settings (UI draft state) ----
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<SystemSettings | null>(null);
  const [settingsSaving, setSettingsSaving] = useState<boolean>(false);

  // safely read nested keys
  const g = (obj: any, path: string, def: any = '') =>
    path.split('.').reduce((a, k) => (a && a[k] !== undefined ? a[k] : def), obj);

  // set nested value immutably: path like "general.site_name"
  const setPath = (obj: any, path: string, value: any) => {
    const keys = path.split('.');
    const clone = structuredClone(obj ?? {});
    let cur = clone;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (typeof cur[k] !== 'object' || cur[k] === null) cur[k] = {};
      cur = cur[k];
    }
    cur[keys[keys.length - 1]] = value;
    return clone;
  };

  const onField = (path: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { type, value, checked } = e.target as HTMLInputElement;
    let v: any = value;
    if (type === 'checkbox') v = checked;
    if (type === 'number') v = value === '' ? '' : Number(value);
    setSettingsDraft((prev) => setPath(prev, path, v));
  };

  // hydrate editable draft when settings load
  useEffect(() => {
    if (systemSettings) setSettingsDraft(structuredClone(systemSettings));
  }, [systemSettings]);

  // ---- Notifications ----
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const addNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
  const id = Date.now() + Math.random();
  setNotifications(prev => [...prev, { id, message, type }]);
  setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
};
  const removeNotification = (id: number) => setNotifications(prev => prev.filter(n => n.id !== id));

  const NotificationToast: React.FC<{ notification: Notification }> = ({ notification }) => {
    const styleByType = (t: string) => t === 'error'
      ? { backgroundColor: '#f8d7da', borderColor: '#f5c6cb', color: '#721c24' }
      : t === 'info'
      ? { backgroundColor: '#d1ecf1', borderColor: '#bee5eb', color: '#0c5460' }
      : { backgroundColor: '#d4edda', borderColor: '#c3e6cb', color: '#155724' };
    const s = styleByType(notification.type);
    return (
      <div className="alert d-flex align-items-center justify-content-between rounded-3 mb-2"
           style={{ ...s, border: `1px solid ${s.borderColor}` }}>
        <span>{notification.message}</span>
        <button className="btn btn-sm" onClick={() => removeNotification(notification.id)}>
          <X size={14} />
        </button>
      </div>
    );
  };

  // ---- Auth-aware fetch helper ----
  const fetchJson = async (url: string, opts: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const baseHeaders = {
      Accept: 'application/json',
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    const res = await fetch(url, {
      ...opts,
      headers: baseHeaders,
      credentials: 'omit',
    });

    const text = await res.text().catch(() => '');
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch {}

    if (!res.ok) {
      const detail = data?.message || data?.error || text || res.statusText;
      const err = new Error(`${res.status} ${res.statusText} – ${detail}`);
      (err as any).status = res.status;
      (err as any).body = data || text;
      throw err;
    }
    return data;
  };

  // ---- Dashboard data ----
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const fetchDashboard = async () => {
    try {
      const data = await fetchJson(`${apiBaseUrl}/dashboard`);
      setDashboardData(data);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      addNotification((error as Error).message || 'Failed to load dashboard data', 'error');
      setDashboardData(null);
    }
  };

  // ---- Users list ----
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalUsers, setTotalUsers] = useState<number>(0);

  const fetchUsers = async (page: number = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: '20',
        ...(selectedRole !== 'all' && { role: selectedRole }),
        ...(selectedStatus !== 'all' && { status: selectedStatus }),
        ...(searchTerm ? { q: searchTerm } : {}),
      });
      const data = await fetchJson(`${apiBaseUrl}/users?${params.toString()}`);
      setUsers(data.users || []);
      setTotalPages(data.pagination?.last_page || 1);
      setTotalUsers(data.pagination?.total || 0);
      setCurrentPage(page);
    } catch (error) {
      console.error('Users fetch error:', error);
      addNotification((error as Error).message || 'Failed to load users', 'error');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string, reason: string) => {
    try {
      await fetchJson(`${apiBaseUrl}/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, confirm_deletion: true }),
      });
      addNotification('User deleted successfully', 'success');
      await fetchUsers(currentPage);
    } catch (error) {
      console.error('Delete user error:', error);
      addNotification((error as Error).message || 'Failed to delete user', 'error');
    }
  };

  const updateUserStatus = async (userId: string, status: string, reason: string = '') => {
    try {
      await fetchJson(`${apiBaseUrl}/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason, notify_user: true }),
      });
      addNotification('User status updated successfully', 'success');
      await fetchUsers(currentPage);
    } catch (error) {
      console.error('Update status error:', error);
      addNotification((error as Error).message || 'Failed to update user status', 'error');
    }
  };

  // ---- Settings ----
  const fetchSettings = async () => {
    try {
      const data = await fetchJson(`${apiBaseUrl}/settings`);
      setSystemSettings(data);
    } catch (error) {
      console.error('Settings fetch error:', error);
      addNotification((error as Error).message || 'Failed to load system settings', 'error');
    }
  };
  
  const updateSettings = async (settings: SystemSettings) => {
    try {
      await fetchJson(`${apiBaseUrl}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      addNotification('Settings updated successfully!', 'success');
      await fetchSettings();
    } catch (error) {
      console.error('Settings update error:', error);
      addNotification((error as Error).message || 'Failed to update settings', 'error');
    }
  };

  // ---- Profile ----
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Partial<User>>({
    name: currentUser.name || '',
    email: currentUser.email || '',
    phone: '',
    department: '',
    bio: '',
  });
  const [profileAvatar, setProfileAvatar] = useState<string | null>(currentUser.avatar || null);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);
  const [profileSaving, setProfileSaving] = useState<boolean>(false);

  const getProfile = async () => {
    setProfileLoading(true);
    try {
      const data = await fetchJson(`${PROFILE_API_BASE}${PROFILE_ENDPOINT}`);
      setProfile({
        name: data?.name ?? '',
        email: data?.email ?? '',
        phone: data?.phone ?? '',
        department: data?.department ?? '',
        bio: data?.bio ?? '',
      });
      if (data?.avatar_url) setProfileAvatar(data.avatar_url);
    } catch (error) {
      console.error('Profile fetch error:', error);
      addNotification((error as Error).message || 'Failed to load profile', 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  const saveProfile = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    setProfileSaving(true);
    try {
      await fetchJson(`${PROFILE_API_BASE}${PROFILE_ENDPOINT}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      addNotification('Profile updated successfully!', 'success');
    } catch (error) {
      console.error('Profile save error:', error);
      addNotification((error as Error).message || 'Failed to update profile', 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePhotoUpload = async (file: File | null) => {
  if (!file) return;
  
  // Validation
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (!allowedTypes.includes(file.type)) {
    addNotification('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.', 'error');
    return;
  }
  
  if (file.size > maxSize) {
    addNotification('File size must be less than 5MB. Please choose a smaller image.', 'error');
    return;
  }
  
  const formData = new FormData();
  formData.append('avatar', file);
  
  try {
    const data = await fetchJson(`${PROFILE_API_BASE}${PROFILE_ENDPOINT}/avatar`, {
      method: 'POST',
      body: formData,
    });
    setProfileAvatar(data.avatar_url);
    addNotification('Profile photo updated successfully!', 'success');
  } catch (error) {
    console.error('Photo upload error:', error);
    addNotification((error as Error).message || 'Failed to upload photo', 'error');
  } finally {
    if (fileInputRef.current) fileInputRef.current.value = '';
  }
};

  const handlePhotoRemove = async () => {
    try {
      await fetchJson(`${PROFILE_API_BASE}${PROFILE_ENDPOINT}/avatar`, { method: 'DELETE' });
      setProfileAvatar(null);
      addNotification('Profile photo removed successfully!', 'success');
    } catch (error) {
      console.error('Photo removal error:', error);
      addNotification((error as Error).message || 'Failed to remove photo', 'error');
    }
  };

  // ---- Effects ----
  useEffect(() => {
    if (activeTab === 'dashboard') fetchDashboard();
    if (activeTab === 'users') fetchUsers(1);
    if (activeTab === 'config') fetchSettings();
    if (activeTab === 'profile') getProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRole, selectedStatus, searchTerm]);

  // ---- Small UI helpers ----
  const ProfileAvatar: React.FC<{ size?: number; className?: string }> = ({ size = 88, className = "" }) => {
    if (profileAvatar) {
      return (
        <img
          src={profileAvatar}
          alt="avatar"
          className={`rounded-circle ${className}`}
          style={{ width: size, height: size, objectFit: 'cover' }}
        />
      );
    }
    return (
        <div
          className={`rounded-circle d-flex align-items-center justify-content-center ${className}`}
          style={{ width: size, height: size, backgroundColor: '#fef2f2', color: '#e53e3e' }}
        >
          <User size={size * 0.5} />
        </div>
    );
  };

  interface StatCardProps {
    title: string;
    value: number | string;
    icon: React.ComponentType<any>;
    color: string;
    subtitle?: string;
    bgColor?: string;
  }

  
const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, subtitle, bgColor }) => (
  <div className="bg-white rounded-4 shadow-sm p-4 h-100 border-0">
    <div className="text-center">
      <div className="d-inline-flex align-items-center justify-content-center mb-3"
           style={{ width: 64, height: 64 }}>
        <Icon size={32} style={{ color }} />
      </div>
      <h2 className="fw-bold mb-2" style={{ color, fontSize: '2.5rem' }}>{value ?? '—'}</h2>
      <p className="text-muted fw-medium mb-0">{title}</p>
      {subtitle && <p className="text-muted small mt-1">{subtitle}</p>}
    </div>
  </div>
);

// Professional Sidebar Component for Admin
const Sidebar = () => {
  const menuItems = [
    { 
      id: 'dashboard', 
      icon: LayoutGrid, 
      label: t('admin.dashboard', 'Dashboard'),
    },
    { 
      id: 'users', 
      icon: Users, 
      label: t('admin.user_management', 'User Management'),
    },
    { 
      id: 'config', 
      icon: Settings, 
      label: t('admin.system_config', 'System Config'),
    },
    { 
      id: 'profile', 
      icon: UserCog, 
      label: t('admin.profile', 'Profile'),
    },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && window.innerWidth < 768 && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 1040,
            backdropFilter: 'blur(2px)',
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: window.innerWidth < 768 ? (sidebarOpen ? 0 : '-300px') : 0,
          bottom: 0,
          width: sidebarCollapsed && window.innerWidth >= 768 ? '85px' : '280px',
          background: '#1a1d29',
          boxShadow: '4px 0 24px rgba(0, 0, 0, 0.12)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 1050,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: sidebarCollapsed && window.innerWidth >= 768 ? '24px 16px' : '24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #1e2230 0%, #1a1d29 100%)',
            minHeight: '80px',
          }}
        >
          {!(sidebarCollapsed && window.innerWidth >= 768) ? (
            <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '14px',
                  boxShadow: '0 4px 12px rgba(220, 53, 69, 0.3)',
                  overflow: 'hidden',
                }}
              >
                <img
                  src="/logo6.png"
                  alt="FIU Logo"
                  style={{
                    width: '32px',
                    height: '32px',
                    objectFit: 'cover',
                  }}
                />
              </div>
              <div>
                <h6 style={{ color: '#ffffff', margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                  FIU Admin
                </h6>
                <small style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem', fontWeight: 500 }}>
                  Admin Portal
                </small>
              </div>
            </div>
          ) : (
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(220, 53, 69, 0.3)',
                margin: '0 auto',
              }}
            >
              <img src="/logo6.png" alt="FIU Logo" style={{ width: '32px', height: '32px', objectFit: 'cover' }} />
            </div>
          )}

          {window.innerWidth >= 768 && (
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{
                background: 'linear-gradient(135deg, rgba(220, 53, 69, 0.15) 0%, rgba(200, 35, 51, 0.15) 100%)',
                border: '1px solid rgba(220, 53, 69, 0.3)',
                borderRadius: '10px',
                width: '36px',
                height: '36px',
                color: '#dc3545',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                fontSize: '0.9rem',
                fontWeight: 700,
                boxShadow: '0 2px 8px rgba(220, 53, 69, 0.2)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(220, 53, 69, 0.25) 0%, rgba(200, 35, 51, 0.25) 100%)';
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(220, 53, 69, 0.15) 0%, rgba(200, 35, 51, 0.15) 100%)';
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(220, 53, 69, 0.2)';
              }}
            >
              {sidebarCollapsed ? '»' : '«'}
            </button>
          )}
        </div>

        {/* Menu */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: sidebarCollapsed && window.innerWidth >= 768 ? '16px 8px' : '20px 16px' }}>
          {!(sidebarCollapsed && window.innerWidth >= 768) && (
            <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', paddingLeft: '12px' }}>
              Main Menu
            </div>
          )}

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  if (window.innerWidth < 768) setSidebarOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: sidebarCollapsed && window.innerWidth >= 768 ? 'center' : 'space-between',
                  padding: sidebarCollapsed && window.innerWidth >= 768 ? '14px' : '14px 16px',
                  marginBottom: '6px',
                  background: isActive ? 'linear-gradient(135deg, rgba(220, 53, 69, 0.15) 0%, rgba(200, 35, 51, 0.15) 100%)' : 'transparent',
                  border: isActive ? '1px solid rgba(220, 53, 69, 0.3)' : '1px solid transparent',
                  borderRadius: '10px',
                  color: isActive ? '#dc3545' : 'rgba(255, 255, 255, 0.75)',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  fontSize: '0.95rem',
                  fontWeight: isActive ? 600 : 500,
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Icon size={20} />
                  {!(sidebarCollapsed && window.innerWidth >= 768) && (
                    <span style={{ marginLeft: '14px' }}>{item.label}</span>
                  )}
                </div>
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '4px',
                      height: '60%',
                      background: 'linear-gradient(180deg, #dc3545 0%, #c82333 100%)',
                      borderRadius: '0 4px 4px 0',
                    }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile */}
        <div
          style={{
            padding: sidebarCollapsed && window.innerWidth >= 768 ? '16px 12px' : '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.2) 100%)',
          }}
        >
          {!(sidebarCollapsed && window.innerWidth >= 768) ? (
            <div className="dropdown dropup w-100">
              <button
                className="btn w-100 text-start"
                data-bs-toggle="dropdown"
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '12px',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                  }}
                >
                  {currentUser?.name?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                    {currentUser?.name || 'Admin'}
                  </div>
                  <small style={{ opacity: 0.7, fontSize: '0.75rem' }}>Administrator</small>
                </div>
                <Settings size={18} style={{ opacity: 0.6 }} />
              </button>

              <ul className="dropdown-menu dropdown-menu-end">
                <li><h6 className="dropdown-header">Language</h6></li>
                <li>
                  <button className="dropdown-item" onClick={() => i18n.changeLanguage('en')}>
                    <Globe size={16} className="me-2" />
                    🇺🇸 English
                  </button>
                </li>
                <li>
                  <button className="dropdown-item" onClick={() => i18n.changeLanguage('tr')}>
                    <Globe size={16} className="me-2" />
                    🇹🇷 Türkçe
                  </button>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <button className="dropdown-item text-danger" onClick={onLogout}>
                    <LogOut size={16} className="me-2" />
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          ) : (
            <button
              onClick={onLogout}
              style={{
                width: '100%',
                background: 'rgba(220, 53, 69, 0.15)',
                border: '1px solid rgba(220, 53, 69, 0.3)',
                color: '#dc3545',
                padding: '12px',
                borderRadius: '10px',
                cursor: 'pointer',
              }}
            >
              <LogOut size={20} />
            </button>
          )}
        </div>
      </div>
    </>
  );
};

  // ---- Renders ----
  const renderTopBar = () => (
  <div 
    className="border-bottom"
    style={{
      background: 'white',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1030,
      height: '80px'
    }}
  >
    <div className="container-fluid d-flex align-items-center justify-content-between h-100 px-4">
      {/* Your existing navbar content - no changes needed here */}
      {/* Brand / Logo */}
      <div 
        className="d-flex align-items-center gap-3"
        style={{
          display: 'flex',
          alignItems: 'center',
          minWidth: '280px'
        }}
      >
        <img
          src="/logo6.png"
          alt="Final International University"
          style={{ 
            width: 50, 
            height: 50, 
            objectFit: 'contain', 
            borderRadius: 8 
          }}
        />
        <div className="d-none d-md-block">
          <div 
            className="fw-bold" 
            style={{ 
              lineHeight: 1, 
              color: '#212529',
              fontSize: '1.25rem',
              marginBottom: 2
            }}
          >
            Final International University
          </div>
          <small 
            className="text-muted"
            style={{
              color: '#6c757d',
              fontSize: '0.875rem'
            }}
          >
            {t('admin.medical_appointments')}
          </small>
        </div>
      </div>

      {/* Tabs - Better spacing and responsive design */}
      <div className="d-flex gap-3 flex-wrap justify-content-center" style={{ flex: '1 1 auto', padding: '0 20px' }}>
        <button
          className={`btn ${activeTab === 'dashboard' ? 'btn-danger' : 'btn-outline-danger'}`}
          onClick={() => setActiveTab('dashboard')}
          style={{
            borderRadius: '8px',
            border: 'none',
            color: activeTab === 'dashboard' ? '#dc3545' : '#666',
            backgroundColor: activeTab === 'dashboard' ? 'rgba(220, 53, 69, 0.1)' : 'none',
            padding: '10px 16px', // Increased padding
            fontWeight: 600,
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            minWidth: '120px', // Ensure consistent button width
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            if (activeTab !== 'dashboard') {
              e.currentTarget.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
              e.currentTarget.style.color = '#dc3545';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== 'dashboard') {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#dc3545';
            }
          }}
        >
          <LayoutGrid size={16} /> 
          <span className="d-none d-sm-inline">{t('admin.dashboard')}</span>
        </button>
        
        <button
          className={`btn ${activeTab === 'profile' ? 'btn-danger' : 'btn-outline-danger'}`}
          onClick={() => setActiveTab('profile')}
          style={{
            borderRadius: '8px',
            border: 'none',
            color: activeTab === 'profile' ? '#dc3545' : '#666',
            backgroundColor: activeTab === 'profile' ? 'rgba(220, 53, 69, 0.1)' : 'none',
            padding: '10px 16px',
            fontWeight: 600,
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            minWidth: '120px',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            if (activeTab !== 'profile') {
              e.currentTarget.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
              e.currentTarget.style.color = '#dc3545';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== 'profile') {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#dc3545';
            }
          }}
        >
          <UserCog size={16} /> 
          <span className="d-none d-sm-inline">{t('admin.profile')}</span>
        </button>
        
        <button
          className={`btn ${activeTab === 'users' ? 'btn-danger' : 'btn-outline-danger'}`}
          onClick={() => setActiveTab('users')}
          style={{
            borderRadius: '8px',
            border: 'none',
            color: activeTab === 'users' ? '#dc3545' : '#666',
            backgroundColor: activeTab === 'users' ? 'rgba(220, 53, 69, 0.1)' : 'none',
            padding: '10px 16px',
            fontWeight: 600,
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            minWidth: '120px',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            if (activeTab !== 'users') {
              e.currentTarget.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
              e.currentTarget.style.color = '#dc3545';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== 'users') {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#dc3545';
            }
          }}
        >
          <Users size={16} /> 
          <span className="d-none d-sm-inline">{t('admin.user_management')}</span>
        </button>
        
        <button
          className={`btn ${activeTab === 'config' ? 'btn-danger' : 'btn-outline-danger'}`}
          onClick={() => setActiveTab('config')}
          style={{
            borderRadius: '8px',
            border: 'none',
            color: activeTab === 'config' ? '#dc3545' : '#666',
            backgroundColor: activeTab === 'config' ? 'rgba(220, 53, 69, 0.1)' : 'none',
            padding: '10px 16px',
            fontWeight: 600,
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            minWidth: '120px',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            if (activeTab !== 'config') {
              e.currentTarget.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
              e.currentTarget.style.color = '#dc3545';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== 'config') {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#dc3545';
            }
          }}
        >
          <Settings size={16} /> 
          <span className="d-none d-sm-inline">{t('admin.system_config')}</span>
        </button>
      </div>

      {/* Language Switcher and User Dropdown - Better spacing */}
      <div className="d-flex align-items-center gap-3" style={{ minWidth: '200px', justifyContent: 'flex-end' }}>
        {/* User Profile Dropdown - Language moved inside */}
  <div className="dropdown">
    <button 
      className="btn btn-light dropdown-toggle d-flex align-items-center" 
      data-bs-toggle="dropdown"
      style={{ 
        borderRadius: '25px',
        border: '2px solid #dee2e6',
        padding: '8px 16px',
        background: '#f8f9fa',
        color: '#212529'
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
          backgroundColor: '#dc3545',
          color: 'white'
        }}
      >
        {profileAvatar ? (
          <img 
            src={profileAvatar}
            alt="Profile" 
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              objectFit: 'cover'
            }}
          />
        ) : (
          <User size={18} />
        )}
      </div>
      {/* Removed name display */}
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
              backgroundColor: '#dc3545',
              color: 'white'
            }}
          >
            {profileAvatar ? (
              <img 
                src={profileAvatar}
                alt="Profile" 
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  objectFit: 'cover'
                }}
              />
            ) : (
              <User size={20} />
            )}
          </div>
          <div>
            <div className="fw-semibold" style={{ color: '#212529' }}>
              {profile.name || currentUser.name}
            </div>
            <small className="text-muted">{profile.email || currentUser.email}</small>
            <div>
              <small className="text-muted">Administrator</small>
            </div>
          </div>
        </div>
      </li>
      
      {/* Language Selection */}
      <li>
        <h6 className="dropdown-header" style={{ padding: '12px 20px 8px 20px', margin: 0, color: '#6c757d', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Language
        </h6>
      </li>
      <li>
        <button 
          className="dropdown-item d-flex align-items-center"
          style={{
            padding: '12px 20px',
            transition: 'background-color 0.2s ease',
            color: '#212529'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          onClick={() => i18n.changeLanguage('en')}
        >
          <Globe size={16} className="me-3" />
          <div className="flex-grow-1 d-flex justify-content-between align-items-center">
            <span>🇺🇸 English</span>
            {i18n.language === 'en' && (
              <CheckCircle size={16} className="text-success" />
            )}
          </div>
        </button>
      </li>
      <li>
        <button 
          className="dropdown-item d-flex align-items-center"
          style={{
            padding: '12px 20px',
            transition: 'background-color 0.2s ease',
            color: '#212529'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          onClick={() => i18n.changeLanguage('tr')}
        >
          <Globe size={16} className="me-3" />
          <div className="flex-grow-1 d-flex justify-content-between align-items-center">
            <span>🇹🇷 Türkçe</span>
            {i18n.language === 'tr' && (
              <CheckCircle size={16} className="text-success" />
            )}
          </div>
        </button>
      </li>
      
      <li><hr className="dropdown-divider" style={{ margin: '8px 0' }} /></li>
      
      {/* Profile Link */}
      <li>
        <button 
          className="dropdown-item d-flex align-items-center"
          style={{
            padding: '12px 20px',
            transition: 'background-color 0.2s ease',
            color: '#212529'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          onClick={() => setActiveTab('profile')}
        >
          <UserCog size={16} className="me-3" />
          <div className="flex-grow-1">
            {t('admin.profile')}
          </div>
        </button>
      </li>
      
      <li><hr className="dropdown-divider" style={{ margin: '8px 0' }} /></li>
      
      {/* Logout */}
      <li>
        <button 
          className="dropdown-item d-flex align-items-center text-danger" 
          onClick={() => {
            try { localStorage.removeItem('token'); } catch {}
            onLogout ? onLogout() : window.location.assign('/');
          }}
          style={{
            padding: '12px 20px',
            transition: 'background-color 0.2s ease',
            color: '#dc3545'
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
  </div>
);

  const renderDashboard = () => (
  <div className="container-fluid px-4 py-4" style={{ backgroundColor: '#f8fafc' }}>
    <div className="row g-4">
      {/* Welcome Card */}
      <div className="col-12">
        <div className="rounded-4 shadow-sm p-5 text-white position-relative overflow-hidden"
             style={{ background: 'linear-gradient(135deg, #e53e3e 0%, #c53030 100%)' }}>
          <div className="row align-items-center">
            <div className="col-md-8">
              <h1 className="fw-bold mb-3">{t('admin.welcome_back')}</h1>
              <p className="mb-2 opacity-90 fs-5">{t('admin.medical_appointments')}</p>
              <p className="mb-0 opacity-75">{t('admin.monitor_system')}</p>
              {dashboardData?.admin?.last_login && (
                <p className="mb-0 opacity-75 mt-2">
                  {t('admin.last_login', { date: new Date(dashboardData.admin.last_login).toLocaleString() })}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards with translations */}
      <div className="col-12"><h4 className="fw-bold mb-3">{t('admin.system_overview')}</h4></div>
      <div className="col-lg-3 col-md-6">
        <StatCard 
          title={t('admin.total_users')} 
          value={dashboardData?.system_overview?.total_users || 0} 
          icon={Users} 
          color="#e53e3e" 
          subtitle={t('admin.all_registered')} 
        />
      </div>
      <div className="col-lg-3 col-md-6">
        <StatCard 
          title={t('admin.active_users')} 
          value={dashboardData?.system_overview?.active_users || 0} 
          icon={Activity} 
          color="#38a169" 
          subtitle={t('admin.currently_active')} 
        />
      </div>
      <div className="col-lg-3 col-md-6">
        <StatCard 
          title={t('admin.new_registrations_today')} 
          value={dashboardData?.system_overview?.new_registrations_today || 0} 
          icon={CheckCircle} 
          color="#3182ce" 
          subtitle={t('admin.todays_signups')} 
        />
      </div>
      <div className="col-lg-3 col-md-6">
        <StatCard 
          title={t('admin.pending_verifications')} 
          value={dashboardData?.system_overview?.pending_verifications || 0} 
          icon={Clock} 
          color="#d69e2e" 
          subtitle={t('admin.awaiting_verification')} 
        />
      </div>
    </div>
  </div>
);

const renderProfile = () => (
  <div className="container py-4">
    <div className="row g-4">
      {/* Personal Information */}
      <div className="col-lg-8">
        <div className="rounded-4 shadow-sm bg-white">
          <div className="px-4 py-3 rounded-top-4" style={{ background: '#ef4444', color: 'white' }}>
            <strong><UserCog size={18} className="me-2" /> {t('admin.personal_information')}</strong>
          </div>
          <div className="p-4">
            {profileLoading ? (
              <div className="text-muted">{t('admin.loading_profile')}</div>
            ) : (
              <form onSubmit={saveProfile}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">{t('admin.full_name')}</label>
                    <input
                      type="text"
                      className="form-control"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      required
                      placeholder={t('admin.enter_name')}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">{t('admin.email_address')}</label>
                    <input
                      type="email"
                      className="form-control"
                      value={profile.email}
                      disabled
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">{t('admin.phone_number')}</label>
                    <PhoneInput
                      country={'tr'}
                      value={profile.phone}
                      onChange={(phone) => setProfile({ ...profile, phone })}
                      placeholder={t('admin.enter_phone')}
                      inputProps={{
                        className: 'form-control',
                        required: false
                      }}
                      containerClass="mb-3"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">{t('admin.department')}</label>
                    <select
                      className="form-select"
                      value={profile.department}
                      onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                    >
                      <option value="">{t('admin.select_department')}</option>
                      <option value="Administration">{t('admin.administration')}</option>
                      <option value="Medicine">{t('admin.medicine')}</option>
                      <option value="Nursing">{t('admin.nursing')}</option>
                      <option value="Pharmacy">{t('admin.pharmacy')}</option>
                      <option value="Dentistry">{t('admin.dentistry')}</option>
                      <option value="Engineering">{t('admin.engineering')}</option>
                      <option value="Sciences">{t('admin.sciences')}</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label">{t('admin.bio')}</label>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      placeholder={t('admin.tell_about_yourself')}
                    />
                  </div>
                </div>

                <div className="mt-3 text-end">
                  <button type="submit" className="btn btn-success" disabled={profileSaving}>
                    {profileSaving ? t('admin.saving') : t('admin.save_changes')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Profile Picture */}
<div className="col-lg-4">
  <div className="rounded-4 shadow-sm bg-white">
    <div className="px-4 py-3 rounded-top-4 d-flex align-items-center" style={{ background: '#fee2e2' }}>
      <ImageIcon size={18} className="me-2 text-danger" />
      <strong className="text-danger">{t('admin.profile_picture')}</strong>
    </div>
    <div className="p-4 text-center">
      <ProfileAvatar size={96} className="mx-auto mb-3" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => handlePhotoUpload(e.target.files?.[0] || null)}
      />
      <button className="btn btn-outline-danger w-100 mb-2" onClick={() => fileInputRef.current?.click()}>
        <Upload size={16} className="me-1" /> {t('admin.upload_new_photo')}
      </button>
      <button className="btn btn-outline-secondary w-100 mb-3" disabled={!profileAvatar} onClick={handlePhotoRemove}>
        <Trash2 size={16} className="me-1" /> {t('admin.remove_photo')}
      </button>
      
      {/* Photo Guidelines Dropdown */}
      <div className="accordion" id="adminPhotoGuidelines">
        <div className="accordion-item" style={{ border: 'none', background: 'transparent' }}>
          <h2 className="accordion-header" id="adminPhotoGuidelinesHeading">
            <button 
              className="accordion-button collapsed"
              type="button" 
              data-bs-toggle="collapse" 
              data-bs-target="#adminPhotoGuidelinesCollapse" 
              aria-expanded="false" 
              aria-controls="adminPhotoGuidelinesCollapse"
              style={{
                background: 'transparent',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '0.875rem',
                color: '#6c757d',
                boxShadow: 'none'
              }}
              onFocus={(e) => {
                e.currentTarget.style.boxShadow = '0 0 0 0.25rem rgba(220, 53, 69, 0.25)';
                e.currentTarget.style.borderColor = '#dc3545';
              }}
              onBlur={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = '#dee2e6';
              }}
            >
              <ImageIcon size={16} className="me-2" />
              Photo Upload Guidelines
            </button>
          </h2>
          <div 
            id="adminPhotoGuidelinesCollapse" 
            className="accordion-collapse collapse" 
            aria-labelledby="adminPhotoGuidelinesHeading" 
            data-bs-parent="#adminPhotoGuidelines"
          >
            <div className="accordion-body" style={{ padding: '16px 0' }}>
              <div 
                className="photo-requirements text-start"
                style={{
                  background: '#f8f9fa',
                  border: '1px solid #e9ecef',
                  borderRadius: '8px',
                  padding: '16px'
                }}
              >
                <div className="row g-2">
                  <div className="col-12">
                    <div className="d-flex align-items-start">
                      <CheckCircle size={16} className="text-success me-2 mt-1 flex-shrink-0" />
                      <div>
                        <strong className="text-dark">File Types:</strong>
                        <br />
                        <small className="text-muted">JPEG, PNG, GIF, or WebP formats</small>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-12">
                    <div className="d-flex align-items-start">
                      <CheckCircle size={16} className="text-success me-2 mt-1 flex-shrink-0" />
                      <div>
                        <strong className="text-dark">File Size:</strong>
                        <br />
                        <small className="text-muted">Maximum 5MB per file</small>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-12">
                    <div className="d-flex align-items-start">
                      <CheckCircle size={16} className="text-success me-2 mt-1 flex-shrink-0" />
                      <div>
                        <strong className="text-dark">Dimensions:</strong>
                        <br />
                        <small className="text-muted">Square format (1:1 ratio) recommended</small>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-12">
                    <div className="d-flex align-items-start">
                      <CheckCircle size={16} className="text-success me-2 mt-1 flex-shrink-0" />
                      <div>
                        <strong className="text-dark">Professional Quality:</strong>
                        <br />
                        <small className="text-muted">Clear, well-lit, high-resolution image</small>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-12">
                    <div className="d-flex align-items-start">
                      <CheckCircle size={16} className="text-success me-2 mt-1 flex-shrink-0" />
                      <div>
                        <strong className="text-dark">Administrative Standards:</strong>
                        <br />
                        <small className="text-muted">Professional appearance suitable for administrative role</small>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-12">
                    <div className="d-flex align-items-start">
                      <CheckCircle size={16} className="text-success me-2 mt-1 flex-shrink-0" />
                      <div>
                        <strong className="text-dark">System Usage:</strong>
                        <br />
                        <small className="text-muted">Appropriate for staff directory and system interface</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
    </div>
  </div>
);

const renderUsers = () => (
  <div className="container-fluid px-4 py-4">
    {/* Filters */}
    <div className="d-flex gap-2 align-items-center mb-3">
      <input
        className="form-control"
        placeholder={t('admin.search_users')}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ maxWidth: 280 }}
      />
      <select className="form-select" style={{ maxWidth: 180 }} value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
        <option value="all">{t('admin.all_roles')}</option>
        <option value="student">{t('admin.student')}</option>
        <option value="doctor">{t('admin.doctor')}</option>
        <option value="nurse">{t('admin.nurse')}</option>
        <option value="admin">{t('admin.admin')}</option>
      </select>
      <select className="form-select" style={{ maxWidth: 180 }} value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
        <option value="all">{t('admin.all_status')}</option>
        <option value="active">{t('admin.active')}</option>
        <option value="suspended">{t('admin.suspended')}</option>
        <option value="pending">{t('admin.pending')}</option>
      </select>
    </div>

    {/* Table */}
    <div className="table-responsive bg-white rounded-4 shadow-sm">
      <table className="table table-hover mb-0">
        <thead>
          <tr>
            <th>{t('admin.user')}</th>
            <th>{t('admin.email')}</th>
            <th>{t('admin.role')}</th>
            <th>{t('admin.status')}</th>
            <th>{t('admin.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={5} className="text-center py-4">{t('admin.loading')}</td></tr>
          ) : users.length === 0 ? (
            <tr><td colSpan={5} className="text-center py-4">{t('admin.no_users_found')}</td></tr>
          ) : users.map(u => (
            <tr key={u.id}>
              <td className="d-flex align-items-center gap-2">
                {u.avatar_url ? (
                  <img 
                    src={u.avatar_url} 
                    alt="" 
                    onError={(e)=>{e.currentTarget.style.display='none';}} 
                    className="rounded-circle" 
                    style={{ width: 32, height: 32, objectFit: 'cover' }} 
                  />
                ) : (
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center"
                    style={{ width: 32, height: 32, backgroundColor: '#fef2f2', color: '#e53e3e' }}
                  >
                    <User size={16} />
                  </div>
                )}
                {u.name}
              </td>
              <td>{u.email}</td>
              <td>
                <span className={`badge ${u.role === 'admin' ? 'bg-primary' : u.role === 'doctor' ? 'bg-success' : u.role === 'student' ? 'bg-info' : 'bg-secondary'}`}>
                  {u.role === 'student' ? t('admin.student') : 
                   u.role === 'doctor' ? t('admin.doctor') :
                   u.role === 'admin' ? t('admin.admin') :
                   u.role === 'nurse' ? t('admin.nurse') : u.role}
                </span>
              </td>
              <td>
                <span className={`badge ${u.status === 'active' ? 'bg-success' : u.status === 'suspended' ? 'bg-danger' : 'bg-warning text-dark'}`}>
                  {u.status === 'active' ? t('admin.active') :
                   u.status === 'suspended' ? t('admin.suspended') :
                   u.status === 'pending' ? t('admin.pending') : u.status}
                </span>
              </td>
              <td className="d-flex gap-2">
                <button className="btn btn-sm btn-outline-secondary" onClick={() => updateUserStatus(u.id, u.status === 'active' ? 'suspended' : 'active')}>
                  {u.status === 'active' ? t('admin.suspend') : t('admin.activate')}
                </button>
                <button className="btn btn-sm btn-outline-danger" onClick={() => deleteUser(u.id, 'admin_action')}>
                  {t('admin.delete')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Pagination */}
    <div className="d-flex justify-content-between align-items-center mt-3">
      <div>{t('admin.total', { count: totalUsers })}</div>
      <div className="btn-group">
        <button className="btn btn-outline-secondary" disabled={currentPage <= 1} onClick={() => fetchUsers(currentPage - 1)}>
          {t('admin.prev')}
        </button>
        <span className="btn btn-outline-secondary disabled">{currentPage} / {totalPages}</span>
        <button className="btn btn-outline-secondary" disabled={currentPage >= totalPages} onClick={() => fetchUsers(currentPage + 1)}>
          {t('admin.next')}
        </button>
      </div>
    </div>
  </div>
);

  const renderConfig = () => {
  // Define timezone options
  const timezoneOptions = [
    { value: 'UTC-12', label: 'UTC-12 (Baker Island)' },
    { value: 'UTC-11', label: 'UTC-11 (American Samoa)' },
    { value: 'UTC-10', label: 'UTC-10 (Hawaii)' },
    { value: 'UTC-9', label: 'UTC-9 (Alaska)' },
    { value: 'UTC-8', label: 'UTC-8 (Pacific Time)' },
    { value: 'UTC-7', label: 'UTC-7 (Mountain Time)' },
    { value: 'UTC-6', label: 'UTC-6 (Central Time)' },
    { value: 'UTC-5', label: 'UTC-5 (Eastern Time)' },
    { value: 'UTC-4', label: 'UTC-4 (Atlantic Time)' },
    { value: 'UTC-3', label: 'UTC-3 (Argentina, Brazil)' },
    { value: 'UTC-2', label: 'UTC-2 (South Georgia)' },
    { value: 'UTC-1', label: 'UTC-1 (Azores)' },
    { value: 'UTC+0', label: 'UTC+0 (Greenwich Mean Time)' },
    { value: 'UTC+1', label: 'UTC+1 (Central European Time)' },
    { value: 'UTC+2', label: 'UTC+2 (Eastern European Time)' },
    { value: 'UTC+3', label: 'UTC+3 (Turkey, Russia)' },
    { value: 'UTC+4', label: 'UTC+4 (Gulf Standard Time)' },
    { value: 'UTC+5', label: 'UTC+5 (Pakistan Standard Time)' },
    { value: 'UTC+6', label: 'UTC+6 (Bangladesh Standard Time)' },
    { value: 'UTC+7', label: 'UTC+7 (Indochina Time)' },
    { value: 'UTC+8', label: 'UTC+8 (China Standard Time)' },
    { value: 'UTC+9', label: 'UTC+9 (Japan Standard Time)' },
    { value: 'UTC+10', label: 'UTC+10 (Australian Eastern Time)' },
    { value: 'UTC+11', label: 'UTC+11 (Solomon Islands)' },
    { value: 'UTC+12', label: 'UTC+12 (New Zealand)' }
  ];

  // Define language options
  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'tr', label: 'Türkçe (Turkish)' },
    { value: 'de', label: 'Deutsch (German)' },
    { value: 'fr', label: 'Français (French)' },
    { value: 'es', label: 'Español (Spanish)' },
    { value: 'it', label: 'Italiano (Italian)' },
    { value: 'pt', label: 'Português (Portuguese)' },
    { value: 'ru', label: 'Русский (Russian)' },
    { value: 'ar', label: 'العربية (Arabic)' },
    { value: 'zh', label: '中文 (Chinese)' },
    { value: 'ja', label: '日本語 (Japanese)' },
    { value: 'ko', label: '한국어 (Korean)' }
  ];

  // Check if settings have changes compared to original
  const hasChanges = () => {
    if (!systemSettings || !settingsDraft) return false;
    return JSON.stringify(systemSettings) !== JSON.stringify(settingsDraft);
  };

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h5 className="mb-0">{t('admin.system_settings')}</h5>
        <div>
          <button
            className="btn btn-outline-secondary me-2"
            onClick={() => {
              if (systemSettings) {
                setSettingsDraft(structuredClone(systemSettings));
                addNotification(t('admin.settings_reset'), 'info');
              }
            }}
            disabled={!systemSettings || settingsSaving || !hasChanges()}
          >
            {t('admin.reset')}
          </button>
          <button
            className="btn btn-primary"
            disabled={!settingsDraft || settingsSaving || !hasChanges()}
            onClick={async () => {
                if (!settingsDraft) return;
                
                try {
                    setSettingsSaving(true);
                    await updateSettings(settingsDraft);
                    setSystemSettings(structuredClone(settingsDraft));
                    addNotification(t('admin.settings_saved'), 'success');
                } catch (err) {
                    console.error('Failed to save settings:', err);
                    addNotification((err as Error).message || t('admin.failed_update_settings'), 'error');
                } finally {
                    setSettingsSaving(false);
                }
                }}
          >
            {settingsSaving ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                {t('admin.saving')}
              </>
            ) : (
              t('admin.save_changes')
            )}
          </button>
        </div>
      </div>

      {!settingsDraft ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">{t('admin.loading')}</span>
          </div>
          <div className="text-muted mt-2">{t('admin.loading_settings')}</div>
        </div>
      ) : (
        <div className="row g-4">
          {/* GENERAL */}
          <div className="col-12">
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-header bg-white rounded-top-4">
                <strong>{t('admin.general')}</strong>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">{t('admin.site_name')}</label>
                    <input
                      className="form-control"
                      value={g(settingsDraft, 'general.site_name', '')}
                      onChange={onField('general.site_name')}
                      placeholder={t('admin.enter_site_name')}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">{t('admin.default_language')}</label>
                    <select
                      className="form-select"
                      value={g(settingsDraft, 'general.default_language', 'en')}
                      onChange={onField('general.default_language')}
                    >
                      {languageOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label">{t('admin.site_description')}</label>
                    <textarea
                    className="form-control"
                    rows={2}
                    value={g(settingsDraft, 'general.site_description', '')}
                    onChange={onField('general.site_description')}
                    placeholder={t('admin.enter_site_description')}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">{t('admin.timezone')}</label>
                    <select
                      className="form-select"
                      value={g(settingsDraft, 'general.timezone', 'UTC+3')}
                      onChange={onField('general.timezone')}
                    >
                      {timezoneOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-8 d-flex align-items-center gap-4">
                    <div className="form-check">
                      <input
                        id="maintenance"
                        type="checkbox"
                        className="form-check-input"
                        checked={!!g(settingsDraft, 'general.maintenance_mode', false)}
                        onChange={onField('general.maintenance_mode')}
                      />
                      <label htmlFor="maintenance" className="form-check-label">
                        {t('admin.maintenance_mode')}
                      </label>
                    </div>
                    <div className="form-check">
                      <input
                        id="registration_enabled"
                        type="checkbox"
                        className="form-check-input"
                        checked={!!g(settingsDraft, 'general.registration_enabled', true)}
                        onChange={onField('general.registration_enabled')}
                      />
                      <label htmlFor="registration_enabled" className="form-check-label">
                        {t('admin.registration_enabled')}
                      </label>
                    </div>
                    <div className="form-check">
                      <input
                        id="email_verification_required"
                        type="checkbox"
                        className="form-check-input"
                        checked={!!g(settingsDraft, 'general.email_verification_required', true)}
                        onChange={onField('general.email_verification_required')}
                      />
                      <label htmlFor="email_verification_required" className="form-check-label">
                        {t('admin.email_verification_required')}
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AUTHENTICATION */}
          <div className="col-12">
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-header bg-white rounded-top-4">
                <strong>{t('admin.authentication')}</strong>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-3">
                    <label className="form-label">{t('admin.password_min_length')}</label>
                    <input
                      type="number"
                      min={6}
                      max={128}
                      className="form-control"
                      value={g(settingsDraft, 'authentication.password_min_length', 8)}
                      onChange={onField('authentication.password_min_length')}
                    />
                  </div>
                  <div className="col-md-9 d-flex align-items-center flex-wrap gap-4">
                    {[
                      ['authentication.password_require_uppercase', t('admin.require_uppercase')],
                      ['authentication.password_require_lowercase', t('admin.require_lowercase')],
                      ['authentication.password_require_numbers', t('admin.require_numbers')],
                      ['authentication.password_require_symbols', t('admin.require_symbols')],
                      ['authentication.two_factor_enabled', t('admin.two_factor_enabled')],
                    ].map(([path, label]) => (
                      <div className="form-check" key={path}>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id={path}
                          checked={!!g(settingsDraft, path, false)}
                          onChange={onField(path)}
                        />
                        <label className="form-check-label" htmlFor={path}>
                          {label}
                        </label>
                      </div>
                    ))}
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">{t('admin.session_timeout')}</label>
                    <input
                      type="number"
                      min={1}
                      max={43200}
                      className="form-control"
                      value={g(settingsDraft, 'authentication.session_timeout', 1440)}
                      onChange={onField('authentication.session_timeout')}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">{t('admin.max_login_attempts')}</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      className="form-control"
                      value={g(settingsDraft, 'authentication.max_login_attempts', 5)}
                      onChange={onField('authentication.max_login_attempts')}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">{t('admin.lockout_duration')}</label>
                    <input
                      type="number"
                      min={1}
                      max={1440}
                      className="form-control"
                      value={g(settingsDraft, 'authentication.lockout_duration', 15)}
                      onChange={onField('authentication.lockout_duration')}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* EMAIL */}
          <div className="col-12">
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-header bg-white rounded-top-4">
                <strong>{t('admin.email_smtp')}</strong>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">{t('admin.smtp_host')}</label>
                    <input
                      className="form-control"
                      value={g(settingsDraft, 'email.smtp_host', '')}
                      onChange={onField('email.smtp_host')}
                      placeholder="smtp.example.com"
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">{t('admin.smtp_port')}</label>
                    <input
                      type="number"
                      min={1}
                      max={65535}
                      className="form-control"
                      value={g(settingsDraft, 'email.smtp_port', 587)}
                      onChange={onField('email.smtp_port')}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">{t('admin.encryption')}</label>
                    <select
                      className="form-select"
                      value={g(settingsDraft, 'email.smtp_encryption', 'tls')}
                      onChange={onField('email.smtp_encryption')}
                    >
                      <option value="">{t('admin.none')}</option>
                      <option value="tls">TLS</option>
                      <option value="ssl">SSL</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">{t('admin.from_address')}</label>
                    <input
                      type="email"
                      className="form-control"
                      value={g(settingsDraft, 'email.from_address', '')}
                      onChange={onField('email.from_address')}
                      placeholder="noreply@example.com"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">{t('admin.from_name')}</label>
                    <input
                      className="form-control"
                      value={g(settingsDraft, 'email.from_name', '')}
                      onChange={onField('email.from_name')}
                      placeholder={t('admin.enter_organization_name')}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">{t('admin.smtp_username')}</label>
                    <input
                      className="form-control"
                      value={g(settingsDraft, 'email.smtp_username', '')}
                      onChange={onField('email.smtp_username')}
                      placeholder="smtp_username"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">{t('admin.smtp_password')}</label>
                    <input
                      type="password"
                      className="form-control"
                      value={g(settingsDraft, 'email.smtp_password', '')}
                      onChange={onField('email.smtp_password')}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Changes indicator */}
          {hasChanges() && (
            <div className="col-12">
              <div className="alert alert-info d-flex align-items-center" role="alert">
                <i className="bi bi-info-circle me-2"></i>
                {t('admin.unsaved_changes')}
              </div>
            </div>
          )}

          {/* Raw JSON (collapsible aid) */}
          <div className="col-12">
            <details>
              <summary className="text-muted">{t('admin.view_raw_json')}</summary>
              <pre className="bg-light p-3 rounded-3 mt-2 small">{JSON.stringify(settingsDraft, null, 2)}</pre>
            </details>
          </div>
        </div>
      )}
    </div>
  );
};

  // ---- Page scaffold ----
   return (
  <div style={{ minHeight: '100vh', display: 'flex' }}>
    {/* Sidebar */}
    <Sidebar />

    {/* Mobile Header */}
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: 'white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        display: window.innerWidth < 768 ? 'flex' : 'none',
        alignItems: 'center',
        padding: '0 20px',
        zIndex: 1030,
      }}
    >
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          background: 'none',
          border: 'none',
          fontSize: '1.5rem',
          cursor: 'pointer',
        }}
      >
        ☰
      </button>
      <h6 style={{ margin: 0, marginLeft: '15px', fontWeight: 600 }}>FIU Admin</h6>
    </div>

    {/* Main Content Wrapper */}
    <div
      style={{
        flex: 1,
        marginLeft: window.innerWidth >= 768 ? (sidebarCollapsed ? '85px' : '280px') : '0',
        paddingTop: window.innerWidth < 768 ? '60px' : '0',
        transition: 'margin-left 0.3s ease',
        minHeight: '100vh',
      }}
    >
      {/* Toasts */}
      <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 9999, width: 360 }}>
        {notifications.map(n => <NotificationToast key={n.id} notification={n} />)}
      </div>

      {/* Main content */}
      <div style={{ padding: '20px' }}>
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'profile' && renderProfile()}
      {activeTab === 'users' && renderUsers()}
      {activeTab === 'config' && renderConfig()}
    </div>
  </div>
  </div>
);
};

export default AdminDashboard;