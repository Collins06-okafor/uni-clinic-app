import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, FileText, History, Edit, X, CheckCircle, Stethoscope, Heart, Brain, Thermometer, BarChart3, Activity, Users, TrendingUp, Upload, Camera, AlertTriangle, Globe, Save, Bell, LogOut, Phone } from 'lucide-react';
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { APPOINTMENT_STATUSES, getStatusText } from '../../constants/appointmentStatuses';
import './StudentAppointmentSystem.css'; // Import the CSS file
import { useTranslation } from 'react-i18next';
import i18n from '../../services/i18n';
import RealTimeDashboard from '../../components/RealTimeDashboard';
import NotificationSystem from '../../components/NotificationSystem';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import websocketService from '../../services/websocket';
import apiService from '../../services/api';
import Select from 'react-select';
// CORRECT - Use the viewing component
import { ClinicHoursCard, AppointmentTipsCard, EmergencyContactsCard } from '../../components/ClinicInfoSidebar';
// Configuration
//const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";


interface StudentDashboardProps {
  user: User | null;
  onLogout: () => void;
}

// Type Definitions
interface User {
  id?: string;
  student_id?: string;
  name?: string;
  email?: string;
  department?: string;
  phone?: string;
  date_of_birth?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  medical_history?: string;
}

interface UserProfile {
  student_id: string;
  name: string;
  email: string;
  department: string;
  avatar_url: string | null;
  allergies: string;
  has_known_allergies: boolean;
  allergies_uncertain: boolean;
  addictions: string;
  phone_number: string;
  date_of_birth: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  emergency_contact_email: string;
  blood_type: string;
  gender: string;
  medical_history: string;
}


interface Appointment {
  id: string;
  doctor: string;
  specialty: string; // Make sure this matches your backend
  date: string;
  time: string;
  status: string;
  reason?: string;
  notes?: string;
  urgency?: string;
  doctorImage?: string;
}

interface AppointmentForm {
  doctor_id: string;  // Changed from specialization
  date: string;
  time: string;
  reason: string;
  urgency: 'normal' | 'high' | 'urgent';
  department: string;
}

interface RescheduleForm {
  id: string;
  date: string;
  time: string;
}

interface Specialization {
  id: string;
  name: string;
}

interface Message {
  type: 'success' | 'error' | '';
  text: string;
}

interface UrgencyLevel {
  value: 'normal' | 'high' | 'urgent';
  label: string;
  color: string;
}

interface DashboardStats {
  total: number;
  upcoming: number;
  completed: number;
  pending: number;
}

interface Doctor {
  id: string | number;
  name: string;
  specialization: string;
  email?: string;
  phone?: string;
}

interface Holiday {
  id: string | number;
  name: string;
  start_date: string;
  end_date: string;
  type: string;
  blocks_appointments: boolean;
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


interface Props {
  user?: User;
  onLogout?: () => void;
}

const StudentAppointmentSystem: React.FC<Props> = ({ 
  user = { department: 'Computer Science', name: 'Student', email: 'student@example.com' }, 
  onLogout 
}) => {

  const { t, i18n } = useTranslation();
  const [isConnected, setIsConnected] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);


  // State Management
  type TabType = 'overview' | 'profile' | 'request' | 'history' | 'medical-history';
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  //const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);  // Add this state
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<Message>({ type: '', text: '' });
  const [profileComplete, setProfileComplete] = useState<boolean>(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState<boolean>(false);

  // Add missing state for alternatives modal
  const [showAlternativesModal, setShowAlternativesModal] = useState<boolean>(false);
  const [alternativeDates, setAlternativeDates] = useState<string[]>([]);

  // Add state for cancel confirmation modal
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null);

  const [medicalHistory, setMedicalHistory] = useState<MedicalRecord[]>([]);

  // Profile state
  const [userProfile, setUserProfile] = useState<UserProfile>({
  student_id: user?.student_id || '',
  name: user?.name || '',
  email: user?.email || '',
  department: user?.department || '',
  avatar_url: null,
  allergies: '',
  has_known_allergies: false,
  allergies_uncertain: false,
  addictions: '',
  phone_number: user?.phone || '',
  date_of_birth: user?.date_of_birth || '',
  emergency_contact_name: user?.emergency_contact_name || '',
  emergency_contact_phone: user?.emergency_contact_phone || '',
  emergency_contact_relationship: '',  // ✅ Empty string, not null
  emergency_contact_email: '',         // ✅ Empty string, not null
  blood_type: '',                      // ✅ Empty string (changed from 'Unknown')
  gender: '',                          // ✅ Empty string, not null
  medical_history: user?.medical_history || ''
});
  
  // Form state for new appointment
  const [appointmentForm, setAppointmentForm] = useState<AppointmentForm>({
    doctor_id: '',  // Changed from specialization: ''
    date: '',
    time: '',
    reason: '',
    urgency: 'normal',
    department: user?.department || ''
  });

  // Form state for rescheduling
  const [rescheduleForm, setRescheduleForm] = useState<RescheduleForm>({
    id: '',
    date: '',
    time: ''
  });

  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  // Utility Functions
  // 2. Update the checkProfileComplete function to work with current state
const checkProfileComplete = (profileData = userProfile): boolean => {
  const required: (keyof UserProfile)[] = [
    'name', 
    'email', 
    'department', 
    'phone_number', 
    'date_of_birth', 
    'emergency_contact_name', 
    'emergency_contact_phone',
    'emergency_contact_relationship',  // ✅ ADD THIS
    'emergency_contact_email',         // ✅ ADD THIS
    'blood_type',                      // ✅ ADD THIS
    'gender'                           // ✅ ADD THIS
  ];
  const isComplete = required.every(field => profileData[field] && String(profileData[field]).trim() !== '');
  setProfileComplete(isComplete);
  return isComplete;
};

  const getDashboardStats = (): DashboardStats => {
    const today = new Date().toISOString().split('T')[0];
    
    const upcomingAppointments = appointments.filter(apt => 
      apt.date >= today && (apt.status === 'scheduled' || apt.status === 'confirmed')
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

  // Add these helper functions near your other utility functions
const getMaxBirthDate = (): string => {
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 16);
  return maxDate.toISOString().split('T')[0];
};

const validateAge = (birthDate: string): boolean => {
  if (!birthDate) return true;
  
  const birth = new Date(birthDate);
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  const exactAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate()) 
    ? age - 1 
    : age;
  
  return exactAge >= 16;
};

const handleDateOfBirthChange = (selectedDate: string): void => {
  setUserProfile({...userProfile, date_of_birth: selectedDate});
  
  if (selectedDate && !validateAge(selectedDate)) {
    setMessage({
      type: 'error',
      text: 'Students must be at least 16 years old to register.'
    });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  }
};

  const hasPendingAppointments = (): boolean => {
    const today = new Date().toISOString().split('T')[0];
    return appointments.some(apt => 
      ['pending', 'under_review', 'assigned'].includes(apt.status) &&
      apt.date >= today
    );
  };

  const getAuthToken = (): string | null => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  };

  const getMinDate = (): string => {
    const tomorrow = new Date();
    if (appointmentForm.urgency === 'urgent') {
      return tomorrow.toISOString().split('T')[0];
    } else {
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
  };

  const getSpecialtyIcon = (specialization: string): React.ReactNode => {
  switch (specialization) {
    case 'General Medicine': return <Stethoscope className="text-danger" size={16} />;
    case 'Cardiology': return <Heart className="text-danger" size={16} />;
    case 'Dermatology': return <Thermometer className="text-warning" size={16} />;
    case 'Psychiatry': return <Brain className="text-info" size={16} />;
    case 'Orthopedics': return <Activity className="text-success" size={16} />;
    case 'Neurology': return <Brain className="text-purple" size={16} />;
    default: return <Stethoscope className="text-danger" size={16} />;
  }
};

  const getStatusBadge = (status: string): string => {
    return `status-badge status-${status}`;
  };

  // Event Handlers
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
  const file = event.target.files?.[0];
  if (!file) return;

  // Validation (keep existing validation code)
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(file.type)) {
  setMessage({ 
    type: 'error', 
    text: 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image file.' 
  });
  setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  event.target.value = '';
  return;
}

if (file.size > maxSize) {
  setMessage({ 
    type: 'error', 
    text: 'File too large. Please choose an image smaller than 5MB.' 
  });
  setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  event.target.value = '';
  return;
}

  // Store the previous image URL for rollback
  const previousImageUrl = userProfile.avatar_url;

  try {
    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      setUserProfile(prev => ({...prev, avatar_url: e.target?.result as string}));
    };
    reader.readAsDataURL(file);

    // Prepare FormData
    const formData = new FormData();
    formData.append('avatar', file);

    // Get authentication token
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication token not found. Please log in again.');
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/profile/avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      body: formData
    });

    if (!response.ok) {
      let errorMessage = `Upload failed with status ${response.status}`;
      
      try {
        const errorData = await response.json();
        if (response.status === 403) {
          errorMessage = 'Access denied. Please check your permissions or try logging in again.';
        } else if (response.status === 413) {
          errorMessage = 'File too large. Please choose a smaller image.';
        } else if (response.status === 422) {
          errorMessage = errorData.errors ? 
            Object.values(errorData.errors).flat().join(', ') : 
            'Invalid file format or data.';
        } else {
          errorMessage = errorData.message || errorData.error || errorMessage;
        }
      } catch (parseError) {
        if (response.status === 403) {
          errorMessage = 'Access denied. You may need to log in again or check your permissions.';
        }
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // Handle different possible response formats
    let imageUrl = data.avatar_url || data.url || data.path || data.image_url;
    
    // If the URL is relative, make it absolute
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = `${API_BASE_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
    }

    // Update profile with server response
    setUserProfile(prev => ({ 
      ...prev, 
      avatar_url: imageUrl
    }));

    setMessage({ 
      type: 'success', 
      text: 'Profile image uploaded successfully!' 
    });

    // Clear the file input
    event.target.value = '';
    
  } catch (error) {
    console.error('Image upload error:', error);
    
    // Revert the preview on error to previous image
    setUserProfile(prev => ({ ...prev, avatar_url: previousImageUrl }));
    
    setMessage({ 
      type: 'error', 
      text: error instanceof Error ? error.message : 'Failed to upload image. Please try again.' 
    });
    
    // Clear the file input on error too
    event.target.value = '';
  } finally {
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }
};


  const handleAllergiesChange = (type: 'known' | 'uncertain'): void => {
    if (type === 'known') {
      setUserProfile({
        ...userProfile, 
        has_known_allergies: !userProfile.has_known_allergies,
        allergies_uncertain: false,
        allergies: !userProfile.has_known_allergies ? userProfile.allergies : ''
      });
    } else if (type === 'uncertain') {
      setUserProfile({
        ...userProfile, 
        allergies_uncertain: !userProfile.allergies_uncertain,
        has_known_allergies: false,
        allergies: ''
      });
    }
  };

  const openRescheduleModal = (appointment: Appointment): void => {
  console.log('Opening reschedule modal for appointment:', appointment);
  
  // Prevent body scrolling
  document.body.classList.add('modal-open');
  
  // Clear form and set appointment data
  setRescheduleForm({
    id: appointment.id,
    date: '',
    time: ''
  });
  
  // Clear any existing messages
  setMessage({ type: '', text: '' });
  
  // Show the modal
  setShowRescheduleModal(true);
};
console.log('Modal should be open:', showRescheduleModal);
console.log('Reschedule form data:', rescheduleForm);

const closeRescheduleModal = (): void => {
  // Re-enable body scrolling
  document.body.classList.remove('modal-open');
  
  // Close modal
  setShowRescheduleModal(false);
  
  // Clear form
  setRescheduleForm({ id: '', date: '', time: '' });
  
  // Clear messages
  setMessage({ type: '', text: '' });
};

  // API Functions
  const fetchDoctors = async (): Promise<void> => {
  setLoading(true);
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/student/doctors/availability`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load doctors');
    }
    
    const data: { doctors: Doctor[] } = await response.json();
    setDoctors(Array.isArray(data.doctors) ? data.doctors : []);
  } catch (error) {
    console.error('Error fetching doctors:', error);
    setMessage({ 
      type: 'error', 
      text: 'Failed to load doctors. Please refresh the page and try again.' 
    });
    setDoctors([]);
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }
  setLoading(false);
};

  const fetchAppointments = async (): Promise<void> => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/student/appointments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load appointments');
      }
      
      const data: { appointments: Appointment[] } = await response.json();
setAppointments(Array.isArray(data.appointments) ? data.appointments : []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to load appointments. Please refresh the page and try again.' 
      });
      setAppointments([]);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
    setLoading(false);
  };

  // ✅ Add this helper function BEFORE your fetchUserProfile function
const safeString = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

  // 1. Add a new function to fetch user profile from backend
const fetchUserProfile = async (): Promise<void> => {
  try {
    const token = getAuthToken();
    console.log('🔑 Token:', token ? 'EXISTS' : 'MISSING');
    
    const response = await fetch(`${API_BASE_URL}/api/student/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    console.log('📡 Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('📥 RAW API Response:', JSON.stringify(data, null, 2));
      
      // Format date properly
      const formatDate = (dateString: string | null | undefined): string => {
        if (!dateString) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
        return dateString.split('T')[0];
      };
      
      // Convert ALL null values to empty strings
      const updatedProfile = {
        student_id: safeString(data.student_id),
        name: safeString(data.name),
        email: safeString(data.email),
        department: safeString(data.department),
        avatar_url: data.avatar_url || null,
        allergies: safeString(data.allergies),
        has_known_allergies: data.has_known_allergies || false,
        allergies_uncertain: data.allergies_uncertain || false,
        addictions: safeString(data.addictions),
        phone_number: safeString(data.phone_number),
        date_of_birth: formatDate(data.date_of_birth),
        emergency_contact_name: safeString(data.emergency_contact_name),
        emergency_contact_phone: safeString(data.emergency_contact_phone),
        emergency_contact_relationship: safeString(data.emergency_contact_relationship),
        emergency_contact_email: safeString(data.emergency_contact_email),
        blood_type: safeString(data.blood_type),
        gender: safeString(data.gender),
        medical_history: safeString(data.medical_history)
      };
      
      console.log('✅ Updated Profile State:', JSON.stringify(updatedProfile, null, 2));
      
      setUserProfile(updatedProfile);
      const isComplete = checkProfileComplete(updatedProfile);
      console.log('📊 Profile complete:', isComplete);
      
    } else if (response.status === 404) {
      console.log('❌ Profile not found (404)');
      setProfileComplete(false);
    } else {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      throw new Error('Failed to fetch profile');
    }
  } catch (error) {
    console.error('💥 Error fetching user profile:', error);
    setProfileComplete(false);
  }
};

// Debug version - replace your current helper functions with these
// Simplified helper functions that work with your actual data
const canCancelAppointment = (appointment: Appointment): boolean => {
  console.log('🔍 Checking cancel for:', appointment.status);
  
  // Only these statuses can be cancelled
  const cancellableStatuses = ['pending', 'scheduled', 'assigned'];
  
  const canCancel = cancellableStatuses.includes(appointment.status);
  console.log('✅ Can cancel:', canCancel);
  
  return canCancel;
};

const canRescheduleAppointment = (appointment: Appointment): boolean => {
  console.log('🔍 Checking reschedule for:', appointment.status);
  
  // Only these statuses can be rescheduled (pending usually can't be rescheduled until assigned)
  const reschedulableStatuses = ['scheduled', 'assigned', 'confirmed'];
  
  const canReschedule = reschedulableStatuses.includes(appointment.status);
  console.log('✅ Can reschedule:', canReschedule);
  
  return canReschedule;
};

const fetchMedicalHistory = async (): Promise<void> => {
  setLoading(true);
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/student/medical-history`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      setMedicalHistory(data.medical_history || []);
    }
  } catch (error) {
    console.error('Error fetching medical history:', error);
    setMessage({ 
      type: 'error', 
      text: 'Failed to fetch medical history' 
    });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  } finally {
    setLoading(false);
  }
};


// Replace your saveProfile function with this improved version:

const saveProfile = async (): Promise<void> => {
  setLoading(true);
  try {
    // Validate required fields before sending
    const required: (keyof UserProfile)[] = [
      'name', 
      'email', 
      'department', 
      'phone_number', 
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
        switch(field) {
          case 'phone_number': return 'Phone Number';
          case 'date_of_birth': return 'Date of Birth';
          case 'emergency_contact_name': return 'Emergency Contact Name';
          case 'emergency_contact_phone': return 'Emergency Contact Phone';
          case 'emergency_contact_relationship': return 'Emergency Contact Relationship';
          case 'emergency_contact_email': return 'Emergency Contact Email';
          case 'blood_type': return 'Blood Type';
          case 'gender': return 'Gender';
          default: return field.charAt(0).toUpperCase() + field.slice(1);
        }
      });
      
      setMessage({ 
        type: 'error', 
        text: `Please fill in all required fields: ${fieldNames.join(', ')}` 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      setLoading(false);
      return;
    }

    // Prepare clean data
    const profileData = {
      name: userProfile.name?.trim() || '',
      department: userProfile.department?.trim() || '',
      phone_number: userProfile.phone_number?.trim() || '',
      date_of_birth: userProfile.date_of_birth || '',
      emergency_contact_name: userProfile.emergency_contact_name?.trim() || '',
      emergency_contact_phone: userProfile.emergency_contact_phone?.trim() || '',
      emergency_contact_relationship: userProfile.emergency_contact_relationship?.trim() || '',
      emergency_contact_email: userProfile.emergency_contact_email?.trim() || '',
      blood_type: userProfile.blood_type || '',
      gender: userProfile.gender || '',
      medical_history: userProfile.medical_history?.trim() || '',
      allergies: userProfile.allergies?.trim() || '',
      has_known_allergies: Boolean(userProfile.has_known_allergies),
      allergies_uncertain: Boolean(userProfile.allergies_uncertain),
      addictions: userProfile.addictions?.trim() || ''
    };

    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication token not found. Please log in again.');
    }

    console.log('📤 Sending profile data:', profileData);
    
    const response = await fetch(`${API_BASE_URL}/api/student/profile`, {
      method: 'PUT',
      headers: {  
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(profileData)
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
    
    const isComplete = checkProfileComplete();
    
    setMessage({ 
      type: 'success', 
      text: isComplete ? 'Profile completed and saved successfully!' : 'Profile saved successfully!'
    });
    
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    
  } catch (error) {
    console.error('💥 Error saving profile:', error);
    setMessage({ 
      type: 'error', 
      text: error instanceof Error ? error.message : 'Failed to save profile. Please try again.' 
    });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  } finally {
    setLoading(false);
  }
};

// Add this helper function
const isWeekday = (dateString: string): boolean => {
  const date = new Date(dateString);
  const day = date.getDay();
  // 0 = Sunday, 6 = Saturday
  // Returns true only for Monday (1) through Friday (5)
  return day >= 1 && day <= 5;
};

const getDateClosureReason = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDay();
  
  if (day === 0) return 'Clinic is closed on Sundays';
  if (day === 6) return 'Clinic is closed on Saturdays';
  return 'Clinic is not operating on this date';
};
  
const checkDateAvailability = async (date: string): Promise<boolean> => {
  try {
    const response = await apiService.get(`/holidays/check-availability?date=${date}&staff_type=clinical`);
    
    if (!response.is_available) {
      const blockingHoliday = response.blocking_holidays?.[0];
      setMessage({
        type: 'error',
        text: `Cannot book appointments on ${date}. ${blockingHoliday?.name ? `Reason: ${blockingHoliday.name}` : 'University holiday period'}`
      });
      
      // Show alternative dates
      if (response.alternative_dates?.length > 0) {
        setAlternativeDates(response.alternative_dates);
        setShowAlternativesModal(true);
      }
      
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking date availability:', error);
    return true; // Allow booking if check fails
  }
};

// Add this function to fetch holidays and generate blocked dates
const fetchHolidays = async (): Promise<void> => {
  try {
    const response = await apiService.get('/holidays');
    const holidaysList = response.holidays || [];
    setHolidays(holidaysList);
    
    // Generate list of blocked dates
    const blocked: string[] = [];
    holidaysList.forEach((holiday: Holiday) => {
      if (holiday.blocks_appointments) {
        const startDate = new Date(holiday.start_date);
        const endDate = new Date(holiday.end_date);
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          blocked.push(d.toISOString().split('T')[0]);
        }
      }
    });
    
    setBlockedDates(blocked);
  } catch (error) {
    console.error('Error fetching holidays:', error);
  }
};

// Add this helper function to check if a date is blocked
const isDateBlocked = (dateString: string): boolean => {
  return blockedDates.includes(dateString);
};

  

const submitAppointment = async (): Promise<void> => {
  // ... existing profile and pending checks ...

  if (!appointmentForm.date || !appointmentForm.time || !appointmentForm.reason) {
    setMessage({ 
      type: 'error', 
      text: t('appointments.required_fields')
    });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    return;
  }

  // ... existing date blocking checks ...

  try {
    setLoading(true);

    const response = await apiService.post('/student/appointments/schedule', {
      doctor_id: appointmentForm.doctor_id,
      date: appointmentForm.date,
      time: appointmentForm.time,
      reason: appointmentForm.reason,
      urgency: appointmentForm.urgency,
      department: appointmentForm.department
    });

    setMessage({
      type: 'success',
      text: response.message || t('appointments.submit_success')
    });

    setAppointmentForm({
      doctor_id: '',  // Changed from specialization: ''
      date: '',
      time: '',
      reason: '',
      urgency: 'normal',
      department: user?.department || ''
    });

    fetchAppointments();
  } catch (error: any) {
    setMessage({
      type: 'error',
      text: error.message || t('appointments.submit_error')
    });
  } finally {
    setLoading(false);
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }
};


  const submitReschedule = async (): Promise<void> => {
  // Validation
  if (!rescheduleForm.id) {
    setMessage({ type: 'error', text: 'No appointment selected for rescheduling.' });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    return;
  }

  if (!rescheduleForm.date || !rescheduleForm.time) {
    setMessage({ type: 'error', text: 'Please select both date and time for rescheduling.' });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    return;
  }

  // Check if the selected date is not in the past
  const selectedDateTime = new Date(`${rescheduleForm.date}T${rescheduleForm.time}`);
  const now = new Date();
  
  if (selectedDateTime <= now) {
    setMessage({ type: 'error', text: 'Cannot reschedule to a past date/time.' });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    return;
  }

  // Check if date is blocked by holidays
  if (isDateBlocked(rescheduleForm.date)) {
    const blockingHoliday = holidays.find(h => 
      h.blocks_appointments && 
      rescheduleForm.date >= h.start_date && 
      rescheduleForm.date <= h.end_date
    );
    
    setMessage({
      type: 'error',
      text: `Selected date is not available. ${blockingHoliday ? `Reason: ${blockingHoliday.name}` : 'University holiday period'}`
    });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    return;
  }

  setLoading(true);
  
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication token not found. Please log in again.');
    }

    console.log('Sending reschedule request:', {
      appointmentId: rescheduleForm.id,
      date: rescheduleForm.date,
      time: rescheduleForm.time
    });

    const response = await fetch(`${API_BASE_URL}/api/student/appointments/${rescheduleForm.id}/reschedule`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({ 
        date: rescheduleForm.date, 
        time: rescheduleForm.time 
      })
    });
    
    console.log('Reschedule response status:', response.status);
    
    if (!response.ok) {
      let errorMessage = 'Failed to reschedule appointment';
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          const errorData = await response.json();
          console.error('Reschedule error data:', errorData);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (parseError) {
          console.error('Error parsing JSON response:', parseError);
        }
      } else {
        const textResponse = await response.text();
        console.error('Non-JSON error response:', textResponse);
        
        switch (response.status) {
          case 500:
            errorMessage = 'Server error occurred. Please try again later.';
            break;
          case 404:
            errorMessage = 'Appointment not found or may have been cancelled.';
            break;
          case 403:
            errorMessage = 'You are not authorized to reschedule this appointment.';
            break;
          case 401:
            errorMessage = 'Your session has expired. Please log in again.';
            break;
          case 400:
            errorMessage = 'Invalid rescheduling request. Please check your date and time.';
            break;
          case 422:
            errorMessage = 'The selected time slot may no longer be available. Please choose a different time.';
            break;
          default:
            errorMessage = `Server error (${response.status}). Please try again.`;
        }
      }
      
      throw new Error(errorMessage);
    }
    
    // Handle successful response
    const contentType = response.headers.get('content-type');
    let successMessage = 'Appointment rescheduled successfully!';
    
    if (contentType && contentType.includes('application/json')) {
      try {
        const data = await response.json();
        console.log('Reschedule success data:', data);
        successMessage = data.message || successMessage;
      } catch (parseError) {
        console.error('Error parsing success response JSON:', parseError);
      }
    }
    
    setMessage({ 
      type: 'success', 
      text: successMessage
    });
    
    // Close modal and reset form
    setShowRescheduleModal(false);
    setRescheduleForm({ id: '', date: '', time: '' });

    // On success, close modal properly
    closeRescheduleModal();
    
    // Refresh appointments to show updated data
    await fetchAppointments();
    
  } catch (error) {
    console.error('Error rescheduling appointment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to reschedule appointment. Please try again.';
    setMessage({ 
      type: 'error', 
      text: errorMessage
    });
  } finally {
    setLoading(false);
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }
};

// Add utility functions at top
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

const cancelAppointment = async (appointmentId: string): Promise<void> => {
  setLoading(true);
  
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/student/appointments/${appointmentId}/cancel`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      // Check if response is JSON before trying to parse
      let errorMessage = 'Failed to cancel appointment';
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          console.error('Error parsing JSON response:', parseError);
          // Use default error message if JSON parsing fails
        }
      } else {
        // If it's not JSON, get the text content for debugging
        const textResponse = await response.text();
        console.error('Non-JSON error response:', textResponse);
        
        // Provide a more specific error message based on status
        switch (response.status) {
          case 500:
            errorMessage = 'Server error occurred. Please try again later.';
            break;
          case 404:
            errorMessage = 'Appointment not found.';
            break;
          case 403:
            errorMessage = 'You are not authorized to cancel this appointment.';
            break;
          case 401:
            errorMessage = 'Your session has expired. Please log in again.';
            break;
          default:
            errorMessage = `Server error (${response.status}). Please try again.`;
        }
      }
      
      throw new Error(errorMessage);
    }
    
    // Handle successful response
    const contentType = response.headers.get('content-type');
    let successMessage = 'Appointment cancelled successfully!';
    
    if (contentType && contentType.includes('application/json')) {
      try {
        const data = await response.json();
        successMessage = data.message || successMessage;
      } catch (parseError) {
        console.error('Error parsing success response JSON:', parseError);
        // Use default success message
      }
    }
    
    setMessage({ 
      type: 'success', 
      text: successMessage
    });
    
    fetchAppointments();
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to cancel appointment. Please try again.';
    setMessage({ 
      type: 'error', 
      text: errorMessage
    });
  }
  
  setLoading(false);
  setTimeout(() => setMessage({ type: '', text: '' }), 5000);

  // Close the modal
    setShowCancelModal(false);
    setAppointmentToCancel(null);
    
    fetchAppointments();
};

  // Constants
  const stats = getDashboardStats();
  
  const timeSlots: string[] = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30'
  ];

  const urgencyLevels: UrgencyLevel[] = [
    { value: 'normal', label: 'Normal', color: 'text-success' },
    { value: 'high', label: 'High', color: 'text-warning' },  // Add this line
    { value: 'urgent', label: 'Urgent', color: 'text-danger' }
  ];

  // Effects
  useEffect(() => {
  const initializeData = async () => {
    setLoading(true);
    try {
      await fetchUserProfile();
      await fetchDoctors();  // Changed from fetchSpecializations
      await fetchAppointments();
      await fetchHolidays();
      await fetchMedicalHistory(); // ADD THIS LINE
    } catch (error) {
      console.error('Error initializing dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  initializeData();
}, []);

  // Add this useEffect after your existing ones
// Update the existing WebSocket useEffect in StudentDashboard.tsx
useEffect(() => {
  const connectWebSocket = () => {
    try {
      if (typeof websocketService?.tryConnect === 'function') {
        websocketService.tryConnect();
        
        const handleConnectionChange = (connected: boolean) => {
          setIsConnected(connected);
        };
        
        const handleNewNotification = (notification: any) => {
          setMessage({ 
            type: 'success', 
            text: notification.message 
          });
          setUnreadNotifications(prev => prev + 1);
          setTimeout(() => setMessage({ type: '', text: '' }), 5000);
        };

        // IMPORTANT: Add this handler for appointment updates
        const handleAppointmentUpdate = (appointmentData: any) => {
          console.log('Appointment status updated:', appointmentData);
          
          // Refresh appointments list to show updated status
          fetchAppointments();
          
          // Show notification to user
          setMessage({
            type: 'success',
            text: appointmentData.message || `Your appointment status has been updated to: ${appointmentData.appointment.status}`
          });
          setTimeout(() => setMessage({ type: '', text: '' }), 5000);
        };

        websocketService.onConnectionChange?.(handleConnectionChange);
        websocketService.onNotification?.(handleNewNotification);
        websocketService.onAppointmentUpdate?.(handleAppointmentUpdate); // Add this line
        
        // Join the students channel and personal user channel
        websocketService.joinChannel?.('students');
        websocketService.joinChannel?.(`user.${user?.student_id || user?.id}`);

        return () => {
          websocketService.offConnectionChange?.(handleConnectionChange);
          websocketService.off?.('notification', handleNewNotification);
          websocketService.off?.('appointment.updated', handleAppointmentUpdate); // Add this line
          websocketService.leaveChannel?.('students');
          websocketService.leaveChannel?.(`user.${user?.student_id || user?.id}`);
        };
      }
    } catch (error) {
      console.warn('WebSocket connection failed, continuing without real-time updates:', error);
      setIsConnected(false);
    }
    
    return () => {};
  };

  const cleanup = connectWebSocket();

  return () => {
    if (cleanup) cleanup();
    try {
      websocketService?.disconnect?.();
    } catch (error) {
      console.warn('Error disconnecting WebSocket:', error);
    }
  };
}, [user]);

const AlternativeDatesModal = () => (
  showAlternativesModal && (
    <div className="modal-backdrop show">
      <div className="modal modal-custom show">
        <div className="modal-content">
          <div className="modal-header modal-header-custom">
            <h5 className="modal-title">Alternative Available Dates</h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={() => setShowAlternativesModal(false)}
              aria-label="Close"
            />
          </div>
          <div className="modal-body">
            <p className="mb-3">Your selected date is not available. Here are some alternative dates:</p>
            <div className="row g-2">
              {alternativeDates.map((date, index) => (
                <div key={index} className="col-md-4">
                  <button
                    className="btn btn-outline-primary w-100"
                    onClick={() => {
                      setAppointmentForm({...appointmentForm, date});
                      setShowAlternativesModal(false);
                    }}
                  >
                    {new Date(date).toLocaleDateString()}
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary-custom" 
              onClick={() => setShowAlternativesModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
);

// ==================== SIDEBAR COMPONENT ====================
const Sidebar = () => {
  const menuItems = [
    { id: 'overview', icon: BarChart3, label: 'Dashboard' },
    { id: 'request', icon: Calendar, label: 'Book Appointment' },
    { id: 'history', icon: History, label: 'My Appointments' },
    { id: 'medical-history', icon: FileText, label: 'Medical Records' },
  ];

  // Check if mobile
  const isMobile = window.innerWidth < 768;

  return (
    <>
      {/* Mobile Overlay */}
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

      {/* Sidebar Container */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: isMobile ? (sidebarOpen ? 0 : '-300px') : 0,
          bottom: 0,
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
        {/* ===== HEADER ===== */}
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
                  overflow: 'hidden',
                }}
              >
                <img
                  src="/logo6.png"
                  alt="FIU Logo"
                  style={{
                    width: isMobile ? '24px' : '28px',
                    height: isMobile ? '24px' : '28px',
                    objectFit: 'cover',
                  }}
                />
              </div>
              <div>
                <h6
                  style={{
                    color: '#ffffff',
                    margin: 0,
                    fontSize: isMobile ? '0.9rem' : '1rem',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2,
                  }}
                >
                  FIU Medical
                </h6>
                <small
                  style={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: isMobile ? '0.68rem' : '0.75rem',
                    fontWeight: 500,
                  }}
                >
                  Student Portal
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
                boxShadow: '0 4px 12px rgba(220, 53, 69, 0.3)',
                margin: '0 auto',
                overflow: 'hidden',
              }}
            >
              <img
                src="/logo6.png"
                alt="FIU Logo"
                style={{
                  width: '28px',
                  height: '28px',
                  objectFit: 'cover',
                }}
              />
            </div>
          )}

          {/* Collapse Toggle - Desktop Only */}
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
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                fontSize: '0.85rem',
                fontWeight: 700,
                boxShadow: '0 2px 8px rgba(220, 53, 69, 0.2)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(220, 53, 69, 0.25) 0%, rgba(200, 35, 51, 0.25) 100%)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(220, 53, 69, 0.15) 0%, rgba(200, 35, 51, 0.15) 100%)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {sidebarCollapsed ? '»' : '«'}
            </button>
          )}
        </div>

        {/* ===== NAVIGATION ===== */}
        <nav
          style={{
            // DESKTOP: flex:1 with overflow auto (allows scrolling if needed)
            // MOBILE: flexShrink:0 with no overflow (compact, no scroll)
            flex: isMobile ? 'none' : 1,
            flexShrink: isMobile ? 0 : 1,
            overflowY: isMobile ? 'visible' : 'auto',
            overflowX: 'hidden',
            padding: sidebarCollapsed && !isMobile ? '12px 8px' : isMobile ? '6px 10px' : '16px 12px',
            minHeight: isMobile ? 'auto' : 0,
          }}
        >
          {/* Menu Section Label */}
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

          {/* Menu Items */}
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as TabType);
                  if (isMobile) setSidebarOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: sidebarCollapsed && !isMobile ? 'center' : 'space-between',
                  padding: sidebarCollapsed && !isMobile 
                    ? '14px' 
                    : isMobile 
                    ? '7px 10px' 
                    : '10px 14px',
                  marginBottom: isMobile ? '2px' : '4px',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(220, 53, 69, 0.15) 0%, rgba(200, 35, 51, 0.15) 100%)'
                    : 'transparent',
                  border: isActive ? '1px solid rgba(220, 53, 69, 0.3)' : '1px solid transparent',
                  borderRadius: isMobile ? '6px' : '10px',
                  color: isActive ? '#dc3545' : 'rgba(255, 255, 255, 0.75)',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  fontSize: isMobile ? '0.82rem' : '0.9rem',
                  fontWeight: isActive ? 600 : 500,
                  position: 'relative',
                  overflow: 'hidden',
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
                  <Icon size={isMobile ? 15 : 18} style={{ minWidth: isMobile ? '15px' : '18px' }} />
                  {!(sidebarCollapsed && !isMobile) && (
                    <span style={{ marginLeft: isMobile ? '9px' : '14px' }}>{item.label}</span>
                  )}
                </div>

                {/* Active Indicator */}
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

          {/* Divider */}
          <div
            style={{
              height: '1px',
              background: 'rgba(255, 255, 255, 0.08)',
              margin: isMobile ? '6px 0' : '12px 0',
            }}
          />

          {/* Profile Menu Item */}
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
              padding: sidebarCollapsed && !isMobile 
                ? '14px' 
                : isMobile 
                ? '7px 10px' 
                : '10px 14px',
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
              <span style={{ marginLeft: isMobile ? '9px' : '14px' }}>Profile</span>
            )}
          </button>
        </nav>

        {/* ===== SPACER (Desktop only) ===== */}
        {!isMobile && <div style={{ flex: 1, minHeight: 0 }} />}

        {/* ===== FOOTER ===== */}
        <div
          style={{
            padding: sidebarCollapsed && !isMobile ? '16px 12px' : isMobile ? '8px 12px' : '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.2) 100%)',
            flexShrink: 0,
          }}
        >
          {!(sidebarCollapsed && !isMobile) ? (
            <div>
              {/* User Info Display */}
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
                    boxShadow: '0 4px 12px rgba(220, 53, 69, 0.3)',
                    color: 'white',
                  }}
                >
                  {user?.name?.charAt(0).toUpperCase() || 'S'}
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
                    {user?.name || 'Student'}
                  </div>
                  <small
                    style={{
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontSize: isMobile ? '0.63rem' : '0.7rem',
                      fontWeight: 500,
                    }}
                  >
                    Student Portal
                  </small>
                </div>
              </div>

              {/* Language Switcher */}
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
                  Language
                </div>

                <div style={{ display: 'flex', gap: isMobile ? '4px' : '6px' }}>
                  <button
                    onClick={() => i18n.changeLanguage('en')}
                    style={{
                      flex: 1,
                      background: i18n.language === 'en'
                        ? 'linear-gradient(135deg, rgba(220, 53, 69, 0.2) 0%, rgba(200, 35, 51, 0.2) 100%)'
                        : 'rgba(255, 255, 255, 0.05)',
                      border: i18n.language === 'en'
                        ? '1px solid rgba(220, 53, 69, 0.4)'
                        : '1px solid rgba(255, 255, 255, 0.1)',
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
                      border: i18n.language === 'tr'
                        ? '1px solid rgba(220, 53, 69, 0.4)'
                        : '1px solid rgba(255, 255, 255, 0.1)',
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

              {/* Logout Button */}
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
                Logout
              </button>
            </div>
          ) : (
            // Collapsed state - Just icons
            <div>
              <button
                onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'tr' : 'en')}
                title={`Switch to ${i18n.language === 'en' ? 'Turkish' : 'English'}`}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.75)',
                  padding: '12px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
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
                title="Logout"
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
// ==================== END SIDEBAR COMPONENT ====================


  return (
  <div 
    className="dashboard-wrapper"
    style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #e0f2fe 0%, #f0fdf4 100%)',
    }}
  >
    {/* Add Sidebar */}
    <Sidebar />
    
    {/* Main Content Container */}
    <div 
      style={{
        marginLeft: window.innerWidth < 768 ? 0 : (sidebarCollapsed ? '85px' : '280px'),
        transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Mobile Header */}
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
          <h5 style={{ margin: 0, fontWeight: 700 }}>Student Dashboard</h5>
          <div style={{ width: '40px' }} />
        </div>
      )}
  
      
      

      {/* Main Container */}
      <div className="student-appointment-container" style={{ paddingTop: '5px' }}>
        {/* Main Content */}
        <div className="main-content">
          <div className="row justify-content-center">
            <div className="col-12 col-xl-10">
            {/* Profile Complete Warning */}
            {!profileComplete && (
              <div className="alert alert-warning-custom alert-dismissible fade show" role="alert">
                <div className="d-flex align-items-center">
                  <AlertTriangle size={20} className="me-2" />
                  <strong>Profile Incomplete:</strong> Please complete your profile before booking appointments.
                  <button 
                    className="btn btn-sm btn-outline-warning ms-auto"
                    onClick={() => setActiveTab('profile')}
                  >
                    Complete Profile
                  </button>
                </div>
              </div>
            )}

            {/* Message Display */}
            {message.text && (
              <div className={`alert ${message.type === 'success' ? 'alert-success-custom' : 'alert-error-custom'} alert-dismissible fade show`} 
                   role="alert">
                <div className="d-flex align-items-center">
                  {message.type === 'success' ? <CheckCircle size={20} className="me-2" /> : <X size={20} className="me-2" />}
                  {message.text}
                </div>
              </div>
            )}

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="row g-4">
                {/* Welcome Card */}
                <div className="col-12">
                  <div className="card welcome-card shadow-custom">
                    <div className="card-body">
                      <div className="row align-items-center">
                        <div className="col-md-8">
                          <h3 className="mb-2">{t('dashboard.welcome', { name: userProfile.name })}</h3>
                          <p className="mb-1 opacity-90">{userProfile.email}</p>
                          <p className="mb-1 opacity-90">Student ID: {userProfile.student_id}</p>
                          <p className="mb-0 opacity-75">Department: {userProfile.department}</p>
                        </div>{/*
                        <div className="col-md-4 text-end">
                          {userProfile.avatar_url ? (
                          <img 
                            src={userProfile.avatar_url}
                            alt="Profile" 
                            className="profile-image-welcome"
                          />
                        ) : (
                          <User size={80} className="opacity-75" />
                        )}
                        </div>*/}
                      </div>
                    </div>
                  </div>
                </div>

                 {/* Statistics Cards - Better mobile layout */}
    {[
      { icon: Calendar, value: stats.total, label: t('dashboard.total_appointments'), color: '#E53E3E' },
      { icon: CheckCircle, value: stats.completed, label: 'Completed', color: '#28a745' },
      { icon: Clock, value: stats.pending, label: 'Pending', color: '#ffc107' },
      { icon: TrendingUp, value: stats.upcoming, label: 'Upcoming', color: '#17a2b8' }
    ].map((stat, index) => (
      <div key={index} className="col-6 col-lg-3">
        <div className="card stat-card h-100">
          <div className="card-body p-3 p-md-4 text-center">
            <div 
              className="stat-icon-wrapper d-inline-flex align-items-center justify-content-center mb-3"
              style={{
                width: 'clamp(50px, 12vw, 60px)',
                height: 'clamp(50px, 12vw, 60px)',
                borderRadius: '50%'
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
          </div>
        </div>
      </div>
    ))}

                {/* Quick Actions */}
                <div className="col-12">
                  <div className="card card-custom">
                    <div className="card-header bg-white border-0 pb-0">
                      <h5 className="fw-bold mb-0">Quick Actions</h5>
                    </div>
                    <div className="card-body p-4">
                      <div className="row g-3">
                        <div className="col-md-4">
                          <button 
                            className="quick-action-btn quick-action-btn-primary" 
                            onClick={() => setActiveTab('request')}
                            disabled={!profileComplete || hasPendingAppointments()}
                          >
                            <FileText size={24} className="mb-2" />
                            <div className="fw-semibold">{t('appointments.schedule')}</div>
                            <small className="opacity-75">Book a new medical appointment</small>
                            {!profileComplete && <div className="small text-warning mt-1">Complete profile first</div>}
                            {hasPendingAppointments() && <div className="small text-warning mt-1">Pending appointment exists</div>}
                          </button>
                        </div>
                        
                        <div className="col-md-4">
                          <button 
                            className="quick-action-btn quick-action-btn-outline"
                            onClick={() => setActiveTab('history')}
                          >
                            <History size={24} className="mb-2" />
                            <div className="fw-semibold">View History</div>
                            <small className="text-muted">Check your appointment history</small>
                          </button>
                        </div>
                        
                        <div className="col-md-4">
                          <button 
                            className="quick-action-btn quick-action-btn-outline"
                            onClick={() => setActiveTab('profile')}
                          >
                            <User size={24} className="mb-2" />
                            <div className="fw-semibold">
                              {profileComplete ? 'Update Profile' : 'Complete Profile'}
                            </div>
                            <small className="text-muted">Manage your personal information</small>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Appointments - Mobile Responsive */}
{appointments.length > 0 && (
  <div className="col-12">
    <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
      <div className="card-header bg-white border-0 pb-0">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="fw-bold mb-0">Recent Appointments</h5>
          <button 
            className="btn btn-sm btn-outline-primary"
            onClick={() => setActiveTab('history')}
            style={{ borderRadius: '0.5rem' }}
          >
            View All
          </button>
        </div>
      </div>
      <div className="card-body p-3 p-md-4">
        {/* Desktop: Original layout */}
        <div className="d-none d-md-block">
          {appointments.slice(0, 3).map((appointment) => (
            <div key={appointment.id} className="d-flex align-items-center p-3 bg-light rounded-3 mb-3">
              <div className="me-3">
                {getSpecialtyIcon(appointment.specialty)}
              </div>
              <div className="flex-grow-1">
                <h6 className="mb-1 fw-semibold">{appointment.doctor}</h6>
                <div className="d-flex align-items-center text-muted small">
                  <Calendar size={14} className="me-1" />
                  {formatDate(appointment.date)}
                  <Clock size={14} className="ms-3 me-1" />
                  {formatTime(appointment.time)}
                </div>
                <small className="text-muted">{appointment.reason}</small>
              </div>
              <span className={getStatusBadge(appointment.status)}>
                {t(`status.${appointment.status}`)}
              </span>
            </div>
          ))}
        </div>

        {/* Mobile: Card layout */}
        <div className="d-block d-md-none">
          {appointments.slice(0, 3).map((appointment) => (
            <div key={appointment.id} className="card mb-2 border-0 bg-light">
              <div className="card-body p-3">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center mb-1">
                      <div className="me-2">
                        {getSpecialtyIcon(appointment.specialty)}
                      </div>
                      <h6 className="mb-0 fw-semibold">{appointment.doctor}</h6>
                    </div>
                    <div className="d-flex align-items-center text-muted small mb-1">
                      <Calendar size={12} className="me-1" />
                      <span className="me-3">{new Date(appointment.date).toLocaleDateString()}</span>
                      <Clock size={12} className="me-1" />
                      <span>{appointment.time}</span>
                    </div>
                  </div>
                  <span className={`${getStatusBadge(appointment.status)} small`}>
                    {t(`status.${appointment.status}`)}
                  </span>
                </div>
                <small className="text-muted d-block" style={{ 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap' 
                }}>
                  {appointment.reason}
                </small>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
)}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="card card-custom">
                <div className="card-header card-header-custom">
                  <h3 className="card-title-custom">
                    <User size={24} className="me-2" />
                    Student Profile
                  </h3>
                </div>
                <div className="card-body p-4">
                  <div className="row g-4">
                    {/* Profile Image */}
<div className="col-12 text-center">
  <div className="profile-image-container">
    {userProfile.avatar_url ? (
      <img 
        src={userProfile.avatar_url}
        alt="Profile" 
        style={{
          width: 'clamp(100px, 25vw, 150px)', // Responsive image size
          height: 'clamp(100px, 25vw, 150px)',
          borderRadius: '50%',
          objectFit: 'cover',
          border: '4px solid var(--university-primary)'
        }}
      />
    ) : (
      <div 
        style={{
          width: 'clamp(100px, 25vw, 150px)',
          height: 'clamp(100px, 25vw, 150px)',
          borderRadius: '50%',
          backgroundColor: 'var(--university-light)',
          border: '4px solid var(--university-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <User size={60} className="text-university-primary" />
      </div>
    )}
    
    <label 
      htmlFor="profileImageInput" 
      className="btn btn-sm"
      style={{
        position: 'absolute',
        bottom: 0,
        right: 'calc(50% - clamp(50px, 12.5vw, 75px))', // Center the button
        backgroundColor: 'var(--university-primary)',
        color: 'white',
        borderRadius: '50%',
        width: 'clamp(30px, 8vw, 40px)',
        height: 'clamp(30px, 8vw, 40px)',
        border: '2px solid white',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0
      }}
      title="Upload profile photo"
    >
      <Camera size={16} />
    </label>
    
    <input 
      id="profileImageInput"
      type="file" 
      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" 
      onChange={handleImageUpload}
      style={{ display: 'none' }}
    />
  </div>

  
  {/* Photo Guidelines Dropdown */}
  <div className="mt-3">
    <div className="accordion" id="photoGuidelines">
      <div className="accordion-item" style={{ border: 'none', background: 'transparent' }}>
        <h2 className="accordion-header" id="photoGuidelinesHeading">
          <button 
            className="accordion-button collapsed"
            type="button" 
            data-bs-toggle="collapse" 
            data-bs-target="#photoGuidelinesCollapse" 
            aria-expanded="false" 
            aria-controls="photoGuidelinesCollapse"
            style={{
              background: 'transparent',
              border: '1px solid #dee2e6',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '0.875rem',
              color: '#6c757d'
            }}
          >
            <Camera size={16} className="me-2" />
            Photo Upload Guidelines
          </button>
        </h2>
        <div 
          id="photoGuidelinesCollapse" 
          className="accordion-collapse collapse" 
          aria-labelledby="photoGuidelinesHeading" 
          data-bs-parent="#photoGuidelines"
        >
          <div className="accordion-body" style={{ padding: '16px 0' }}>
            <div className="photo-requirements text-start" style={{ maxWidth: '400px', margin: '0 auto' }}>
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
                      <small className="text-muted">Face clearly visible, appropriate attire</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    {/* Remove photo button if photo exists */}
    {userProfile.avatar_url && (
      <button 
        type="button"
        className="btn btn-outline-danger btn-sm mt-3"
        onClick={async () => {
          if (confirm('Are you sure you want to remove your profile photo?')) {
            try {
              const token = getAuthToken();
              const response = await fetch(`${API_BASE_URL}/api/auth/profile/avatar`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Accept': 'application/json'
                }
              });
              
              if (response.ok) {
                setUserProfile({...userProfile, avatar_url: null});
                setMessage({ type: 'success', text: 'Profile photo removed successfully!' });
              } else {
                throw new Error('Failed to remove photo');
              }
            } catch (error) {
              setMessage({ type: 'error', text: 'Failed to remove photo. Please try again.' });
            }
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
          }
        }}
      >
        <X size={14} className="me-1" />
        Remove Photo
      </button>
    )}
  </div>
</div>

                    {/* Basic Information */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Student ID <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control form-control-custom form-control-lg"
                        value={userProfile.student_id}
                        onChange={(e) => setUserProfile({...userProfile, student_id: e.target.value})}
                        placeholder="Enter your student ID"
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Full Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control form-control-custom form-control-lg"
                        value={userProfile.name}
                        onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
                        placeholder="Enter your full name"
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Email Address <span className="text-danger">*</span></label>
                      <input
                        type="email"
                        className="form-control form-control-custom form-control-lg"
                        value={userProfile.email}
                        onChange={(e) => setUserProfile({...userProfile, email: e.target.value})}
                        placeholder="Enter your email"
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Department <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control form-control-custom form-control-lg"
                        value={userProfile.department}
                        onChange={(e) => setUserProfile({...userProfile, department: e.target.value})}
                        placeholder="Enter your department"
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Phone Number <span className="text-danger">*</span></label>
                      <PhoneInput
                        country={'tr'}
                        value={userProfile.phone_number}
                        onChange={(phone_number) => setUserProfile({...userProfile, phone_number})}
                        placeholder="Enter your phone number"
                        inputProps={{
                          className: 'form-control form-control-lg',
                          required: true
                        }}
                        containerClass="mb-3"
                      />
                    </div>

                    <div className="col-md-6">
                    <label className="form-label fw-semibold">Emergency Contact Relationship <span className="text-danger">*</span></label>
                    <Select
                      value={[
                        { value: '', label: 'Select relationship' },
                        { value: 'parent', label: 'Parent' },
                        { value: 'guardian', label: 'Guardian' },
                        { value: 'spouse', label: 'Spouse' },
                        { value: 'sibling', label: 'Sibling' },
                        { value: 'friend', label: 'Friend' },
                        { value: 'other', label: 'Other' }
                      ].find(option => option.value === (userProfile.emergency_contact_relationship || ''))}
                      onChange={(option) => setUserProfile({...userProfile, emergency_contact_relationship: option?.value || ''})}
                      options={[
                        { value: '', label: 'Select relationship' },
                        { value: 'parent', label: 'Parent' },
                        { value: 'guardian', label: 'Guardian' },
                        { value: 'spouse', label: 'Spouse' },
                        { value: 'sibling', label: 'Sibling' },
                        { value: 'friend', label: 'Friend' },
                        { value: 'other', label: 'Other' }
                      ]}
                      placeholder="Select relationship"
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      styles={{
                        control: (base) => ({
                          ...base,
                          borderRadius: '0.5rem',
                          border: '2px solid #e9ecef',
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
                        }),
                        menuPortal: (base) => ({ 
                          ...base, 
                          zIndex: 9999 
                        })
                      }}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Emergency Contact Email <span className="text-danger">*</span></label>
                    <input
                      type="email"
                      className="form-control form-control-custom form-control-lg"
                      value={userProfile.emergency_contact_email}
                      onChange={(e) => setUserProfile({...userProfile, emergency_contact_email: e.target.value})}
                      placeholder="Emergency contact email"
                      required
                    />
                  </div>

                  <div className="col-md-6">
                  <label className="form-label fw-semibold">Blood Type <span className="text-danger">*</span></label>
                  <Select
                    value={[
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
                    ].find(option => option.value === (userProfile.blood_type || ''))}
                    onChange={(option) => setUserProfile({...userProfile, blood_type: option?.value || ''})}
                    options={[
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
                    ]}
                    placeholder="Select blood type"
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderRadius: '0.5rem',
                        border: '2px solid #e9ecef',
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
                      }),
                      menuPortal: (base) => ({ 
                        ...base, 
                        zIndex: 9999 
                      })
                    }}
                  />
                </div>

                  <div className="col-md-6">
                  <label className="form-label fw-semibold">Gender <span className="text-danger">*</span></label>
                  <Select
                    value={[
                      { value: '', label: 'Select gender' },
                      { value: 'male', label: 'Male' },
                      { value: 'female', label: 'Female' }
                    ].find(option => option.value === (userProfile.gender || ''))}
                    onChange={(option) => setUserProfile({...userProfile, gender: option?.value || ''})}
                    options={[
                      { value: '', label: 'Select gender' },
                      { value: 'male', label: 'Male' },
                      { value: 'female', label: 'Female' }
                    ]}
                    placeholder="Select gender"
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderRadius: '0.5rem',
                        border: '2px solid #e9ecef',
                        minHeight: '50px'
                      }),
                      menu: (base) => ({
                        ...base,
                        zIndex: 9999
                      }),
                      menuPortal: (base) => ({ 
                        ...base, 
                        zIndex: 9999 
                      })
                    }}
                  />
                </div>

                    <div className="col-md-6 col-overflow-visible">
                     <label className="form-label fw-semibold">Date of Birth <span className="text-danger">*</span></label>
                      <div className="date-input-wrapper">
                        <input
                          type="date"
                          className={`form-control form-control-custom form-control-lg ${
                            userProfile.date_of_birth && !validateAge(userProfile.date_of_birth) ? 'is-invalid' : ''
                          }`}
                          value={userProfile.date_of_birth}
                          onChange={(e) => handleDateOfBirthChange(e.target.value)}
                          max={getMaxBirthDate()}
                          required
                        />
                      </div>
                      {userProfile.date_of_birth && !validateAge(userProfile.date_of_birth) && (
                        <div className="invalid-feedback d-block">
                          Students must be at least 16 years old to register.
                        </div>
                      )}
                      <small className="form-text text-muted">
                        Students must be at least 16 years old
                      </small>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Emergency Contact Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control form-control-custom form-control-lg"
                        value={userProfile.emergency_contact_name}
                        onChange={(e) => setUserProfile({...userProfile, emergency_contact_name: e.target.value})}
                        placeholder="Emergency contact name"
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Emergency Contact Number <span className="text-danger">*</span></label>
                      <PhoneInput
                        country={'tr'}
                        value={userProfile.emergency_contact_phone}
                        onChange={(emergency_contact_phone) => setUserProfile({...userProfile, emergency_contact_phone})}
                        placeholder="Emergency contact phone number"
                        inputProps={{
                          className: 'form-control form-control-lg',
                          required: true
                        }}
                        containerClass="mb-3"
                      />
                    </div>

                    {/* Medical Information */}
                    <div className="col-12 mt-4">
                      <h5 className="fw-bold mb-3 text-university-primary">
                        <Stethoscope size={20} className="me-2" />
                        Medical Information
                      </h5>
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-semibold">Allergies</label>
                      <div className="mb-3">
                        <div className="form-check">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="hasKnownAllergies"
                            checked={userProfile.has_known_allergies}
                            onChange={() => handleAllergiesChange('known')}
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
                            onChange={() => handleAllergiesChange('uncertain')}
                          />
                          <label className="form-check-label" htmlFor="allergiesUncertain">
                            I'm not sure if I have allergies
                          </label>
                        </div>
                      </div>
                      {userProfile.has_known_allergies && (
                        <div className="mb-3">
                          <label className="form-label">List of Allergies</label>
                          <textarea
                            className="form-control form-control-custom"
                            rows={2}
                            value={userProfile.allergies}
                            onChange={(e) => setUserProfile({...userProfile, allergies: e.target.value})}
                            placeholder="List all known allergies (e.g., penicillin, nuts, etc.)"
                          />
                        </div>
                      )}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Addictions (if any)</label>
                      <input
                        type="text"
                        className="form-control form-control-custom"
                        value={userProfile.addictions}
                        onChange={(e) => setUserProfile({...userProfile, addictions: e.target.value})}
                        placeholder="e.g., smoking, alcohol, etc."
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-semibold">Medical History</label>
                      <textarea
                        className="form-control form-control-custom"
                        rows={3}
                        value={userProfile.medical_history}
                        onChange={(e) => setUserProfile({...userProfile, medical_history: e.target.value})}
                        placeholder="Any past medical conditions, surgeries, or chronic illnesses"
                      />
                    </div>

                    {/* Save Button */}
                    <div className="col-12 mt-4">
                      <button 
                        className="btn btn-success" 
                        onClick={saveProfile}
                        disabled={loading}
                      >
                        {loading ? (
                          <span className="loading-spinner me-2" role="status" aria-hidden="true"></span>
                        ) : (
                          <Save size={18} className="me-2" />
                        )}
                        Save Profile
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Request Appointment Tab */}
{activeTab === 'request' && (
  <div className="row">
    <div className="col-md-8">
      <div className="card card-custom">
        <div className="card-header card-header-custom">
          <h3 className="card-title-custom">
            <FileText size={24} className="me-2" />
            Request New Appointment
          </h3>
        </div>
        <div className="card-body p-4 card-body-overflow-visible">
          {/* Pending Appointment Warning */}
          {hasPendingAppointments() && (
            <div className="alert alert-warning-custom mb-4">
              <div className="d-flex align-items-center">
                <AlertTriangle size={20} className="me-2" />
                <div>
                  <strong>Pending Appointment:</strong> You already have a pending appointment request. 
                  Please wait for it to be approved before requesting another appointment.
                </div>
              </div>
            </div>
          )}

          {/* Incomplete Profile Warning */}
          {!profileComplete && (
            <div className="alert alert-warning-custom mb-4">
              <div className="d-flex align-items-center">
                <AlertTriangle size={20} className="me-2" />
                <div>
                  <strong>Profile Incomplete:</strong> You must complete your profile before booking appointments. 
                  <button 
                    className="btn btn-sm btn-outline-warning ms-2"
                    onClick={() => setActiveTab('profile')}
                  >
                    Complete Profile
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="row g-4 row-overflow-visible">
            {/* Select Doctor (Optional) */}
            {/* Select Doctor (Optional) */}
            <div className="col-md-6">
              <label className="form-label fw-semibold">Select Doctor (Optional)</label>
              <Select
                value={[
                  { value: '', label: 'Any available doctor' },
                  ...doctors.map((doctor) => ({
                    value: String(doctor.id),
                    label: `Dr. ${doctor.name} - ${doctor.specialization}`
                  }))
                ].find(option => option.value === (appointmentForm.doctor_id || ''))}
                onChange={(option) => setAppointmentForm({...appointmentForm, doctor_id: option?.value || ''})}
                options={[
                  { value: '', label: 'Any available doctor' },
                  ...doctors.map((doctor) => ({
                    value: String(doctor.id),
                    label: `Dr. ${doctor.name} - ${doctor.specialization}`
                  }))
                ]}
                isDisabled={loading || !profileComplete}
                isClearable
                placeholder="Any available doctor"
                menuPortalTarget={document.body}
                menuPosition="fixed"
                styles={{
                  control: (base) => ({
                    ...base,
                    borderRadius: '0.5rem',
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
                  }),
                  menuPortal: (base) => ({ 
                    ...base, 
                    zIndex: 9999 
                  })
                }}
              />
              <div className="form-text">Leave blank to be assigned to any available doctor</div>
            </div>

            {/* Urgency Level */}
            <div className="col-md-6">
              <label className="form-label fw-semibold">Urgency Level <span className="text-danger">*</span></label>
              <div className="d-flex gap-3">
                {urgencyLevels.map((level) => (
                  <div key={level.value} className="flex-grow-1">
                    <input
                      type="radio"
                      className="btn-check"
                      name="urgency"
                      id={`urgency-${level.value}`}
                      autoComplete="off"
                      checked={appointmentForm.urgency === level.value}
                      onChange={() => setAppointmentForm({...appointmentForm, urgency: level.value})}
                      disabled={loading || !profileComplete}
                    />
                    <label
                      className={`urgency-btn ${appointmentForm.urgency === level.value ? 'active' : ''}`}
                      htmlFor={`urgency-${level.value}`}
                    >
                      {level.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Date - with clinic hours validation */}
            <div className="col-md-6 col-overflow-visible">
              <label className="form-label fw-semibold">Date <span className="text-danger">*</span></label>
              <div className="date-input-wrapper">
              <input
                type="date"
                className={`form-control form-control-custom form-control-lg ${
                  appointmentForm.date && !isWeekday(appointmentForm.date) ? 'is-invalid' : ''
                }`}
                value={appointmentForm.date}
                onChange={(e) => {
                  const selectedDate = e.target.value;
                  
                  // Check if date is a weekday (Monday-Friday)
                  if (selectedDate && !isWeekday(selectedDate)) {
                    setMessage({
                      type: 'error',
                      text: getDateClosureReason(selectedDate) + '. Please select a weekday (Monday-Friday).'
                    });
                    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
                    return; // Don't set the date
                  }
                  
                  // Check if date is blocked by holidays (existing check)
                  if (isDateBlocked(selectedDate)) {
                    const blockingHoliday = holidays.find(h => 
                      h.blocks_appointments && 
                      selectedDate >= h.start_date && 
                      selectedDate <= h.end_date
                    );
                    
                    setMessage({
                      type: 'error',
                      text: `Selected date is not available. ${blockingHoliday ? `Reason: ${blockingHoliday.name}` : 'University holiday period'}`
                    });
                    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
                    return;
                  }
                  
                  setAppointmentForm({...appointmentForm, date: selectedDate});
                }}
                min={getMinDate()}
                disabled={loading || !profileComplete}
                required
              />
              </div>
              {appointmentForm.date && !isWeekday(appointmentForm.date) && (
                <div className="invalid-feedback d-block">
                  {getDateClosureReason(appointmentForm.date)}. Please select a weekday.
                </div>
              )}
              <small className="form-text text-muted">
                Clinic operates Monday-Friday, 9:00 AM - 5:00 PM
              </small>
            </div>

            {/* Time */}
            <div className="col-md-6">
              <label className="form-label fw-semibold">Time <span className="text-danger">*</span></label>
              <Select
                value={timeSlots.map(time => ({ value: time, label: time })).find(option => option.value === appointmentForm.time)}
                onChange={(option) => setAppointmentForm({...appointmentForm, time: option?.value || ''})}
                options={timeSlots.map(time => ({ value: time, label: time }))}
                isDisabled={loading || !appointmentForm.date || !profileComplete}
                placeholder={!appointmentForm.date ? 'Select date first' : 'Select a time slot'}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                styles={{
                  control: (base) => ({
                    ...base,
                    borderRadius: '0.5rem',
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
                  }),
                  menuPortal: (base) => ({ 
                    ...base, 
                    zIndex: 9999 
                  })
                }}
              />
            </div>

            {/* Reason */}
            <div className="col-12">
              <label className="form-label fw-semibold">Reason for Appointment <span className="text-danger">*</span></label>
              <textarea
                className="form-control form-control-custom"
                rows={3}
                value={appointmentForm.reason}
                onChange={(e) => setAppointmentForm({...appointmentForm, reason: e.target.value})}
                placeholder="Describe your symptoms or reason for the appointment in detail"
                disabled={loading || !profileComplete}
                required
              />
            </div>

            {/* Submit Button */}
            <div className="col-12">
              <button
                className="btn btn-primary-custom"
                onClick={submitAppointment}
                disabled={loading || !profileComplete || hasPendingAppointments()}
              >
                {loading ? (
                  <span className="loading-spinner me-2" role="status" aria-hidden="true"></span>
                ) : (
                  <FileText size={18} className="me-2" />
                )}
                Request Appointment
              </button>

              {hasPendingAppointments() && (
                <div className="text-warning small mt-2">
                  You cannot request a new appointment while you have pending requests.
                </div>
              )}
            </div>
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
    </div>
    
    {/* Right Sidebar - NEW SECTION */}
    <div className="col-md-4">
  <ClinicHoursCard />
  <AppointmentTipsCard />
  <EmergencyContactsCard />
</div>
  </div>
)}

    {/* Appointment History Tab */}
    {activeTab === 'history' && (
    <div className="card card-custom">
      <div className="card-header card-header-custom">
        <h3 className="card-title-custom">
          <History size={24} className="me-2" />
          Appointment History
        </h3>
      </div>
      <div className="card-body p-2 p-md-4">
        {appointments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FileText size={48} />
            </div>
            <h5 className="fw-bold">No Appointments Found</h5>
            <p className="text-muted">You haven't booked any appointments yet.</p>
            <button 
              className="btn btn-primary-custom"
              onClick={() => setActiveTab('request')}
            >
              <FileText size={18} className="me-2" />
              Book an Appointment
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
                      <h6 className="mb-1 fw-semibold">{appointment.doctor}</h6>
                      <div className="d-flex align-items-center small text-muted mb-1">
                        {getSpecialtyIcon(appointment.specialty)}
                        <span className="ms-2">{appointment.specialty}</span>
                      </div>
                    </div>
                    <span className={getStatusBadge(appointment.status)}>
                      {getStatusText(appointment.status as typeof APPOINTMENT_STATUSES[keyof typeof APPOINTMENT_STATUSES])}
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
                  
                  <div className="d-flex gap-1 flex-wrap">
                    {canRescheduleAppointment(appointment) ? (
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
                        title={
                          appointment.status === 'completed' || appointment.status === 'cancelled' 
                            ? 'Cannot reschedule completed/cancelled appointments'
                            : new Date(`${appointment.date}T${appointment.time}`) <= new Date()
                            ? 'Cannot reschedule past appointments'
                            : 'Reschedule not available for this status'
                        }
                      >
                        <Edit size={14} className="me-1" />
                        Reschedule
                      </button>
                    )}

                    {canCancelAppointment(appointment) ? (
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
                        title={
                          appointment.status === 'completed' || appointment.status === 'cancelled' 
                            ? 'Cannot cancel completed/cancelled appointments'
                            : new Date(`${appointment.date}T${appointment.time}`) <= new Date()
                            ? 'Cannot cancel past appointments'
                            : 'Cancellation not available for this status'
                        }
                      >
                        <X size={14} className="me-1" />
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: Table layout */}
          <div className="d-none d-lg-block">
            <div className="table-responsive">
              <table className="table table-custom table-hover">
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Specialty</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment) => (
                    <tr key={appointment.id}>
                      <td>
                        <div className="d-flex align-items-center">
                          {appointment.doctorImage ? (
                            <img 
                              src={appointment.doctorImage} 
                              alt="Doctor" 
                              className="doctor-image"
                            />
                          ) : (
                            <User size={20} className="me-2" />
                          )}
                          {appointment.doctor}
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          {getSpecialtyIcon(appointment.specialty)}
                          <span className="ms-2">{appointment.specialty}</span>
                        </div>
                      </td>
                      <td>{formatDate(appointment.date)}</td>
                      <td>{formatTime(appointment.time)}</td>
                      <td>
                        <span className={getStatusBadge(appointment.status)}>
                          {getStatusText(appointment.status as typeof APPOINTMENT_STATUSES[keyof typeof APPOINTMENT_STATUSES])}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          {canRescheduleAppointment(appointment) ? (
                            <button 
                              className="btn btn-sm btn-outline-primary-custom"
                              onClick={() => {
                                console.log('Reschedule button clicked for:', appointment);
                                openRescheduleModal(appointment);
                              }}
                              title="Reschedule appointment"
                            >
                              <Edit size={16} />
                            </button>
                          ) : (
                            <button 
                              className="btn btn-sm btn-outline-secondary"
                              disabled
                              title={
                                appointment.status === 'completed' || appointment.status === 'cancelled' 
                                  ? 'Cannot reschedule completed/cancelled appointments'
                                  : new Date(`${appointment.date}T${appointment.time}`) <= new Date()
                                  ? 'Cannot reschedule past appointments'
                                  : 'Reschedule not available for this status'
                              }
                            >
                              <Edit size={16} />
                            </button>
                          )}

                          {canCancelAppointment(appointment) ? (
                            <button 
                              className="btn btn-sm btn-outline-danger-custom"
                              onClick={() => {
                                setAppointmentToCancel(appointment.id);
                                setShowCancelModal(true);
                              }}
                              title="Cancel appointment"
                            >
                              <X size={16} />
                            </button>
                          ) : (
                            <button 
                              className="btn btn-sm btn-outline-secondary"
                              disabled
                              title={
                                appointment.status === 'completed' || appointment.status === 'cancelled' 
                                  ? 'Cannot cancel completed/cancelled appointments'
                                  : new Date(`${appointment.date}T${appointment.time}`) <= new Date()
                                ? 'Cannot cancel past appointments'
                                : 'Cancellation not available for this status'
                              }
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
{activeTab === 'history' && (
  <div className="card card-custom">
    {/* Appointment History content */}
    <div className="card-body">
      {/* Add your appointment history content here */}
    </div>
  </div>
)}

{/* Medical History Tab - CORRECT LOCATION (separate from history) */}
{activeTab === 'medical-history' && (
  <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
    <div className="card-header" style={{ backgroundColor: 'var(--university-primary)', borderRadius: '1rem 1rem 0 0' }}>
      <h3 className="mb-0 fw-bold text-white">
        <Stethoscope size={24} className="me-2" />
        Medical History
      </h3>
    </div>
    <div className="card-body p-2 p-md-4">
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border" style={{ color: 'var(--university-primary)' }} role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading medical history...</p>
        </div>
      ) : medicalHistory.length === 0 ? (
        <div className="text-center py-5">
          <Stethoscope size={48} className="text-muted mb-3" />
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
                          <span className="fw-semibold">{formatDate(record.date)}</span>
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
                    <div className="modal-header" style={{ backgroundColor: 'var(--university-primary)' }}>
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
          </div>
        </div>
      </div>

      {/* Reschedule Modal */}
      {/* Reschedule Modal - Fixed Version */}
{showRescheduleModal && (
  <>
    {/* Modal Backdrop */}
    <div 
      className="modal-backdrop fade show"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 1050
      }}
      onClick={() => setShowRescheduleModal(false)}
    />
    
    {/* Modal Container */}
    <div 
      className="modal fade show"
      style={{ 
        display: 'block',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'auto',
        zIndex: 1055
      }}
      tabIndex={-1}
      role="dialog"
    >
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div 
          className="modal-content"
          style={{
            borderRadius: '1rem',
            border: 'none',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
          }}
        >
          {/* Modal Header */}
          <div 
            className="modal-header"
            style={{
              backgroundColor: 'var(--university-primary)',
              color: 'white',
              borderRadius: '1rem 1rem 0 0',
              borderBottom: 'none',
              padding: '1rem 1.5rem'
            }}
          >
            <h5 className="modal-title mb-0">Reschedule Appointment</h5>
            <button 
              type="button" 
              className="btn-close btn-close-white"
              onClick={() => setShowRescheduleModal(false)}
              aria-label="Close"
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              ×
            </button>
          </div>
          
          {/* Modal Body */}
          <div className="modal-body" style={{ padding: '1.5rem' }}>
            <div className="row g-3">
              <div className="col-12">
                <label className="form-label fw-semibold">New Date <span className="text-danger">*</span></label>
                <input
                  type="date"
                  className="form-control form-control-custom"
                  value={rescheduleForm.date}
                  onChange={(e) => {
                    const selectedDate = e.target.value;
                    
                    // Check if date is blocked
                    if (isDateBlocked(selectedDate)) {
                      const blockingHoliday = holidays.find(h => 
                        h.blocks_appointments && 
                        selectedDate >= h.start_date && 
                        selectedDate <= h.end_date
                      );
                      
                      setMessage({
                        type: 'error',
                        text: `Selected date is not available. ${blockingHoliday ? `Reason: ${blockingHoliday.name}` : 'University holiday period'}`
                      });
                      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
                      return;
                    }
                    
                    setRescheduleForm({...rescheduleForm, date: selectedDate});
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
                {rescheduleForm.date && isDateBlocked(rescheduleForm.date) && (
                  <small className="text-danger">
                    This date is not available due to university holidays
                  </small>
                )}
              </div>
              
              <div className="col-12">
              <label className="form-label fw-semibold">New Time <span className="text-danger">*</span></label>
              <Select
                value={timeSlots.map(time => ({ value: time, label: time })).find(option => option.value === rescheduleForm.time)}
                onChange={(option) => setRescheduleForm({...rescheduleForm, time: option?.value || ''})}
                options={timeSlots.map(time => ({ value: time, label: time }))}
                isDisabled={!rescheduleForm.date}
                placeholder="Select a time slot"
                menuPortalTarget={document.body}
                menuPosition="fixed"
                styles={{
                  control: (base) => ({
                    ...base,
                    borderRadius: '0.5rem',
                    border: '2px solid #e9ecef',
                    minHeight: '45px'
                  }),
                  menu: (base) => ({
                    ...base,
                    maxHeight: window.innerWidth < 768 ? '200px' : '300px',
                    zIndex: 9999
                  }),
                  menuList: (base) => ({
                    ...base,
                    maxHeight: window.innerWidth < 768 ? '200px' : '300px',
                  }),
                  menuPortal: (base) => ({ 
                    ...base, 
                    zIndex: 9999 
                  })
                }}
              />
            </div>
            </div>
          </div>
          
          {/* Modal Footer */}
          <div 
            className="modal-footer"
            style={{ 
              borderTop: '1px solid #dee2e6',
              padding: '1rem 1.5rem'
            }}
          >
            <button 
              type="button" 
              className="btn btn-secondary me-2"
              onClick={() => {
                setShowRescheduleModal(false);
                setRescheduleForm({ id: '', date: '', time: '' });
                setMessage({ type: '', text: '' });
              }}
              style={{
                borderRadius: '0.5rem',
                padding: '0.5rem 1rem'
              }}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={submitReschedule}
              disabled={loading || !rescheduleForm.date || !rescheduleForm.time}
              style={{
                backgroundColor: 'var(--university-primary)',
                borderColor: 'var(--university-primary)',
                borderRadius: '0.5rem',
                padding: '0.5rem 1rem'
              }}
            >
              {loading ? (
                <>
                  <span 
                    className="spinner-border spinner-border-sm me-2" 
                    role="status" 
                    aria-hidden="true"
                    style={{ width: '1rem', height: '1rem' }}
                  />
                  Rescheduling...
                </>
              ) : (
                <>
                  <Edit size={16} className="me-2" />
                  Reschedule Appointment
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  </>
)}
{/* Cancel Confirmation Modal */}
                  {showCancelModal && (
                    <>
                      {/* Modal Backdrop */}
                      <div 
                        className="modal-backdrop fade show"
                        style={{ 
                          position: 'fixed',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          backgroundColor: 'rgba(0,0,0,0.5)',
                          zIndex: 1050
                        }}
                        onClick={() => {
                          setShowCancelModal(false);
                          setAppointmentToCancel(null);
                        }}
                      />
                      
                      {/* Modal Container */}
                      <div 
                        className="modal fade show"
                        style={{ 
                          display: 'block',
                          position: 'fixed',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          overflow: 'auto',
                          zIndex: 1055
                        }}
                        tabIndex={-1}
                        role="dialog"
                      >
                        <div className="modal-dialog modal-dialog-centered" role="document">
                          <div 
                            className="modal-content"
                            style={{
                              borderRadius: '1rem',
                              border: 'none',
                              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
                            }}
                          >
                            {/* Modal Header */}
                            <div 
                              className="modal-header"
                              style={{
                                backgroundColor: '#dc3545',
                                color: 'white',
                                borderRadius: '1rem 1rem 0 0',
                                borderBottom: 'none',
                                padding: '1rem 1.5rem'
                              }}
                            >
                              <h5 className="modal-title mb-0 d-flex align-items-center">
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
                                aria-label="Close"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'white',
                                  fontSize: '1.5rem',
                                  fontWeight: 'bold',
                                  cursor: 'pointer'
                                }}
                              >
                                ×
                              </button>
                            </div>
                            
                            {/* Modal Body */}
                            <div className="modal-body" style={{ padding: '1.5rem' }}>
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
                                  <strong>Note:</strong> Please cancel at least 24 hours in advance when possible to allow other students to book this slot.
                                </small>
                              </div>
                            </div>
                            
                            {/* Modal Footer */}
                            <div 
                              className="modal-footer"
                              style={{ 
                                borderTop: '1px solid #dee2e6',
                                padding: '1rem 1.5rem'
                              }}
                            >
                              <button 
                                type="button" 
                                className="btn btn-secondary me-2"
                                onClick={() => {
                                  setShowCancelModal(false);
                                  setAppointmentToCancel(null);
                                }}
                                style={{
                                  borderRadius: '0.5rem',
                                  padding: '0.5rem 1rem'
                                }}
                              >
                                Keep Appointment
                              </button>
                              <button 
                                type="button" 
                                className="btn btn-danger"
                                onClick={() => appointmentToCancel && cancelAppointment(appointmentToCancel)}
                                disabled={loading}
                                style={{
                                  borderRadius: '0.5rem',
                                  padding: '0.5rem 1rem'
                                }}
                              >
                                {loading ? (
                                  <>
                                    <span 
                                      className="spinner-border spinner-border-sm me-2" 
                                      role="status" 
                                      aria-hidden="true"
                                      style={{ width: '1rem', height: '1rem' }}
                                    />
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
                    </>
                  )}
    </div>
    </div>
  </div>
  
  );
};

export default StudentAppointmentSystem;