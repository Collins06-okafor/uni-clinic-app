import React, { useEffect, useRef, useState } from 'react';
import {
  Users, Settings, Activity, CheckCircle, Clock, Calendar,
  AlertTriangle, Trash2, User, X, Upload, LogOut, UserCog, LayoutGrid, Image as ImageIcon
} from 'lucide-react';

/**
 * AUTH MODE
 * - Sanctum cookies? set USE_SANCTUM = true
 * - Bearer token (localStorage 'token')? keep false (default)
 */
const USE_SANCTUM = false;

/**
 * API BASE
 * e.g., 'http://localhost:8000/api/admin' or '/api/admin'
 */
const DEFAULT_API_BASE = 'http://127.0.0.1:8000/api/admin';
const PROFILE_API_BASE = 'http://127.0.0.1:8000/api'; // Profile routes are outside admin group
const PROFILE_ENDPOINT = '/profile'; // appended to apiBaseUrl

const AdminDashboard = ({
  user: initialUser = { name: 'Admin User', avatar: null, email: 'admin@university.edu' },
  onLogout,
  apiBaseUrl = DEFAULT_API_BASE
}) => {
  // ---- Tabs ----
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'profile' | 'users' | 'config'

  // ---- Settings (UI draft state) ----
const [systemSettings, setSystemSettings] = useState(null);
const [settingsDraft, setSettingsDraft] = useState(null);
const [settingsSaving, setSettingsSaving] = useState(false);

// safely read nested keys
const g = (obj, path, def = '') =>
  path.split('.').reduce((a, k) => (a && a[k] !== undefined ? a[k] : def), obj);

// set nested value immutably: path like "general.site_name"
const setPath = (obj, path, value) => {
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

const onField = (path) => (e) => {
  const { type, value, checked } = e.target;
  let v = value;
  if (type === 'checkbox') v = checked;
  if (type === 'number') v = value === '' ? '' : Number(value);
  setSettingsDraft((prev) => setPath(prev, path, v));
};

// hydrate editable draft when settings load
useEffect(() => {
  if (systemSettings) setSettingsDraft(structuredClone(systemSettings));
}, [systemSettings]);

  // ---- Notifications ----
  const [notifications, setNotifications] = useState([]);
  const addNotification = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
  };
  const removeNotification = (id) => setNotifications(prev => prev.filter(n => n.id !== id));

  const NotificationToast = ({ notification }) => {
    const styleByType = (t) => t === 'error'
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
  const fetchJson = async (url, opts = {}) => {
    const token = localStorage.getItem('token');
    const baseHeaders = USE_SANCTUM
      ? { Accept: 'application/json', ...(opts.headers || {}) }
      : { Accept: 'application/json', ...(opts.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };

    const res = await fetch(url, {
      ...opts,
      headers: baseHeaders,
      credentials: USE_SANCTUM ? 'include' : 'omit',
    });

    const text = await res.text().catch(() => '');
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch {}

    if (!res.ok) {
      const detail = data?.message || data?.error || text || res.statusText;
      const err = new Error(`${res.status} ${res.statusText} – ${detail}`);
      err.status = res.status;
      err.body = data || text;
      throw err;
    }
    return data;
  };

  // ---- Dashboard data ----
  const [dashboardData, setDashboardData] = useState(null);
  const fetchDashboard = async () => {
    try {
      const data = await fetchJson(`${apiBaseUrl}/dashboard`);
      setDashboardData(data);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      addNotification(error.message || 'Failed to load dashboard data', 'error');
      setDashboardData(null);
    }
  };

  // ---- Users list ----
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  const fetchUsers = async (page = 1) => {
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
      addNotification(error.message || 'Failed to load users', 'error');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId, reason) => {
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
      addNotification(error.message || 'Failed to delete user', 'error');
    }
  };

  const updateUserStatus = async (userId, status, reason = '') => {
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
      addNotification(error.message || 'Failed to update user status', 'error');
    }
  };

  // ---- Settings ----
  
  const fetchSettings = async () => {
    try {
      const data = await fetchJson(`${apiBaseUrl}/settings`);
      setSystemSettings(data);
    } catch (error) {
      console.error('Settings fetch error:', error);
      addNotification(error.message || 'Failed to load system settings', 'error');
    }
  };
  const updateSettings = async (settings) => {
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
      addNotification(error.message || 'Failed to update settings', 'error');
    }
  };

  // ---- Profile ----
  const fileInputRef = useRef(null);
  const [profile, setProfile] = useState({
    name: initialUser.name || '',
    email: initialUser.email || '',
    phone: '',
    department: '',
    bio: '',
  });
  const [profileAvatar, setProfileAvatar] = useState(initialUser.avatar || null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  const getProfile = async () => {
    setProfileLoading(true);
    try {
      const data = await fetchJson(`http://127.0.0.1:8000/api/profile`);
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
      addNotification(error.message || 'Failed to load profile', 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  const saveProfile = async (e) => {
    e?.preventDefault?.();
    setProfileSaving(true);
    try {
      await fetchJson(`${apiBaseUrl}${PROFILE_ENDPOINT}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      addNotification('Profile updated successfully!', 'success');
    } catch (error) {
      console.error('Profile save error:', error);
      addNotification(error.message || 'Failed to update profile', 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePhotoUpload = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const data = await fetchJson(`${apiBaseUrl}${PROFILE_ENDPOINT}/avatar`, {
        method: 'POST',
        body: formData, // browser sets boundary
      });
      setProfileAvatar(data.avatar_url);
      addNotification('Profile photo updated successfully!', 'success');
    } catch (error) {
      console.error('Photo upload error:', error);
      addNotification(error.message || 'Failed to upload photo', 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePhotoRemove = async () => {
    try {
      await fetchJson(`${apiBaseUrl}${PROFILE_ENDPOINT}/avatar`, { method: 'DELETE' });
      setProfileAvatar(null);
      addNotification('Profile photo removed successfully!', 'success');
    } catch (error) {
      console.error('Photo removal error:', error);
      addNotification(error.message || 'Failed to remove photo', 'error');
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
  const ProfileAvatar = ({ size = 88, className = "" }) => {
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

  const StatCard = ({ title, value, icon: Icon, color, subtitle, bgColor }) => (
    <div className="bg-white rounded-4 shadow-sm p-4 h-100 border-0">
      <div className="text-center">
        <div className="d-inline-flex align-items-center justify-content-center mb-3"
             style={{ width: 64, height: 64, backgroundColor: bgColor || `${color}20`, borderRadius: '50%' }}>
          <Icon size={28} style={{ color }} />
        </div>
        <h2 className="fw-bold mb-2" style={{ color, fontSize: '2.5rem' }}>{value ?? '—'}</h2>
        <p className="text-muted fw-medium mb-0">{title}</p>
        {subtitle && <p className="text-muted small mt-1">{subtitle}</p>}
      </div>
    </div>
  );

  // ---- Renders ----
  const renderTopBar = () => (
    <div className="border-bottom bg-white">
      <div className="container d-flex align-items-center justify-content-between py-3">
        {/* Brand / Logo */}
        <div className="d-flex align-items-center gap-3">
          <img
            src="/logo6.png"
            alt="Final International University"
            style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 6 }}
          />
          <div className="d-none d-md-block">
            <div className="fw-bold" style={{ lineHeight: 1, color: '#b91c1c' }}>
              Final International University
            </div>
            <small className="text-muted">Medical Appointments</small>
          </div>
        </div>

        {/* Tabs */}
        <div className="d-flex gap-2">
          <button
            className={`btn ${activeTab === 'dashboard' ? 'btn-danger' : 'btn-outline-danger'}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutGrid size={16} className="me-1" /> Dashboard
          </button>
          <button
            className={`btn ${activeTab === 'profile' ? 'btn-danger' : 'btn-outline-danger'}`}
            onClick={() => setActiveTab('profile')}
          >
            <UserCog size={16} className="me-1" /> Profile
          </button>
          <button
            className={`btn ${activeTab === 'users' ? 'btn-danger' : 'btn-outline-danger'}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={16} className="me-1" /> User Management
          </button>
          <button
            className={`btn ${activeTab === 'config' ? 'btn-danger' : 'btn-outline-danger'}`}
            onClick={() => setActiveTab('config')}
          >
            <Settings size={16} className="me-1" /> System Config
          </button>
        </div>

        {/* Logout */}
        <div>
          <button
            className="btn btn-outline-danger"
            onClick={() => {
              try { localStorage.removeItem('token'); } catch {}
              onLogout ? onLogout() : window.location.assign('/');
            }}
          >
            <LogOut size={16} className="me-1" /> Logout
          </button>
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
  <div className="container-fluid px-4 py-4" style={{ backgroundColor: '#f8fafc' }}>
    <div className="row g-4">
      {/* Welcome */}
      <div className="col-12">
        <div
          className="rounded-4 shadow-sm p-5 text-white position-relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #e53e3e 0%, #c53030 100%)' }}
        >
          <div className="row align-items-center">
            <div className="col-md-8">
              <h1 className="fw-bold mb-3">Welcome back!</h1>
              <p className="mb-2 opacity-90 fs-5">Medical Appointments Admin Dashboard</p>
              <p className="mb-0 opacity-75">Monitor and manage your university health system</p>
              {dashboardData?.admin?.last_login && (
                <p className="mb-0 opacity-75 mt-2">
                  Last login: {new Date(dashboardData.admin.last_login).toLocaleString()}
                </p>
              )}
            </div>
            <div className="col-md-4">
              <div className="d-flex flex-column align-items-end">
                <ProfileAvatar size={120} className="opacity-90" />
                {!!profileAvatar && (
                  <button
                    className="btn btn-outline-light mt-3"
                    onClick={handlePhotoRemove}
                  >
                    <Trash2 size={16} /> Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* KPIs */}
        <div className="col-12"><h4 className="fw-bold mb-3">System Overview</h4></div>
        <div className="col-lg-3 col-md-6">
          <StatCard title="Total Users" value={dashboardData?.system_overview?.total_users} icon={Users} color="#e53e3e" subtitle="All registered users" />
        </div>
        <div className="col-lg-3 col-md-6">
          <StatCard title="Active Users" value={dashboardData?.system_overview?.active_users} icon={Activity} color="#38a169" subtitle="Currently active" />
        </div>
        <div className="col-lg-3 col-md-6">
          <StatCard title="New Registrations Today" value={dashboardData?.system_overview?.new_registrations_today} icon={CheckCircle} color="#3182ce" subtitle="Today's signups" />
        </div>
        <div className="col-lg-3 col-md-6">
          <StatCard title="Pending Verifications" value={dashboardData?.system_overview?.pending_verifications} icon={Clock} color="#d69e2e" subtitle="Awaiting verification" />
        </div>

        {/* …add your breakdown/analytics if needed… */}
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
              <strong><UserCog size={18} className="me-2" /> Personal Information</strong>
            </div>
            <div className="p-4">
              {profileLoading ? (
                <div className="text-muted">Loading profile…</div>
              ) : (
                <form onSubmit={saveProfile}>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Full Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        required
                        placeholder="Enter your name"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Email Address</label>
                      <input
                        type="email"
                        className="form-control"
                        value={profile.email}
                        disabled
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Phone Number</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        placeholder="Enter your phone number"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Department</label>
                      <select
                        className="form-select"
                        value={profile.department}
                        onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                      >
                        <option value="">Select Department</option>
                        <option value="Administration">Administration</option>
                        <option value="Medicine">Medicine</option>
                        <option value="Nursing">Nursing</option>
                        <option value="Pharmacy">Pharmacy</option>
                        <option value="Dentistry">Dentistry</option>
                        <option value="Engineering">Engineering</option>
                        <option value="Sciences">Sciences</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label">Bio</label>
                      <textarea
                        className="form-control"
                        rows={4}
                        value={profile.bio}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                        placeholder="Tell us about yourself.."
                      />
                    </div>
                  </div>

                  <div className="mt-3 text-end">
                    <button type="submit" className="btn btn-danger" disabled={profileSaving}>
                      {profileSaving ? 'Saving…' : 'Save Changes'}
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
              <strong className="text-danger">Profile Picture</strong>
            </div>
            <div className="p-4 text-center">
              <ProfileAvatar size={96} className="mx-auto mb-3" />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
              />
              <button className="btn btn-outline-danger w-100 mb-2" onClick={() => fileInputRef.current?.click()}>
                <Upload size={16} className="me-1" /> Upload New Photo
              </button>
              <button className="btn btn-outline-secondary w-100" disabled={!profileAvatar} onClick={handlePhotoRemove}>
                <Trash2 size={16} className="me-1" /> Remove Photo
              </button>
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
          placeholder="Search users…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <select className="form-select" style={{ maxWidth: 180 }} value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
          <option value="all">All roles</option>
          <option value="student">Student</option>
          <option value="doctor">Doctor</option>
          <option value="nurse">Nurse</option>
          <option value="admin">Admin</option>
        </select>
        <select className="form-select" style={{ maxWidth: 180 }} value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-responsive bg-white rounded-4 shadow-sm">
        <table className="table table-hover mb-0">
          <thead>
            <tr>
              <th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="text-center py-4">Loading…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-4">No users found</td></tr>
            ) : users.map(u => (
              <tr key={u.id}>
                <td className="d-flex align-items-center gap-2">
                  <img src={u.avatar_url || ''} alt="" onError={(e)=>{e.currentTarget.style.display='none';}} className="rounded-circle" style={{ width: 32, height: 32, objectFit: 'cover' }} />
                  {u.name}
                </td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.status}</td>
                <td className="d-flex gap-2">
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => updateUserStatus(u.id, u.status === 'active' ? 'suspended' : 'active')}>
                    {u.status === 'active' ? 'Suspend' : 'Activate'}
                  </button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => deleteUser(u.id, 'admin_action')}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="d-flex justify-content-between align-items-center mt-3">
        <div>Total: {totalUsers}</div>
        <div className="btn-group">
          <button className="btn btn-outline-secondary" disabled={currentPage <= 1} onClick={() => fetchUsers(currentPage - 1)}>Prev</button>
          <span className="btn btn-outline-secondary disabled">{currentPage} / {totalPages}</span>
          <button className="btn btn-outline-secondary" disabled={currentPage >= totalPages} onClick={() => fetchUsers(currentPage + 1)}>Next</button>
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
        <h5 className="mb-0">System Settings</h5>
        <div>
          <button
            className="btn btn-outline-secondary me-2"
            onClick={() => {
              if (systemSettings) {
                setSettingsDraft(structuredClone(systemSettings));
                addNotification('Settings reset to saved values', 'info');
              }
            }}
            disabled={!systemSettings || settingsSaving || !hasChanges()}
          >
            Reset
          </button>
          <button
            className="btn btn-primary"
            disabled={!settingsDraft || settingsSaving || !hasChanges()}
            onClick={async () => {
              try {
                setSettingsSaving(true);
                await updateSettings(settingsDraft);
                
                // Update the canonical settings to match what was saved
                setSystemSettings(structuredClone(settingsDraft));
                
                // Optionally refresh from server to ensure consistency
                // await fetchSettings();
                
                addNotification('Settings saved successfully', 'success');
              } catch (err) {
                console.error('Failed to save settings:', err);
                addNotification(err.message || 'Failed to save settings', 'error');
              } finally {
                setSettingsSaving(false);
              }
            }}
          >
            {settingsSaving ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Saving…
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>

      {!settingsDraft ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <div className="text-muted mt-2">Loading settings…</div>
        </div>
      ) : (
        <div className="row g-4">
          {/* GENERAL */}
          <div className="col-12">
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-header bg-white rounded-top-4">
                <strong>General</strong>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Site Name</label>
                    <input
                      className="form-control"
                      value={g(settingsDraft, 'general.site_name', '')}
                      onChange={onField('general.site_name')}
                      placeholder="Enter site name"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Default Language</label>
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
                    <label className="form-label">Site Description</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={g(settingsDraft, 'general.site_description', '')}
                      onChange={onField('general.site_description')}
                      placeholder="Enter site description"
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Timezone</label>
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
                        Maintenance mode
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
                        Registration enabled
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
                        Email verification required
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
                <strong>Authentication</strong>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-3">
                    <label className="form-label">Password min length</label>
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
                      ['authentication.password_require_uppercase', 'Require uppercase'],
                      ['authentication.password_require_lowercase', 'Require lowercase'],
                      ['authentication.password_require_numbers', 'Require numbers'],
                      ['authentication.password_require_symbols', 'Require symbols'],
                      ['authentication.two_factor_enabled', 'Two‑factor enabled'],
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
                    <label className="form-label">Session timeout (minutes)</label>
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
                    <label className="form-label">Max login attempts</label>
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
                    <label className="form-label">Lockout duration (minutes)</label>
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
                <strong>Email (SMTP)</strong>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">SMTP Host</label>
                    <input
                      className="form-control"
                      value={g(settingsDraft, 'email.smtp_host', '')}
                      onChange={onField('email.smtp_host')}
                      placeholder="smtp.example.com"
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">SMTP Port</label>
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
                    <label className="form-label">Encryption</label>
                    <select
                      className="form-select"
                      value={g(settingsDraft, 'email.smtp_encryption', 'tls')}
                      onChange={onField('email.smtp_encryption')}
                    >
                      <option value="">None</option>
                      <option value="tls">TLS</option>
                      <option value="ssl">SSL</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">From Address</label>
                    <input
                      type="email"
                      className="form-control"
                      value={g(settingsDraft, 'email.from_address', '')}
                      onChange={onField('email.from_address')}
                      placeholder="noreply@example.com"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">From Name</label>
                    <input
                      className="form-control"
                      value={g(settingsDraft, 'email.from_name', '')}
                      onChange={onField('email.from_name')}
                      placeholder="Your Organization Name"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">SMTP Username</label>
                    <input
                      className="form-control"
                      value={g(settingsDraft, 'email.smtp_username', '')}
                      onChange={onField('email.smtp_username')}
                      placeholder="smtp_username"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">SMTP Password</label>
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
                You have unsaved changes. Don't forget to save your settings.
              </div>
            </div>
          )}

          {/* Raw JSON (collapsible aid) */}
          <div className="col-12">
            <details>
              <summary className="text-muted">View raw JSON</summary>
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
    <div>
      {/* Toasts */}
      <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 9999, width: 360 }}>
        {notifications.map(n => <NotificationToast key={n.id} notification={n} />)}
      </div>

      {/* Top bar with logo + tabs + logout */}
      {renderTopBar()}

      {/* Content */}
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'profile' && renderProfile()}
      {activeTab === 'users' && renderUsers()}
      {activeTab === 'config' && renderConfig()}
    </div>
  );
};

export default AdminDashboard;