// src/pages/dashboards/AcademicStaffDashboard.tsx
import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, User, FileText, History, Edit, X, CheckCircle, 
  Stethoscope, Heart, Brain, Thermometer, BarChart3, Activity, 
  Users, TrendingUp, Phone, Mail, LogOut, Globe, Plus, UserCog, Camera, AlertTriangle, Save
} from 'lucide-react';
import Select from 'react-select';
import { APPOINTMENT_STATUSES, getStatusText, getStatusBadgeClass } from '../../constants/appointmentStatuses';
import type { AppointmentStatus } from '../../constants/appointmentStatuses';
import { useTranslation } from 'react-i18next';
import i18n from '../../services/i18n';
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { ClinicHoursCard, AppointmentTipsCard, EmergencyContactsCard } from '../../components/ClinicInfoSidebar';
import './AcademicStaffDashboard.css'

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
  const [profileComplete, setProfileComplete] = useState<boolean>(false);

  
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

  const timeSlotOptions = availableSlots.map(slot => ({
  value: slot,
  label: slot
}));

// First, add this near the top with other options (around line 265):
const departmentOptions = [
  { value: '', label: 'Select Department' },
  { value: 'Medicine', label: 'Medicine' },
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Business Administration', label: 'Business Administration' },
  { value: 'Computer Science', label: 'Computer Science' },
  { value: 'Education', label: 'Education' },
  { value: 'Arts & Sciences', label: 'Arts & Sciences' },
  { value: 'Pharmacy', label: 'Pharmacy' },
  { value: 'Dentistry', label: 'Dentistry' },
  { value: 'Nursing', label: 'Nursing' },
  { value: 'Architecture', label: 'Architecture' }
];

const genderOptions = [
  { value: '', label: 'Select gender' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' }
];

const bloodTypeOptions = [
  { value: '', label: 'Select blood type' },
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
  { value: 'Unknown', label: 'Unknown' }
];

const relationshipOptions = [
  { value: '', label: 'Select relationship' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'parent', label: 'Parent' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'child', label: 'Child' },
  { value: 'friend', label: 'Friend' },
  { value: 'colleague', label: 'Colleague' },
  { value: 'other', label: 'Other' }
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
    case 'emergency medicine': // ✅ ADD THIS
    case 'emergency':
      return <AlertTriangle className="text-danger" size={16} />;
    default:
      console.log('Unknown specialization:', specialization);
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
    fetchAppointments();      // ✅ ADD THIS
    fetchMedicalHistory();
  }, []);

// 🔥 FIX: Fetch profile when switching to profile tab
useEffect(() => {
  if (activeTab === 'profile') {
    fetchProfile();
  }
}, [activeTab]);

// 🔥 FIX: Check profile completeness on mount and when userProfile changes
useEffect(() => {
  checkProfileComplete();
}, [userProfile]);

  // Profile API functions
  const fetchProfile = async (): Promise<void> => {
  setProfileLoading(true);
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}/api/academic-staff/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      console.log('📥 Profile data received:', data); // DEBUG
      
      // Format date properly
      let formattedDate = '';
      if (data.date_of_birth) {
        try {
          const dateObj = new Date(data.date_of_birth);
          if (!isNaN(dateObj.getTime())) {
            formattedDate = dateObj.toISOString().split('T')[0];
          }
        } catch (e) {
          console.error('Date parsing error:', e);
        }
      }
      
      // 🔥 FIX: Properly set ALL fields including those that might be null
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
        has_known_allergies: Boolean(data.has_known_allergies),
        allergies_uncertain: Boolean(data.allergies_uncertain),
        addictions: data.addictions || '',
        medical_history: data.medical_history || ''
      });
      
      console.log('✅ Profile state updated'); // DEBUG
    } else {
      console.error('Failed to fetch profile:', response.status);
    }
  } catch (error) {
    console.error('Error fetching profile:', error);
  } finally {
    setProfileLoading(false);
  }
};

  const saveProfile = async (e?: React.FormEvent): Promise<void> => {
  if (e) {
    e.preventDefault();
  }
  
  setProfileSaving(true);
  
  try {
    // Validate required fields
    const required: (keyof typeof userProfile)[] = [
      'name', 
      'phone', 
      'department',
      'date_of_birth', 
      'emergency_contact_name', 
      'emergency_contact_phone',
      'emergency_contact_relationship',
      'emergency_contact_email',
      'blood_type',
      'gender'
    ];
    
    const missingFields = required.filter(field => {
      const value = userProfile[field];
      return !value || String(value).trim() === '';
    });
    
    if (missingFields.length > 0) {
      const fieldNames = missingFields.map(field => {
        const formatted = field.replace(/_/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        return formatted;
      });
      
      showMessage('error', `Please fill in all required fields: ${fieldNames.join(', ')}`);
      setProfileSaving(false);
      return;
    }

    // Clean and prepare payload - remove empty strings, keep false/0
    const payload: Record<string, any> = {
      name: userProfile.name?.trim() || '',
      phone: userProfile.phone?.trim() || null,
      department: userProfile.department?.trim() || null,
      bio: userProfile.bio?.trim() || null,
      date_of_birth: userProfile.date_of_birth || null,
      emergency_contact_name: userProfile.emergency_contact_name?.trim() || null,
      emergency_contact_phone: userProfile.emergency_contact_phone?.trim() || null,
      emergency_contact_relationship: userProfile.emergency_contact_relationship?.trim() || null,
      emergency_contact_email: userProfile.emergency_contact_email?.trim() || null,
      blood_type: userProfile.blood_type || 'Unknown',
      gender: userProfile.gender || null,
      allergies: userProfile.allergies?.trim() || null,
      has_known_allergies: Boolean(userProfile.has_known_allergies),
      allergies_uncertain: Boolean(userProfile.allergies_uncertain),
      addictions: userProfile.addictions?.trim() || null,
      medical_history: userProfile.medical_history?.trim() || null
    };

    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found. Please log in again.');
    }

    console.log('📤 Sending profile update:', payload);
    
    const response = await fetch(`${API_BASE_URL}/api/academic-staff/profile`, {
      method: 'PUT',
      headers: {  
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    console.log('📡 Response status:', response.status);
    
    if (!response.ok) {
      let errorMessage = `Profile save failed with status ${response.status}`;
      
      try {
        const errorData = await response.json();
        console.error('❌ Error details:', errorData);
        
        if (response.status === 422) {
          if (errorData.errors) {
            const validationErrors = Object.entries(errorData.errors)
              .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
              .join('; ');
            errorMessage = `Validation errors: ${validationErrors}`;
          } else {
            errorMessage = errorData.message || 'Validation failed';
          }
        } else {
          errorMessage = errorData.message || errorData.error || errorMessage;
        }
      } catch (parseError) {
        console.error('Could not parse error response:', parseError);
      }
      
      throw new Error(errorMessage);
    }
    
    const responseData = await response.json();
    console.log('✅ Profile saved successfully:', responseData);
    
    // Update local state with the response
    if (responseData.user) {
      setUserProfile(prev => ({
        ...prev,
        ...responseData.user
      }));
    }
    
    showMessage('success', 'Profile updated successfully!');
    
    // Auto-hide success message after 3 seconds
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    
  } catch (error) {
    console.error('💥 Error saving profile:', error);
    showMessage('error', error instanceof Error ? error.message : 'Failed to save profile. Please try again.');
    
    // Keep error message visible longer
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
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
  showMessage('error', t('academic.file_too_large'));
  return;
}

if (!allowedTypes.includes(file.type)) {
  showMessage('error', t('academic.invalid_file_type'));
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
      showMessage('error', errorData.message || t('academic.photo_upload_failed'));
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
  if (!window.confirm(t('academic.confirm_remove_photo'))) return;
  
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
      showMessage('error', errorData.message || t('academic.photo_remove_failed'));
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

  const doctorOptions = [
  { value: '', label: 'Any available doctor' },
  ...doctors.map(doctor => ({
    value: doctor.id,
    label: `Dr. ${doctor.name} - ${doctor.specialization}`
  }))
];

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
  if (!date) {
    console.log('⚠️ No date provided, skipping slot fetch');
    return;
  }
  
  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    console.error('❌ Invalid date format for fetching slots:', date);
    setAvailableSlots(timeSlots);
    return;
  }
  
  try {
    // ✅ FIX: Ensure doctorId is a string before checking
    const safeDoctorId = doctorId ? String(doctorId).trim() : '';
    
    // Build URL - only add doctor_id param if it's not empty
    let url = `${API_BASE_URL}/api/academic-staff/available-slots?date=${date}`;
    if (safeDoctorId && safeDoctorId !== '') {
      url += `&doctor_id=${safeDoctorId}`;
    }
    
    console.log('📡 Fetching available slots:', { url, date, doctorId: safeDoctorId });
      
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('📥 Slots response:', data);
    
    if (response.ok) {
      // Backend returns available_slots array
      if (data.available_slots && Array.isArray(data.available_slots)) {
        setAvailableSlots(data.available_slots);
        console.log('✅ Available slots set:', data.available_slots.length, 'slots');
      } else {
        console.warn('⚠️ No available_slots in response, using all slots');
        setAvailableSlots(timeSlots);
      }
    } else {
      // Handle validation errors (like weekend dates)
      if (response.status === 422 && data.message) {
        console.warn('⚠️ Date validation issue:', data.message);
        showMessage('error', data.message);
        setAvailableSlots([]);
      } else {
        console.error('❌ Failed to fetch slots:', response.status, data);
        setAvailableSlots(timeSlots);
      }
    }
  } catch (error) {
    console.error('❌ Error fetching available slots:', error);
    setAvailableSlots(timeSlots);
  }
};
  

  const checkProfileComplete = (profileData = userProfile): boolean => {
  const required: (keyof typeof userProfile)[] = [
    'name', 
    'phone', 
    'department', 
    'date_of_birth', 
    'emergency_contact_name', 
    'emergency_contact_phone',
    'emergency_contact_relationship',
    'emergency_contact_email',
    'blood_type',
    'gender'
  ];
  const isComplete = required.every(field => profileData[field] && String(profileData[field]).trim() !== '');
  setProfileComplete(isComplete);
  return isComplete;
};

  const handleScheduleAppointment = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    // Validate required fields
    if (!appointmentForm.date || !appointmentForm.time || !appointmentForm.reason) {
      showMessage('error', t('academic.fill_required_fields'));
      return;
    }

    // Validate weekday
    if (!isWeekday(appointmentForm.date)) {
      showMessage('error', getDateClosureReason(appointmentForm.date) + '. ' + t('academic.select_weekday'));
      return;
    }

    setLoading(true);

    try {
      // ✅ FIX: Build payload conditionally - don't include empty doctor_id
      const payload: Record<string, any> = {
        date: appointmentForm.date,
        time: appointmentForm.time,
        reason: appointmentForm.reason,
        urgency: appointmentForm.urgency
      };

      // ✅ CRITICAL: Only add doctor_id if it's actually selected (not empty string)
      const safeDoctorId = appointmentForm.doctor_id ? String(appointmentForm.doctor_id).trim() : '';
if (safeDoctorId && safeDoctorId !== '') {
  payload.doctor_id = safeDoctorId;
}

      console.log('📤 Sending appointment request:', payload);

      const response = await fetch(`${API_BASE_URL}/api/academic-staff/schedule-appointment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log('📥 Response:', data);

      if (response.ok) {
        // Clear form
        setAppointmentForm({ 
          doctor_id: '', 
          date: '', 
          time: '', 
          reason: '',
          urgency: 'normal'
        });
        setAvailableSlots([]);
        
        // Show success message
        showMessage('success', data.message || t('academic.appointment_scheduled'));
        
        // Refresh appointments
        await fetchAppointments();
    
        // Switch to appointments tab to show the new appointment
        setActiveTab('appointments');
        
        // Auto-hide success message after 5 seconds
        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      } else {
        // Handle validation errors
        if (data.errors) {
          const errorMessages = Object.values(data.errors).flat().join(', ');
          showMessage('error', errorMessages);
        } else {
          showMessage('error', data.message || t('academic.appointment_schedule_failed'));
        }
        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      }
    } catch (error) {
      console.error('Error scheduling appointment:', error);
      showMessage('error', 'Failed to schedule appointment. Please try again.');
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
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
    let date: Date;
    if (timeString.includes('T')) {
      date = new Date(timeString);
    } else {
      const [hours, minutes] = timeString.split(':');
      // Use UTC to avoid timezone issues
      date = new Date(Date.UTC(2000, 0, 1, parseInt(hours), parseInt(minutes), 0));
    }
    
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC' // Force UTC interpretation
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
  
  if (day === 0) return t('academic.clinic_closed_sundays');
  if (day === 6) return t('academic.clinic_closed_saturdays');
  return t('academic.clinic_not_operating');
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
  console.log(`🔄 Form change: ${field} = ${value}`);
  
  setAppointmentForm(prev => ({ ...prev, [field]: value }));
  
  // ✅ Only fetch slots if we have a valid date
  if (field === 'doctor_id' || field === 'date') {
    const doctorId = field === 'doctor_id' ? value : appointmentForm.doctor_id;
    const date = field === 'date' ? value : appointmentForm.date;
    
    // ✅ Validate date format before fetching slots
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (date && dateRegex.test(date)) {
      fetchAvailableSlots(doctorId, date);
    } else {
      console.warn('⚠️ Skipping slot fetch - invalid date format:', date);
    }
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
  // Ensure we're getting YYYY-MM-DD format
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const formattedDate = `${year}-${month}-${day}`;
  
  console.log('📅 Min date calculated:', formattedDate);
  return formattedDate;
};

const isValidDateFormat = (dateString: string): boolean => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

  // ==================== SIDEBAR COMPONENT ====================
const Sidebar = () => {
  const menuItems = [
    { id: 'overview', icon: BarChart3, label: t('academic.dashboard') },
    { id: 'schedule', icon: Calendar, label: t('academic.book_appointment') },
    { id: 'appointments', icon: History, label: t('academic.my_appointments') },
    { id: 'medical-history', icon: FileText, label: t('academic.medical_records') },
  ];

  const isMobile = window.innerWidth < 768;

  return (
    <>
      {sidebarOpen && isMobile && (
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
          left: isMobile ? (sidebarOpen ? 0 : '-300px') : 0,
          height: '100vh',  // ← CHANGE THIS LINE
          width: sidebarCollapsed && !isMobile ? '85px' : '280px',
          background: '#1a1d29',
          boxShadow: '4px 0 24px rgba(0, 0, 0, 0.12)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 1050,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* HEADER */}
        <div
          style={{
            padding: sidebarCollapsed && !isMobile ? '10px 10px' : isMobile ? '10px 14px' : '14px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #1e2230 0%, #1a1d29 100%)',
            minHeight: isMobile ? '55px' : '65px',
            flexShrink: 0,
          }}
        >
          {!(sidebarCollapsed && !isMobile) ? (
            <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div
                style={{
                  width: isMobile ? '35px' : '42px',
                  height: isMobile ? '35px' : '42px',
                  borderRadius: isMobile ? '7px' : '10px',
                  background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: isMobile ? '9px' : '12px',
                  boxShadow: '0 4px 12px rgba(220, 53, 69, 0.3)',
                }}
              >
                <img src="/logo6.png" alt="FIU Logo" style={{ width: isMobile ? '24px' : '28px', height: isMobile ? '24px' : '28px', objectFit: 'cover' }} />
              </div>
              <div>
                <h6 style={{ color: '#ffffff', margin: 0, fontSize: isMobile ? '0.9rem' : '1rem', fontWeight: 700, lineHeight: 1.2 }}>
                  FIU Medical
                </h6>
                <small style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: isMobile ? '0.68rem' : '0.75rem' }}>
                  {t('academic.academic_staff_portal')}
                </small>
              </div>
            </div>
          ) : (
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
              }}
            >
              <img src="/logo6.png" alt="FIU Logo" style={{ width: '28px', height: '28px', objectFit: 'cover' }} />
            </div>
          )}

          {!isMobile && (
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{
                background: 'linear-gradient(135deg, rgba(220, 53, 69, 0.15) 0%, rgba(200, 35, 51, 0.15) 100%)',
                border: '1px solid rgba(220, 53, 69, 0.3)',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                color: '#dc3545',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                fontSize: '0.85rem',
                fontWeight: 700,
              }}
            >
              {sidebarCollapsed ? '»' : '«'}
            </button>
          )}
        </div>

        {/* NAVIGATION */}
        <nav
  style={{
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: sidebarCollapsed && !isMobile ? '12px 8px' : isMobile ? '6px 10px' : '16px 12px',
    minHeight: 0,
  }}
>
          {!(sidebarCollapsed && !isMobile) && (
            <div
              style={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: isMobile ? '0.62rem' : '0.7rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: isMobile ? '3px' : '8px',
                paddingLeft: isMobile ? '8px' : '12px',
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
                  if (isMobile) setSidebarOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: sidebarCollapsed && !isMobile ? 'center' : 'flex-start',
                  padding: sidebarCollapsed && !isMobile ? '14px' : isMobile ? '7px 10px' : '10px 14px',
                  marginBottom: isMobile ? '2px' : '4px',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(220, 53, 69, 0.15) 0%, rgba(200, 35, 51, 0.15) 100%)'
                    : 'transparent',
                  border: isActive ? '1px solid rgba(220, 53, 69, 0.3)' : '1px solid transparent',
                  borderRadius: isMobile ? '6px' : '10px',
                  color: isActive ? '#dc3545' : 'rgba(255, 255, 255, 0.75)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: isMobile ? '0.82rem' : '0.9rem',
                  fontWeight: isActive ? 600 : 500,
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                    e.currentTarget.style.color = '#ffffff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)';
                  }
                }}
              >
                <Icon size={isMobile ? 15 : 18} style={{ minWidth: isMobile ? '15px' : '18px' }} />
                {!(sidebarCollapsed && !isMobile) && (
                  <span style={{ marginLeft: isMobile ? '9px' : '14px' }}>{item.label}</span>
                )}
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: isMobile ? '3px' : '4px',
                      height: '60%',
                      background: 'linear-gradient(180deg, #dc3545 0%, #c82333 100%)',
                      borderRadius: '0 4px 4px 0',
                    }}
                  />
                )}
              </button>
            );
          })}

          <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: isMobile ? '6px 0' : '12px 0' }} />

          <button
            onClick={() => {
              setActiveTab('profile');
              if (isMobile) setSidebarOpen(false);
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarCollapsed && !isMobile ? 'center' : 'flex-start',
              padding: sidebarCollapsed && !isMobile ? '14px' : isMobile ? '7px 10px' : '10px 14px',
              marginBottom: isMobile ? '0' : '4px',
              background: activeTab === 'profile'
                ? 'linear-gradient(135deg, rgba(220, 53, 69, 0.15) 0%, rgba(200, 35, 51, 0.15) 100%)'
                : 'transparent',
              border: activeTab === 'profile' ? '1px solid rgba(220, 53, 69, 0.3)' : '1px solid transparent',
              borderRadius: isMobile ? '6px' : '10px',
              color: activeTab === 'profile' ? '#dc3545' : 'rgba(255, 255, 255, 0.75)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: isMobile ? '0.82rem' : '0.9rem',
              fontWeight: activeTab === 'profile' ? 600 : 500,
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'profile') {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                e.currentTarget.style.color = '#ffffff';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'profile') {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)';
              }
            }}
          >
            <User size={isMobile ? 15 : 18} />
            {!(sidebarCollapsed && !isMobile) && (
              <span style={{ marginLeft: isMobile ? '9px' : '14px' }}>{t('nav.profile')}</span>
            )}
          </button>
        </nav>

        {/* SPACER - Desktop only 
        {!isMobile && <div style={{ flex: 1, minHeight: 0 }} />}*/}

        {/* FOOTER */}
        <div
  style={{
    padding: sidebarCollapsed && !isMobile ? '16px 12px' : isMobile ? '8px 12px' : '16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    background: 'linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.2) 100%)',
    flexShrink: 0,
    flexGrow: 0,
    minHeight: 'auto',
  }}
>
          {!(sidebarCollapsed && !isMobile) ? (
            <div>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: isMobile ? '7px 9px' : '10px 12px',
                  borderRadius: isMobile ? '8px' : '10px',
                  marginBottom: isMobile ? '5px' : '8px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: isMobile ? '30px' : '36px',
                    height: isMobile ? '30px' : '36px',
                    borderRadius: isMobile ? '6px' : '8px',
                    background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: isMobile ? '7px' : '10px',
                    fontSize: isMobile ? '0.85rem' : '1rem',
                    fontWeight: 700,
                    color: 'white',
                  }}
                >
                  {user?.name?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div
                    style={{
                      fontSize: isMobile ? '0.82rem' : '0.9rem',
                      fontWeight: 600,
                      color: 'white',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: 1.2,
                    }}
                  >
                    {user?.name || t('academic.academic_staff')}
                  </div>
                  <small style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: isMobile ? '0.63rem' : '0.7rem' }}>
                    {t('academic.academic_staff')}
                  </small>
                </div>
              </div>

              <div style={{ marginBottom: isMobile ? '5px' : '8px' }}>
                <div
                  style={{
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: isMobile ? '0.58rem' : '0.65rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: isMobile ? '3px' : '5px',
                    paddingLeft: '4px',
                  }}
                >
                 {t('academic.language')}
                </div>
                <div style={{ display: 'flex', gap: isMobile ? '4px' : '6px' }}>
                  <button
                    onClick={() => i18n.changeLanguage('en')}
                    style={{
                      flex: 1,
                      background: i18n.language === 'en'
                        ? 'linear-gradient(135deg, rgba(220, 53, 69, 0.2) 0%, rgba(200, 35, 51, 0.2) 100%)'
                        : 'rgba(255, 255, 255, 0.05)',
                      border: i18n.language === 'en' ? '1px solid rgba(220, 53, 69, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: i18n.language === 'en' ? '#dc3545' : 'rgba(255, 255, 255, 0.7)',
                      padding: isMobile ? '4px 5px' : '6px 8px',
                      borderRadius: isMobile ? '6px' : '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontSize: isMobile ? '0.72rem' : '0.8rem',
                      fontWeight: i18n.language === 'en' ? 600 : 500,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: isMobile ? '3px' : '4px',
                    }}
                  >
                    <Globe size={isMobile ? 11 : 13} />
                    <span>EN</span>
                    {i18n.language === 'en' && <CheckCircle size={isMobile ? 10 : 12} />}
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
                      padding: isMobile ? '4px 5px' : '6px 8px',
                      borderRadius: isMobile ? '6px' : '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontSize: isMobile ? '0.72rem' : '0.8rem',
                      fontWeight: i18n.language === 'tr' ? 600 : 500,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: isMobile ? '3px' : '4px',
                    }}
                  >
                    <Globe size={isMobile ? 11 : 13} />
                    <span>TR</span>
                    {i18n.language === 'tr' && <CheckCircle size={isMobile ? 10 : 12} />}
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
                  padding: isMobile ? '7px' : '10px',
                  borderRadius: isMobile ? '6px' : '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isMobile ? '0.82rem' : '0.9rem',
                  fontWeight: 600,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(220, 53, 69, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(220, 53, 69, 0.15)';
                }}
              >
                <LogOut size={isMobile ? 14 : 16} style={{ marginRight: isMobile ? '6px' : '8px' }} />
                {t('academic.logout')}
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
                <Globe size={18} />
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
                <LogOut size={18} />
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
  <div style={{ 
    display: 'flex', 
    height: '100vh', 
    overflow: 'hidden',
    background: 'linear-gradient(135deg, #ffffffff 0%, #f0fdf4 100%)' 
  }}>
    <Sidebar />
    
    <div style={{
  marginLeft: window.innerWidth < 768 ? 0 : (sidebarCollapsed ? '85px' : '280px'),
  transition: 'margin-left 0.3s ease',
  padding: window.innerWidth < 768 ? '20px 16px' : '40px 32px',
  height: '100vh',           // ← ADD THIS
  overflowY: 'auto',         // ← ADD THIS
  overflowX: 'hidden',       // ← ADD THIS
  flex: 1,                   // ← ADD THIS
}}>
      {window.innerWidth < 768 && (
        <div
          style={{
            position: 'sticky',
            top: 0,
            right: 0,
            left: 0,
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

      {/* Enhanced Message Display */}
{message.text && (
  <div 
    className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'} alert-dismissible fade show`}
    role="alert"
    style={{
      position: 'sticky',
      top: window.innerWidth < 768 ? '70px' : '20px',
      zIndex: 1000,
      marginBottom: '1rem',
      borderRadius: '0.75rem',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      animation: 'slideIn 0.3s ease-out'
    }}
  >
    <div className="d-flex align-items-center">
      {message.type === 'success' ? (
        <CheckCircle size={20} className="me-2 flex-shrink-0" />
      ) : (
        <AlertTriangle size={20} className="me-2 flex-shrink-0" />
      )}
      <div className="flex-grow-1">
        <strong>{message.type === 'success' ? 'Success!' : 'Error'}</strong>
        <div>{message.text}</div>
      </div>
      <button 
        type="button" 
        className="btn-close" 
        onClick={() => setMessage({ type: '', text: '' })}
        aria-label="Close"
      />
    </div>
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
                    <h3 className="mb-2">{t('academic.welcome_back', { name: user.name })}</h3>
                    <div className="d-flex align-items-center mb-1">
                      <Mail size={16} className="me-2 opacity-75" />
                      <span className="opacity-90">{user.email}</span>
                    </div>
                    <div className="d-flex align-items-center mb-1">
                      <Users size={16} className="me-2 opacity-75" />
                      <span className="opacity-75">{t('academic.staff_no', { staffNo: user.staff_no })}</span>
                    </div>
                    {user.phone && (
                      <div className="d-flex align-items-center">
                        <Phone size={16} className="me-2 opacity-75" />
                        <span className="opacity-75">{user.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

            {/* Statistics Cards */}
            {[
              { 
                icon: Calendar, 
                value: stats.total, 
                label: t('academic.total_appointments'), 
                subLabel: t('academic.overall_count'), 
                color: universityTheme.primary 
              },
              { 
                icon: CheckCircle, 
                value: stats.completed, 
                label: t('academic.completed'), 
                subLabel: t('academic.finished_visits'), 
                color: universityTheme.secondary 
              },
              { 
                icon: Clock, 
                value: stats.pending, 
                label: t('academic.pending'), 
                subLabel: t('academic.awaiting_confirmation'), 
                color: '#ffc107' 
              },
              { 
                icon: TrendingUp, 
                value: stats.upcoming, 
                label: t('academic.upcoming'), 
                subLabel: t('academic.scheduled_ahead'), 
                color: '#17a2b8' 
              }
            ].map((stat, index) => (
              <div key={index} className="col-6 col-lg-3">
                <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1rem' }}>
                  <div className="card-body p-3 p-md-4 text-center">
                    <div className="d-inline-flex align-items-center justify-content-center mb-3"
                      style={{
                        width: 'clamp(50px, 12vw, 60px)',
                        height: 'clamp(50px, 12vw, 60px)'
                      }}
                    >
                      <stat.icon size={24} style={{ color: stat.color }} />
                    </div>
                    <h4 className="fw-bold mb-1" 
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
                  <h5 className="fw-bold mb-0">{t('academic.quick_actions')}</h5>
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
                        <div className="fw-semibold">{t('academic.schedule_appointment')}</div>
                        <small className="opacity-75">{t('academic.book_new_appointment')}</small>
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
                        <div className="fw-semibold">{t('academic.my_appointments')}</div>
                        <small className="text-muted">{t('academic.view_manage_appointments')}</small>
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
                        <div className="fw-semibold">{t('academic.medical_records')}</div>
                        <small className="text-muted">{t('academic.access_health_info')}</small>
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
          <h5 className="fw-bold mb-0">{t('academic.recent_appointments')}</h5>
          <button 
            className="btn btn-sm btn-outline-primary align-self-start align-self-sm-auto"
            onClick={() => handleTabChange('appointments')}
            style={{ borderRadius: '0.5rem' }}
          >
            {t('academic.view_all')}
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
            {t('academic.request_new_appointment')}
          </h3>
        </div>
        <div className="card-body p-4 card-body-overflow-visible">
          {/* 🔥 ADD THIS WARNING */}
          
          <form onSubmit={handleScheduleAppointment}>
            {!profileComplete && (
              <div className="alert alert-warning d-flex align-items-start mb-4" 
                  style={{ borderRadius: '0.75rem', border: 'none', backgroundColor: '#fff3cd' }}>
                <AlertTriangle size={20} className="me-2 flex-shrink-0 mt-1" style={{ color: '#856404' }} />
                <div>
                  <strong style={{ color: '#856404' }}>{t('academic.profile_incomplete')}</strong>
                  <div style={{ color: '#856404', marginTop: '4px' }}>
                    {t('academic.must_complete_profile')}
                    <button 
                      className="btn btn-sm btn-outline-warning ms-2"
                      onClick={() => setActiveTab('profile')}
                      style={{ borderRadius: '0.5rem', padding: '0.25rem 0.75rem' }}
                    >
                      {t('academic.complete_profile')}
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="row g-4 row-overflow-visible">
              
              {/* Select Doctor and Urgency Level - Side by Side */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  {t('academic.select_doctor')}
                </label>
                <Select
  value={doctorOptions.find(option => option.value === appointmentForm.doctor_id)}
  onChange={(option) => handleAppointmentFormChange('doctor_id', option?.value || '')}
  options={doctorOptions}
  isDisabled={loading || !profileComplete}
  placeholder={t('academic.any_available_doctor')}
  isClearable
  styles={{
    control: (base) => ({
      ...base,
      borderRadius: '0.75rem',
      border: '2px solid #e9ecef',
      padding: '0.5rem',
      minHeight: '50px'
    }),
    menu: (base) => ({
      ...base,
      maxHeight: window.innerWidth < 768 ? '200px' : '300px',
      zIndex: 9999
    }),
    menuList: (base) => ({
      ...base,
      maxHeight: window.innerWidth < 768 ? '200px' : '300px',
    })
  }}
/>
                <div className="form-text mt-2">
                  {t('academic.leave_blank_any_doctor')}
                </div>
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  {t('academic.urgency_level')} <span className="text-danger">*</span>
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
              {/* Date - with clinic hours validation */}
              <div className="col-md-6 col-overflow-visible">
                <label className="form-label fw-semibold">
                  {t('academic.date')} <span className="text-danger">*</span>
                </label>
                <div className="date-input-wrapper">
                  <input 
  type="date"
  className={`form-control form-control-lg ${
    appointmentForm.date && !isWeekday(appointmentForm.date) ? 'is-invalid' : ''
  }`}
  value={appointmentForm.date}
  onChange={(e) => {
    const rawValue = e.target.value;
    console.log('📅 Date input changed:', rawValue);
    
    // ✅ FIX: Prevent malformed dates from being processed
    if (!rawValue) {
      handleAppointmentFormChange('date', '');
      return;
    }
    
    // ✅ Strict validation for YYYY-MM-DD format
    const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
    const match = rawValue.match(dateRegex);
    
    if (!match) {
      console.error('❌ Invalid date format:', rawValue);
      showMessage('error', 'Invalid date format. Please use the date picker.');
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }
    
    // ✅ Validate year is reasonable (between 2024-2030)
    const year = parseInt(match[1]);
    const month = parseInt(match[2]);
    const day = parseInt(match[3]);
    
    if (year < 2024 || year > 2030) {
      console.error('❌ Invalid year:', year);
      showMessage('error', 'Please select a valid date between 2024-2030');
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }
    
    if (month < 1 || month > 12) {
      console.error('❌ Invalid month:', month);
      return;
    }
    
    if (day < 1 || day > 31) {
      console.error('❌ Invalid day:', day);
      return;
    }
    
    // ✅ Reconstruct the date to ensure format
    const selectedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    console.log('✅ Validated date:', selectedDate);
    
    // Check if it's a weekday
    if (!isWeekday(selectedDate)) {
      showMessage('error', getDateClosureReason(selectedDate) + '. ' + t('academic.select_weekday'));
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
    
    // Update the form
    handleAppointmentFormChange('date', selectedDate);
  }}
  min={getMinDate()}
  max="2030-12-31"
  required
  style={{
    borderRadius: '0.75rem',
    border: '2px solid #e9ecef',
    padding: window.innerWidth < 768 ? '0.75rem' : '0.875rem 1rem',
    fontSize: window.innerWidth < 768 ? '0.9rem' : '1rem'
  }}
/>
                </div>
                {appointmentForm.date && !isWeekday(appointmentForm.date) && (
                  <div className="invalid-feedback d-block">
                    {getDateClosureReason(appointmentForm.date)}. {t('academic.select_weekday')}
                  </div>
                )}
                <small className="form-text text-muted">
                  {t('academic.clinic_operates')} (Mon-Fri, 9 AM - 5 PM)
                </small>
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  {t('academic.time')} <span className="text-danger">*</span>
                </label>
                <Select
  value={timeSlotOptions.find(option => option.value === appointmentForm.time)}
  onChange={(option) => handleAppointmentFormChange('time', option?.value || '')}
  options={timeSlotOptions}
  isDisabled={!appointmentForm.date || loading || !profileComplete}
  placeholder={!appointmentForm.date ? 'Select date first' : t('academic.select_time_slot')}
  styles={{
    control: (base) => ({
      ...base,
      borderRadius: '0.75rem',
      border: '2px solid #e9ecef',
      padding: '0.5rem',
      minHeight: '50px'
    }),
    menu: (base) => ({
      ...base,
      maxHeight: window.innerWidth < 768 ? '200px' : '300px',
      zIndex: 9999
    }),
    menuList: (base) => ({
      ...base,
      maxHeight: window.innerWidth < 768 ? '200px' : '300px',
    })
  }}
/>
              </div>

              {/* Reason for Appointment - Full Width */}
              <div className="col-12">
                <label className="form-label fw-semibold">
                  {t('academic.reason_for_appointment')} <span className="text-danger">*</span>
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
                  {appointmentForm.reason ? appointmentForm.reason.length : 0}/500 {t('academic.characters')}
                </div>
              </div>

              {/* Submit Button */}
              <div className="col-12">
                <button 
                  type="submit" 
                  className="btn btn-lg w-100"
                  disabled={loading || !profileComplete}
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
                      {t('academic.scheduling')}
                    </>
                  ) : (
                    <>
                      <Calendar size={20} className="me-2" />
                      {t('academic.schedule_appointment')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Doctor Cards - Keep existing */}
          {doctors.length > 0 && (
            <div className="mt-5">
              <h5 className="mb-3 fw-semibold">{t('academic.available_doctors')}</h5>
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
                  {t('academic.appointment_history')}
                </h3>
                <button 
                  className="btn btn-sm text-white"
                  onClick={() => setActiveTab('schedule')}
                  style={{ borderRadius: '0.5rem', border: '1px solid white' }}
                >
                  <Calendar size={16} className="me-1" />
                  {t('academic.new_appointment')}
                </button>
              </div>
            </div>
            <div className="card-body p-2 p-md-4">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border" style={{ color: universityTheme.primary }} role="status">
                    <span className="visually-hidden">{t('common.loading')}</span>
                  </div>
                  <p className="mt-3">{t('academic.loading_appointments')}</p>
                </div>
              ) : appointments.length === 0 ? (
                <div className="text-center py-5">
                  <FileText size={48} className="text-muted mb-3" />
                  <h5 className="fw-semibold">{t('academic.no_appointments')}</h5>
                  <p className="text-muted">{t('academic.first_appointment_message')}</p>
                  <button 
                    className="btn btn-primary mt-3"
                    onClick={() => setActiveTab('schedule')}
                    style={{ borderRadius: '0.5rem', backgroundColor: universityTheme.primary }}
                  >
                    <Calendar size={18} className="me-2" />
                    {t('academic.schedule_appointment')}
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
                                  {t('academic.reschedule')}
                                </button>
                              ) : (
                                <button 
                                  className="btn btn-sm btn-outline-secondary flex-fill" 
                                  disabled
                                  title={getRescheduleDisabledReason(appointment.status)}
                                >
                                  <Edit size={14} className="me-1" />
                                 {t('academic.reschedule')}
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
                                  {t('academic.cancel')}
                                </button>
                              ) : (
                                <button 
                                  className="btn btn-sm btn-outline-secondary flex-fill" 
                                  disabled
                                  title={getCancelDisabledReason(appointment.status)}
                                >
                                  <X size={14} className="me-1" />
                                  {t('academic.cancel')}
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
                            <th scope="col">{t('academic.doctor')}</th>
                            <th scope="col">{t('academic.specialization')}</th>
                            <th scope="col">{t('academic.date')}</th>
                            <th scope="col">{t('academic.time')}</th>
                            <th scope="col">{t('academic.reason')}</th>
                            <th scope="col">{t('academic.status')}</th>
                            <th scope="col">{t('academic.actions')}</th>
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
                                      title={t('academic.reschedule')}
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
                                      title={t('academic.cancel')}
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
                  {t('academic.personal_information')}
                </h5>
              </div>
              <div className="card-body p-3 p-md-4 card-body-overflow-visible">
                {profileLoading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary mb-3" role="status">
                      <span className="visually-hidden">{t('common.loading')}</span>
                    </div>
                    <p className="text-muted">{t('academic.loading_profile')}</p>
                  </div>
                ) : (
                  <form onSubmit={saveProfile}>
                    <div className="row g-3 row-overflow-visible">
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold">{t('academic.full_name')}</label>
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
                        <label className="form-label fw-semibold">{t('academic.email_address')}</label>
                        <input
                          type="email"
                          className="form-control"
                          value={userProfile.email}
                          disabled
                          style={{ backgroundColor: '#f8f9fa' }}
                        />
                        <div className="form-text">{t('academic.email_cannot_change')}</div>
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold">{t('academic.staff_number')}</label>
                        <input
                          type="text"
                          className="form-control"
                          value={userProfile.staff_no}
                          disabled
                          style={{ backgroundColor: '#f8f9fa' }}
                        />
                        <div className="form-text">{t('academic.staff_no_cannot_change')}</div>
                      </div>
                      
                      {/* Phone Number with responsive PhoneInput */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold">{t('academic.phone_number')}</label>
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
                        <label className="form-label fw-semibold">{t('academic.department')}</label>
                        <Select
                          value={departmentOptions.find(option => option.value === userProfile.department)}
                          onChange={(option) => setUserProfile({ ...userProfile, department: option?.value || '' })}
                          options={departmentOptions}
                          placeholder="Select Department"
                          styles={{
                            control: (base) => ({
                              ...base,
                              borderRadius: '0.5rem',
                              border: '1px solid #dee2e6',
                              minHeight: '38px'
                            }),
                            menu: (base) => ({
                              ...base,
                              maxHeight: window.innerWidth < 768 ? '200px' : '300px',
                              zIndex: 9999
                            }),
                            menuList: (base) => ({
                              ...base,
                              maxHeight: window.innerWidth < 768 ? '200px' : '300px',
                            })
                          }}
                        />
                      </div>
                      {/* Add after the existing fields like phone, department, bio */}

                      {/* Date of Birth */}
<div className="col-12 col-md-6 col-overflow-visible">
  <label className="form-label fw-semibold">{t('academic.date_of_birth')}</label>
  <div className="date-input-wrapper">
    <input
      type="date"
      className="form-control"
      value={userProfile.date_of_birth}
      onChange={(e) => setUserProfile({ ...userProfile, date_of_birth: e.target.value })}
      max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
    />
  </div>
  <div className="form-text">{t('academic.must_be_18')}</div>
</div>

                      {/* Gender */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold">{t('academic.gender')}</label>
                        <Select
                          value={genderOptions.find(option => option.value === userProfile.gender)}
                          onChange={(option) => setUserProfile({ ...userProfile, gender: option?.value || '' })}
                          options={[
                            { value: '', label: t('academic.select_gender') },
                            { value: 'male', label: t('academic.male') },
                            { value: 'female', label: t('academic.female') }
                          ]}
                          placeholder={t('academic.select_gender')}
                          styles={{
                            control: (base) => ({
                              ...base,
                              borderRadius: '0.5rem',
                              border: '1px solid #dee2e6',
                              minHeight: '38px'
                            }),
                            menu: (base) => ({
                              ...base,
                              zIndex: 9999
                            })
                          }}
                        />
                      </div>

                      {/* Blood Type */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold">{t('academic.blood_type')}</label>
                        <Select
                          value={bloodTypeOptions.find(option => option.value === userProfile.blood_type)}
                          onChange={(option) => setUserProfile({ ...userProfile, blood_type: option?.value || '' })}
                          options={bloodTypeOptions}
                          placeholder={t('academic.select_blood_type')}
                          styles={{
                            control: (base) => ({
                              ...base,
                              borderRadius: '0.5rem',
                              border: '1px solid #dee2e6',
                              minHeight: '38px'
                            }),
                            menu: (base) => ({
                              ...base,
                              maxHeight: window.innerWidth < 768 ? '200px' : '300px',
                              zIndex: 9999
                            }),
                            menuList: (base) => ({
                              ...base,
                              maxHeight: window.innerWidth < 768 ? '200px' : '300px',
                            })
                          }}
                        />
                      </div>

                      {/* Medical Information Section Header */}
                      <div className="col-12 mt-3">
                        <h6 className="fw-bold text-primary">
                          <Stethoscope size={18} className="me-2" />
                          {t('academic.medical_information')}
                        </h6>
                        <hr />
                      </div>

                      {/* Allergies */}
                      <div className="col-12">
                        <label className="form-label fw-semibold">{t('academic.allergies')}</label>
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
                              {t('academic.has_known_allergies')}
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
                              {t('academic.not_sure_allergies')}
                            </label>
                          </div>
                        </div>
                        {userProfile.has_known_allergies && (
                          <textarea
                            className="form-control"
                            rows={2}
                            value={userProfile.allergies}
                            onChange={(e) => setUserProfile({ ...userProfile, allergies: e.target.value })}
                            placeholder={t('academic.list_allergies')}
                          />
                        )}
                      </div>

                      {/* Addictions */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold">{t('academic.addictions')}</label>
                        <input
                          type="text"
                          className="form-control"
                          value={userProfile.addictions}
                          onChange={(e) => setUserProfile({ ...userProfile, addictions: e.target.value })}
                          placeholder={t('academic.addictions_placeholder')}
                        />
                      </div>

                      {/* Medical History */}
                      <div className="col-12">
                        <label className="form-label fw-semibold">{t('academic.medical_history')}</label>
                        <textarea
                          className="form-control"
                          rows={3}
                          value={userProfile.medical_history}
                          onChange={(e) => setUserProfile({ ...userProfile, medical_history: e.target.value })}
                          placeholder={t('academic.medical_history_placeholder')}
                          maxLength={1000}
                        />
                        <div className="form-text">
                          {userProfile.medical_history ? userProfile.medical_history.length : 0}/1000 {t('academic.characters')}
                        </div>
                      </div>

                      {/* Emergency Contact Section Header */}
                      <div className="col-12 mt-3">
                        <h6 className="fw-bold text-danger">
                          <Phone size={18} className="me-2" />
                          {t('academic.emergency_contact_info')}
                        </h6>
                        <hr />
                      </div>

                      {/* Emergency Contact Name */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold">{t('academic.emergency_contact_name')}</label>
                        <input
                          type="text"
                          className="form-control"
                          value={userProfile.emergency_contact_name}
                          onChange={(e) => setUserProfile({ ...userProfile, emergency_contact_name: e.target.value })}
                          placeholder={t('common.full_name')}
                        />
                      </div>

                      {/* Emergency Contact Phone */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold">{t('academic.emergency_contact_phone')}</label>
                        <PhoneInput
                          country={'tr'}
                          value={userProfile.emergency_contact_phone}
                          onChange={(phone) => setUserProfile({ ...userProfile, emergency_contact_phone: phone })}
                          placeholder={t('academic.enter_phone')}
                          inputProps={{
                            className: 'form-control',
                            required: false
                          }}
                          containerClass="phone-input-container w-100"
                        />
                      </div>

                      {/* Emergency Contact Relationship */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold">{t('academic.relationship')}</label>
                        <Select
                          value={relationshipOptions.find(option => option.value === userProfile.emergency_contact_relationship)}
                          onChange={(option) => setUserProfile({ ...userProfile, emergency_contact_relationship: option?.value || '' })}
                          options={[
                            { value: '', label: t('academic.select_relationship') },
                            { value: 'spouse', label: t('academic.spouse') },
                            { value: 'parent', label: t('academic.parent') },
                            { value: 'sibling', label: t('academic.sibling') },
                            { value: 'child', label: t('academic.child') },
                            { value: 'friend', label: t('academic.friend') },
                            { value: 'colleague', label: t('academic.colleague') },
                            { value: 'other', label: t('academic.other') }
                          ]}
                          placeholder={t('academic.select_relationship')}
                          styles={{
                            control: (base) => ({
                              ...base,
                              borderRadius: '0.5rem',
                              border: '1px solid #dee2e6',
                              minHeight: '38px'
                            }),
                            menu: (base) => ({
                              ...base,
                              zIndex: 9999
                            })
                          }}
                        />
                      </div>

                      {/* Emergency Contact Email */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold">{t('academic.emergency_contact_email')}</label>
                        <input
                          type="email"
                          className="form-control"
                          value={userProfile.emergency_contact_email}
                          onChange={(e) => setUserProfile({ ...userProfile, emergency_contact_email: e.target.value })}
                          placeholder={t('academic.emergency_contact_email')}
                        />
                      </div>
                    </div>

                    <div className="mt-4 d-flex gap-2">
  <button 
    type="submit" 
    className="btn btn-primary btn-lg"
    disabled={profileSaving}
    style={{ 
      background: universityTheme.secondary, 
      border: 'none',
      minWidth: '150px',
      borderRadius: '0.75rem'
    }}
    onClick={saveProfile}
  >
    {profileSaving ? (
      <>
        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
        {t('academic.saving')}
      </>
    ) : (
      <>
        <Save size={18} className="me-2" />
        {t('academic.save_profile')}
      </>
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
                      {t('academic.profile_picture')}
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
                      {t('academic.upload_new_photo')}
                    </button>
                    
                    {userProfile.avatar_url && (
                      <button 
                        className="btn btn-outline-danger w-100 mb-3" 
                        onClick={handlePhotoRemove}
                        disabled={profileSaving}
                      >
                        <X size={16} className="me-1" /> 
                        {t('academic.remove_photo')}
                      </button>
                    )}
                    
                    {/* Photo Guidelines Dropdown */}
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
                          >
                            <Camera size={16} className="me-2" />
                            {t('academic.photo_upload_guidelines')}
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
                                      <strong className="text-dark">{t('academic.file_types')}</strong>
                                      <br />
                                      <small className="text-muted">{t('academic.file_types_desc')}</small>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="col-12">
                                  <div className="d-flex align-items-start">
                                    <CheckCircle size={16} className="text-success me-2 mt-1 flex-shrink-0" />
                                    <div>
                                      <strong className="text-dark">{t('academic.file_size')}</strong>
                                      <br />
                                      <small className="text-muted">{t('academic.file_size_desc')}</small>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="col-12">
                                  <div className="d-flex align-items-start">
                                    <CheckCircle size={16} className="text-success me-2 mt-1 flex-shrink-0" />
                                    <div>
                                      <strong className="text-dark">{t('academic.dimensions')}</strong>
                                      <br />
                                      <small className="text-muted">{t('academic.dimensions_desc')}</small>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="col-12">
                                  <div className="d-flex align-items-start">
                                    <CheckCircle size={16} className="text-success me-2 mt-1 flex-shrink-0" />
                                    <div>
                                      <strong className="text-dark">{t('academic.quality')}</strong>
                                      <br />
                                      <small className="text-muted">{t('academic.quality_desc')}</small>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="col-12">
                                  <div className="d-flex align-items-start">
                                    <CheckCircle size={16} className="text-success me-2 mt-1 flex-shrink-0" />
                                    <div>
                                      <strong className="text-dark">{t('academic.content')}</strong>
                                      <br />
                                      <small className="text-muted">{t('academic.content_desc')}</small>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="col-12">
                                  <div className="d-flex align-items-start">
                                    <CheckCircle size={16} className="text-success me-2 mt-1 flex-shrink-0" />
                                    <div>
                                      <strong className="text-dark">{t('academic.academic_standards')}</strong>
                                      <br />
                                      <small className="text-muted">{t('academic.academic_standards_desc')}</small>
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
        {activeTab === 'medical-history' && (
        <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
          <div className="card-header" style={{ backgroundColor: universityTheme.primary, borderRadius: '1rem 1rem 0 0' }}>
            <h3 className="mb-0 fw-bold text-white">
              <History size={24} className="me-2" />
              {t('academic.medical_history_title')}
            </h3>
          </div>
          <div className="card-body p-2 p-md-4">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border" style={{ color: universityTheme.primary }} role="status">
                  <span className="visually-hidden">{t('common.loading')}</span>
                </div>
                <p className="mt-3">{t('academic.loading_medical_history')}</p>
              </div>
            ) : medicalHistory.length === 0 ? (
              <div className="text-center py-5">
                <History size={48} className="text-muted mb-3" />
                <h5 className="fw-semibold">{t('academic.no_medical_records')}</h5>
                <p className="text-muted">{t('academic.first_appointment_message')}</p>
              </div>
            ) : (
              <>
                {/* Desktop: Table layout */}
                <div className="d-none d-lg-block">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle">
                      <thead>
                        <tr>
                          <th scope="col">{t('academic.date')}</th>
                          <th scope="col">{t('academic.doctor')}</th>
                          <th scope="col">{t('academic.diagnosis')}</th>
                          <th scope="col">{t('academic.treatment')}</th>
                          <th scope="col">{t('common.actions')}</th>
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
                                  {t('academic.view_prescription')}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

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
                            <strong className="text-primary">{t('academic.diagnosis_details')}</strong>
                            <p className="text-muted mb-1">{record.diagnosis_details}</p>
                          </div>
                          <div className="small mb-2">
                            <strong className="text-success">{t('academic.treatment')}</strong>
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
                              {t('academic.view_prescription')}
                            </button>
                            <div className="collapse mt-2" id={`prescription-mobile-${record.id}`}>
                              <div className="card card-body bg-light">
                                {record.prescription.map((item, i) => (
                                  <div key={i} className="mb-2 pb-2 border-bottom">
                                    <div className="small"><strong>{t('academic.medication')}:</strong> {item.medication}</div>
                                    <div className="small"><strong>{t('academic.dosage')}:</strong> {item.dosage}</div>
                                    <div className="small"><strong>{t('academic.frequency')}:</strong> {item.frequency}</div>
                                    <div className="small"><strong>{t('academic.duration')}:</strong> {item.duration}</div>
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

                  {/* Prescription Modals for Desktop */}
                  {medicalHistory.map((record) => (
                    record.prescription && record.prescription.length > 0 && (
                      <div key={record.id} className="modal fade" id={`prescription-modal-${record.id}`} tabIndex={-1}>
                        <div className="modal-dialog modal-dialog-centered">
                          <div className="modal-content" style={{ borderRadius: '1rem' }}>
                            <div className="modal-header" style={{ backgroundColor: universityTheme.primary }}>
                              <h5 className="modal-title text-white">
                                <FileText size={20} className="me-2" />
                                {t('academic.prescription_details')}
                              </h5>
                              <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div className="modal-body">
                              <div className="mb-3">
                                <strong>{t('academic.date')}</strong> {new Date(record.date).toLocaleDateString()}
                              </div>
                              <div className="mb-3">
                                <strong>{t('academic.doctor')}:</strong> Dr. {record.doctor}
                              </div>
                              <div className="mb-3">
                                <strong>{t('academic.diagnosis')}:</strong> {record.diagnosis}
                              </div>
                              <hr />
                              <h6 className="fw-bold mb-3">{t('academic.medications')}</h6>
                              <div className="table-responsive">
                                <table className="table table-bordered">
                                  <thead>
                                    <tr>
                                      <th>{t('academic.medication')}</th>
                                      <th>{t('academic.dosage')}</th>
                                      <th>{t('academic.frequency')}</th>
                                      <th>{t('academic.duration')}</th>
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
                              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">{t('academic.close')}</button>
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

        {/* Reschedule Modal */}
        {showRescheduleModal && (
          <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content" style={{ borderRadius: '1rem' }}>
                <div className="modal-header" style={{ backgroundColor: universityTheme.primary }}>
                  <h5 className="modal-title fw-bold text-white">
                    <Edit size={20} className="me-2" />
                    {t('academic.reschedule_appointment')}
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
                      <label className="form-label">{t('academic.new_date')}</label>
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
                      <label className="form-label">{t('academic.new_time')}</label>
                      <select 
                        className="form-select" 
                        value={rescheduleForm.time}
                        onChange={(e) => setRescheduleForm({...rescheduleForm, time: e.target.value})}
                        required
                      >
                        <option value="">{t('academic.select_time_slot')}</option>
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
                        {t('common.cancel')}
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
                            {t('academic.updating')}
                          </>
                        ) : t('academic.reschedule')}
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
            {t('academic.cancel_appointment')}
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
              <h6 className="fw-bold mb-2">{t('academic.sure_cancel')}</h6>
              <p className="text-muted mb-0">
                {t('academic.cannot_undo')}
              </p>
            </div>
          </div>
          
          <div className="alert alert-warning mb-0">
            <small>
              <strong>{t('common.note')}:</strong> {t('academic.cancel_24h_notice')}
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
            {t('academic.keep_appointment')}
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
                {t('academic.cancelling')}
              </>
            ) : (
              <>
                <X size={16} className="me-2" />
                {t('academic.yes_cancel')}
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