import React, { useState, useEffect } from 'react';
import { 
  Users, Settings, Shield, Database, FileText, BarChart3, 
  Activity, AlertTriangle, CheckCircle, Clock, Server,
  UserPlus, UserMinus, Key, Download, Upload, Mail,
  HardDrive, Cpu, Memory, Wifi, Bell, Search, Filter,
  Calendar, TrendingUp, Eye, Edit, Trash2, Plus, User
} from 'lucide-react';

const AdminDashboard = ({ user = { name: 'Admin User' }, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [systemData, setSystemData] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Mock API call - replace with actual API calls
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setSystemData({
        totalUsers: 1250,
        activeUsers: 1180,
        newRegistrations: 87,
        systemHealth: 98.5,
        uptime: '99.98%',
        responseTime: '125ms',
        serverLoad: 23
      });
      setUsers([
        { id: 1, name: 'John Doe', email: 'john@university.edu', role: 'student', status: 'active', lastLogin: '2024-02-09' },
        { id: 2, name: 'Dr. Smith', email: 'smith@university.edu', role: 'doctor', status: 'active', lastLogin: '2024-02-09' },
        { id: 3, name: 'Jane Admin', email: 'jane@university.edu', role: 'admin', status: 'active', lastLogin: '2024-02-08' },
        { id: 4, name: 'Bob Wilson', email: 'bob@university.edu', role: 'student', status: 'inactive', lastLogin: '2024-02-05' },
        { id: 5, name: 'Dr. Brown', email: 'brown@university.edu', role: 'doctor', status: 'active', lastLogin: '2024-02-09' }
      ]);
      setLoading(false);
    }, 1000);
  };

  const StatCard = ({ title, value, icon: Icon, color, subtitle, trend }) => (
    <div className={`bg-white rounded-xl shadow-sm p-6 border-0 h-100`} style={{ borderRadius: '1rem' }}>
      <div className="d-flex align-items-center justify-content-between">
        <div className="flex-grow-1">
          <h6 className="text-muted fw-medium mb-2">{title}</h6>
          <h3 className="fw-bold mb-1" style={{ color: getColorClass(color) }}>{value}</h3>
          {subtitle && <p className="text-muted small mb-2">{subtitle}</p>}
          {trend && (
            <div className="d-flex align-items-center">
              <TrendingUp size={16} className="text-success me-1" />
              <span className="text-success small fw-medium">{trend}</span>
            </div>
          )}
        </div>
        <div className={`d-inline-flex align-items-center justify-content-center`} 
             style={{ 
               width: '60px', 
               height: '60px', 
               backgroundColor: getBackgroundColor(color), 
               borderRadius: '50%' 
             }}>
          <Icon size={28} style={{ color: getColorClass(color) }} />
        </div>
      </div>
    </div>
  );

  const getColorClass = (color) => {
    const colors = {
      blue: '#0d6efd',
      green: '#198754',
      yellow: '#ffc107',
      red: '#dc3545',
      purple: '#6f42c1',
      orange: '#fd7e14'
    };
    return colors[color] || '#6c757d';
  };

  const getBackgroundColor = (color) => {
    const backgrounds = {
      blue: '#e3f2fd',
      green: '#e8f5e8',
      yellow: '#fff3cd',
      red: '#f8d7da',
      purple: '#f3e5f5',
      orange: '#ffe5cc'
    };
    return backgrounds[color] || '#f8f9fa';
  };

  const TabButton = ({ id, label, icon: Icon, isActive, onClick }) => (
    <button
      onClick={() => onClick(id)}
      className={`nav-link fw-semibold d-flex align-items-center px-4 py-3 ${
        isActive 
          ? 'active text-white' 
          : 'text-muted'
      }`}
      style={{ 
        borderRadius: '0.75rem',
        background: isActive ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
        border: 'none',
        transition: 'all 0.3s ease'
      }}
    >
      <Icon size={18} className="me-2" />
      {label}
    </button>
  );

  const renderOverview = () => (
    <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', padding: '2rem 0' }}>
      <div className="container-fluid">
        <div className="row g-4">
          {/* Welcome Card */}
          <div className="col-12">
            <div className="card border-0 shadow-sm" style={{ 
              borderRadius: '1.5rem', 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
            }}>
              <div className="card-body p-5 text-white">
                <div className="row align-items-center">
                  <div className="col-md-8">
                    <h2 className="mb-3 fw-bold">Welcome back, {user.name}!</h2>
                    <p className="mb-2 opacity-90 fs-5">System Administration Dashboard</p>
                    <p className="mb-0 opacity-75">Monitor and manage your university management system</p>
                  </div>
                  <div className="col-md-4 text-end">
                    <Shield size={100} className="opacity-75" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="col-lg-3 col-md-6">
            <StatCard 
              title="Total Users" 
              value={systemData?.totalUsers?.toLocaleString() || '0'} 
              icon={Users} 
              color="blue"
              subtitle="All registered users"
              trend="+12.5% this month"
            />
          </div>
          <div className="col-lg-3 col-md-6">
            <StatCard 
              title="Active Users" 
              value={systemData?.activeUsers?.toLocaleString() || '0'} 
              icon={Activity} 
              color="green"
              subtitle="Currently active"
            />
          </div>
          <div className="col-lg-3 col-md-6">
            <StatCard 
              title="System Health" 
              value={`${systemData?.systemHealth || 0}%`} 
              icon={CheckCircle} 
              color="green"
              subtitle="All systems operational"
            />
          </div>
          <div className="col-lg-3 col-md-6">
            <StatCard 
              title="Server Load" 
              value={`${systemData?.serverLoad || 0}%`} 
              icon={Server} 
              color="yellow"
              subtitle="CPU utilization"
            />
          </div>

          {/* System Performance & Alerts */}
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1rem' }}>
              <div className="card-header bg-white border-0 pb-0">
                <h5 className="fw-bold mb-0 d-flex align-items-center">
                  <BarChart3 size={20} className="me-2" style={{ color: '#667eea' }} />
                  System Performance
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="row g-4">
                  <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded-3">
                      <span className="fw-medium">Uptime</span>
                      <span className="fw-bold text-success">{systemData?.uptime || '0%'}</span>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded-3">
                      <span className="fw-medium">Response Time</span>
                      <span className="fw-bold">{systemData?.responseTime || '0ms'}</span>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded-3">
                      <span className="fw-medium">Memory Usage</span>
                      <span className="fw-bold">68%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1rem' }}>
              <div className="card-header bg-white border-0 pb-0">
                <h5 className="fw-bold mb-0 d-flex align-items-center">
                  <Bell size={20} className="me-2" style={{ color: '#667eea' }} />
                  Recent Alerts
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="d-flex align-items-center p-3 bg-warning bg-opacity-10 rounded-3 mb-3">
                  <AlertTriangle size={20} className="text-warning me-3" />
                  <div className="flex-grow-1">
                    <p className="fw-medium mb-1">Database response time increased</p>
                    <p className="text-muted small mb-0">30 minutes ago</p>
                  </div>
                </div>
                <div className="d-flex align-items-center p-3 bg-success bg-opacity-10 rounded-3">
                  <CheckCircle size={20} className="text-success me-3" />
                  <div className="flex-grow-1">
                    <p className="fw-medium mb-1">Backup completed successfully</p>
                    <p className="text-muted small mb-0">2 hours ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="col-12">
            <div className="card border-0 shadow-sm" style={{ borderRadius: '1rem' }}>
              <div className="card-header bg-white border-0 pb-0">
                <h5 className="fw-bold mb-0">Quick Actions</h5>
              </div>
              <div className="card-body p-4">
                <div className="row g-3">
                  <div className="col-md-3">
                    <button 
                      className="btn w-100 py-4 border-0 text-white fw-semibold" 
                      style={{ 
                        borderRadius: '1rem', 
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                      }}
                      onClick={() => setActiveTab('users')}
                    >
                      <UserPlus size={28} className="mb-2 d-block mx-auto" />
                      <div>Manage Users</div>
                      <small className="opacity-75">Add or edit user accounts</small>
                    </button>
                  </div>
                  
                  <div className="col-md-3">
                    <button 
                      className="btn btn-outline-primary w-100 py-4 fw-semibold" 
                      style={{ borderRadius: '1rem' }}
                      onClick={() => setActiveTab('config')}
                    >
                      <Settings size={28} className="mb-2 d-block mx-auto" />
                      <div>System Config</div>
                      <small className="text-muted">Configure system settings</small>
                    </button>
                  </div>
                  
                  <div className="col-md-3">
                    <button 
                      className="btn btn-outline-success w-100 py-4 fw-semibold" 
                      style={{ borderRadius: '1rem' }}
                      onClick={() => setActiveTab('backup')}
                    >
                      <Database size={28} className="mb-2 d-block mx-auto" />
                      <div>Backup Data</div>
                      <small className="text-muted">Manage system backups</small>
                    </button>
                  </div>
                  
                  <div className="col-md-3">
                    <button 
                      className="btn btn-outline-warning w-100 py-4 fw-semibold" 
                      style={{ borderRadius: '1rem' }}
                      onClick={() => setActiveTab('security')}
                    >
                      <Shield size={28} className="mb-2 d-block mx-auto" />
                      <div>Security Audit</div>
                      <small className="text-muted">Review security status</small>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUserManagement = () => (
    <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', padding: '2rem 0' }}>
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <div className="card border-0 shadow-sm" style={{ borderRadius: '1rem' }}>
              <div className="card-header border-0" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <div className="d-flex justify-content-between align-items-center">
                  <h3 className="text-white mb-0 d-flex align-items-center">
                    <Users size={24} className="me-2" />
                    User Management
                  </h3>
                  <div className="d-flex gap-2">
                    <button className="btn btn-light fw-semibold">
                      <UserPlus size={16} className="me-1" />
                      Add User
                    </button>
                    <button className="btn btn-outline-light">
                      <Download size={16} className="me-1" />
                      Export
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="card-body p-0">
                {/* Search and Filters */}
                <div className="p-4 border-bottom bg-light">
                  <div className="row g-3 align-items-center">
                    <div className="col-md-4">
                      <div className="position-relative">
                        <Search size={16} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                        <input 
                          type="text" 
                          placeholder="Search users..." 
                          className="form-control ps-5"
                          style={{ borderRadius: '0.75rem' }}
                        />
                      </div>
                    </div>
                    <div className="col-md-3">
                      <select className="form-select" style={{ borderRadius: '0.75rem' }}>
                        <option>All Roles</option>
                        <option>Students</option>
                        <option>Doctors</option>
                        <option>Admin</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <select className="form-select" style={{ borderRadius: '0.75rem' }}>
                        <option>All Status</option>
                        <option>Active</option>
                        <option>Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Users Table */}
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="fw-semibold text-muted py-3 ps-4">Name</th>
                        <th className="fw-semibold text-muted py-3">Email</th>
                        <th className="fw-semibold text-muted py-3">Role</th>
                        <th className="fw-semibold text-muted py-3">Status</th>
                        <th className="fw-semibold text-muted py-3">Last Login</th>
                        <th className="fw-semibold text-muted py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => (
                        <tr key={user.id}>
                          <td className="py-3 ps-4">
                            <div className="d-flex align-items-center">
                              <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-3">
                                <User size={16} className="text-primary" />
                              </div>
                              <span className="fw-medium">{user.name}</span>
                            </div>
                          </td>
                          <td className="py-3 text-muted">{user.email}</td>
                          <td className="py-3">
                            <span className={`badge px-3 py-2 ${
                              user.role === 'admin' ? 'bg-purple bg-opacity-10 text-purple' :
                              user.role === 'doctor' ? 'bg-success bg-opacity-10 text-success' :
                              'bg-primary bg-opacity-10 text-primary'
                            }`} style={{ borderRadius: '0.5rem' }}>
                              {user.role}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className={`badge px-3 py-2 ${
                              user.status === 'active' ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'
                            }`} style={{ borderRadius: '0.5rem' }}>
                              {user.status}
                            </span>
                          </td>
                          <td className="py-3 text-muted">{user.lastLogin}</td>
                          <td className="py-3">
                            <div className="d-flex gap-2">
                              <button className="btn btn-sm btn-outline-primary" style={{ borderRadius: '0.5rem' }}>
                                <Eye size={14} />
                              </button>
                              <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: '0.5rem' }}>
                                <Edit size={14} />
                              </button>
                              <button className="btn btn-sm btn-outline-danger" style={{ borderRadius: '0.5rem' }}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSystemConfiguration = () => (
    <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', padding: '2rem 0' }}>
      <div className="container-fluid">
        <div className="row g-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm" style={{ borderRadius: '1rem' }}>
              <div className="card-header border-0" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <h3 className="text-white mb-0 d-flex align-items-center">
                  <Settings size={24} className="me-2" />
                  System Configuration
                </h3>
              </div>
            </div>
          </div>
          
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1rem' }}>
              <div className="card-header bg-white border-0">
                <h5 className="fw-bold mb-0 d-flex align-items-center">
                  <Settings size={20} className="me-2 text-primary" />
                  General Settings
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="mb-4">
                  <label className="form-label fw-semibold">Site Name</label>
                  <input 
                    type="text" 
                    value="University Management System" 
                    className="form-control form-control-lg" 
                    style={{ borderRadius: '0.75rem' }}
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label fw-semibold">Timezone</label>
                  <select className="form-select form-select-lg" style={{ borderRadius: '0.75rem' }}>
                    <option>UTC</option>
                    <option>EST</option>
                    <option>PST</option>
                  </select>
                </div>
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" id="maintenance" />
                  <label className="form-check-label fw-medium" htmlFor="maintenance">
                    Maintenance Mode
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1rem' }}>
              <div className="card-header bg-white border-0">
                <h5 className="fw-bold mb-0 d-flex align-items-center">
                  <Shield size={20} className="me-2 text-success" />
                  Security Settings
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="mb-4">
                  <label className="form-label fw-semibold">Password Min Length</label>
                  <input 
                    type="number" 
                    value="8" 
                    className="form-control form-control-lg" 
                    style={{ borderRadius: '0.75rem' }}
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label fw-semibold">Session Timeout (minutes)</label>
                  <input 
                    type="number" 
                    value="1440" 
                    className="form-control form-control-lg" 
                    style={{ borderRadius: '0.75rem' }}
                  />
                </div>
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" id="2fa" defaultChecked />
                  <label className="form-check-label fw-medium" htmlFor="2fa">
                    Enable Two-Factor Authentication
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 text-end">
            <button className="btn btn-lg px-5 text-white fw-semibold" 
                    style={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '0.75rem',
                      border: 'none'
                    }}>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBackupRecovery = () => (
    <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', padding: '2rem 0' }}>
      <div className="container-fluid">
        <div className="row g-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm" style={{ borderRadius: '1rem' }}>
              <div className="card-header border-0" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <div className="d-flex justify-content-between align-items-center">
                  <h3 className="text-white mb-0 d-flex align-items-center">
                    <Database size={24} className="me-2" />
                    Backup & Recovery
                  </h3>
                  <button className="btn btn-light fw-semibold">
                    <Plus size={16} className="me-1" />
                    Create Backup
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Backup Cards */}
          <div className="col-lg-4">
            <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1rem' }}>
              <div className="card-header bg-white border-0">
                <h5 className="fw-bold mb-0 d-flex align-items-center">
                  <Database size={20} className="me-2 text-primary" />
                  Database Backup
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="mb-3">
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Last Backup:</span>
                    <span className="fw-medium">2 hours ago</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Size:</span>
                    <span className="fw-medium">2.8 GB</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Status:</span>
                    <span className="fw-medium text-success">Healthy</span>
                  </div>
                </div>
                <button className="btn btn-outline-primary w-100" style={{ borderRadius: '0.75rem' }}>
                  Backup Now
                </button>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1rem' }}>
              <div className="card-header bg-white border-0">
                <h5 className="fw-bold mb-0 d-flex align-items-center">
                  <HardDrive size={20} className="me-2 text-info" />
                  File System
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="mb-3">
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Last Backup:</span>
                    <span className="fw-medium">Daily at 2:00 AM</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Size:</span>
                    <span className="fw-medium">1.6 GB</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Status:</span>
                    <span className="fw-medium text-success">Scheduled</span>
                  </div>
                </div>
                <button className="btn btn-outline-info w-100" style={{ borderRadius: '0.75rem' }}>
                  Configure
                </button>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1rem' }}>
              <div className="card-header bg-white border-0">
                <h5 className="fw-bold mb-0 d-flex align-items-center">
                  <Upload size={20} className="me-2 text-warning" />
                  Recovery
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="mb-3">
                  <p className="text-muted mb-3">Restore system from backup</p>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Available Backups:</span>
                    <span className="fw-medium">15</span>
                  </div>
                </div>
                <button className="btn btn-warning w-100 fw-semibold" style={{ borderRadius: '0.75rem' }}>
                  Restore System
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecurityAudit = () => (
    <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', padding: '2rem 0' }}>
      <div className="container-fluid">
        <div className="row g-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm" style={{ borderRadius: '1rem' }}>
              <div className="card-header border-0" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <h3 className="text-white mb-0 d-flex align-items-center">
                  <Shield size={24} className="me-2" />
                  Security Audit
                </h3>
              </div>
            </div>
          </div>
          
          {/* Security Stats */}
          <div className="col-lg-3 col-md-6">
            <StatCard 
              title="Failed Logins" 
              value="234" 
              icon={AlertTriangle} 
              color="red"
              subtitle="Last 24 hours"
            />
          </div>
          <div className="col-lg-3 col-md-6">
            <StatCard 
              title="Blocked IPs" 
              value="12" 
              icon={Shield} 
              color="orange"
              subtitle="Currently blocked"
            />
          </div>
          <div className="col-lg-3 col-md-6">
            <StatCard 
              title="Security Score" 
              value="94/100" 
              icon={CheckCircle} 
              color="green"
              subtitle="Excellent"
            />
          </div>
          <div className="col-lg-3 col-md-6">
            <StatCard 
              title="Last Scan" 
              value="12h ago" 
              icon={Clock} 
              color="blue"
              subtitle="All systems scanned"
            />
          </div>

          {/* Security Events */}
          <div className="col-12">
            <div className="card border-0 shadow-sm" style={{ borderRadius: '1rem' }}>
              <div className="card-header bg-white border-0">
                <h5 className="fw-bold mb-0">Security Events</h5>
              </div>
              <div className="card-body p-4">
                {[
                  { type: 'Failed Login', user: 'unknown@attacker.com', ip: '192.168.1.100', time: '5 min ago', severity: 'high' },
                  { type: 'Password Reset', user: 'john@university.edu', ip: '10.0.0.25', time: '1 hour ago', severity: 'medium' },
                  { type: 'Admin Login', user: 'admin@university.edu', ip: '192.168.1.50', time: '2 hours ago', severity: 'low' }
                ].map((event, index) => (
                  <div key={index} className="d-flex align-items-center justify-content-between p-3 border rounded-3 mb-3 bg-light">
                    <div className="d-flex align-items-center">
                      <AlertTriangle size={20} className={`me-3 ${
                        event.severity === 'high' ? 'text-danger' :
                        event.severity === 'medium' ? 'text-warning' : 'text-success'
                      }`} />
                      <div>
                        <p className="fw-medium mb-1">{event.type}</p>
                        <p className="text-muted small mb-0">{event.user} from {event.ip}</p>
                      </div>
                    </div>
                    <div className="text-end">
                      <p className="text-muted small mb-1">{event.time}</p>
                      <span className={`badge px-2 py-1 ${
                        event.severity === 'high' ? 'bg-danger bg-opacity-10 text-danger' :
                        event.severity === 'medium' ? 'bg-warning bg-opacity-10 text-warning' : 
                        'bg-success bg-opacity-10 text-success'
                      }`} style={{ borderRadius: '0.5rem' }}>
                        {event.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderReports = () => (
    <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', padding: '2rem 0' }}>
      <div className="container-fluid">
        <div className="row g-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm" style={{ borderRadius: '1rem' }}>
              <div className="card-header border-0" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <div className="d-flex justify-content-between align-items-center">
                  <h3 className="text-white mb-0 d-flex align-items-center">
                    <FileText size={24} className="me-2" />
                    Reports & Analytics
                  </h3>
                  <button className="btn btn-light fw-semibold">
                    <Plus size={16} className="me-1" />
                    Generate Report
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Analytics Cards */}
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1rem' }}>
              <div className="card-header bg-white border-0">
                <h5 className="fw-bold mb-0">User Analytics</h5>
              </div>
              <div className="card-body p-4">
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-muted">Total Users</span>
                    <span className="fw-bold">1,250</span>
                  </div>
                  <div className="progress mb-3" style={{ height: '8px', borderRadius: '4px' }}>
                    <div className="progress-bar bg-primary" role="progressbar" style={{ width: '78%' }}></div>
                  </div>
                  <div className="d-flex justify-content-between text-muted small">
                    <span>Students: 78%</span>
                    <span>Staff: 22%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1rem' }}>
              <div className="card-header bg-white border-0">
                <h5 className="fw-bold mb-0">System Usage</h5>
              </div>
              <div className="card-body p-4">
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="text-muted">Daily Active Users</span>
                    <span className="fw-bold">890</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="text-muted">Peak Hours</span>
                    <span className="fw-bold">9-10 AM</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted">Avg Session</span>
                    <span className="fw-bold">24 mins</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Available Reports */}
          <div className="col-12">
            <div className="card border-0 shadow-sm" style={{ borderRadius: '1rem' }}>
              <div className="card-header bg-white border-0">
                <h5 className="fw-bold mb-0">Available Reports</h5>
              </div>
              <div className="card-body p-4">
                <div className="row g-4">
                  {[
                    { name: 'User Activity Report', description: 'Detailed user engagement metrics', icon: Users, color: 'primary' },
                    { name: 'Security Audit Report', description: 'Comprehensive security analysis', icon: Shield, color: 'success' },
                    { name: 'System Performance', description: 'Server and application metrics', icon: Activity, color: 'info' },
                    { name: 'Usage Statistics', description: 'Feature usage and adoption rates', icon: BarChart3, color: 'warning' },
                    { name: 'Financial Report', description: 'Cost analysis and budget tracking', icon: FileText, color: 'secondary' },
                    { name: 'Compliance Report', description: 'Regulatory compliance status', icon: CheckCircle, color: 'success' }
                  ].map((report, index) => (
                    <div key={index} className="col-md-6 col-lg-4">
                      <div className="card border h-100" style={{ borderRadius: '0.75rem' }}>
                        <div className="card-body p-4 text-center">
                          <div className={`d-inline-flex align-items-center justify-content-center mb-3`} 
                               style={{ 
                                 width: '60px', 
                                 height: '60px', 
                                 backgroundColor: getBackgroundColor(report.color), 
                                 borderRadius: '50%' 
                               }}>
                            <report.icon size={24} style={{ color: getColorClass(report.color) }} />
                          </div>
                          <h6 className="fw-bold mb-2">{report.name}</h6>
                          <p className="text-muted small mb-3">{report.description}</p>
                          <button className={`btn btn-outline-${report.color} w-100`} style={{ borderRadius: '0.5rem' }}>
                            Generate
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'config', label: 'System Config', icon: Settings },
    { id: 'backup', label: 'Backup & Recovery', icon: Database },
    { id: 'security', label: 'Security Audit', icon: Shield },
    { id: 'reports', label: 'Reports', icon: FileText }
  ];

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted fs-5">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      {/* Header */}
      <div className="bg-white shadow-sm border-bottom">
        <div className="container-fluid px-4">
          <div className="d-flex justify-content-between align-items-center py-4">
            <div>
              <div className="d-flex align-items-center mb-2">
                <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-3">
                  <Shield size={24} className="text-primary" />
                </div>
                <div>
                  <h2 className="fw-bold mb-0">Admin Dashboard</h2>
                  <p className="text-muted mb-0">Welcome back, {user.name}</p>
                </div>
              </div>
            </div>
            <div className="d-flex align-items-center gap-3">
              <div className="d-flex align-items-center text-success small">
                <div className="bg-success rounded-circle me-2" style={{ width: '8px', height: '8px', animation: 'pulse 2s infinite' }}></div>
                <span className="fw-medium">System Online</span>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="btn btn-outline-danger fw-semibold px-4"
                  style={{ borderRadius: '0.75rem' }}
                >
                  <User size={16} className="me-1" />
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="container-fluid px-4 py-4">
        <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '1rem' }}>
          <div className="card-body p-3">
            <nav className="nav nav-pills nav-fill gap-2">
              {tabs.map(tab => (
                <TabButton
                  key={tab.id}
                  id={tab.id}
                  label={tab.label}
                  icon={tab.icon}
                  isActive={activeTab === tab.id}
                  onClick={setActiveTab}
                />
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'users' && renderUserManagement()}
        {activeTab === 'config' && renderSystemConfiguration()}
        {activeTab === 'backup' && renderBackupRecovery()}
        {activeTab === 'security' && renderSecurityAudit()}
        {activeTab === 'reports' && renderReports()}
      </div>
    </div>
  );
};

export default AdminDashboard;