// src/pages/dashboards/AcademicStaffDashboard.tsx
import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, User, FileText, History, Edit, X, CheckCircle, 
  Stethoscope, Heart, Brain, Thermometer, BarChart3, Activity, 
  Users, TrendingUp, Phone, Mail, LogOut, Globe, Plus, UserCog, Camera, AlertTriangle
} from 'lucide-react';
import { APPOINTMENT_STATUSES, getStatusText, getStatusBadgeClass } from '../../constants/appointmentStatuses';
import type { AppointmentStatus } from '../../constants/appointmentStatuses';
import { useTranslation } from 'react-i18next';
import i18n from '../../services/i18n';
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { ClinicHoursCard, AppointmentTipsCard, EmergencyContactsCard } from '../../components/ClinicInfoSidebar';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// Type definitions
interface User {
  name: string;
  email: string;
  staff_no: string;
  phone?: string;
  department?: string;
  bio?: string;
  avatar_url?: string;
}

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  phone?: string;
}

interface Appointment {
  id: string;
  doctor: string;
  specialization: string;
  date: string;
  time: string;
  reason: string;
  status: string;
}

interface MedicalRecord {
  id: string;
  date: string;
  doctor: string;
  diagnosis: string;
  diagnosis_details: string;
  treatment: string;
  prescription?: PrescriptionItem[];
}

interface PrescriptionItem {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
}

interface AppointmentForm {
  doctor_id: string;
  date: string;
  time: string;
  reason: string;
}

interface RescheduleForm {
  appointmentId: string;
  date: string;
  time: string;
}

interface Message {
  type: 'success' | 'error' | '';
  text: string;
}

interface DashboardStats {
  total: number;
  upcoming: number;
  completed: number;
  pending: number;
}

interface AcademicStaffDashboardProps {
  user: User;
  onLogout: () => void;
}

const AcademicStaffDashboard: React.FC<AcademicStaffDashboardProps> = ({ user, onLogout }) => {
  const { t } = useTranslation();
  
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medicalHistory, setMedicalHistory] = useState<MedicalRecord[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<Message>({ type: '', text: '' });
  const [avatarError, setAvatarError] = useState<boolean>(false);

  
  // Profile states
  const [userProfile, setUserProfile] = useState({
    name: user.name || '',
    email: user.email || '',
    staff_no: user.staff_no || '',
    phone: user.phone || '',
    department: user.department || '',
    bio: user.bio || '',
    avatar_url: user.avatar_url || null
  });
  const [profileLoading, setProfileLoading] = useState<boolean>(false);
  const [profileSaving, setProfileSaving] = useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Form states
  const [appointmentForm, setAppointmentForm] = useState<AppointmentForm>({
    doctor_id: '',
    date: '',
    time: '',
    reason: ''
  });
  
  const [rescheduleForm, setRescheduleForm] = useState<RescheduleForm>({
    appointmentId: '',
    date: '',
    time: ''
  });

  const [showRescheduleModal, setShowRescheduleModal] = useState<boolean>(false);

  // Add state for cancel confirmation modal
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null);

  // University theme colors matching student dashboard
  const universityTheme = {
    primary: '#dc2626',
    secondary: '#059669',
    accent: '#dc3545',
    light: '#e0f2fe',
    gradient: 'linear-gradient(135deg, #af1e1eff 0%, #c33939ff 100%)'
  };

  // Available time slots
  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
  ];

  // Get dashboard statistics
  const getDashboardStats = (): DashboardStats => {
    const today = new Date();
    const upcomingAppointments = appointments.filter(apt => 
      new Date(apt.date) >= today && (apt.status === 'scheduled' || apt.status === 'confirmed')
    ).length;
    
    const completedAppointments = appointments.filter(apt => 
      apt.status === 'completed'
    ).length;
    
    const pendingAppointments = appointments.filter(apt => 
      apt.status === 'scheduled'
    ).length;
    
    return {
      total: appointments.length,
      upcoming: upcomingAppointments,
      completed: completedAppointments,
      pending: pendingAppointments
    };
  };

  const stats = getDashboardStats();

  // Specialty icons mapping
  const getSpecialtyIcon = (specialization: string | undefined): React.ReactNode => {
  const spec = specialization?.toLowerCase() || 'general';
  
  switch (spec) {
    case 'general practice':
    case 'general medicine':
    case 'general':
      return <Stethoscope className="text-danger" size={16} />;
    case 'cardiology':
    case 'heart':
      return <Heart className="text-danger" size={16} />;
    case 'dermatology':
    case 'skin':
      return <Thermometer className="text-warning" size={16} />;
    case 'psychiatry':
    case 'mental health':
    case 'psychology':
      return <Brain className="text-info" size={16} />;
    case 'orthopedics':
    case 'bone':
      return <Activity className="text-success" size={16} />;
    case 'neurology':
    case 'brain':
      return <Brain className="text-purple" size={16} />;
    default:
      console.log('Unknown specialization:', specialization); // Debug unknown specializations
      return <Stethoscope className="text-danger" size={16} />;
  }
};

  const getStatusBadge = (status: string): string => {
    return getStatusBadgeClass(status as AppointmentStatus);
  };

  // All existing API functions remain unchanged
  useEffect(() => {
    fetchDashboardData();
    fetchDoctors();
  }, []);

  // Profile API functions
  const fetchProfile = async (): Promise<void> => {
  setProfileLoading(true);
  try {
    const response = await fetch(`${API_BASE_URL}/api/academic-staff/profile`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      setUserProfile({
        name: data.name || '',
        email: data.email || '',
        staff_no: data.staff_no || '',
        phone: data.phone || '',
        department: data.department || '',
        bio: data.bio || '',
        avatar_url: data.avatar_url || null // Ensure this is properly set
      });
    } else {
      console.error('Failed to fetch profile:', response.status);
      showMessage('error', 'Failed to fetch profile');
    }
  } catch (error) {
    console.error('Error fetching profile:', error);
    showMessage('error', 'Failed to fetch profile');
  } finally {
    setProfileLoading(false);
  }
};

  const saveProfile = async (e?: React.FormEvent): Promise<void> => {
    e?.preventDefault();
    setProfileSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/academic-staff/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: userProfile.name,
          phone: userProfile.phone,
          department: userProfile.department,
          bio: userProfile.bio
        })
      });

      if (response.ok) {
        showMessage('success', 'Profile updated successfully!');
      } else {
        showMessage('error', 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      showMessage('error', 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleImageUpload = async (file: File | null): Promise<void> => {
  if (!file) return;
  
  // Basic client-side validation
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  
  if (file.size > maxSize) {
  showMessage('error', 'File size must be less than 5MB. Please choose a smaller image.');
  return;
}

if (!allowedTypes.includes(file.type)) {
  showMessage('error', 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.');
  return;
}
  
  setProfileSaving(true);
  const formData = new FormData();
  formData.append('avatar', file);
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/academic-staff/profile/avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });

    if (response.ok) {
      const data = await response.json();
      setUserProfile(prev => ({ ...prev, avatar_url: data.avatar_url }));
      setAvatarError(false); // Reset error state
      showMessage('success', 'Profile photo updated successfully!');
    } else {
      const errorData = await response.json().catch(() => ({}));
      showMessage('error', errorData.message || 'Failed to upload photo');
    }
  } catch (error) {
    console.error('Error uploading photo:', error);
    showMessage('error', 'Failed to upload photo. Please check your connection and try again.');
  } finally {
    setProfileSaving(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }
};

  const handlePhotoRemove = async (): Promise<void> => {
  if (!window.confirm('Are you sure you want to remove your profile photo?')) return;
  
  setProfileSaving(true);
  try {
    const response = await fetch(`${API_BASE_URL}/api/academic-staff/profile/avatar`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (response.ok) {
      setUserProfile(prev => ({ ...prev, avatar_url: null }));
      setAvatarError(false); // Reset error state
      showMessage('success', 'Profile photo removed successfully!');
    } else {
      const errorData = await response.json().catch(() => ({}));
      showMessage('error', errorData.message || 'Failed to remove photo');
    }
  } catch (error) {
    console.error('Error removing photo:', error);
    showMessage('error', 'Failed to remove photo. Please try again.');
  } finally {
    setProfileSaving(false);
  }
};

  const AvatarDisplay: React.FC<{
  src?: string | null;
  size: number;
  className?: string;
  fallbackColor?: string;
}> = ({ src, size, className = "", fallbackColor = "#dc3545" }) => {
  const [hasError, setHasError] = useState(false);
  
  // Reset error state when src changes
  React.useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return (
      <div 
        className={`rounded-circle d-flex align-items-center justify-content-center ${className}`}
        style={{
          width: size,
          height: size,
          backgroundColor: fallbackColor === "#dc3545" ? "#fee2e2" : "rgba(220, 53, 69, 0.1)",
          color: fallbackColor,
          overflow: 'hidden'
        }}
      >
        <User size={size * 0.4} />
      </div>
    );
  }

  return (
    <img 
      src={src}
      alt="Profile" 
      className={`rounded-circle ${className}`}
      style={{
        width: size,
        height: size,
        objectFit: 'cover'
      }}
      onError={() => setHasError(true)}
      onLoad={() => setHasError(false)}
    />
  );
};

  const fetchDashboardData = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/academic-staff/dashboard`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Dashboard data is available in data
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const fetchAppointments = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/academic-staff/appointments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Raw appointment data from API:', data.appointments); // Add this debug line
        setAppointments(data.appointments || []);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      showMessage('error', 'Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  };

  const fetchMedicalHistory = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/academic-staff/medical-history`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMedicalHistory(data.medical_history || []);
      }
    } catch (error) {
      console.error('Error fetching medical history:', error);
      showMessage('error', 'Failed to fetch medical history');
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/academic-staff/doctor-availability`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDoctors(data.doctors || []);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const fetchAvailableSlots = async (doctorId: string, date: string): Promise<void> => {
    if (!date) return;
    
    try {
      const url = doctorId 
        ? `${API_BASE_URL}/api/academic-staff/available-slots?doctor_id=${doctorId}&date=${date}`
        : `${API_BASE_URL}/api/academic-staff/available-slots?date=${date}`;
        
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableSlots(data.available_slots || timeSlots);
      }
    } catch (error) {
      console.error('Error fetching available slots:', error);
      setAvailableSlots(timeSlots);
    }
  };

  const handleScheduleAppointment = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    if (!appointmentForm.date || !appointmentForm.time || !appointmentForm.reason) {
      showMessage('error', 'Please fill in all required fields (date, time, and reason).');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/academic-staff/schedule-appointment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(appointmentForm)
      });

      const data = await response.json();

      if (response.ok) {
        showMessage('success', data.message);
        setAppointmentForm({ doctor_id: '', date: '', time: '', reason: '' });
        setAvailableSlots([]);
        if (activeTab === 'appointments') {
          fetchAppointments();
        }
      } else {
        showMessage('error', data.message);
      }
    } catch (error) {
      console.error('Error scheduling appointment:', error);
      showMessage('error', 'Failed to schedule appointment');
    } finally {
      setLoading(false);
    }
  };

  const handleRescheduleAppointment = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/academic-staff/reschedule-appointment/${rescheduleForm.appointmentId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: rescheduleForm.date,
          time: rescheduleForm.time
        })
      });

      const data = await response.json();

      if (response.ok) {
        showMessage('success', data.message);
        setRescheduleForm({ appointmentId: '', date: '', time: '' });
        setShowRescheduleModal(false);
        fetchAppointments();
      } else {
        showMessage('error', data.message);
      }
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      showMessage('error', 'Failed to reschedule appointment');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async (appointmentId: string): Promise<void> => {
  setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/academic-staff/cancel-appointment/${appointmentId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        showMessage('success', data.message);
        // Close the modal
        setShowCancelModal(false);
        setAppointmentToCancel(null);

        fetchAppointments();
      } else {
        showMessage('error', data.message);
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      showMessage('error', 'Failed to cancel appointment');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string): void => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleTabChange = (tab: string): void => {
    setActiveTab(tab);
    if (tab === 'appointments') {
      fetchAppointments();
    } else if (tab === 'medical-history') {
      fetchMedicalHistory();
    } else if (tab === 'profile') {
      fetchProfile();
    }
  };

  const handleAppointmentFormChange = (field: keyof AppointmentForm, value: string): void => {
    setAppointmentForm(prev => ({ ...prev, [field]: value }));
    
    if (field === 'doctor_id' || field === 'date') {
      const doctorId = field === 'doctor_id' ? value : appointmentForm.doctor_id;
      const date = field === 'date' ? value : appointmentForm.date;
      fetchAvailableSlots(doctorId, date);
    }
  };

  // Helper functions for appointment actions
const canShowActions = (status: string): boolean => {
  return ['scheduled', 'confirmed', 'pending'].includes(status.toLowerCase());
};

const canReschedule = (status: string): boolean => {
  return ['scheduled', 'confirmed'].includes(status.toLowerCase());
};

const canCancel = (status: string): boolean => {
  return ['scheduled', 'confirmed', 'pending'].includes(status.toLowerCase());
};

const getRescheduleDisabledReason = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'Cannot reschedule completed appointments';
    case 'cancelled':
      return 'Cannot reschedule cancelled appointments';
    case 'pending':
      return 'Cannot reschedule until appointment is confirmed';
    default:
      return 'Reschedule not available for this status';
  }
};

const getCancelDisabledReason = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'Cannot cancel completed appointments';
    case 'cancelled':
      return 'Appointment already cancelled';
    default:
      return 'Cancel not available for this status';
  }
};

  const openRescheduleModal = (appointment: Appointment): void => {
  console.log('Opening reschedule modal for appointment:', appointment);
  
  // Prevent body scrolling
  document.body.classList.add('modal-open');
  
  setRescheduleForm({
    appointmentId: appointment.id,
    date: appointment.date,
    time: appointment.time
  });
  
  // Clear any existing messages
  setMessage({ type: '', text: '' });
  
  setShowRescheduleModal(true);
};

  const getMinDate = (): string => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Navigation component matching student dashboard style
  const Navigation = () => (
  <nav 
    className="navbar navbar-expand-lg navbar-light"
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      width: '100%',
      zIndex: 1030,
      background: 'white',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      border: 'none',
      borderBottom: 'none',
      minHeight: '70px', // Reduced for mobile
      padding: 0,
      margin: 0
    }}
  >
    <div 
      className="container-fluid d-flex align-items-center justify-content-between h-100"
      style={{
        padding: '0.5rem 1rem', // Better mobile padding
        margin: 0
      }}
    >
      {/* Logo Section - Mobile responsive */}
      <div 
        className="navbar-brand d-flex align-items-center"
        style={{
          marginRight: 0,
          padding: 0,
          minWidth: '200px' // Ensure logo is always visible
        }}
      >
        <img
          src="/logo6.png"
          alt="Final International University Logo"
          style={{
            width: 'clamp(40px, 10vw, 50px)', // Responsive logo size
            height: 'clamp(40px, 10vw, 50px)',
            objectFit: 'contain',
            borderRadius: '8px',
            marginRight: 'clamp(8px, 2vw, 12px)' // Responsive spacing
          }}
        />
        <div>
          <h5 
            style={{
              color: '#212529',
              fontWeight: 'bold',
              fontSize: 'clamp(0.9rem, 3vw, 1.25rem)', // Responsive font size
              marginBottom: '2px',
              lineHeight: 1.2
            }}
            className="d-none d-sm-block" // Hide on very small screens
          >
            Final International University
          </h5>
          <h6 
            style={{
              color: '#212529',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              marginBottom: '2px',
              lineHeight: 1.2
            }}
            className="d-block d-sm-none" // Show abbreviated name on small screens
          >
            FIU Academic
          </h6>
          <small 
            style={{
              color: '#6c757d',
              fontSize: 'clamp(0.7rem, 2vw, 0.875rem)',
              lineHeight: 1
            }}
            className="d-none d-md-block" // Hide subtitle on mobile
          >
            Academic Staff Medical Portal
          </small>
        </div>
      </div>

      {/* Mobile menu toggle */}
      <button 
        className="navbar-toggler d-lg-none border-0" 
        type="button" 
        data-bs-toggle="collapse" 
        data-bs-target="#navbarContent"
        aria-controls="navbarContent" 
        aria-expanded="false" 
        aria-label="Toggle navigation"
        style={{
          padding: '4px 8px',
          fontSize: '1rem'
        }}
      >
        <span className="navbar-toggler-icon"></span>
      </button>

        {/* Navigation Menu */}
        <div className="collapse navbar-collapse" id="navbarContent">
          <ul 
            className="navbar-nav mx-auto mb-0" 
            style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <li className="nav-item">
              <button 
                className={`nav-link btn ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
                style={{
                  borderRadius: '8px',
                  border: 'none',
                  margin: 0,
                  padding: '10px 16px',
                  fontWeight: 600,
                  transition: 'all 0.3s ease',
                  backgroundColor: activeTab === 'overview' ? '#dc3545' : 'transparent',
                  color: activeTab === 'overview' ? 'white' : '#495057',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  minHeight: '44px'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== 'overview') {
                    e.currentTarget.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
                    e.currentTarget.style.color = '#dc3545';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== 'overview') {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#495057';
                  }
                }}
              >
                <BarChart3 size={18} />
                <span>Overview</span>
              </button>
            </li>
            
            <li className="nav-item">
              <button 
                className={`nav-link btn ${activeTab === 'schedule' ? 'active' : ''}`}
                onClick={() => setActiveTab('schedule')}
                style={{
                  borderRadius: '8px',
                  border: 'none',
                  margin: 0,
                  padding: '10px 16px',
                  fontWeight: 600,
                  transition: 'all 0.3s ease',
                  backgroundColor: activeTab === 'schedule' ? '#dc3545' : 'transparent',
                  color: activeTab === 'schedule' ? 'white' : '#495057',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  minHeight: '44px'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== 'schedule') {
                    e.currentTarget.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
                    e.currentTarget.style.color = '#dc3545';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== 'schedule') {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#495057';
                  }
                }}
              >
                <Calendar size={18} />
                <span>Schedule</span>
              </button>
            </li>
            
            <li className="nav-item">
              <button 
                className={`nav-link btn ${activeTab === 'appointments' ? 'active' : ''}`}
                onClick={() => handleTabChange('appointments')}
                style={{
                  borderRadius: '8px',
                  border: 'none',
                  margin: 0,
                  padding: '10px 16px',
                  fontWeight: 600,
                  transition: 'all 0.3s ease',
                  backgroundColor: activeTab === 'appointments' ? '#dc3545' : 'transparent',
                  color: activeTab === 'appointments' ? 'white' : '#495057',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  minHeight: '44px'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== 'appointments') {
                    e.currentTarget.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
                    e.currentTarget.style.color = '#dc3545';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== 'appointments') {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#495057';
                  }
                }}
              >
                <FileText size={18} />
                <span>Appointments</span>
              </button>
            </li>
            
            <li className="nav-item">
              <button 
                className={`nav-link btn ${activeTab === 'medical-history' ? 'active' : ''}`}
                onClick={() => handleTabChange('medical-history')}
                style={{
                  borderRadius: '8px',
                  border: 'none',
                  margin: 0,
                  padding: '10px 16px',
                  fontWeight: 600,
                  transition: 'all 0.3s ease',
                  backgroundColor: activeTab === 'medical-history' ? '#dc3545' : 'transparent',
                  color: activeTab === 'medical-history' ? 'white' : '#495057',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  minHeight: '44px'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== 'medical-history') {
                    e.currentTarget.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
                    e.currentTarget.style.color = '#dc3545';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== 'medical-history') {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#495057';
                  }
                }}
              >
                <History size={18} />
                <span>History</span>
              </button>
            </li>
            
            <li className="nav-item">
              <button 
                className={`nav-link btn ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => handleTabChange('profile')}
                style={{
                  borderRadius: '8px',
                  border: 'none',
                  margin: 0,
                  padding: '10px 16px',
                  fontWeight: 600,
                  transition: 'all 0.3s ease',
                  backgroundColor: activeTab === 'profile' ? '#dc3545' : 'transparent',
                  color: activeTab === 'profile' ? 'white' : '#495057',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  minHeight: '44px'
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
                    e.currentTarget.style.color = '#495057';
                  }
                }}
              >
                <UserCog size={18} />
                <span>Profile</span>
              </button>
            </li>
          </ul>

        {/* Right side controls */}
        <div 
          className="d-flex align-items-center"
          style={{ 
            gap: '12px',
            minWidth: '200px',
            justifyContent: 'flex-end'
          }}
        >
          {/* User Profile Dropdown - Language moved inside */}
          <div className="dropdown">
            <button 
              className="btn btn-light dropdown-toggle d-flex align-items-center" 
              data-bs-toggle="dropdown"
              style={{ 
                borderRadius: '25px',
                border: '2px solid #dee2e6',
                padding: '6px 12px',
                background: '#f8f9fa',
                color: '#212529',
                height: '40px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e9ecef';
                e.currentTarget.style.borderColor = '#ced4da';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f8f9fa';
                e.currentTarget.style.borderColor = '#dee2e6';
              }}
            >
              <div className="me-2">
                <AvatarDisplay 
                  src={userProfile.avatar_url} 
                  size={28} 
                />
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
                  <div className="me-3">
                    <AvatarDisplay 
                      src={userProfile.avatar_url} 
                      size={40} 
                    />
                  </div>
                  <div>
                    <div className="fw-semibold">{user.name}</div>
                    <small className="text-muted">{user.email}</small>
                    <div>
                      <small className="text-muted">Staff No: {user.staff_no}</small>
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
                    transition: 'background-color 0.2s ease'
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
                    transition: 'background-color 0.2s ease'
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
              
              {/* Logout */}
              {onLogout && (
                <li>
                  <button 
                    className="dropdown-item d-flex align-items-center text-danger" 
                    onClick={onLogout}
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
              )}
            </ul>
          </div>
        </div>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="min-vh-100" style={{ backgroundColor: '#f8f9fa', paddingTop: '90px' }}>
      <Navigation />
      
      <div className="container-fluid px-4">
        {/* Message Display */}
        {message.text && (
          <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'} alert-dismissible fade show mb-4`} 
               role="alert">
            <div className="d-flex align-items-center">
              {message.type === 'success' ? <CheckCircle size={20} className="me-2" /> : <X size={20} className="me-2" />}
              {message.text}
            </div>
            <button
              type="button"
              className="btn-close"
              onClick={() => setMessage({ type: '', text: '' })}
            ></button>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="row g-4">
            {/* Welcome Card */}
            <div className="col-12">
              <div className="card shadow-sm border-0" style={{ borderRadius: '1rem', background: universityTheme.gradient }}>
                <div className="card-body p-4 text-white">
                  <div className="row align-items-center">
                    <div className="col-md-8">
                      <h3 className="mb-2">Welcome back, {user.name}!</h3>
                      <div className="d-flex align-items-center mb-1">
                        <Mail size={16} className="me-2 opacity-75" />
                        <span className="opacity-90">{user.email}</span>
                      </div>
                      <div className="d-flex align-items-center mb-1">
                        <Users size={16} className="me-2 opacity-75" />
                        <span className="opacity-75">Staff No: {user.staff_no}</span>
                      </div>
                      {user.phone && (
                        <div className="d-flex align-items-center">
                          <Phone size={16} className="me-2 opacity-75" />
                          <span className="opacity-75">{user.phone}</span>
                        </div>
                      )}
                    </div>
                    <div className="col-md-4 text-end">
                      <div className="d-flex justify-content-end">
                        {userProfile.avatar_url ? (
                          <AvatarDisplay 
                            src={userProfile.avatar_url} 
                            size={120}
                            className="border border-white border-3"
                            fallbackColor="#fff"
                          />
                        ) : (
                          <div 
                            className="rounded-circle d-flex align-items-center justify-content-center border border-white border-3"
                            style={{
                              width: '120px',
                              height: '120px',
                              backgroundColor: 'rgba(255, 255, 255, 0.2)',
                              color: 'white'
                            }}
                          >
                            <User size={60} className="opacity-75" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics Cards - Better mobile layout */}
    {[
      { icon: Calendar, value: stats.total, label: 'Total Appointments', subLabel: 'Overall count', color: universityTheme.primary },
      { icon: CheckCircle, value: stats.completed, label: 'Completed', subLabel: 'Finished visits', color: universityTheme.secondary },
      { icon: Clock, value: stats.pending, label: 'Pending', subLabel: 'Awaiting confirmation', color: '#ffc107' },
      { icon: TrendingUp, value: stats.upcoming, label: 'Upcoming', subLabel: 'Scheduled ahead', color: '#17a2b8' }
    ].map((stat, index) => (
      <div key={index} className="col-6 col-lg-3">
        <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1rem' }}>
          <div className="card-body p-3 p-md-4 text-center">
            <div 
              className="d-inline-flex align-items-center justify-content-center mb-3"
              style={{
                width: 'clamp(50px, 12vw, 60px)',
                height: 'clamp(50px, 12vw, 60px)'
              }}
            >
              <stat.icon size={24} style={{ color: stat.color }} />
            </div>
            <h4 
              className="fw-bold mb-1" 
              style={{ 
                color: stat.color,
                fontSize: 'clamp(1.2rem, 5vw, 1.5rem)'
              }}
            >
              {stat.value}
            </h4>
            <p className="text-muted mb-0 small">{stat.label}</p>
            <small className="text-muted d-none d-md-block">{stat.subLabel}</small>
          </div>
        </div>
      </div>
    ))}

            {/* Quick Actions */}
            <div className="col-12">
              <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
                <div className="card-header bg-white border-0 pb-0">
                  <h5 className="fw-bold mb-0">Quick Actions</h5>
                </div>
                <div className="card-body p-4">
                  <div className="row g-3">
                    <div className="col-md-4">
                      <button 
                        className="btn btn-primary w-100 py-3 border-0" 
                        style={{ 
                          borderRadius: '0.75rem', 
                          background: universityTheme.gradient,
                          transition: 'all 0.3s ease'
                        }}
                        onClick={() => setActiveTab('schedule')}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#c52e3dff';
                          e.currentTarget.style.color = 'white';
                          e.currentTarget.style.border = '2px solid #c52e3dff';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = universityTheme.gradient;
                          e.currentTarget.style.color = 'white';
                          e.currentTarget.style.border = 'none';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <Calendar size={24} className="mb-2" />
                        <div className="fw-semibold">Schedule Appointment</div>
                        <small className="opacity-75">Book a new medical appointment</small>
                      </button>
                    </div>
                    
                    <div className="col-md-4">
                      <button 
                        className="btn w-100 py-3" 
                        style={{ 
                          borderRadius: '0.75rem',
                          border: `2px solid ${universityTheme.primary}`,
                          color: universityTheme.primary,
                          backgroundColor: 'transparent',
                          transition: 'all 0.3s ease'
                        }}
                        onClick={() => handleTabChange('appointments')}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.setProperty('background-color', '#c52e3dff', 'important');
                          e.currentTarget.style.setProperty('color', 'white', 'important');
                          e.currentTarget.style.setProperty('border-color', '#c52e3dff', 'important');
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.setProperty('background-color', 'transparent', 'important');
                          e.currentTarget.style.setProperty('color', universityTheme.primary, 'important');
                          e.currentTarget.style.setProperty('border-color', universityTheme.primary, 'important');
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <FileText size={24} className="mb-2" />
                        <div className="fw-semibold">My Appointments</div>
                        <small className="text-muted">View and manage appointments</small>
                      </button>
                    </div>
                    
                    <div className="col-md-4">
                      <button 
                        className="btn w-100 py-3" 
                        style={{ 
                          borderRadius: '0.75rem',
                          border: `2px solid ${universityTheme.accent}`,
                          color: universityTheme.accent,
                          backgroundColor: 'transparent',
                          transition: 'all 0.3s ease'
                        }}
                        onClick={() => handleTabChange('medical-history')}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.setProperty('background-color', '#c92c3cff', 'important');
                          e.currentTarget.style.setProperty('color', 'white', 'important');
                          e.currentTarget.style.setProperty('border-color', '#c52e3dff', 'important');
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.setProperty('background-color', 'transparent', 'important');
                          e.currentTarget.style.setProperty('color', universityTheme.accent, 'important');
                          e.currentTarget.style.setProperty('border-color', universityTheme.accent, 'important');
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <History size={24} className="mb-2" />
                        <div className="fw-semibold">Medical Records</div>
                        <small className="text-muted">Access your health information</small>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Appointments */}
            {/* Recent Appointments - Mobile Responsive */}
{appointments.length > 0 && (
  <div className="col-12">
    <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
      <div className="card-header bg-white border-0 pb-0">
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2">
          <h5 className="fw-bold mb-0">Recent Appointments</h5>
          <button 
            className="btn btn-sm btn-outline-primary align-self-start align-self-sm-auto"
            onClick={() => handleTabChange('appointments')}
            style={{ borderRadius: '0.5rem' }}
          >
            View All
          </button>
        </div>
      </div>
      <div className="card-body p-3 p-md-4">
        {/* Desktop: Original horizontal layout */}
        <div className="d-none d-md-block">
          {appointments.slice(0, 3).map((appointment) => (
            <div key={appointment.id} className="d-flex align-items-center p-3 bg-light rounded-3 mb-3">
              <div className="me-3">
                <User size={24} className="text-primary" />
              </div>
              <div className="flex-grow-1">
                <h6 className="mb-1 fw-semibold">Dr. {appointment.doctor}</h6>
                <div className="d-flex align-items-center text-muted small">
                  <Calendar size={14} className="me-1" />
                  {new Date(appointment.date).toLocaleDateString()}
                  <Clock size={14} className="ms-3 me-1" />
                  {appointment.time}
                </div>
                <small className="text-muted">{appointment.reason}</small>
              </div>
              <span className={`${getStatusBadge(appointment.status)} small`}>
                {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
              </span>
            </div>
          ))}
        </div>

        {/* Mobile: Vertical card layout */}
        <div className="d-block d-md-none">
          {appointments.slice(0, 3).map((appointment) => (
            <div 
              key={appointment.id} 
              className="card mb-3 border-0"
              style={{ 
                backgroundColor: '#f8f9fa',
                borderRadius: '0.75rem'
              }}
            >
              <div className="card-body p-3">
                {/* Header with doctor name and status */}
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center mb-1">
                      <User size={20} className="text-primary me-2 flex-shrink-0" />
                      <h6 className="mb-0 fw-semibold" style={{ fontSize: '0.95rem' }}>
                        Dr. {appointment.doctor}
                      </h6>
                    </div>
                    
                    {/* Date and time on mobile */}
                    <div 
                      className="d-flex align-items-center text-muted mb-2"
                      style={{ fontSize: '0.8rem' }}
                    >
                      <Calendar size={12} className="me-1 flex-shrink-0" />
                      <span className="me-3">{new Date(appointment.date).toLocaleDateString()}</span>
                      <Clock size={12} className="me-1 flex-shrink-0" />
                      <span>{appointment.time}</span>
                    </div>
                  </div>
                  
                  {/* Status badge */}
                  <span 
                    className={getStatusBadge(appointment.status)}
                    style={{ 
                      fontSize: '0.75rem',
                      padding: '0.3rem 0.6rem',
                      borderRadius: '1rem',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                  </span>
                </div>

                {/* Reason - truncated on mobile */}
                <div 
                  className="text-muted"
                  style={{ 
                    fontSize: '0.85rem',
                    lineHeight: '1.4',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  title={appointment.reason} // Show full text on hover/touch
                >
                  {appointment.reason}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Show more button on mobile if there are more appointments */}
        <div className="d-block d-md-none text-center">
          {appointments.length > 3 && (
            <button 
              className="btn btn-outline-primary btn-sm mt-2"
              onClick={() => handleTabChange('appointments')}
              style={{ borderRadius: '1rem' }}
            >
              View {appointments.length - 3} More Appointments
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
)}
          </div>
        )}

        {/* Schedule Appointment Tab - UNCHANGED */}
        {activeTab === 'schedule' && (
          <div className="row">
            <div className="col-md-8">
              <div className="card shadow-sm">
                <div className="card-header" style={{ backgroundColor: universityTheme.primary }}>
                  <h3 className="card-title text-white mb-0 d-flex align-items-center">
                    <Calendar size={24} className="me-2" />
                    Schedule New Appointment
                  </h3>
                </div>
                <div className="card-body p-4">
                  <form onSubmit={handleScheduleAppointment}>
                    <div className="row g-4">
                      <div className="col-12">
                        <label className="form-label fw-semibold">Select Doctor (Optional)</label>
                        <select 
                          className="form-select form-select-lg"
                          value={appointmentForm.doctor_id}
                          onChange={(e) => handleAppointmentFormChange('doctor_id', e.target.value)}
                        >
                          <option value="">Any available doctor</option>
                          {doctors.map(doctor => (
                            <option key={doctor.id} value={doctor.id}>
                              Dr. {doctor.name} - {doctor.specialization}
                            </option>
                          ))}
                        </select>
                        <div className="form-text">Leave blank to be assigned to any available doctor</div>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Appointment Date <span className="text-danger">*</span></label>
                        <input 
                          type="date"
                          className="form-control form-control-lg"
                          value={appointmentForm.date}
                          onChange={(e) => handleAppointmentFormChange('date', e.target.value)}
                          min={getMinDate()}
                          required
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Available Time Slots <span className="text-danger">*</span></label>
                        <select 
                          className="form-select form-select-lg"
                          value={appointmentForm.time}
                          onChange={(e) => handleAppointmentFormChange('time', e.target.value)}
                          required
                          disabled={!appointmentForm.date}
                        >
                          <option value="">
                            {!appointmentForm.date ? 'Select date first' : 'Choose a time slot...'}
                          </option>
                          {availableSlots.map(slot => (
                            <option key={slot} value={slot}>{slot}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-12">
                        <label className="form-label fw-semibold">Reason for Visit <span className="text-danger">*</span></label>
                        <textarea 
                          className="form-control"
                          rows={4}
                          value={appointmentForm.reason}
                          onChange={(e) => handleAppointmentFormChange('reason', e.target.value)}
                          placeholder="Describe your health concerns or reason for the appointment..."
                          maxLength={500}
                          required
                          style={{ resize: 'none' }}
                        />
                        <div className="form-text">{appointmentForm.reason ? appointmentForm.reason.length : 0}/500 characters</div>
                      </div>

                      <div className="col-12">
                        <button 
                          type="submit" 
                          className="btn btn-primary btn-lg w-100 py-3"
                          disabled={loading}
                          style={{ 
                            backgroundColor: loading ? '#6c757d' : universityTheme.primary,
                            border: 'none',
                            borderRadius: '0.5rem'
                          }}
                        >
                          {loading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                              Scheduling...
                            </>
                          ) : (
                            <>
                              <Calendar size={20} className="me-2" />
                              Schedule Appointment
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Doctor Cards */}
                  {doctors.length > 0 && (
                    <div className="mt-5">
                      <h5 className="mb-3 fw-semibold">Available Doctors</h5>
                      <div className="row g-3">
                        {doctors.map((doctor) => (
                          <div key={doctor.id} className="col-md-6">
                            <div className="card h-100 shadow-sm border-0" style={{ borderRadius: '1rem' }}>
                              <div className="card-body text-center p-3">
                                <div className="mb-2">{getSpecialtyIcon(doctor.specialization)}</div>
                                <h6 className="card-title fw-bold mb-1">Dr. {doctor.name}</h6>
                                <p className="card-text text-muted small mb-2">{doctor.specialization}</p>
                                {doctor.phone && (
                                  <div className="d-flex justify-content-center align-items-center">
                                    <Phone size={14} className="me-1 text-muted" />
                                    <small className="text-muted">{doctor.phone}</small>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="col-md-4">
  <ClinicHoursCard />
  <AppointmentTipsCard />
  <EmergencyContactsCard />
</div>
          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
            <div className="card-header" style={{ backgroundColor: universityTheme.primary, borderRadius: '1rem 1rem 0 0' }}>
              <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center gap-3">
                <h3 className="mb-0 fw-bold text-white">
                  <History size={24} className="me-2" />
                  Appointment History
                </h3>
                <button 
                  className="btn btn-sm text-white"
                  onClick={() => setActiveTab('schedule')}
                  style={{ borderRadius: '0.5rem', border: '1px solid white' }}
                >
                  <Calendar size={16} className="me-1" />
                  New Appointment
                </button>
              </div>
            </div>
            <div className="card-body p-2 p-md-4">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border" style={{ color: universityTheme.primary }} role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-3">Loading appointments...</p>
                </div>
              ) : appointments.length === 0 ? (
                <div className="text-center py-5">
                  <FileText size={48} className="text-muted mb-3" />
                  <h5 className="fw-semibold">No appointments found</h5>
                  <p className="text-muted">You haven't scheduled any appointments yet.</p>
                  <button 
                    className="btn btn-primary mt-3"
                    onClick={() => setActiveTab('schedule')}
                    style={{ borderRadius: '0.5rem', backgroundColor: universityTheme.primary }}
                  >
                    <Calendar size={18} className="me-2" />
                    Schedule Appointment
                  </button>
                </div>
              ) : (
                <>
                  {/* Mobile: Card layout */}
                  <div className="d-block d-lg-none">
                    {appointments.map((appointment) => (
                      <div key={appointment.id} className="card mb-3 border">
                        <div className="card-body p-3">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <div className="flex-grow-1">
                              <h6 className="mb-1 fw-semibold">Dr. {appointment.doctor}</h6>
                              <div className="d-flex align-items-center small text-muted mb-1">
                                {getSpecialtyIcon(appointment.specialization)}
                                <span className="ms-2">{appointment.specialization}</span>
                              </div>
                            </div>
                            <span className={getStatusBadge(appointment.status)}>
                              {appointment.status === 'pending' 
                                ? 'Pending Clinical Approval' 
                                : getStatusText(appointment.status)}
                            </span>
                          </div>
                          
                          <div className="mb-2">
                            <div className="d-flex align-items-center text-muted small mb-1">
                              <Calendar size={12} className="me-1" />
                              {new Date(appointment.date).toLocaleDateString()}
                              <Clock size={12} className="ms-3 me-1" />
                              {appointment.time}
                            </div>
                            <small className="text-muted">{appointment.reason}</small>
                          </div>
                          
                          {canShowActions(appointment.status) && (
                            <div className="d-flex gap-1 flex-wrap">
                              {canReschedule(appointment.status) ? (
                                <button 
                                  className="btn btn-sm btn-outline-primary flex-fill"
                                  onClick={() => openRescheduleModal(appointment)}
                                >
                                  <Edit size={14} className="me-1" />
                                  Reschedule
                                </button>
                              ) : (
                                <button 
                                  className="btn btn-sm btn-outline-secondary flex-fill" 
                                  disabled
                                  title={getRescheduleDisabledReason(appointment.status)}
                                >
                                  <Edit size={14} className="me-1" />
                                  Reschedule
                                </button>
                              )}

                              {canCancel(appointment.status) ? (
                                <button 
                                  className="btn btn-sm btn-outline-danger flex-fill"
                                  onClick={() => {
                                    setAppointmentToCancel(appointment.id);
                                    setShowCancelModal(true);
                                  }}
                                >
                                  <X size={14} className="me-1" />
                                  Cancel
                                </button>
                              ) : (
                                <button 
                                  className="btn btn-sm btn-outline-secondary flex-fill" 
                                  disabled
                                  title={getCancelDisabledReason(appointment.status)}
                                >
                                  <X size={14} className="me-1" />
                                  Cancel
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop: Table layout */}
                  <div className="d-none d-lg-block">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle">
                        <thead>
                          <tr>
                            <th scope="col">Doctor</th>
                            <th scope="col">Specialization</th>
                            <th scope="col">Date</th>
                            <th scope="col">Time</th>
                            <th scope="col">Reason</th>
                            <th scope="col">Status</th>
                            <th scope="col">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {appointments.map((appointment) => (
                            <tr key={appointment.id}>
                              <td>
                                <div className="d-flex align-items-center">
                                  <User size={20} className="me-2 text-primary" />
                                  <span className="fw-semibold">Dr. {appointment.doctor}</span>
                                </div>
                              </td>
                              <td>
                                <div className="d-flex align-items-center">
                                  {getSpecialtyIcon(appointment.specialization)}
                                  <span className="ms-2">{appointment.specialization}</span>
                                </div>
                              </td>
                              <td>
                                <div className="d-flex flex-column">
                                  <span className="fw-semibold">{new Date(appointment.date).toLocaleDateString()}</span>
                                </div>
                              </td>
                              <td>
                                <small className="text-muted">{appointment.time}</small>
                              </td>
                              <td>
                                <div className="text-truncate" style={{ maxWidth: '200px' }} title={appointment.reason}>
                                  {appointment.reason}
                                </div>
                              </td>
                              <td>
                                <span className={getStatusBadge(appointment.status)}>
                                  {appointment.status === 'pending' 
                                    ? 'Pending Clinical Approval' 
                                    : getStatusText(appointment.status)}
                                </span>
                              </td>
                              <td>
                                <div className="d-flex gap-2">
                                  {canReschedule(appointment.status) ? (
                                    <button 
                                      className="btn btn-sm"
                                      onClick={() => openRescheduleModal(appointment)}
                                      style={{ 
                                        borderRadius: '0.5rem',
                                        border: `1px solid ${universityTheme.primary}`,
                                        color: universityTheme.primary,
                                        backgroundColor: 'transparent'
                                      }}
                                      title="Reschedule appointment"
                                    >
                                      <Edit size={16} />
                                    </button>
                                  ) : (
                                    <button 
                                      className="btn btn-sm btn-outline-secondary"
                                      disabled
                                      title={getRescheduleDisabledReason(appointment.status)}
                                      style={{ borderRadius: '0.5rem' }}
                                    >
                                      <Edit size={16} />
                                    </button>
                                  )}
                                  
                                  {canCancel(appointment.status) ? (
                                    <button 
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={() => {
                                        setAppointmentToCancel(appointment.id);
                                        setShowCancelModal(true);
                                      }}
                                      style={{ borderRadius: '0.5rem' }}
                                      title="Cancel appointment"
                                    >
                                      <X size={16} />
                                    </button>
                                  ) : (
                                    <button 
                                      className="btn btn-sm btn-outline-secondary"
                                      disabled
                                      title={getCancelDisabledReason(appointment.status)}
                                      style={{ borderRadius: '0.5rem' }}
                                    >
                                      <X size={16} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
    

        {/* Profile Tab */}
        {activeTab === 'profile' && (
        <div className="row g-3 g-md-4">
          {/* Personal Information */}
          <div className="col-12 col-lg-8">
            <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
              <div className="card-header border-0" style={{ background: universityTheme.gradient, borderRadius: '1rem 1rem 0 0' }}>
                <h5 className="card-title mb-0 text-white d-flex align-items-center">
                  <UserCog size={20} className="me-2" />
                  Personal Information
                </h5>
              </div>
              <div className="card-body p-3 p-md-4">
                {profileLoading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary mb-3" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-muted">Loading profile...</p>
                  </div>
                ) : (
                  <form onSubmit={saveProfile}>
                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold">Full Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={userProfile.name}
                          onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                          required
                          placeholder="Enter your full name"
                        />
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold">Email Address</label>
                        <input
                          type="email"
                          className="form-control"
                          value={userProfile.email}
                          disabled
                          style={{ backgroundColor: '#f8f9fa' }}
                        />
                        <div className="form-text">Email cannot be changed</div>
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold">Staff Number</label>
                        <input
                          type="text"
                          className="form-control"
                          value={userProfile.staff_no}
                          disabled
                          style={{ backgroundColor: '#f8f9fa' }}
                        />
                        <div className="form-text">Staff number cannot be changed</div>
                      </div>
                      
                      {/* Phone Number with responsive PhoneInput */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold">Phone Number</label>
                        <PhoneInput
                          country={'tr'}
                          value={userProfile.phone}
                          onChange={(phone) => setUserProfile({ ...userProfile, phone })}
                          placeholder="Enter your phone number"
                          inputProps={{
                            className: 'form-control',
                            required: false
                          }}
                          containerClass="phone-input-container w-100"
                          inputClass="phone-input-field"
                          dropdownClass="phone-dropdown"
                          searchClass="phone-search"
                        />
                      </div>
                      
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold">Department</label>
                        <select
                          className="form-select"
                          value={userProfile.department}
                          onChange={(e) => setUserProfile({ ...userProfile, department: e.target.value })}
                        >
                          <option value="">Select Department</option>
                          <option value="Medicine">Medicine</option>
                          <option value="Engineering">Engineering</option>
                          <option value="Business Administration">Business Administration</option>
                          <option value="Computer Science">Computer Science</option>
                          <option value="Education">Education</option>
                          <option value="Arts & Sciences">Arts & Sciences</option>
                          <option value="Pharmacy">Pharmacy</option>
                          <option value="Dentistry">Dentistry</option>
                          <option value="Nursing">Nursing</option>
                          <option value="Architecture">Architecture</option>
                        </select>
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-semibold">Bio</label>
                        <textarea
                          className="form-control"
                          rows={4}
                          value={userProfile.bio}
                          onChange={(e) => setUserProfile({ ...userProfile, bio: e.target.value })}
                          placeholder="Tell us about yourself, your research interests, or academic background..."
                          maxLength={500}
                        />
                        <div className="form-text">{userProfile.bio ? userProfile.bio.length : 0}/500 characters</div>
                      </div>
                    </div>

                    <div className="mt-4 d-flex gap-2">
                      <button 
                        type="submit" 
                        className="btn btn-primary"
                        disabled={profileSaving}
                        style={{ background: universityTheme.secondary, border: 'none' }}
                      >
                        {profileSaving ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>

              {/* Profile Picture */}
              <div className="col-lg-4">
                <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
                  <div className="card-header border-0" style={{ background: '#fee2e2', borderRadius: '1rem 1rem 0 0' }}>
                    <h5 className="card-title mb-0 text-danger d-flex align-items-center">
                      <Camera size={20} className="me-2" />
                      Profile Picture
                    </h5>
                  </div>
                  <div className="card-body p-4 text-center">
                    <div className="mb-3">
                      <AvatarDisplay 
                        src={userProfile.avatar_url} 
                        size={120}
                        className="mx-auto"
                        fallbackColor={universityTheme.primary}
                      />
                    </div>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      style={{ display: 'none' }}
                      onChange={(e) => handleImageUpload(e.target.files?.[0] || null)}
                    />
                    
                    <button 
                      className="btn btn-outline-primary w-100 mb-2" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={profileSaving}
                    >
                      <Camera size={16} className="me-1" /> 
                      Upload New Photo
                    </button>
                    
                    {userProfile.avatar_url && (
                      <button 
                        className="btn btn-outline-danger w-100 mb-3" 
                        onClick={handlePhotoRemove}
                        disabled={profileSaving}
                      >
                        <X size={16} className="me-1" /> 
                        Remove Photo
                      </button>
                    )}
                    
                    {/* Photo Guidelines Dropdown with Inline Styles */}
                    <div className="accordion" id="academicPhotoGuidelines">
                      <div className="accordion-item" style={{ border: 'none', background: 'transparent' }}>
                        <h2 className="accordion-header" id="academicPhotoGuidelinesHeading">
                          <button 
                            className="accordion-button collapsed"
                            type="button" 
                            data-bs-toggle="collapse" 
                            data-bs-target="#academicPhotoGuidelinesCollapse" 
                            aria-expanded="false" 
                            aria-controls="academicPhotoGuidelinesCollapse"
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
                            <Camera size={16} className="me-2" />
                            Photo Upload Guidelines
                          </button>
                        </h2>
                        <div 
                          id="academicPhotoGuidelinesCollapse" 
                          className="accordion-collapse collapse" 
                          aria-labelledby="academicPhotoGuidelinesHeading" 
                          data-bs-parent="#academicPhotoGuidelines"
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
                                      <strong className="text-dark">Quality:</strong>
                                      <br />
                                      <small className="text-muted">Clear, well-lit, professional appearance</small>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="col-12">
                                  <div className="d-flex align-items-start">
                                    <CheckCircle size={16} className="text-success me-2 mt-1 flex-shrink-0" />
                                    <div>
                                      <strong className="text-dark">Content:</strong>
                                      <br />
                                      <small className="text-muted">Professional headshot, appropriate academic attire</small>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="col-12">
                                  <div className="d-flex align-items-start">
                                    <CheckCircle size={16} className="text-success me-2 mt-1 flex-shrink-0" />
                                    <div>
                                      <strong className="text-dark">Academic Standards:</strong>
                                      <br />
                                      <small className="text-muted">Suitable for staff directory and official use</small>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Keep the old text as fallback - remove this section */}
                    {/* <div className="mt-3">
                      <small className="text-muted">
                        Supported formats: JPG, PNG, GIF<br/>
                        Maximum size: 5MB
                      </small>
                    </div> */}
                  </div>
                </div>
              </div>

              </div>
          )}

        {/* Medical History Tab - UNCHANGED */}
        {/* Medical History Tab */}
        {activeTab === 'medical-history' && (
          <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
            <div className="card-header" style={{ backgroundColor: universityTheme.primary, borderRadius: '1rem 1rem 0 0' }}>
              <h3 className="mb-0 fw-bold text-white">
                <History size={24} className="me-2" />
                Medical History
              </h3>
            </div>
            <div className="card-body p-2 p-md-4">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border" style={{ color: universityTheme.primary }} role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-3">Loading medical history...</p>
                </div>
              ) : medicalHistory.length === 0 ? (
                <div className="text-center py-5">
                  <History size={48} className="text-muted mb-3" />
                  <h5 className="fw-semibold">No medical records found</h5>
                  <p className="text-muted">Your medical history will appear here after your first appointment.</p>
                </div>
              ) : (
                <>
                  {/* Mobile: Card layout */}
                  <div className="d-block d-lg-none">
                    {medicalHistory.map((record) => (
                      <div key={record.id} className="card mb-3 border">
                        <div className="card-body p-3">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <div className="flex-grow-1">
                              <h6 className="mb-1 fw-semibold">{record.diagnosis}</h6>
                              <div className="d-flex align-items-center small text-muted mb-1">
                                <User size={12} className="me-1" />
                                <span>Dr. {record.doctor}</span>
                                <Calendar size={12} className="ms-3 me-1" />
                                <span>{new Date(record.date).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mb-2">
                            <div className="small mb-2">
                              <strong className="text-primary">Diagnosis Details:</strong>
                              <p className="text-muted mb-1">{record.diagnosis_details}</p>
                            </div>
                            <div className="small mb-2">
                              <strong className="text-success">Treatment:</strong>
                              <p className="text-muted mb-1">{record.treatment}</p>
                            </div>
                          </div>
                          
                          {record.prescription && record.prescription.length > 0 && (
                            <div className="mt-2">
                              <button 
                                className="btn btn-sm btn-outline-primary w-100"
                                type="button"
                                data-bs-toggle="collapse"
                                data-bs-target={`#prescription-mobile-${record.id}`}
                                aria-expanded="false"
                              >
                                View Prescription
                              </button>
                              <div className="collapse mt-2" id={`prescription-mobile-${record.id}`}>
                                <div className="card card-body bg-light">
                                  {record.prescription.map((item, i) => (
                                    <div key={i} className="mb-2 pb-2 border-bottom">
                                      <div className="small"><strong>Medication:</strong> {item.medication}</div>
                                      <div className="small"><strong>Dosage:</strong> {item.dosage}</div>
                                      <div className="small"><strong>Frequency:</strong> {item.frequency}</div>
                                      <div className="small"><strong>Duration:</strong> {item.duration}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop: Table layout */}
                  <div className="d-none d-lg-block">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle">
                        <thead>
                          <tr>
                            <th scope="col">Date</th>
                            <th scope="col">Doctor</th>
                            <th scope="col">Diagnosis</th>
                            <th scope="col">Treatment</th>
                          
                          </tr>
                        </thead>
                        <tbody>
                          {medicalHistory.map((record) => (
                            <tr key={record.id}>
                              <td>
                                <div className="d-flex flex-column">
                                  <span className="fw-semibold">{new Date(record.date).toLocaleDateString()}</span>
                                </div>
                              </td>
                              <td>
                                <div className="d-flex align-items-center">
                                  <User size={20} className="me-2 text-primary" />
                                  <span>Dr. {record.doctor}</span>
                                </div>
                              </td>
                              <td>
                                <div>
                                  <div className="fw-semibold">{record.diagnosis}</div>
                                  <small className="text-muted">{record.diagnosis_details}</small>
                                </div>
                              </td>
                              <td>
                                <div className="text-truncate" style={{ maxWidth: '200px' }} title={record.treatment}>
                                  {record.treatment}
                                </div>
                              </td>
                              <td>
                                {record.prescription && record.prescription.length > 0 && (
                                  <button 
                                    className="btn btn-sm btn-outline-primary"
                                    type="button"
                                    data-bs-toggle="modal"
                                    data-bs-target={`#prescription-modal-${record.id}`}
                                    style={{ borderRadius: '0.5rem' }}
                                  >
                                    <FileText size={16} className="me-1" />
                                    View Prescription
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Prescription Modals for Desktop */}
                  {medicalHistory.map((record) => (
                    record.prescription && record.prescription.length > 0 && (
                      <div key={record.id} className="modal fade" id={`prescription-modal-${record.id}`} tabIndex={-1}>
                        <div className="modal-dialog modal-dialog-centered">
                          <div className="modal-content" style={{ borderRadius: '1rem' }}>
                            <div className="modal-header" style={{ backgroundColor: universityTheme.primary }}>
                              <h5 className="modal-title text-white">
                                <FileText size={20} className="me-2" />
                                Prescription Details
                              </h5>
                              <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div className="modal-body">
                              <div className="mb-3">
                                <strong>Date:</strong> {new Date(record.date).toLocaleDateString()}
                              </div>
                              <div className="mb-3">
                                <strong>Doctor:</strong> Dr. {record.doctor}
                              </div>
                              <div className="mb-3">
                                <strong>Diagnosis:</strong> {record.diagnosis}
                              </div>
                              <hr />
                              <h6 className="fw-bold mb-3">Medications:</h6>
                              <div className="table-responsive">
                                <table className="table table-bordered">
                                  <thead>
                                    <tr>
                                      <th>Medication</th>
                                      <th>Dosage</th>
                                      <th>Frequency</th>
                                      <th>Duration</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {record.prescription.map((item, i) => (
                                      <tr key={i}>
                                        <td>{item.medication}</td>
                                        <td>{item.dosage}</td>
                                        <td>{item.frequency}</td>
                                        <td>{item.duration}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                            <div className="modal-footer">
                              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {/* Reschedule Modal - UNCHANGED */}
        {showRescheduleModal && (
          <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content" style={{ borderRadius: '1rem' }}>
                <div className="modal-header" style={{ backgroundColor: universityTheme.primary }}>
                  <h5 className="modal-title fw-bold text-white">
                    <Edit size={20} className="me-2" />
                    Reschedule Appointment
                  </h5>
                  <button 
                    type="button" 
                    className="btn-close btn-close-white" 
                    onClick={() => setShowRescheduleModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <form onSubmit={handleRescheduleAppointment}>
                    <div className="mb-3">
                      <label className="form-label">New Date</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        value={rescheduleForm.date}
                        onChange={(e) => setRescheduleForm({...rescheduleForm, date: e.target.value})}
                        min={getMinDate()}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">New Time</label>
                      <select 
                        className="form-select" 
                        value={rescheduleForm.time}
                        onChange={(e) => setRescheduleForm({...rescheduleForm, time: e.target.value})}
                        required
                      >
                        <option value="">Select a time slot</option>
                        {timeSlots.map((time) => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                    </div>
                    <div className="d-flex justify-content-end gap-2">
                      <button 
                        type="button" 
                        className="btn btn-outline-secondary" 
                        onClick={() => setShowRescheduleModal(false)}
                        style={{ borderRadius: '0.5rem' }}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="btn btn-primary"
                        disabled={loading}
                        style={{ 
                          backgroundColor: loading ? '#6c757d' : universityTheme.primary,
                          border: 'none',
                          borderRadius: '0.5rem'
                        }}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Updating...
                          </>
                        ) : 'Reschedule'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Cancel Confirmation Modal */}
{showCancelModal && (
  <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
    <div className="modal-dialog modal-dialog-centered">
      <div className="modal-content" style={{ borderRadius: '1rem' }}>
        <div className="modal-header" style={{ backgroundColor: '#dc3545' }}>
          <h5 className="modal-title fw-bold text-white d-flex align-items-center">
            <AlertTriangle size={20} className="me-2" />
            Cancel Appointment
          </h5>
          <button 
            type="button" 
            className="btn-close btn-close-white" 
            onClick={() => {
              setShowCancelModal(false);
              setAppointmentToCancel(null);
            }}
          ></button>
        </div>
        <div className="modal-body">
          <div className="d-flex align-items-start mb-3">
            <AlertTriangle size={48} className="text-warning me-3 flex-shrink-0" />
            <div>
              <h6 className="fw-bold mb-2">Are you sure you want to cancel this appointment?</h6>
              <p className="text-muted mb-0">
                This action cannot be undone. You will need to book a new appointment if you change your mind.
              </p>
            </div>
          </div>
          
          <div className="alert alert-warning mb-0">
            <small>
              <strong>Note:</strong> Please cancel at least 24 hours in advance when possible.
            </small>
          </div>
        </div>
        <div className="modal-footer">
          <button 
            type="button" 
            className="btn btn-outline-secondary" 
            onClick={() => {
              setShowCancelModal(false);
              setAppointmentToCancel(null);
            }}
            style={{ borderRadius: '0.5rem' }}
          >
            Keep Appointment
          </button>
          <button 
            type="button" 
            className="btn btn-danger"
            onClick={() => appointmentToCancel && handleCancelAppointment(appointmentToCancel)}
            disabled={loading}
            style={{ 
              backgroundColor: loading ? '#6c757d' : universityTheme.primary,
              border: 'none',
              borderRadius: '0.5rem'
            }}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Cancelling...
              </>
            ) : (
              <>
                <X size={16} className="me-2" />
                Yes, Cancel Appointment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default AcademicStaffDashboard;