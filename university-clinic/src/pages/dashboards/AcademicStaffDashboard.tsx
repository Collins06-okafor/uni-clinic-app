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
  date_of_birth?: string;                    // ✅ ADD
  emergency_contact_name?: string;           // ✅ ADD
  emergency_contact_phone?: string;          // ✅ ADD
  emergency_contact_relationship?: string;   // ✅ ADD
  emergency_contact_email?: string;          // ✅ ADD
  blood_type?: string;                       // ✅ ADD
  gender?: string;                           // ✅ ADD
  allergies?: string;                        // ✅ ADD
  has_known_allergies?: boolean;             // ✅ ADD
  allergies_uncertain?: boolean;             // ✅ ADD
  addictions?: string;                       // ✅ ADD
  medical_history?: string;                  // ✅ ADD
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
  urgency: 'normal' | 'high' | 'urgent';  // ✅ ADD THIS LINE
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
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
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
    avatar_url: user.avatar_url || null,
    date_of_birth: '',                         // ✅ ADD
    emergency_contact_name: '',                // ✅ ADD
    emergency_contact_phone: '',               // ✅ ADD
    emergency_contact_relationship: '',        // ✅ ADD
    emergency_contact_email: '',               // ✅ ADD
    blood_type: 'Unknown',                     // ✅ ADD
    gender: '',                                // ✅ ADD
    allergies: '',                             // ✅ ADD
    has_known_allergies: false,                // ✅ ADD
    allergies_uncertain: false,                // ✅ ADD
    addictions: '',                            // ✅ ADD
    medical_history: ''                        // ✅ ADD
  });
  const [profileLoading, setProfileLoading] = useState<boolean>(false);
  const [profileSaving, setProfileSaving] = useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Form states
  const [appointmentForm, setAppointmentForm] = useState<AppointmentForm>({
  doctor_id: '',
  date: '',
  time: '',
  reason: '',
  urgency: 'normal'  // ✅ ADD THIS LINE
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
  const timeSlots: string[] = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30'
  ];

  const urgencyLevels = [
    { value: 'normal', label: 'Normal', color: 'text-success', description: 'Regular appointment' },
    { value: 'high', label: 'High', color: 'text-warning', description: 'Needs attention soon' },
    { value: 'urgent', label: 'Urgent', color: 'text-danger', description: 'Requires immediate care' }
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
      
      // Format date properly for input[type="date"]
      let formattedDate = '';
      if (data.date_of_birth) {
        try {
          // Handle both YYYY-MM-DD and other date formats
          const dateObj = new Date(data.date_of_birth);
          if (!isNaN(dateObj.getTime())) {
            formattedDate = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
          }
        } catch (e) {
          console.error('Date parsing error:', e);
        }
      }
      
      setUserProfile({
        name: data.name || '',
        email: data.email || '',
        staff_no: data.staff_no || '',
        phone: data.phone || '',
        department: data.department || '',
        bio: data.bio || '',
        avatar_url: data.avatar_url || null,
        date_of_birth: formattedDate,
        emergency_contact_name: data.emergency_contact_name || '',
        emergency_contact_phone: data.emergency_contact_phone || '',
        emergency_contact_relationship: data.emergency_contact_relationship || '',
        emergency_contact_email: data.emergency_contact_email || '',
        blood_type: data.blood_type || 'Unknown',
        gender: data.gender || '',
        allergies: data.allergies || '',
        has_known_allergies: data.has_known_allergies || false,
        allergies_uncertain: data.allergies_uncertain || false,
        addictions: data.addictions || '',
        medical_history: data.medical_history || ''
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
      // Prepare payload with only non-empty values
      const payload: Record<string, any> = {
        name: userProfile.name,
        phone: userProfile.phone || null,
        department: userProfile.department || null,
        bio: userProfile.bio || null,
        date_of_birth: userProfile.date_of_birth || null,
        emergency_contact_name: userProfile.emergency_contact_name || null,
        emergency_contact_phone: userProfile.emergency_contact_phone || null,
        emergency_contact_relationship: userProfile.emergency_contact_relationship || null,
        emergency_contact_email: userProfile.emergency_contact_email || null,
        blood_type: userProfile.blood_type || 'Unknown',
        gender: userProfile.gender || null,
        allergies: userProfile.allergies || null,
        has_known_allergies: Boolean(userProfile.has_known_allergies),
        allergies_uncertain: Boolean(userProfile.allergies_uncertain),
        addictions: userProfile.addictions || null,
        medical_history: userProfile.medical_history || null
      };

      const response = await fetch(`${API_BASE_URL}/api/academic-staff/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        showMessage('success', 'Profile updated successfully!');
      } else {
        const errorData = await response.json();
        console.error('Profile update error:', errorData);
        showMessage('error', errorData.message || 'Failed to update profile');
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
        body: JSON.stringify({
          ...appointmentForm,
          urgency: appointmentForm.urgency  // ✅ This will now be included
        })
      });

      const data = await response.json();

      if (response.ok) {
        showMessage('success', data.message);
        setAppointmentForm({ 
          doctor_id: '', 
          date: '', 
          time: '', 
          reason: '',
          urgency: 'normal'  // ✅ Reset to default
        });
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

  // Add these utility functions near the top of your component, after imports
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
};

const formatTime = (timeString: string): string => {
  try {
    // Handle both HH:mm format and ISO datetime format
    let date: Date;
    if (timeString.includes('T')) {
      // ISO format like "2025-10-16T11:00:00.000000Z"
      date = new Date(timeString);
    } else {
      // HH:mm format like "11:00"
      const [hours, minutes] = timeString.split(':');
      date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes), 0);
    }
    
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch (error) {
    return timeString;
  }
};

  // Add these helper functions
  const isWeekday = (dateString: string): boolean => {
    const date = new Date(dateString);
    const day = date.getDay();
    return day >= 1 && day <= 5;
  };

  const getDateClosureReason = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDay();
    
    if (day === 0) return 'Clinic is closed on Sundays';
    if (day === 6) return 'Clinic is closed on Saturdays';
    return 'Clinic is not operating on this date';
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

  // ==================== SIDEBAR COMPONENT ====================
const Sidebar = () => {
  const menuItems = [
    { id: 'overview', icon: BarChart3, label: 'Dashboard' },
    { id: 'schedule', icon: Calendar, label: 'Book Appointment' },
    { id: 'appointments', icon: History, label: 'My Appointments' },
    { id: 'medical-history', icon: FileText, label: 'Medical Records' },
  ];

  return (
    <>
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
                }}
              >
                <img src="/logo6.png" alt="FIU Logo" style={{ width: '32px', height: '32px', objectFit: 'cover' }} />
              </div>
              <div>
                <h6 style={{ color: '#ffffff', margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                  FIU Medical
                </h6>
                <small style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem' }}>
                  Academic Staff Portal
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
                transition: 'all 0.3s ease',
              }}
            >
              {sidebarCollapsed ? '»' : '«'}
            </button>
          )}
        </div>

        <nav
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: sidebarCollapsed && window.innerWidth >= 768 ? '16px 8px' : '20px 16px',
          }}
        >
          {!(sidebarCollapsed && window.innerWidth >= 768) && (
            <div
              style={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '12px',
                paddingLeft: '12px',
              }}
            >
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
                  justifyContent: sidebarCollapsed && window.innerWidth >= 768 ? 'center' : 'flex-start',
                  padding: sidebarCollapsed && window.innerWidth >= 768 ? '14px' : '14px 16px',
                  marginBottom: '6px',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(220, 53, 69, 0.15) 0%, rgba(200, 35, 51, 0.15) 100%)'
                    : 'transparent',
                  border: isActive ? '1px solid rgba(220, 53, 69, 0.3)' : '1px solid transparent',
                  borderRadius: '10px',
                  color: isActive ? '#dc3545' : 'rgba(255, 255, 255, 0.75)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '0.95rem',
                  fontWeight: isActive ? 600 : 500,
                  position: 'relative',
                }}
              >
                <Icon size={20} style={{ minWidth: '20px' }} />
                {!(sidebarCollapsed && window.innerWidth >= 768) && (
                  <span style={{ marginLeft: '14px' }}>{item.label}</span>
                )}
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

          <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '20px 0' }} />

          <button
            onClick={() => {
              setActiveTab('profile');
              if (window.innerWidth < 768) setSidebarOpen(false);
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarCollapsed && window.innerWidth >= 768 ? 'center' : 'flex-start',
              padding: sidebarCollapsed && window.innerWidth >= 768 ? '14px' : '14px 16px',
              marginBottom: '6px',
              background: activeTab === 'profile'
                ? 'linear-gradient(135deg, rgba(220, 53, 69, 0.15) 0%, rgba(200, 35, 51, 0.15) 100%)'
                : 'transparent',
              border: activeTab === 'profile' ? '1px solid rgba(220, 53, 69, 0.3)' : '1px solid transparent',
              borderRadius: '10px',
              color: activeTab === 'profile' ? '#dc3545' : 'rgba(255, 255, 255, 0.75)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '0.95rem',
              fontWeight: activeTab === 'profile' ? 600 : 500,
            }}
          >
            <User size={20} />
            {!(sidebarCollapsed && window.innerWidth >= 768) && (
              <span style={{ marginLeft: '14px' }}>Profile</span>
            )}
          </button>
        </nav>

        <div
          style={{
            padding: sidebarCollapsed && window.innerWidth >= 768 ? '16px 12px' : '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {!(sidebarCollapsed && window.innerWidth >= 768) ? (
            <div>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  marginBottom: '12px',
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
                    color: 'white',
                  }}
                >
                  {user?.name?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color: 'white',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {user?.name || 'Staff'}
                  </div>
                  <small style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.75rem' }}>
                    Academic Staff
                  </small>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div
                  style={{
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: '8px',
                    paddingLeft: '4px',
                  }}
                >
                  Language
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => i18n.changeLanguage('en')}
                    style={{
                      flex: 1,
                      background: i18n.language === 'en'
                        ? 'linear-gradient(135deg, rgba(220, 53, 69, 0.2) 0%, rgba(200, 35, 51, 0.2) 100%)'
                        : 'rgba(255, 255, 255, 0.05)',
                      border: i18n.language === 'en' ? '1px solid rgba(220, 53, 69, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: i18n.language === 'en' ? '#dc3545' : 'rgba(255, 255, 255, 0.7)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontSize: '0.85rem',
                      fontWeight: i18n.language === 'en' ? 600 : 500,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Globe size={14} />
                    <span>EN</span>
                    {i18n.language === 'en' && <CheckCircle size={14} />}
                  </button>

                  <button
                    onClick={() => i18n.changeLanguage('tr')}
                    style={{
                      flex: 1,
                      background: i18n.language === 'tr'
                        ? 'linear-gradient(135deg, rgba(220, 53, 69, 0.2) 0%, rgba(200, 35, 51, 0.2) 100%)'
                        : 'rgba(255, 255, 255, 0.05)',
                      border: i18n.language === 'tr' ? '1px solid rgba(220, 53, 69, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: i18n.language === 'tr' ? '#dc3545' : 'rgba(255, 255, 255, 0.7)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontSize: '0.85rem',
                      fontWeight: i18n.language === 'tr' ? 600 : 500,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Globe size={14} />
                    <span>TR</span>
                    {i18n.language === 'tr' && <CheckCircle size={14} />}
                  </button>
                </div>
              </div>

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
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                }}
              >
                <LogOut size={18} style={{ marginRight: '8px' }} />
                Logout
              </button>
            </div>
          ) : (
            <div>
              <button
                onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'tr' : 'en')}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.75)',
                  padding: '12px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '8px',
                }}
              >
                <Globe size={20} />
              </button>
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
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <LogOut size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
// ==================== END SIDEBAR ====================

  // Navigation component matching student dashboard style
  

  return (
  <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #ffffffff 0%, #f0fdf4 100%)' }}>
    <Sidebar />
    
    <div style={{
      marginLeft: window.innerWidth < 768 ? 0 : (sidebarCollapsed ? '85px' : '280px'),
      transition: 'margin-left 0.3s ease',
      paddingTop: '40px',
    }}>
      {window.innerWidth < 768 && (
        <div
          style={{
            position: 'sticky',
            top: 0,
            background: 'white',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            padding: '16px',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
              border: 'none',
              borderRadius: '10px',
              width: '40px',
              height: '40px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
            }}
          >
            ☰
          </button>
          <h5 style={{ margin: 0, fontWeight: 700 }}>Academic Staff</h5>
          <div style={{ width: '40px' }} />
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
                    </div> {/*
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
                    </div> */}
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
                  {formatDate(appointment.date)}
                  <Clock size={14} className="ms-3 me-1" />
                  {formatTime(appointment.time)}
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
      <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
        <div className="card-header border-0" style={{ 
          backgroundColor: universityTheme.primary,
          borderRadius: '1rem 1rem 0 0',
          padding: '1.5rem'
        }}>
          <h3 className="mb-0 fw-bold text-white d-flex align-items-center">
            <Calendar size={24} className="me-2" />
            Request New Appointment
          </h3>
        </div>
        <div className="card-body p-4">
          <form onSubmit={handleScheduleAppointment}>
            <div className="row g-4">
              
              {/* Select Doctor and Urgency Level - Side by Side */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Select Doctor (Optional)
                </label>
                <select 
                  className="form-select form-select-lg"
                  value={appointmentForm.doctor_id}
                  onChange={(e) => handleAppointmentFormChange('doctor_id', e.target.value)}
                  style={{
                    borderRadius: '0.75rem',
                    border: '2px solid #e9ecef',
                    padding: '0.875rem 1rem'
                  }}
                >
                  <option value="">Any available doctor</option>
                  {doctors.map(doctor => (
                    <option key={doctor.id} value={doctor.id}>
                      Dr. {doctor.name} - {doctor.specialization}
                    </option>
                  ))}
                </select>
                <div className="form-text mt-2">
                  Leave blank to be assigned to any available doctor
                </div>
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Urgency Level <span className="text-danger">*</span>
                </label>
                <div className="d-flex gap-2">
                  {urgencyLevels.map((level) => (
                    <div key={level.value} className="flex-grow-1">
                      <input
                        type="radio"
                        className="btn-check"
                        name="urgency"
                        id={`urgency-${level.value}`}
                        autoComplete="off"
                        checked={appointmentForm.urgency === level.value}
                        onChange={() => setAppointmentForm({
                          ...appointmentForm, 
                          urgency: level.value as 'normal' | 'high' | 'urgent'
                        })}
                      />
                      <label
                        className="btn w-100"
                        htmlFor={`urgency-${level.value}`}
                        style={{
                          borderRadius: '0.75rem',
                          border: '2px solid',
                          borderColor: appointmentForm.urgency === level.value 
                            ? (level.value === 'normal' ? '#28a745' : level.value === 'high' ? '#ffc107' : '#dc3545')
                            : '#e9ecef',
                          backgroundColor: appointmentForm.urgency === level.value 
                            ? (level.value === 'normal' ? '#28a745' : level.value === 'high' ? '#ffc107' : '#dc3545')
                            : 'white',
                          color: appointmentForm.urgency === level.value ? 'white' : '#6c757d',
                          padding: '0.875rem 0.5rem',
                          fontWeight: 600,
                          transition: 'all 0.2s ease',
                          cursor: 'pointer'
                        }}
                      >
                        {level.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Date - with clinic hours validation */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Date <span className="text-danger">*</span>
                </label>
                <input 
                  type="date"
                  className={`form-control form-control-lg ${
                    appointmentForm.date && !isWeekday(appointmentForm.date) ? 'is-invalid' : ''
                  }`}
                  value={appointmentForm.date}
                  onChange={(e) => {
                    const selectedDate = e.target.value;
                    
                    // Check if date is a weekday
                    if (selectedDate && !isWeekday(selectedDate)) {
                      showMessage('error', getDateClosureReason(selectedDate) + '. Please select a weekday (Monday-Friday).');
                      return;
                    }
                    
                    handleAppointmentFormChange('date', selectedDate);
                  }}
                  min={getMinDate()}
                  required
                  style={{
                    borderRadius: '0.75rem',
                    border: '2px solid #e9ecef',
                    padding: '0.875rem 1rem'
                  }}
                />
                {appointmentForm.date && !isWeekday(appointmentForm.date) && (
                  <div className="invalid-feedback d-block">
                    {getDateClosureReason(appointmentForm.date)}. Please select a weekday.
                  </div>
                )}
                <small className="form-text text-muted">
                  Clinic operates Monday-Friday, 9:00 AM - 5:00 PM
                </small>
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Time <span className="text-danger">*</span>
                </label>
                <select 
                  className="form-select form-select-lg"
                  value={appointmentForm.time}
                  onChange={(e) => handleAppointmentFormChange('time', e.target.value)}
                  required
                  disabled={!appointmentForm.date}
                  style={{
                    borderRadius: '0.75rem',
                    border: '2px solid #e9ecef',
                    padding: '0.875rem 1rem'
                  }}
                >
                  <option value="">
                    {!appointmentForm.date ? 'Select date first' : 'Select a time slot'}
                  </option>
                  {availableSlots.map(slot => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>

              {/* Reason for Appointment - Full Width */}
              <div className="col-12">
                <label className="form-label fw-semibold">
                  Reason for Appointment <span className="text-danger">*</span>
                </label>
                <textarea 
                  className="form-control"
                  rows={4}
                  value={appointmentForm.reason}
                  onChange={(e) => handleAppointmentFormChange('reason', e.target.value)}
                  placeholder="Describe your health concerns or reason for the appointment..."
                  maxLength={500}
                  required
                  style={{ 
                    resize: 'none',
                    borderRadius: '0.75rem',
                    border: '2px solid #e9ecef',
                    padding: '0.875rem 1rem'
                  }}
                />
                <div className="form-text">
                  {appointmentForm.reason ? appointmentForm.reason.length : 0}/500 characters
                </div>
              </div>

              {/* Submit Button */}
              <div className="col-12">
                <button 
                  type="submit" 
                  className="btn btn-lg w-100"
                  disabled={loading}
                  style={{ 
                    backgroundColor: loading ? '#6c757d' : universityTheme.primary,
                    border: 'none',
                    borderRadius: '0.75rem',
                    padding: '1rem',
                    fontWeight: 600,
                    color: 'white',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.backgroundColor = universityTheme.secondary;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.currentTarget.style.backgroundColor = universityTheme.primary;
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
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

          {/* Doctor Cards - Keep existing */}
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
    
    {/* Right Sidebar - Keep existing */}
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
                                  <span className="fw-semibold">{formatDate(appointment.date)}</span>
                                </div>
                              </td>
                              <td>
                                <small className="text-muted">{formatTime(appointment.time)}</small>
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
                      {/* Add after the existing fields like phone, department, bio */}

                      {/* Date of Birth */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold">Date of Birth</label>
                        <input
                          type="date"
                          className="form-control"
                          value={userProfile.date_of_birth}
                          onChange={(e) => setUserProfile({ ...userProfile, date_of_birth: e.target.value })}
                          max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                        />
                        <div className="form-text">Must be at least 18 years old</div>
                      </div>

                      {/* Gender */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold">Gender</label>
                        <select
                          className="form-select"
                          value={userProfile.gender}
                          onChange={(e) => setUserProfile({ ...userProfile, gender: e.target.value })}
                        >
                          <option value="">Select gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                          <option value="prefer_not_to_say">Prefer not to say</option>
                        </select>
                      </div>

                      {/* Blood Type */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold">Blood Type</label>
                        <select
                          className="form-select"
                          value={userProfile.blood_type}
                          onChange={(e) => setUserProfile({ ...userProfile, blood_type: e.target.value })}
                        >
                          <option value="">Select blood type</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                          <option value="Unknown">Unknown</option>
                        </select>
                      </div>

                      {/* Medical Information Section Header */}
                      <div className="col-12 mt-3">
                        <h6 className="fw-bold text-primary">
                          <Stethoscope size={18} className="me-2" />
                          Medical Information
                        </h6>
                        <hr />
                      </div>

                      {/* Allergies */}
                      <div className="col-12">
                        <label className="form-label fw-semibold">Allergies</label>
                        <div className="mb-2">
                          <div className="form-check">
                            <input 
                              className="form-check-input" 
                              type="checkbox" 
                              id="hasKnownAllergies"
                              checked={userProfile.has_known_allergies}
                              onChange={() => setUserProfile({
                                ...userProfile,
                                has_known_allergies: !userProfile.has_known_allergies,
                                allergies_uncertain: false,
                                allergies: !userProfile.has_known_allergies ? userProfile.allergies : ''
                              })}
                            />
                            <label className="form-check-label" htmlFor="hasKnownAllergies">
                              I have known allergies
                            </label>
                          </div>
                          <div className="form-check">
                            <input 
                              className="form-check-input" 
                              type="checkbox" 
                              id="allergiesUncertain"
                              checked={userProfile.allergies_uncertain}
                              onChange={() => setUserProfile({
                                ...userProfile,
                                allergies_uncertain: !userProfile.allergies_uncertain,
                                has_known_allergies: false,
                                allergies: ''
                              })}
                            />
                            <label className="form-check-label" htmlFor="allergiesUncertain">
                              I'm not sure if I have allergies
                            </label>
                          </div>
                        </div>
                        {userProfile.has_known_allergies && (
                          <textarea
                            className="form-control"
                            rows={2}
                            value={userProfile.allergies}
                            onChange={(e) => setUserProfile({ ...userProfile, allergies: e.target.value })}
                            placeholder="List all known allergies (e.g., penicillin, nuts, etc.)"
                          />
                        )}
                      </div>

                      {/* Addictions */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold">Addictions (if any)</label>
                        <input
                          type="text"
                          className="form-control"
                          value={userProfile.addictions}
                          onChange={(e) => setUserProfile({ ...userProfile, addictions: e.target.value })}
                          placeholder="e.g., smoking, alcohol, etc."
                        />
                      </div>

                      {/* Medical History */}
                      <div className="col-12">
                        <label className="form-label fw-semibold">Medical History</label>
                        <textarea
                          className="form-control"
                          rows={3}
                          value={userProfile.medical_history}
                          onChange={(e) => setUserProfile({ ...userProfile, medical_history: e.target.value })}
                          placeholder="Any past medical conditions, surgeries, or chronic illnesses"
                          maxLength={1000}
                        />
                        <div className="form-text">{userProfile.medical_history ? userProfile.medical_history.length : 0}/1000 characters</div>
                      </div>

                      {/* Emergency Contact Section Header */}
                      <div className="col-12 mt-3">
                        <h6 className="fw-bold text-danger">
                          <Phone size={18} className="me-2" />
                          Emergency Contact Information
                        </h6>
                        <hr />
                      </div>

                      {/* Emergency Contact Name */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold">Emergency Contact Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={userProfile.emergency_contact_name}
                          onChange={(e) => setUserProfile({ ...userProfile, emergency_contact_name: e.target.value })}
                          placeholder="Full name"
                        />
                      </div>

                      {/* Emergency Contact Phone */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold">Emergency Contact Phone</label>
                        <PhoneInput
                          country={'tr'}
                          value={userProfile.emergency_contact_phone}
                          onChange={(phone) => setUserProfile({ ...userProfile, emergency_contact_phone: phone })}
                          placeholder="Enter phone number"
                          inputProps={{
                            className: 'form-control',
                            required: false
                          }}
                          containerClass="phone-input-container w-100"
                        />
                      </div>

                      {/* Emergency Contact Relationship */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold">Relationship</label>
                        <select
                          className="form-select"
                          value={userProfile.emergency_contact_relationship}
                          onChange={(e) => setUserProfile({ ...userProfile, emergency_contact_relationship: e.target.value })}
                        >
                          <option value="">Select relationship</option>
                          <option value="spouse">Spouse</option>
                          <option value="parent">Parent</option>
                          <option value="sibling">Sibling</option>
                          <option value="child">Child</option>
                          <option value="friend">Friend</option>
                          <option value="colleague">Colleague</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      {/* Emergency Contact Email */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold">Emergency Contact Email</label>
                        <input
                          type="email"
                          className="form-control"
                          value={userProfile.emergency_contact_email}
                          onChange={(e) => setUserProfile({ ...userProfile, emergency_contact_email: e.target.value })}
                          placeholder="Emergency contact email"
                        />
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