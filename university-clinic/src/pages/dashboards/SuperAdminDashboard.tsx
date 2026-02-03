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
import Select from 'react-select';
import ClinicSettingsManager from '../../components/ClinicSettingsManager';

// Type definitions
interface User {
  id: string | number;
  name: string;
  email: string;
  role: string;
  department?: string | Department;
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);  // ADD THIS
  const [sidebarOpen, setSidebarOpen] = useState(false);  
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<number | string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

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

  // Custom styles for react-select - matches your red theme
const customSelectStyles = {
  control: (provided: any, state: any) => ({
    ...provided,
    borderRadius: '0.375rem',
    borderColor: state.isFocused ? '#dc3545' : '#dee2e6',
    boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(220, 53, 69, 0.25)' : 'none',
    '&:hover': {
      borderColor: '#dc3545',
    },
    minHeight: '38px',
  }),
  option: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: state.isSelected ? '#dc3545' : state.isFocused ? '#fee2e2' : 'white',
    color: state.isSelected ? 'white' : '#212529',
    '&:hover': {
      backgroundColor: state.isSelected ? '#dc3545' : '#fee2e2',
    },
  }),
  menu: (provided: any) => ({
    ...provided,
    zIndex: 9999,
    borderRadius: '0.375rem',
    boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)',
  }),
  menuPortal: (provided: any) => ({
    ...provided,
    zIndex: 9999,
  }),
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

  // Add these chart components before your main component
const MiniBarChart = ({ data, color, max }: { data: number[], color: string, max?: number }) => {
  const maxValue = max || Math.max(...data);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '40px' }}>
      {data.map((value, index) => (
        <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{
            height: `${(value / maxValue) * 100}%`,
            background: `linear-gradient(to top, ${color}, ${color}88)`,
            borderRadius: '3px 3px 0 0',
            minHeight: value > 0 ? '4px' : '2px',
            transition: 'all 0.3s ease'
          }} />
        </div>
      ))}
    </div>
  );
};

const LineSparkline = ({ data, color, width = 100, height = 40 }: { data: number[], color: string, width?: number, height?: number }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((value, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = height - ((value - min) / range) * height;
        return (
          <circle
            key={index}
            cx={x}
            cy={y}
            r="3"
            fill={color}
          />
        );
      })}
    </svg>
  );
};

// ✅ ADD: Toggle user status handler
const toggleUserStatus = async (userId: string | number, currentStatus: string) => {
  setLoading(true);
  try {
    const response = await api.toggleUserStatus(userId);
    setMessage(response.message || t('superadmin.user_status_updated'));
    setMessageType('success');
    fetchData();
  } catch (error: any) {
    setMessage(error.message || t('superadmin.status_update_error'));
    setMessageType('error');
  } finally {
    setLoading(false);
  }
};

// ✅ ADD: Bulk status update handler
const handleBulkStatusUpdate = async (status: 'active' | 'inactive') => {
  if (selectedUsers.size === 0) {
    setMessage(t('superadmin.select_users_first'));
    setMessageType('error');
    return;
  }
  
  const action = status === 'active' ? 'activate' : 'deactivate';
  if (!window.confirm(t(`superadmin.confirm_bulk_${action}`, { count: selectedUsers.size }))) return;
  
  setLoading(true);
  try {
    const response = await api.bulkUpdateUserStatus(Array.from(selectedUsers), status);
    setMessage(response.message || t('superadmin.bulk_update_success'));
    setMessageType('success');
    setSelectedUsers(new Set());
    setSelectAll(false);
    fetchData();
  } catch (error: any) {
    setMessage(error.message || t('superadmin.bulk_update_error'));
    setMessageType('error');
  } finally {
    setLoading(false);
  }
};

// ✅ ADD: Select/deselect users
const toggleUserSelection = (userId: string | number) => {
  const newSelected = new Set(selectedUsers);
  if (newSelected.has(userId)) {
    newSelected.delete(userId);
  } else {
    newSelected.add(userId);
  }
  setSelectedUsers(newSelected);
  setSelectAll(newSelected.size === users.length);
};

// ✅ ADD: Select all toggle
const toggleSelectAll = () => {
  if (selectAll) {
    setSelectedUsers(new Set());
  } else {
    setSelectedUsers(new Set(users.map((u: User) => u.id)));
  }
  setSelectAll(!selectAll);
};

const RadialProgress = ({ percentage, color, size = 120 }: { percentage: number, color: string, size?: number }) => {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth="10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '28px', fontWeight: '700', color: '#1f2937' }}>
          {percentage}%
        </div>
        <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600' }}>
          Success
        </div>
      </div>
    </div>
  );
};

const DonutChart = ({ data, colors, size = 140 }: { data: number[], colors: string[], size?: number }) => {
  const total = data.reduce((sum, val) => sum + val, 0);
  let currentAngle = 0;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {data.map((value, index) => {
          const percentage = (value / total) * 100;
          const angle = (percentage / 100) * 360;
          const radius = (size - 30) / 2;
          const circumference = 2 * Math.PI * radius;
          const strokeDasharray = `${(angle / 360) * circumference} ${circumference}`;
          const rotation = currentAngle;
          currentAngle += angle;

          return value > 0 ? (
            <circle
              key={index}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={colors[index]}
              strokeWidth="15"
              strokeDasharray={strokeDasharray}
              style={{ 
                transform: `rotate(${rotation}deg)`,
                transformOrigin: 'center',
                transition: 'all 0.6s ease'
              }}
            />
          ) : null;
        })}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - 60) / 2}
          fill="white"
        />
      </svg>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>
          {total}
        </div>
        <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600' }}>
          Total
        </div>
      </div>
    </div>
  );
};

  // NEW: Chart Data Configurations
  const getChartData = () => {
  if (!kpiStats || !kpiStats.appointment_trends) return null;

  const trendData = {
    labels: kpiStats.appointment_trends.map((t: any) => t.date),
    datasets: [
      {
        label: t('superadmin.completed'),
        data: kpiStats.appointment_trends.map((t: any) => t.completed || 0),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
      },
      {
        label: t('superadmin.cancelled'),
        data: kpiStats.appointment_trends.map((t: any) => t.cancelled || 0),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
      },
      {
        label: t('superadmin.scheduled'),
        data: kpiStats.appointment_trends.map((t: any) => t.scheduled || 0),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      }
    ]
  };

  /**
 * Helper function to safely get department name
 */
const getDepartmentName = (department: string | Department | undefined): string => {
  if (!department) return '-';
  if (typeof department === 'string') return department;
  if (typeof department === 'object' && department.name) return department.name;
  return '-';
};

  const currentStats = getCurrentStats();
  const statusData = {
    labels: [
      t('superadmin.completed'),
      t('superadmin.scheduled'),
      t('superadmin.cancelled'),
      t('superadmin.no_show'),
      t('superadmin.in_progress')
    ],
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

// Professional Sidebar Component for Super Admin Dashboard
const Sidebar = () => {
  const menuItems = [
    { id: 'dashboard', icon: Activity, label: t('superadmin.dashboard', 'Dashboard') },
    { id: 'users', icon: Users, label: t('superadmin.users', 'Users') },
    { id: 'departments', icon: Building, label: t('superadmin.departments', 'Departments') },
    { id: 'holidays', icon: Calendar, label: t('superadmin.academic_calendar', 'Academic Calendar') },
    { id: 'settings', icon: Settings, label: t('nav.settings', 'Clinic Settings') },
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
    height: '100vh',                      // ← CHANGE: Replace 'bottom: 0' with this
    width: sidebarCollapsed && window.innerWidth >= 768 ? '85px' : '280px',
    background: '#1a1d29',
    boxShadow: '4px 0 24px rgba(0, 0, 0, 0.12)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 1050,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',                   // ← Keep this! Prevents sidebar scrolling
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
                  Super Admin Portal
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
                  setActiveTab(item.id);
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
                  {user?.name?.charAt(0).toUpperCase() || 'S'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                    {user?.name || 'Super Admin'}
                  </div>
                  <small style={{ opacity: 0.7, fontSize: '0.75rem' }}>
                    Super Administrator
                  </small>
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
              title="Logout"
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

  const currentStats = getCurrentStats();
  const chartData = getChartData();

  return (
  <div style={{ 
    display: 'flex', 
    height: '100vh', 
    overflow: 'hidden',
    background: '#f8f9fa'
  }}>
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
          padding: '5px',
        }}
      >
        ☰
      </button>
      <h6 style={{ margin: 0, marginLeft: '15px', fontWeight: 600 }}>
        FIU Super Admin
      </h6>
    </div>

    {/* Main Content Wrapper */}
    <div
  style={{
    flex: 1,
    marginLeft: window.innerWidth >= 768 ? (sidebarCollapsed ? '85px' : '280px') : '0',
    paddingTop: window.innerWidth < 768 ? '80px' : '40px',
    transition: 'margin-left 0.3s ease',
    height: '100vh',              // ← ADD THIS LINE
    overflowY: 'auto',            // ← ADD THIS LINE
    overflowX: 'hidden',          // ← ADD THIS LINE (optional, prevents horizontal scroll)
  }}
>
      

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
            <label className="form-label fw-semibold">{t('superadmin.select_date')}</label>
            <input
              type="date"
              className="form-control"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <div className="col-md-2">
  <label className="form-label fw-semibold">{t('superadmin.month')}</label>
  <Select
    options={Array.from({ length: 12 }, (_, i) => ({
      value: i + 1,
      label: new Date(2024, i).toLocaleString(i18n.language, { month: 'long' })
    }))}
    value={{
      value: selectedMonth,
      label: new Date(2024, selectedMonth - 1).toLocaleString(i18n.language, { month: 'long' })
    }}
    onChange={(option) => option && setSelectedMonth(option.value)}
    styles={customSelectStyles}
    menuPortalTarget={document.body}
    placeholder={t('superadmin.select_month')}
  />
</div>
<div className="col-md-2">
  <label className="form-label fw-semibold">{t('superadmin.year')}</label>
  <Select
    options={Array.from({ length: 5 }, (_, i) => {
      const year = new Date().getFullYear() - 2 + i;
      return { value: year, label: year.toString() };
    })}
    value={{
      value: selectedYear,
      label: selectedYear.toString()
    }}
    onChange={(option) => option && setSelectedYear(option.value)}
    styles={customSelectStyles}
    menuPortalTarget={document.body}
    placeholder={t('superadmin.select_year')}
  />
</div>
          <div className="col-md-5">
            <label className="form-label fw-semibold">{t('superadmin.view_by')}</label>
            <div className="btn-group w-100" role="group">
              <button
                className={`btn ${timeframe === 'today' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setTimeframe('today')}
              >
                {t('superadmin.today')}
              </button>
              <button
                className={`btn ${timeframe === 'week' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setTimeframe('week')}
              >
                {t('superadmin.this_week')}
              </button>
              <button
                className={`btn ${timeframe === 'month' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setTimeframe('month')}
              >
                {t('superadmin.this_month')}
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
      <span className="visually-hidden">{t('superadmin.loading_statistics')}</span>
    </div>
  </div>
) : kpiStats && currentStats ? (
  <>
    {/* Main KPI Cards */}
    <div className="row g-4 mb-4">
      {/* Total Appointments Card */}
      <div className="col-md-3">
        <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '16px' }}>
          <div className="card-body" style={{ position: 'relative', overflow: 'hidden' }}>
            {/* ... gradient background ... */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #3b82f615, #3b82f625)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Calendar size={24} style={{ color: '#3b82f6' }} />
                </div>
                <div style={{
                  fontSize: '36px',
                  fontWeight: '700',
                  color: '#1f2937'
                }}>
                  {currentStats?.total_appointments || 0}
                </div>
              </div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#6b7280', marginBottom: '12px' }}>
                {t('superadmin.total_appointments')}
              </div>
              {kpiStats?.trends?.appointments && kpiStats.trends.appointments.length > 0 ? (
                <>
                  <MiniBarChart data={kpiStats.trends.appointments} color="#3b82f6" />
                  <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '600', marginTop: '8px' }}>
                    {t('superadmin.7_day_trend')}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>
                  {t('superadmin.no_trend_data')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Completed Card */}
      <div className="col-md-3">
        <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '16px' }}>
          <div className="card-body" style={{ position: 'relative', overflow: 'hidden' }}>
            {/* ... */}
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#6b7280', marginBottom: '12px' }}>
              {t('superadmin.completed')}
            </div>
            {/* ... */}
            <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '600', marginTop: '8px' }}>
              {currentStats?.completion_rate || 0}% {t('superadmin.completion_rate')}
            </div>
          </div>
        </div>
      </div>

      {/* Cancelled Card */}
      <div className="col-md-3">
        <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '16px' }}>
          <div className="card-body" style={{ position: 'relative', overflow: 'hidden' }}>
            {/* ... */}
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#6b7280', marginBottom: '12px' }}>
              {t('superadmin.cancelled')}
            </div>
            {/* ... */}
            <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: '600', marginTop: '8px' }}>
              {currentStats?.cancellation_rate?.toFixed(1) || 0}% {t('superadmin.cancellation_rate')}
            </div>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="col-md-3">
        <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '16px' }}>
          <div className="card-body text-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {/* ... */}
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#6b7280', marginBottom: '16px' }}>
              {t('superadmin.active_sessions')}
            </div>
            <div style={{ fontSize: '12px', color: '#8b5cf6', fontWeight: '600' }}>
              {t('superadmin.currently_in_progress')}
            </div>
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
            <small className="text-muted">{t('superadmin.scheduled')}</small>
          </div>
        </div>
      </div>
      <div className="col-md-2">
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-3">
            <CheckCircle size={24} className="text-primary mb-2" />
            <h5 className="fw-bold mb-0">{currentStats.confirmed || 0}</h5>
            <small className="text-muted">{t('superadmin.confirmed')}</small>
          </div>
        </div>
      </div>
      <div className="col-md-2">
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-3">
            <TrendingUp size={24} className="text-success mb-2" />
            <h5 className="fw-bold mb-0">{currentStats.completion_rate || 0}%</h5>
            <small className="text-muted">{t('superadmin.success_rate')}</small>
          </div>
        </div>
      </div>
    </div>

    {/* Prescription Activity */}
{kpiStats?.prescription_stats && (
  <div className="row mb-4">
    <div className="col-12">
      <div className="card shadow-sm border-0" style={{ borderRadius: '16px' }}>
        <div className="card-header bg-white border-0" style={{ borderRadius: '16px 16px 0 0' }}>
          <h6 className="fw-bold mb-0">{t('superadmin.prescription_activity')}</h6>
        </div>
        <div className="card-body">
          <div className="row g-3">
            {/* Today */}
            <div className="col-md-3">
              <div style={{
                padding: '20px',
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                borderRadius: '12px'
              }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#92400e', marginBottom: '12px' }}>
                  {t('superadmin.today')}
                </div>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#78350f', marginBottom: '8px' }}>
                  {kpiStats.prescription_stats?.today || 0}
                </div>
                <div style={{ fontSize: '11px', color: '#92400e' }}>
                  {t('superadmin.prescriptions_issued')}
                </div>
              </div>
            </div>

            {/* This Week */}
            <div className="col-md-3">
              <div style={{
                padding: '20px',
                background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                borderRadius: '12px'
              }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e40af', marginBottom: '12px' }}>
                  {t('superadmin.this_week_prescriptions')}
                </div>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#1e3a8a', marginBottom: '8px' }}>
                  {kpiStats.prescription_stats?.this_week || 0}
                </div>
                <div style={{ fontSize: '11px', color: '#1e40af' }}>
                  {t('superadmin.prescriptions_issued')}
                </div>
              </div>
            </div>

            {/* This Month */}
            <div className="col-md-3">
              <div style={{
                padding: '20px',
                background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                borderRadius: '12px'
              }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#065f46', marginBottom: '12px' }}>
                  {t('superadmin.this_month_prescriptions')}
                </div>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#064e3b', marginBottom: '8px' }}>
                  {kpiStats.prescription_stats?.this_month || 0}
                </div>
                <div style={{ fontSize: '11px', color: '#065f46' }}>
                  {t('superadmin.prescriptions_issued')}
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="col-md-3">
              <div style={{
                padding: '20px',
                background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#3730a3', marginBottom: '8px', width: '100%' }}>
                  {t('superadmin.total_prescriptions')}
                </div>
                <RadialProgress 
                  percentage={Math.min(100, Math.round((kpiStats.prescription_stats?.this_month || 0) / Math.max(1, kpiStats.prescription_stats?.total || 1) * 100))} 
                  color="#4f46e5" 
                  size={100}
                />
              </div>
            </div>
          </div>
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
              <h6 className="fw-bold mb-0">
                {t('superadmin.appointment_trends')} - {timeframe === 'month' ? t('superadmin.monthly_view') : t('superadmin.daily_view')}
              </h6>
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
              <h6 className="fw-bold mb-0">{t('superadmin.status_distribution')}</h6>
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
            <h5 className="mb-3">{t('superadmin.system_overview_stats')}</h5>
            <div className="row">
              <div className="col-md-3">
                <div className="mb-2">
                  <Users size={20} className="me-2" />
                  <strong>{t('superadmin.total_users')}:</strong> {kpiStats.overall_stats?.total_users || 0}
                </div>
                <div className="mb-2">
                  <Users size={20} className="me-2" />
                  <strong>{t('superadmin.doctors')}:</strong> {kpiStats.overall_stats?.doctors || 0}
                </div>
              </div>
              <div className="col-md-3">
                <div className="mb-2">
                  <Users size={20} className="me-2" />
                  <strong>{t('superadmin.clinical_staff_count')}:</strong> {kpiStats.overall_stats?.clinical_staff || 0}
                </div>
                <div className="mb-2">
                  <Users size={20} className="me-2" />
                  <strong>{t('superadmin.students_count')}:</strong> {kpiStats.overall_stats?.students || 0}
                </div>
              </div>
              <div className="col-md-3">
                <div className="mb-2">
                  <Calendar size={20} className="me-2" />
                  <strong>{t('superadmin.total_appointments')}:</strong> {kpiStats.overall_stats?.total_appointments || 0}
                </div>
                <div className="mb-2">
                  <FileText size={20} className="me-2" />
                  <strong>{t('superadmin.total_prescriptions')}:</strong> {kpiStats.overall_stats?.total_prescriptions || 0}
                </div>
              </div>
              <div className="col-md-3">
                <div className="mb-2">
                  <TrendingUp size={20} className="me-2" />
                  <strong>{t('superadmin.avg_per_day')}:</strong> {kpiStats.overall_stats?.average_appointments_per_day || 0}
                </div>
                <div className="mb-2">
                  <Activity size={20} className="me-2" />
                  <strong>{t('superadmin.busiest_day')}:</strong> {kpiStats.overall_stats?.busiest_day_of_week || 'N/A'}
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
              <h6 className="fw-bold mb-0">{t('superadmin.system_health_indicators')}</h6>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-3">
                  <div className="d-flex align-items-center">
                    <Calendar size={24} className="text-primary me-3" />
                    <div>
                      <div className="fw-bold">{kpiStats.system_health.appointments_today || 0}</div>
                      <small className="text-muted">{t('superadmin.appointments_today')}</small>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="d-flex align-items-center">
                    <Clock size={24} className="text-warning me-3" />
                    <div>
                      <div className="fw-bold">{kpiStats.system_health.upcoming_appointments || 0}</div>
                      <small className="text-muted">{t('superadmin.upcoming_appointments')}</small>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="d-flex align-items-center">
                    <AlertTriangle size={24} className="text-danger me-3" />
                    <div>
                      <div className="fw-bold">{kpiStats.system_health.overdue_appointments || 0}</div>
                      <small className="text-muted">{t('superadmin.overdue_appointments')}</small>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="d-flex align-items-center">
                    <Users size={24} className="text-success me-3" />
                    <div>
                      <div className="fw-bold">{kpiStats.system_health.active_doctors || 0}</div>
                      <small className="text-muted">{t('superadmin.active_doctors')}</small>
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
  <Select
    options={[
      { value: 'doctor', label: t('superadmin.doctor') },
      { value: 'admin', label: t('superadmin.admin') },
      { value: 'clinical_staff', label: t('superadmin.clinical_staff') },
      { value: 'academic_staff', label: t('superadmin.academic_staff') },
    ]}
    value={{
      value: userForm.role,
      label: t(`superadmin.${userForm.role.replace('_', '')}`)
    }}
    onChange={(option) => option && setUserForm({...userForm, role: option.value})}
    styles={customSelectStyles}
    menuPortalTarget={document.body}
    isDisabled={loading}
    placeholder={t('superadmin.select_role')}
  />
</div>
                        <div className="col-md-4">
  <label className="form-label fw-semibold">{t('superadmin.department')}</label>
  <Select
    options={[
      { value: '', label: t('superadmin.select_department') },
      ...departments?.map((dept: Department) => ({
        value: dept.id.toString(),
        label: dept.name
      })) || []
    ]}
    value={
      userForm.department_id
        ? {
            value: userForm.department_id,
            label: departments?.find((d: Department) => d.id.toString() === userForm.department_id)?.name || ''
          }
        : { value: '', label: t('superadmin.select_department') }
    }
    onChange={(option) => option && setUserForm({...userForm, department_id: option.value})}
    styles={customSelectStyles}
    menuPortalTarget={document.body}
    isDisabled={loading}
    placeholder={t('superadmin.select_department')}
    isClearable
  />
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
      {/* ✅ ADD: Checkbox column header */}
      <th style={{ width: '50px' }}>
        <input
          type="checkbox"
          checked={selectAll}
          onChange={toggleSelectAll}
          className="form-check-input"
        />
      </th>
      <th>{t('superadmin.name')}</th>
      <th>{t('superadmin.email')}</th>
      <th>{t('superadmin.role')}</th>
      <th>{t('superadmin.departments')}</th>
      <th>{t('common.status')}</th>
      <th>{t('superadmin.created')}</th>
      <th>{t('superadmin.actions')}</th>
    </tr>
  </thead>
  <tbody>
    {users.map((systemUser: User) => (
      <tr key={systemUser.id}>
        {/* ✅ ADD: Checkbox for each row */}
        <td>
          <input
            type="checkbox"
            checked={selectedUsers.has(systemUser.id)}
            onChange={() => toggleUserSelection(systemUser.id)}
            className="form-check-input"
          />
        </td>
        
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
        <td>
          {String(typeof systemUser.department === 'object' && systemUser.department !== null
  ? systemUser.department.name
  : systemUser.department || '-')}
        </td>
        
        {/* ✅ UPDATED: Clickable status badge */}
        <td>
          <span 
            className={`badge ${
              systemUser.status === 'active' ? 'bg-success' : 
              systemUser.status === 'inactive' ? 'bg-warning' : 
              'bg-secondary'
            }`}
            style={{ cursor: 'pointer' }}
            onClick={() => toggleUserStatus(systemUser.id, systemUser.status || 'active')}
            title={t('superadmin.click_to_toggle_status')}
          >
            {systemUser.status === 'active' ? (
              <>
                <CheckCircle size={14} className="me-1" />
                {t('status.active')}
              </>
            ) : systemUser.status === 'inactive' ? (
              <>
                <X size={14} className="me-1" />
                {t('status.inactive')}
              </>
            ) : (
              <>
                <Clock size={14} className="me-1" />
                {t('status.pending_verification')}
              </>
            )}
          </span>
        </td>
        
        <td>{formatDate(systemUser.created_at)}</td>
        
        {/* ✅ UPDATED: Actions with toggle button */}
        <td>
          <div className="btn-group btn-group-sm">
            <button
              className={`btn btn-sm ${
                systemUser.status === 'active' 
                  ? 'btn-outline-warning' 
                  : 'btn-outline-success'
              }`}
              onClick={() => toggleUserStatus(systemUser.id, systemUser.status || 'active')}
              disabled={loading}
              title={
                systemUser.status === 'active' 
                  ? t('superadmin.deactivate_user')
                  : t('superadmin.activate_user')
              }
            >
              {systemUser.status === 'active' ? (
                <EyeOff size={16} />
              ) : (
                <Eye size={16} />
              )}
            </button>
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={() => deleteUser(systemUser.id)}
              disabled={loading}
              title={t('superadmin.delete_user')}
            >
              <Trash2 size={16} />
            </button>
          </div>
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
  <Select
    options={[
      { value: 'medical', label: t('superadmin.medical') },
      { value: 'academic', label: t('superadmin.academic') },
      { value: 'administrative', label: t('superadmin.administrative') },
    ]}
    value={{
      value: departmentForm.type,
      label: t(`superadmin.${departmentForm.type}`)
    }}
    onChange={(option) => option && setDepartmentForm({...departmentForm, type: option.value})}
    styles={customSelectStyles}
    menuPortalTarget={document.body}
    isDisabled={loading}
    placeholder={t('superadmin.select_type')}
  />
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
  <Select
    options={[
      { value: 'medical', label: t('superadmin.medical') },
      { value: 'academic', label: t('superadmin.academic') },
      { value: 'administrative', label: t('superadmin.administrative') },
    ]}
    value={{
      value: editingDepartment.type,
      label: t(`superadmin.${editingDepartment.type}`)
    }}
    onChange={(option) => option && setEditingDepartment({
      ...editingDepartment,
      type: option.value
    })}
    styles={customSelectStyles}
    menuPortalTarget={document.body}
    placeholder={t('superadmin.select_type')}
  />
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
  <Select
    options={[
      { value: 'semester_break', label: t('superadmin.semester_break') },
      { value: 'exam_period', label: t('superadmin.exam_period') },
      { value: 'registration_period', label: t('superadmin.registration_period') },
      { value: 'national_holiday', label: t('superadmin.national_holiday') },
      { value: 'university_closure', label: t('superadmin.university_closure') },
      { value: 'maintenance', label: t('superadmin.maintenance') },
    ]}
    value={{
      value: holidayForm.type,
      label: t(`superadmin.${holidayForm.type.replace('_', '')}`)
    }}
    onChange={(option) => option && setHolidayForm({...holidayForm, type: option.value})}
    styles={customSelectStyles}
    menuPortalTarget={document.body}
    isDisabled={loading}
    placeholder={t('superadmin.select_type')}
  />
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
  <Select
    options={[
      { value: 'all', label: t('superadmin.all_staff') },
      { value: 'academic', label: t('superadmin.academic_staff_only') },
      { value: 'clinical', label: t('superadmin.clinical_staff_only') },
      { value: 'none', label: t('superadmin.no_staff_general_holiday') },
    ]}
    value={{
      value: holidayForm.affects_staff_type,
      label: t(`superadmin.${holidayForm.affects_staff_type}_staff${holidayForm.affects_staff_type !== 'all' && holidayForm.affects_staff_type !== 'none' ? '_only' : ''}`)
    }}
    onChange={(option) => option && setHolidayForm({...holidayForm, affects_staff_type: option.value})}
    styles={customSelectStyles}
    menuPortalTarget={document.body}
    isDisabled={loading}
    placeholder={t('superadmin.select_staff_type')}
  />
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
     </div>
  );
};

export default EnhancedSuperAdminDashboard;