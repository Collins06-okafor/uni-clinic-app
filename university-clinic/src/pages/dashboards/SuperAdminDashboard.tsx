import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Settings, Activity, Calendar, Building, 
  AlertTriangle, Trash2, Plus, Edit, RefreshCw,
  CalendarDays, Clock, CheckCircle, X, Save,
  UserCog, LogOut, Globe, School, Eye, EyeOff,
  TrendingUp, TrendingDown, FileText, Award
} from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import api from "../../services/api";
import { useTranslation } from 'react-i18next';
import i18n from "../../services/i18n";
import ClinicSettingsManager from '../../components/ClinicSettingsManager';

// Type definitions
interface User {
  id: string | number;
  name: string;
  email: string;
  role: string;
  department?: string;
  department_id?: string | number;
  staff_type?: string;
  status?: string;
  created_at?: string;
}

interface Department {
  id: string | number;
  name: string;
  code: string;
  type: string;
  description?: string;
  is_active: boolean;
  staff_count?: number;
}

interface Holiday {
  id: string | number;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  type: string;
  affects_staff_type: string;
  affected_departments?: number[];
  blocks_appointments: boolean;
  is_active?: boolean;
  academic_year?: number;
}

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface SuperAdminDashboardProps {
  user: { name?: string };
  onLogout: () => void;
}

const EnhancedSuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ user, onLogout }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);

  // NEW: KPI Dashboard States
  const [kpiStats, setKpiStats] = useState<any>(null);
  const [kpiLoading, setKpiLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [timeframe, setTimeframe] = useState('today'); // 'today', 'week', 'month'

  // Calendar source form
  const [calendarSourceForm, setCalendarSourceForm] = useState({
    name: "",
    url: "",
    type: "pdf" as const,
    pattern: "",
    priority: 1
  });

  // User creation form
  const [userForm, setUserForm] = useState({ 
    name: "", 
    email: "", 
    password: "", 
    role: "doctor",
    department_id: "",
    staff_type: "clinical"
  });

  // Department creation form  
  const [departmentForm, setDepartmentForm] = useState({
    name: "",
    code: "",
    description: "",
    type: "medical"
  });

  // Holiday creation form
  const [holidayForm, setHolidayForm] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    type: "semester_break",
    affects_staff_type: "all",
    affected_departments: [] as number[],
    blocks_appointments: true
  });

  const universityTheme = {
  primary: '#1e40af',
  secondary: '#059669',
  accent: '#dc3545', // Red color for active states
  light: '#e0f2fe',
  gradient: 'linear-gradient(135deg, #dc3545 0%, #b91c1c 100%)' // Red gradient instead of the previous one
};

  const handleLogout = () => {
    if (onLogout) onLogout();
    navigate("/login", { replace: true });
  };

  // NEW: Fetch KPI Stats
  const fetchKPIStats = async () => {
    setKpiLoading(true);
    try {
      const response = await api.get(
        `/superadmin/dashboard-stats?date=${selectedDate}&month=${selectedMonth}&year=${selectedYear}`
      );
      setKpiStats(response);
    } catch (error: any) {
      console.error('Error fetching KPI stats:', error);
      setMessage('Failed to load dashboard statistics');
      setMessageType('error');
    } finally {
      setKpiLoading(false);
    }
  };

  // Fetch all data
  const fetchData = async () => {
    setLoading(true);
    try {
      console.log('Starting data fetch...');
      
      // Fetch users
      try {
        console.log('Fetching users...');
        const usersRes = await api.get("/superadmin/users");
        console.log('Users response:', usersRes);
        console.log('Users length:', usersRes.length);
        
        setUsers(usersRes || []);
        console.log('Users set successfully');
      } catch (userError) {
        console.error('User fetch error:', userError);
        setUsers([]);
      }
      
      // Fetch departments
      try {
        console.log('Fetching departments...');
        const departmentsRes = await api.get("/departments");
        console.log('Departments response:', departmentsRes);
        console.log('Departments length:', departmentsRes.length);
        
        setDepartments(departmentsRes || []);
        console.log('Departments set successfully');
      } catch (depError) {
        console.error('Department fetch error:', depError);
        setDepartments([]);
      }
      
      // Fetch holidays
      try {
        console.log('Fetching holidays...');
        const holidaysRes = await api.get("/holidays");
        console.log('Holidays response:', holidaysRes);
        console.log('Holidays array length:', holidaysRes.holidays?.length);
        
        setHolidays(holidaysRes.holidays || []);
        console.log('Holidays set successfully');
      } catch (holError) {
        console.error('Holiday fetch error:', holError);
        setHolidays([]);
      }
      
      setMessage(t('superadmin.data_loaded_success'));
      setMessageType('success');
    } catch (error: any) {
      console.error('General fetch error:', error);
      setMessage(t('superadmin.data_load_error'));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Create user
  const createUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...userForm,
        department_id: userForm.department_id || null
      };
      
      await api.post("/superadmin/users", payload);
      setUserForm({ 
        name: "", 
        email: "", 
        password: "", 
        role: "doctor", 
        department_id: "", 
        staff_type: "clinical" 
      });
      setMessage(t('superadmin.user_created_success'));
      setMessageType('success');
      fetchData();
    } catch (error: any) {
      setMessage(error.response?.data?.message || t('superadmin.user_create_error'));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Create department
  const createDepartment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      await api.post("/departments", departmentForm);
      setDepartmentForm({
        name: "",
        code: "",
        description: "",
        type: "medical"
      });
      setMessage(t('superadmin.department_created_success'));
      setMessageType('success');
      fetchData();
    } catch (error: any) {
      setMessage(error.response?.data?.message || t('superadmin.department_create_error'));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Update department
  const updateDepartment = async (department: Department) => {
    setLoading(true);
    try {
      await api.put(`/departments/${department.id}`, {
        name: department.name,
        code: department.code,
        description: department.description,
        type: department.type,
        is_active: department.is_active
      });
      setEditingDepartment(null);
      setMessage(t('superadmin.department_updated_success'));
      setMessageType('success');
      fetchData();
    } catch (error: any) {
      setMessage(error.response?.data?.message || t('superadmin.department_update_error'));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Create holiday
  const createHoliday = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      await api.post("/holidays", holidayForm);
      setHolidayForm({
        name: "",
        description: "",
        start_date: "",
        end_date: "",
        type: "semester_break",
        affects_staff_type: "all",
        affected_departments: [],
        blocks_appointments: true
      });
      setMessage(t('superadmin.holiday_created_success'));
      setMessageType('success');
      fetchData();
    } catch (error: any) {
      setMessage(error.response?.data?.message || t('superadmin.holiday_create_error'));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Update holiday
  const updateHoliday = async (holiday: Holiday) => {
    setLoading(true);
    try {
      await api.put(`/holidays/${holiday.id}`, {
        name: holiday.name,
        description: holiday.description,
        start_date: holiday.start_date,
        end_date: holiday.end_date,
        type: holiday.type,
        affects_staff_type: holiday.affects_staff_type,
        affected_departments: holiday.affected_departments,
        blocks_appointments: holiday.blocks_appointments,
        is_active: holiday.is_active
      });
      setEditingHoliday(null);
      setMessage(t('superadmin.holiday_updated_success'));
      setMessageType('success');
      fetchData();
    } catch (error: any) {
      setMessage(error.response?.data?.message || t('superadmin.holiday_update_error'));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const syncCalendar = async () => {
    setLoading(true);
    try {
      const response = await api.post("/holidays/sync-calendar", { 
        year: new Date().getFullYear() 
      });
      
      const { synced_holidays, updated_holidays, message } = response;
      setMessage(
        `${message}. ${t('superadmin.sync_stats', { synced: synced_holidays || 0, updated: updated_holidays || 0 })}`
      );
      setMessageType('success');
      fetchData();
    } catch (error: any) {
      setMessage(error.response?.data?.message || t('superadmin.calendar_sync_error'));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Delete user
  const deleteUser = async (userId: string | number) => {
    if (!window.confirm(t('superadmin.confirm_delete_user'))) return;
    
    setLoading(true);
    try {
      await api.delete(`/superadmin/users/${userId}`);
      setMessage(t('superadmin.user_deleted_success'));
      setMessageType('success');
      fetchData();
    } catch (error: any) {
      setMessage(error.response?.data?.message || t('superadmin.user_delete_error'));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Delete department
  const deleteDepartment = async (departmentId: string | number) => {
    if (!window.confirm(t('superadmin.confirm_deactivate_department'))) return;
    
    setLoading(true);
    try {
      await api.delete(`/departments/${departmentId}`);
      setMessage(t('superadmin.department_deactivated_success'));
      setMessageType('success');
      fetchData();
    } catch (error: any) {
      setMessage(error.response?.data?.message || t('superadmin.department_deactivate_error'));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Delete holiday
  const deleteHoliday = async (holidayId: string | number) => {
    if (!window.confirm(t('superadmin.confirm_delete_holiday'))) return;
    
    setLoading(true);
    try {
      await api.delete(`/holidays/${holidayId}`);
      setMessage(t('superadmin.holiday_deleted_success'));
      setMessageType('success');
      fetchData();
    } catch (error: any) {
      setMessage(error.response?.data?.message || t('superadmin.holiday_delete_error'));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const changeLanguage = (language: string) => {
    i18n.changeLanguage(language);
    localStorage.setItem('language', language);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return t('common.na');
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const testCalendarSource = async (sourceId: number) => {
    setLoading(true);
    try {
      const response = await api.post(`/calendar-sources/${sourceId}/test`);
      setMessage(t('superadmin.calendar_test_success', { message: response.message || t('common.success') }));
      setMessageType('success');
    } catch (error: any) {
      setMessage(error.response?.data?.message || t('superadmin.calendar_test_error'));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const checkNewCalendars = async () => {
    setLoading(true);
    try {
      const response = await api.post("/calendar-sources/check-new");
      setMessage(t('superadmin.new_calendars_found', { count: response.new_calendars?.length || 0 }));
      setMessageType('success');
    } catch (error: any) {
      setMessage(error.response?.data?.message || t('superadmin.check_calendars_error'));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

   useEffect(() => {
    fetchData();
    fetchKPIStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchKPIStats();
    }
  }, [selectedDate, selectedMonth, selectedYear, activeTab]);

  // NEW: Get current stats based on timeframe
  const getCurrentStats = () => {
    if (!kpiStats) return null;
    
    switch (timeframe) {
      case 'today':
        return kpiStats.daily_stats;
      case 'week':
        return kpiStats.weekly_stats;
      case 'month':
        return kpiStats.monthly_stats;
      default:
        return kpiStats.daily_stats;
    }
  };

  // NEW: Chart Data Configurations
  const getChartData = () => {
    if (!kpiStats || !kpiStats.appointment_trends) return null;

    const trendData = {
      labels: kpiStats.appointment_trends.map((t: any) => t.date),
      datasets: [
        {
          label: 'Completed',
          data: kpiStats.appointment_trends.map((t: any) => t.completed || 0),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.4,
        },
        {
          label: 'Cancelled',
          data: kpiStats.appointment_trends.map((t: any) => t.cancelled || 0),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4,
        },
        {
          label: 'Scheduled',
          data: kpiStats.appointment_trends.map((t: any) => t.scheduled || 0),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
        }
      ]
    };

    const currentStats = getCurrentStats();
    const statusData = {
      labels: ['Completed', 'Scheduled', 'Cancelled', 'No Show', 'In Progress'],
      datasets: [{
        data: [
          currentStats?.completed || 0,
          currentStats?.scheduled || 0,
          currentStats?.cancelled || 0,
          currentStats?.no_show || 0,
          currentStats?.in_progress || 0
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(249, 115, 22, 0.8)',
          'rgba(168, 85, 247, 0.8)',
        ],
        borderWidth: 2,
      }]
    };

    return { trendData, statusData };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      }
    }
  };

  const NavTab = ({ tabKey, icon: Icon, label, isActive, onClick }: {
  tabKey: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  isActive: boolean;
  onClick: (tabKey: string) => void;
}) => (
  <button
    className={`nav-link btn ${isActive ? 'active' : ''}`}
    style={{
      borderRadius: '8px', // Consistent border radius
      border: 'none',
      margin: 0,
      padding: '10px 16px', // Better padding proportions
      fontWeight: 600,
      transition: 'all 0.3s ease',
      backgroundColor: isActive ? '#dc3545' : 'transparent', // Red for active
      color: isActive ? 'white' : '#495057', // Better neutral color
      display: 'flex',
      alignItems: 'center',
      gap: '6px', // Space between icon and text
      minHeight: '44px', // Consistent button height
      marginLeft: '4px',
      marginRight: '4px'
    }}
    onClick={() => onClick(tabKey)}
    onMouseEnter={(e) => {
      if (!isActive) {
        e.currentTarget.style.backgroundColor = 'rgba(220, 53, 69, 0.1)'; // Light red hover
        e.currentTarget.style.color = '#dc3545'; // Red text on hover
      }
    }}
    onMouseLeave={(e) => {
      if (!isActive) {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = '#495057'; // Back to neutral
      }
    }}
  >
    <Icon size={18} />
    <span>{label}</span>
  </button>
);

  const currentStats = getCurrentStats();
  const chartData = getChartData();

  return (
    <div className="min-vh-100" style={{ backgroundColor: '#f8f9fa' }}>
      {/* Enhanced Header with Navigation */}
      <nav 
        className="navbar navbar-expand-lg navbar-light mb-4" 
        style={{ 
          background: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          position: 'sticky',
          top: 0,
          zIndex: 1030,
          minHeight: '80px'
        }}
      >
        <div className="container-fluid">
          {/* Left: Brand */}
          <div className="navbar-brand d-flex align-items-center">
            <img
              src="/logo6.png"
              alt={t('login.brand_name')}
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '8px',
                objectFit: 'cover',
                marginRight: '15px'
              }}
            />
            <div>
              <div className="fw-bold" style={{ color: '#212529', fontSize: '1.25rem' }}>
                {t('login.brand_name')}
              </div>
              <small style={{ color: '#6c757d' }}>{t('superadmin.portal')}</small>
            </div>
          </div>

          {/* Center: Navigation Tabs */}
          <div className="navbar-nav d-flex flex-row mx-auto">
            <NavTab 
              tabKey="dashboard" 
              icon={Activity} 
              label={t('superadmin.dashboard')} 
              isActive={activeTab === 'dashboard'}
              onClick={setActiveTab}
            />
            <NavTab 
              tabKey="users" 
              icon={Users} 
              label={t('superadmin.users')} 
              isActive={activeTab === 'users'}
              onClick={setActiveTab}
            />
            <NavTab 
              tabKey="departments" 
              icon={Building} 
              label={t('superadmin.departments')} 
              isActive={activeTab === 'departments'}
              onClick={setActiveTab}
            />
            <NavTab 
              tabKey="holidays" 
              icon={Calendar} 
              label={t('superadmin.academic_calendar')} 
              isActive={activeTab === 'holidays'}
              onClick={setActiveTab}
            />
            <NavTab 
              tabKey="settings" 
              icon={Settings} 
              label={t('nav.settings', 'Clinic Settings')} 
              isActive={activeTab === 'settings'}
              onClick={setActiveTab}
            />
          </div>
          
          {/* Right: Controls */}
<div className="d-flex align-items-center gap-3">
  <button 
    className="btn btn-outline-primary btn-sm"
    onClick={fetchData}
    disabled={loading}
  >
    <RefreshCw size={16} className={`me-1 ${loading ? 'spin' : ''}`} />
    {t('refresh')}
  </button>

  {/* User Profile Dropdown with Language inside */}
  <div className="dropdown">
    <button 
      className="btn btn-light dropdown-toggle d-flex align-items-center" 
      data-bs-toggle="dropdown"
      style={{ borderRadius: '25px', border: '2px solid #dee2e6' }}
    >
      <UserCog size={18} className="me-2" />
      {/* Removed name display */}
    </button>
    <ul className="dropdown-menu dropdown-menu-end" style={{ minWidth: '280px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderRadius: '12px', padding: '8px 0' }}>
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
            <UserCog size={20} />
          </div>
          <div>
            <div className="fw-semibold">{user?.name || 'SuperAdmin'}</div>
            <small className="text-muted">System Administrator</small>
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
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          onClick={() => changeLanguage('en')}
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
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          onClick={() => changeLanguage('tr')}
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
      
      {/* Logout */}
      <li>
        <button 
          className="dropdown-item d-flex align-items-center text-danger" 
          onClick={handleLogout}
          style={{
            padding: '12px 20px',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <LogOut size={16} className="me-3" />
          {t('nav.logout')}
        </button>
      </li>
    </ul>
  </div>
</div>
        </div>
      </nav>

      <div className="container-fluid px-4">
        {/* Alert Messages */}
        {message && (
          <div className="row mb-4">
            <div className="col-12">
              <div className={`alert alert-${messageType === 'success' ? 'success' : 'danger'} alert-dismissible`}>
                {message}
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setMessage("")}
                ></button>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <>
            {/* Date & Timeframe Selectors */}
            <div className="row mb-4">
              <div className="col-12">
                <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
                  <div className="card-body">
                    <div className="row g-3 align-items-center">
                      <div className="col-md-3">
                        <label className="form-label fw-semibold">Select Date</label>
                        <input
                          type="date"
                          className="form-control"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                        />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label fw-semibold">Month</label>
                        <select
                          className="form-select"
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        >
                          {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                              {new Date(2024, i).toLocaleString('default', { month: 'long' })}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-2">
                        <label className="form-label fw-semibold">Year</label>
                        <select
                          className="form-select"
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        >
                          {Array.from({ length: 5 }, (_, i) => {
                            const year = new Date().getFullYear() - 2 + i;
                            return <option key={year} value={year}>{year}</option>;
                          })}
                        </select>
                      </div>
                      <div className="col-md-5">
                        <label className="form-label fw-semibold">View By</label>
                        <div className="btn-group w-100" role="group">
                          <button
                            className={`btn ${timeframe === 'today' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setTimeframe('today')}
                          >
                            Today
                          </button>
                          <button
                            className={`btn ${timeframe === 'week' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setTimeframe('week')}
                          >
                            This Week
                          </button>
                          <button
                            className={`btn ${timeframe === 'month' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setTimeframe('month')}
                          >
                            This Month
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {kpiLoading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading statistics...</span>
                </div>
              </div>
            ) : kpiStats && currentStats ? (
              <>
                {/* Main KPI Cards */}
                <div className="row g-4 mb-4">
                  <div className="col-md-3">
                    <div className="card border-0 shadow-sm h-100">
                      <div className="card-body text-center">
                        <Calendar size={32} className="text-primary mb-2" />
                        <h3 className="fw-bold mb-1">{currentStats.total_appointments || 0}</h3>
                        <p className="text-muted mb-0">Total Appointments</p>
                        <small className="text-muted">
                          {timeframe === 'today' && 'Today'}
                          {timeframe === 'week' && 'This Week'}
                          {timeframe === 'month' && 'This Month'}
                        </small>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-3">
                    <div className="card border-0 shadow-sm h-100">
                      <div className="card-body text-center">
                        <CheckCircle size={32} className="text-success mb-2" />
                        <h3 className="fw-bold mb-1">{currentStats.completed || 0}</h3>
                        <p className="text-muted mb-0">Completed</p>
                        <small className="text-success">
                          {currentStats.completion_rate || 0}% completion rate
                        </small>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-3">
                    <div className="card border-0 shadow-sm h-100">
                      <div className="card-body text-center">
                        <X size={32} className="text-danger mb-2" />
                        <h3 className="fw-bold mb-1">{currentStats.cancelled || 0}</h3>
                        <p className="text-muted mb-0">Cancelled</p>
                        <small className="text-danger">
                          {currentStats.cancellation_rate || 0}% cancellation rate
                        </small>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-3">
                    <div className="card border-0 shadow-sm h-100">
                      <div className="card-body text-center">
                        <Activity size={32} className="text-info mb-2" />
                        <h3 className="fw-bold mb-1">{currentStats.sessions_today || currentStats.in_progress || 0}</h3>
                        <p className="text-muted mb-0">Active Sessions</p>
                        <small className="text-info">Currently in progress</small>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Breakdown Cards */}
                <div className="row g-4 mb-4">
                  <div className="col-md-2">
                    <div className="card border-0 shadow-sm">
                      <div className="card-body text-center py-3">
                        <Clock size={24} className="text-warning mb-2" />
                        <h5 className="fw-bold mb-0">{currentStats.scheduled || 0}</h5>
                        <small className="text-muted">Scheduled</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card border-0 shadow-sm">
                      <div className="card-body text-center py-3">
                        <CheckCircle size={24} className="text-primary mb-2" />
                        <h5 className="fw-bold mb-0">{currentStats.confirmed || 0}</h5>
                        <small className="text-muted">Confirmed</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card border-0 shadow-sm">
                      <div className="card-body text-center py-3">
                        <Activity size={24} className="text-purple mb-2" />
                        <h5 className="fw-bold mb-0">{currentStats.in_progress || 0}</h5>
                        <small className="text-muted">In Progress</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card border-0 shadow-sm">
                      <div className="card-body text-center py-3">
                        <AlertTriangle size={24} className="text-danger mb-2" />
                        <h5 className="fw-bold mb-0">{currentStats.pending || 0}</h5>
                        <small className="text-muted">Pending</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card border-0 shadow-sm">
                      <div className="card-body text-center py-3">
                        <X size={24} className="text-secondary mb-2" />
                        <h5 className="fw-bold mb-0">{currentStats.no_show || 0}</h5>
                        <small className="text-muted">No Show</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card border-0 shadow-sm">
                      <div className="card-body text-center py-3">
                        <TrendingUp size={24} className="text-success mb-2" />
                        <h5 className="fw-bold mb-0">{currentStats.completion_rate || 0}%</h5>
                        <small className="text-muted">Success Rate</small>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Prescription Stats */}
                {kpiStats.prescription_stats && (
                  <div className="row g-4 mb-4">
                    <div className="col-md-3">
                      <div className="card border-0 shadow-sm">
                        <div className="card-body text-center">
                          <FileText size={28} className="text-warning mb-2" />
                          <h4 className="fw-bold mb-1">{kpiStats.prescription_stats.today || 0}</h4>
                          <p className="text-muted mb-0 small">Prescriptions Today</p>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="card border-0 shadow-sm">
                        <div className="card-body text-center">
                          <FileText size={28} className="text-primary mb-2" />
                          <h4 className="fw-bold mb-1">{kpiStats.prescription_stats.this_week || 0}</h4>
                          <p className="text-muted mb-0 small">Prescriptions This Week</p>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="card border-0 shadow-sm">
                        <div className="card-body text-center">
                          <FileText size={28} className="text-success mb-2" />
                          <h4 className="fw-bold mb-1">{kpiStats.prescription_stats.this_month || 0}</h4>
                          <p className="text-muted mb-0 small">Prescriptions This Month</p>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="card border-0 shadow-sm">
                        <div className="card-body text-center">
                          <Award size={28} className="text-info mb-2" />
                          <h4 className="fw-bold mb-1">{kpiStats.prescription_stats.total || 0}</h4>
                          <p className="text-muted mb-0 small">Total Prescriptions</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Charts Row */}
                {chartData && (
                  <div className="row g-4 mb-4">
                    {/* Trend Chart */}
                    <div className="col-md-8">
                      <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
                        <div className="card-header bg-white border-0">
                          <h6 className="fw-bold mb-0">Appointment Trends - {timeframe === 'month' ? 'Monthly' : 'Daily'} View</h6>
                        </div>
                        <div className="card-body">
                          <div style={{ height: '300px' }}>
                            <Line data={chartData.trendData} options={chartOptions} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status Distribution */}
                    <div className="col-md-4">
                      <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
                        <div className="card-header bg-white border-0">
                          <h6 className="fw-bold mb-0">Status Distribution</h6>
                        </div>
                        <div className="card-body">
                          <div style={{ height: '300px' }}>
                            <Doughnut 
                              data={chartData.statusData} 
                              options={{
                                ...chartOptions,
                                plugins: {
                                  legend: {
                                    position: 'bottom' as const,
                                  }
                                }
                              }} 
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* System Health & Overall Stats */}
                <div className="row g-4 mb-4">
                  <div className="col-md-12">
                    <div className="card shadow-sm border-0" style={{ borderRadius: '1rem', background: universityTheme.gradient }}>
                      <div className="card-body p-4 text-white">
                        <h5 className="mb-3">System Overview</h5>
                        <div className="row">
                          <div className="col-md-3">
                            <div className="mb-2">
                              <Users size={20} className="me-2" />
                              <strong>Total Users:</strong> {kpiStats.overall_stats?.total_users || 0}
                            </div>
                            <div className="mb-2">
                              <Users size={20} className="me-2" />
                              <strong>Doctors:</strong> {kpiStats.overall_stats?.doctors || 0}
                            </div>
                          </div>
                          <div className="col-md-3">
                            <div className="mb-2">
                              <Users size={20} className="me-2" />
                              <strong>Clinical Staff:</strong> {kpiStats.overall_stats?.clinical_staff || 0}
                            </div>
                            <div className="mb-2">
                              <Users size={20} className="me-2" />
                              <strong>Students:</strong> {kpiStats.overall_stats?.students || 0}
                            </div>
                          </div>
                          <div className="col-md-3">
                            <div className="mb-2">
                              <Calendar size={20} className="me-2" />
                              <strong>Total Appointments:</strong> {kpiStats.overall_stats?.total_appointments || 0}
                            </div>
                            <div className="mb-2">
                              <FileText size={20} className="me-2" />
                              <strong>Total Prescriptions:</strong> {kpiStats.overall_stats?.total_prescriptions || 0}
                            </div>
                          </div>
                          <div className="col-md-3">
                            <div className="mb-2">
                              <TrendingUp size={20} className="me-2" />
                              <strong>Avg. per Day:</strong> {kpiStats.overall_stats?.average_appointments_per_day || 0}
                            </div>
                            <div className="mb-2">
                              <Activity size={20} className="me-2" />
                              <strong>Busiest Day:</strong> {kpiStats.overall_stats?.busiest_day_of_week || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* System Health Indicators */}
                {kpiStats.system_health && (
                  <div className="row g-4">
                    <div className="col-md-12">
                      <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
                        <div className="card-header bg-white border-0">
                          <h6 className="fw-bold mb-0">System Health Indicators</h6>
                        </div>
                        <div className="card-body">
                          <div className="row g-3">
                            <div className="col-md-3">
                              <div className="d-flex align-items-center">
                                <Calendar size={24} className="text-primary me-3" />
                                <div>
                                  <div className="fw-bold">{kpiStats.system_health.appointments_today || 0}</div>
                                  <small className="text-muted">Appointments Today</small>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="d-flex align-items-center">
                                <Clock size={24} className="text-warning me-3" />
                                <div>
                                  <div className="fw-bold">{kpiStats.system_health.upcoming_appointments || 0}</div>
                                  <small className="text-muted">Upcoming Appointments</small>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="d-flex align-items-center">
                                <AlertTriangle size={24} className="text-danger me-3" />
                                <div>
                                  <div className="fw-bold">{kpiStats.system_health.overdue_appointments || 0}</div>
                                  <small className="text-muted">Overdue Appointments</small>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="d-flex align-items-center">
                                <Users size={24} className="text-success me-3" />
                                <div>
                                  <div className="fw-bold">{kpiStats.system_health.active_doctors || 0}</div>
                                  <small className="text-muted">Active Doctors</small>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              // Fallback to old dashboard if no KPI data
              <>
                <div className="row mb-4">
                  <div className="col-12">
                    <div className="card shadow-sm border-0" style={{ borderRadius: '1rem', background: universityTheme.gradient }}>
                      <div className="card-body p-4 text-white">
                        <h2 className="mb-2">{t('superadmin.system_overview')}</h2>
                        <p className="mb-0 opacity-90">{t('superadmin.welcome_back', { name: user?.name || 'SuperAdmin' })}. {t('superadmin.system_overview_desc')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row g-4">
                  <div className="col-md-3">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1rem' }}>
                      <div className="card-body p-4 text-center">
                        <Users size={30} color={universityTheme.primary} className="mb-3" />
                        <h4 className="fw-bold">{users?.length || 0}</h4>
                        <p className="text-muted mb-0">{t('superadmin.total_users')}</p>
                        <small className="text-muted">
                          {users?.filter((u: User) => u.role === 'doctor').length} {t('superadmin.doctors')}, {' '}
                          {users?.filter((u: User) => u.role === 'admin').length} {t('superadmin.admins')}
                        </small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1rem' }}>
                      <div className="card-body p-4 text-center">
                        <Building size={30} color={universityTheme.secondary} className="mb-3" />
                        <h4 className="fw-bold">{departments?.length || 0}</h4>
                        <p className="text-muted mb-0">{t('superadmin.departments')}</p>
                        <small className="text-muted">
                          {departments?.filter((d: Department) => d.is_active).length} {t('superadmin.active')}
                        </small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1rem' }}>
                      <div className="card-body p-4 text-center">
                        <Calendar size={30} color="#d97706" className="mb-3" />
                        <h4 className="fw-bold">{holidays?.length || 0}</h4>
                        <p className="text-muted mb-0">{t('superadmin.academic_holidays')}</p>
                        <small className="text-muted">
                          {holidays?.filter((h: Holiday) => h.is_active !== false).length} {t('superadmin.active')}
                        </small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1rem' }}>
                      <div className="card-body p-4 text-center">
                        <Activity size={30} color={universityTheme.accent} className="mb-3" />
                        <h4 className="fw-bold">{users?.filter((currentUser: User) => currentUser.role === 'clinical_staff').length || 0}</h4>
                        <p className="text-muted mb-0">{t('superadmin.clinical_staff')}</p>
                        <small className="text-muted">{t('superadmin.healthcare_professionals')}</small>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <>
            <div className="row mb-4">
              <div className="col-12">
                <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
                  <div className="card-header border-0" style={{ background: universityTheme.gradient, borderRadius: '1rem 1rem 0 0' }}>
                    <h5 className="card-title mb-0 text-white">{t('superadmin.create_new_user')}</h5>
                  </div>
                  <div className="card-body p-4">
                    <form onSubmit={createUser}>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label fw-semibold">{t('superadmin.name')} *</label>
                          <input
                            type="text"
                            className="form-control"
                            value={userForm.name}
                            onChange={(event) => setUserForm({...userForm, name: event.target.value})}
                            required
                            disabled={loading}
                            placeholder={t('superadmin.enter_full_name')}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-semibold">{t('superadmin.email')} *</label>
                          <input
                            type="email"
                            className="form-control"
                            value={userForm.email}
                            onChange={(event) => setUserForm({...userForm, email: event.target.value})}
                            required
                            disabled={loading}
                            placeholder={t('superadmin.enter_email')}
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label fw-semibold">{t('superadmin.password')} *</label>
                          <input
                            type="password"
                            className="form-control"
                            value={userForm.password}
                            onChange={(event) => setUserForm({...userForm, password: event.target.value})}
                            required
                            disabled={loading}
                            placeholder={t('superadmin.enter_password')}
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label fw-semibold">{t('superadmin.role')} *</label>
                          <select
                            className="form-select"
                            value={userForm.role}
                            onChange={(event) => setUserForm({...userForm, role: event.target.value})}
                            disabled={loading}
                          >
                            <option value="doctor">{t('superadmin.doctor')}</option>
                            <option value="admin">{t('superadmin.admin')}</option>
                            <option value="clinical_staff">{t('superadmin.clinical_staff')}</option>
                            <option value="academic_staff">{t('superadmin.academic_staff')}</option>
                          </select>
                        </div>
                        <div className="col-md-4">
                          <label className="form-label fw-semibold">{t('superadmin.department')}</label>
                          <select
                            className="form-select"
                            value={userForm.department_id}
                            onChange={(event) => setUserForm({...userForm, department_id: event.target.value})}
                            disabled={loading}
                          >
                            <option value="">{t('superadmin.select_department')}</option>
                            {departments?.map((dept: Department) => (
                              <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="btn btn-primary mt-3"
                        disabled={loading}
                        style={{ background: universityTheme.gradient, border: 'none' }}
                      >
                        {loading ? t('superadmin.creating') : t('superadmin.create_user')}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-12">
                <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
                  <div className="card-header border-0" style={{ background: universityTheme.gradient, borderRadius: '1rem 1rem 0 0' }}>
                    <h5 className="card-title mb-0 text-white">{t('superadmin.system_users')} ({users?.length || 0})</h5>
                  </div>
                  <div className="card-body p-4">
                    {users.length === 0 ? (
                      <div className="text-center py-4">
                        <Users size={48} className="mb-3 text-muted" />
                        <p className="text-muted">{t('superadmin.no_users_found')}</p>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover">
                          <thead>
                            <tr>
                              <th>{t('superadmin.name')}</th>
                              <th>{t('superadmin.email')}</th>
                              <th>{t('superadmin.role')}</th>
                              <th>{t('superadmin.department')}</th>
                              <th>{t('common.status')}</th>
                              <th>{t('superadmin.created')}</th>
                              <th>{t('superadmin.actions')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {users.map((systemUser: User) => (
                              <tr key={systemUser.id}>
                                <td>{systemUser.name}</td>
                                <td>{systemUser.email}</td>
                                <td>
                                  <span className={`badge ${
                                    systemUser.role === 'doctor' ? 'bg-primary' :
                                    systemUser.role === 'admin' ? 'bg-danger' :
                                    systemUser.role === 'clinical_staff' ? 'bg-success' :
                                    'bg-info'
                                  }`}>
                                    {t(`superadmin.${systemUser.role?.replace('_', '')}`)}
                                  </span>
                                </td>
                                <td>{systemUser.department || '-'}</td>
                                <td>
                                  <span className={`badge ${
                                    systemUser.status === 'active' ? 'bg-success' : 'bg-warning'
                                  }`}>
                                    {t(`status.${systemUser.status || 'active'}`)}
                                  </span>
                                </td>
                                <td>{formatDate(systemUser.created_at)}</td>
                                <td>
                                  <button
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => deleteUser(systemUser.id)}
                                    disabled={loading}
                                    title={t('superadmin.delete_user')}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Departments Tab */}
        {activeTab === 'departments' && (
          <>
            <div className="row mb-4">
              <div className="col-12">
                <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
                  <div className="card-header border-0" style={{ background: universityTheme.gradient, borderRadius: '1rem 1rem 0 0' }}>
                    <h5 className="card-title mb-0 text-white">{t('superadmin.create_new_department')}</h5>
                  </div>
                  <div className="card-body p-4">
                    <form onSubmit={createDepartment}>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label fw-semibold">{t('superadmin.department_name')} *</label>
                          <input
                            type="text"
                            className="form-control"
                            value={departmentForm.name}
                            onChange={(e) => setDepartmentForm({...departmentForm, name: e.target.value})}
                            required
                            disabled={loading}
                            placeholder={t('superadmin.enter_department_name')}
                          />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label fw-semibold">{t('superadmin.code')} *</label>
                          <input
                            type="text"
                            className="form-control"
                            value={departmentForm.code}
                            onChange={(e) => setDepartmentForm({...departmentForm, code: e.target.value.toUpperCase()})}
                            required
                            disabled={loading}
                            maxLength={10}
                            placeholder={t('superadmin.enter_code')}
                          />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label fw-semibold">{t('superadmin.type')} *</label>
                          <select
                            className="form-select"
                            value={departmentForm.type}
                            onChange={(e) => setDepartmentForm({...departmentForm, type: e.target.value})}
                            disabled={loading}
                          >
                            <option value="medical">{t('superadmin.medical')}</option>
                            <option value="academic">{t('superadmin.academic')}</option>
                            <option value="administrative">{t('superadmin.administrative')}</option>
                          </select>
                        </div>
                        <div className="col-12">
                          <label className="form-label fw-semibold">{t('superadmin.description')}</label>
                          <textarea
                            className="form-control"
                            rows={3}
                            value={departmentForm.description}
                            onChange={(e) => setDepartmentForm({...departmentForm, description: e.target.value})}
                            disabled={loading}
                            placeholder={t('superadmin.enter_description')}
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="btn btn-primary mt-3"
                        disabled={loading}
                        style={{ background: universityTheme.gradient, border: 'none' }}
                      >
                        {loading ? t('superadmin.creating') : t('superadmin.create_department')}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-12">
                <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
                  <div className="card-header border-0" style={{ background: universityTheme.gradient, borderRadius: '1rem 1rem 0 0' }}>
                    <h5 className="card-title mb-0 text-white">{t('superadmin.departments')} ({departments?.length || 0})</h5>
                  </div>
                  <div className="card-body p-4">
                    {departments.length === 0 ? (
                      <div className="text-center py-4">
                        <Building size={48} className="mb-3 text-muted" />
                        <p className="text-muted">{t('superadmin.no_departments_found')}</p>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover">
                          <thead>
                            <tr>
                              <th>{t('superadmin.name')}</th>
                              <th>{t('superadmin.code')}</th>
                              <th>{t('superadmin.type')}</th>
                              <th>{t('superadmin.staff_count')}</th>
                              <th>{t('common.status')}</th>
                              <th>{t('superadmin.actions')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {departments.map((dept: Department) => (
                              <tr key={dept.id}>
                                <td>
                                  {editingDepartment?.id === dept.id ? (
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      value={editingDepartment.name}
                                      onChange={(e) => setEditingDepartment({
                                        ...editingDepartment,
                                        name: e.target.value
                                      })}
                                    />
                                  ) : (
                                    dept.name
                                  )}
                                </td>
                                <td>
                                  {editingDepartment?.id === dept.id ? (
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      value={editingDepartment.code}
                                      onChange={(e) => setEditingDepartment({
                                        ...editingDepartment,
                                        code: e.target.value.toUpperCase()
                                      })}
                                    />
                                  ) : (
                                    <code>{dept.code}</code>
                                  )}
                                </td>
                                <td>
                                  {editingDepartment?.id === dept.id ? (
                                    <select
                                      className="form-select form-select-sm"
                                      value={editingDepartment.type}
                                      onChange={(e) => setEditingDepartment({
                                        ...editingDepartment,
                                        type: e.target.value
                                      })}
                                    >
                                      <option value="medical">{t('superadmin.medical')}</option>
                                      <option value="academic">{t('superadmin.academic')}</option>
                                      <option value="administrative">{t('superadmin.administrative')}</option>
                                    </select>
                                  ) : (
                                    <span className={`badge ${
                                      dept.type === 'medical' ? 'bg-danger' :
                                      dept.type === 'academic' ? 'bg-primary' :
                                      'bg-secondary'
                                    }`}>
                                      {t(`superadmin.${dept.type}`)}
                                    </span>
                                  )}
                                </td>
                                <td>{dept.staff_count || 0}</td>
                                <td>
                                  {editingDepartment?.id === dept.id ? (
                                    <div className="form-check form-switch">
                                      <input
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={editingDepartment.is_active}
                                        onChange={(e) => setEditingDepartment({
                                          ...editingDepartment,
                                          is_active: e.target.checked
                                        })}
                                      />
                                    </div>
                                  ) : (
                                    <span className={`badge ${dept.is_active ? 'bg-success' : 'bg-warning'}`}>
                                      {dept.is_active ? t('superadmin.active') : t('superadmin.inactive')}
                                    </span>
                                  )}
                                </td>
                                <td>
                                  {editingDepartment?.id === dept.id ? (
                                    <div className="btn-group btn-group-sm">
                                      <button
                                        className="btn btn-success"
                                        onClick={() => updateDepartment(editingDepartment)}
                                        disabled={loading}
                                        title={t('common.save')}
                                      >
                                        <Save size={14} />
                                      </button>
                                      <button
                                        className="btn btn-secondary"
                                        onClick={() => setEditingDepartment(null)}
                                        title={t('common.cancel')}
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="btn-group btn-group-sm">
                                      <button
                                        className="btn btn-outline-primary"
                                        onClick={() => setEditingDepartment(dept)}
                                        title={t('common.edit')}
                                      >
                                        <Edit size={14} />
                                      </button>
                                      <button
                                        className="btn btn-outline-danger"
                                        onClick={() => deleteDepartment(dept.id)}
                                        disabled={loading}
                                        title={t('common.delete')}
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Holidays Tab */}
        {activeTab === 'holidays' && (
          <>
            <div className="row mb-4">
              <div className="col-md-8">
                <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
                  <div className="card-header border-0" style={{ background: universityTheme.gradient, borderRadius: '1rem 1rem 0 0' }}>
                    <h5 className="card-title mb-0 text-white">{t('superadmin.create_academic_holiday')}</h5>
                  </div>
                  <div className="card-body p-4">
                    <form onSubmit={createHoliday}>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label fw-semibold">{t('superadmin.holiday_name')} *</label>
                          <input
                            type="text"
                            className="form-control"
                            value={holidayForm.name}
                            onChange={(e) => setHolidayForm({...holidayForm, name: e.target.value})}
                            required
                            disabled={loading}
                            placeholder={t('superadmin.enter_holiday_name')}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-semibold">{t('superadmin.type')} *</label>
                          <select
                            className="form-select"
                            value={holidayForm.type}
                            onChange={(e) => setHolidayForm({...holidayForm, type: e.target.value})}
                            disabled={loading}
                          >
                            <option value="semester_break">{t('superadmin.semester_break')}</option>
                            <option value="exam_period">{t('superadmin.exam_period')}</option>
                            <option value="registration_period">{t('superadmin.registration_period')}</option>
                            <option value="national_holiday">{t('superadmin.national_holiday')}</option>
                            <option value="university_closure">{t('superadmin.university_closure')}</option>
                            <option value="maintenance">{t('superadmin.maintenance')}</option>
                          </select>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-semibold">{t('superadmin.start_date')} *</label>
                          <input
                            type="date"
                            className="form-control"
                            value={holidayForm.start_date}
                            onChange={(e) => setHolidayForm({...holidayForm, start_date: e.target.value})}
                            required
                            disabled={loading}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-semibold">{t('superadmin.end_date')} *</label>
                          <input
                            type="date"
                            className="form-control"
                            value={holidayForm.end_date}
                            onChange={(e) => setHolidayForm({...holidayForm, end_date: e.target.value})}
                            required
                            disabled={loading}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-semibold">{t('superadmin.affects_staff_type')} *</label>
                          <select
                            className="form-select"
                            value={holidayForm.affects_staff_type}
                            onChange={(e) => setHolidayForm({...holidayForm, affects_staff_type: e.target.value})}
                            disabled={loading}
                          >
                            <option value="all">{t('superadmin.all_staff')}</option>
                            <option value="academic">{t('superadmin.academic_staff_only')}</option>
                            <option value="clinical">{t('superadmin.clinical_staff_only')}</option>
                            <option value="none">{t('superadmin.no_staff_general_holiday')}</option>
                          </select>
                        </div>
                        <div className="col-md-6">
                          <div className="form-check mt-4">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="blocksAppointments"
                              checked={holidayForm.blocks_appointments}
                              onChange={(e) => setHolidayForm({...holidayForm, blocks_appointments: e.target.checked})}
                              disabled={loading}
                            />
                            <label className="form-check-label fw-semibold" htmlFor="blocksAppointments">
                              {t('superadmin.blocks_appointments')}
                            </label>
                          </div>
                        </div>
                        <div className="col-12">
                          <label className="form-label fw-semibold">{t('superadmin.description')}</label>
                          <textarea
                            className="form-control"
                            rows={3}
                            value={holidayForm.description}
                            onChange={(e) => setHolidayForm({...holidayForm, description: e.target.value})}
                            disabled={loading}
                            placeholder={t('superadmin.enter_description')}
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="btn btn-primary mt-3"
                        disabled={loading}
                        style={{ background: universityTheme.gradient, border: 'none' }}
                      >
                        {loading ? t('superadmin.creating') : t('superadmin.create_holiday')}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
                  <div className="card-header border-0" style={{ background: '#f8f9fa', borderRadius: '1rem 1rem 0 0' }}>
                    <h6 className="card-title mb-0">{t('superadmin.calendar_sync')}</h6>
                  </div>
                  <div className="card-body p-4 text-center">
                    <RefreshCw size={32} className="mb-3 text-primary" />
                    <p className="text-muted mb-3">{t('superadmin.sync_holidays_desc')}</p>
                    <button
                      className="btn btn-outline-primary"
                      onClick={syncCalendar}
                      disabled={loading}
                    >
                      {loading ? t('superadmin.syncing') : t('superadmin.sync_calendar')}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-12">
                <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
                  <div className="card-header border-0" style={{ background: universityTheme.gradient, borderRadius: '1rem 1rem 0 0' }}>
                    <h5 className="card-title mb-0 text-white">{t('superadmin.academic_holidays')} ({holidays?.length || 0})</h5>
                  </div>
                  <div className="card-body p-4">
                    {holidays.length === 0 ? (
                      <div className="text-center py-4">
                        <Calendar size={48} className="mb-3 text-muted" />
                        <p className="text-muted">{t('superadmin.no_holidays_found')}</p>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover">
                          <thead>
                            <tr>
                              <th>{t('superadmin.name')}</th>
                              <th>{t('superadmin.type')}</th>
                              <th>{t('superadmin.start_date')}</th>
                              <th>{t('superadmin.end_date')}</th>
                              <th>{t('superadmin.affects')}</th>
                              <th>{t('superadmin.blocks_appointments')}</th>
                              <th>{t('common.status')}</th>
                              <th>{t('superadmin.actions')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {holidays.map((holiday: Holiday) => (
                              <tr key={holiday.id}>
                                <td>
                                  {editingHoliday?.id === holiday.id ? (
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      value={editingHoliday.name}
                                      onChange={(e) => setEditingHoliday({
                                        ...editingHoliday,
                                        name: e.target.value
                                      })}
                                    />
                                  ) : (
                                    holiday.name
                                  )}
                                </td>
                                <td>
                                  <span className={`badge ${
                                    holiday.type === 'semester_break' ? 'bg-primary' :
                                    holiday.type === 'exam_period' ? 'bg-warning' :
                                    holiday.type === 'national_holiday' ? 'bg-success' :
                                    'bg-info'
                                  }`}>
                                    {t(`superadmin.${holiday.type.replace('_', '')}`)}
                                  </span>
                                </td>
                                <td>
                                  {editingHoliday?.id === holiday.id ? (
                                    <input
                                      type="date"
                                      className="form-control form-control-sm"
                                      value={editingHoliday.start_date}
                                      onChange={(e) => setEditingHoliday({
                                        ...editingHoliday,
                                        start_date: e.target.value
                                      })}
                                    />
                                  ) : (
                                    formatDate(holiday.start_date)
                                  )}
                                </td>
                                <td>
                                  {editingHoliday?.id === holiday.id ? (
                                    <input
                                      type="date"
                                      className="form-control form-control-sm"
                                      value={editingHoliday.end_date}
                                      onChange={(e) => setEditingHoliday({
                                        ...editingHoliday,
                                        end_date: e.target.value
                                      })}
                                    />
                                  ) : (
                                    formatDate(holiday.end_date)
                                  )}
                                </td>
                                <td>
                                  <span className="badge bg-secondary">
                                    {t(`superadmin.${holiday.affects_staff_type}`)}
                                  </span>
                                </td>
                                <td>
                                  {editingHoliday?.id === holiday.id ? (
                                    <div className="form-check">
                                      <input
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={editingHoliday.blocks_appointments}
                                        onChange={(e) => setEditingHoliday({
                                          ...editingHoliday,
                                          blocks_appointments: e.target.checked
                                        })}
                                      />
                                    </div>
                                  ) : (
                                    <span className={`badge ${holiday.blocks_appointments ? 'bg-danger' : 'bg-success'}`}>
                                      {holiday.blocks_appointments ? t('superadmin.blocks') : t('superadmin.allows')}
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <span className={`badge ${holiday.is_active !== false ? 'bg-success' : 'bg-warning'}`}>
                                    {holiday.is_active !== false ? t('superadmin.active') : t('superadmin.inactive')}
                                  </span>
                                </td>
                                <td>
                                  {editingHoliday?.id === holiday.id ? (
                                    <div className="btn-group btn-group-sm">
                                      <button
                                        className="btn btn-success"
                                        onClick={() => updateHoliday(editingHoliday)}
                                        disabled={loading}
                                        title={t('common.save')}
                                      >
                                        <Save size={14} />
                                      </button>
                                      <button
                                        className="btn btn-secondary"
                                        onClick={() => setEditingHoliday(null)}
                                        title={t('common.cancel')}
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="btn-group btn-group-sm">
                                      <button
                                        className="btn btn-outline-primary"
                                        onClick={() => setEditingHoliday(holiday)}
                                        title={t('common.edit')}
                                      >
                                        <Edit size={14} />
                                      </button>
                                      <button
                                        className="btn btn-outline-danger"
                                        onClick={() => deleteHoliday(holiday.id)}
                                        disabled={loading}
                                        title={t('common.delete')}
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        {activeTab === 'settings' && <ClinicSettingsManager />}
      </div>

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .text-purple {
          color: #a855f7;
        }
          
      `}</style>
    </div>
  );
};

export default EnhancedSuperAdminDashboard;