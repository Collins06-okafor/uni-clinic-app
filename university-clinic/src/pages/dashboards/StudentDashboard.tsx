import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, FileText, History, Edit, X, CheckCircle, Stethoscope, Heart, Brain, Thermometer, BarChart3, Activity, Users, TrendingUp, Upload, Camera, AlertTriangle, Globe, Save, Bell, LogOut } from 'lucide-react';
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
  avatar_url: string | null; // Changed from profile_image
  allergies: string;
  has_known_allergies: boolean;
  allergies_uncertain: boolean;
  addictions: string;
  phone_number: string;
  date_of_birth: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
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
  specialization: string;
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
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<Message>({ type: '', text: '' });
  const [profileComplete, setProfileComplete] = useState<boolean>(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState<boolean>(false);
  
  
  // Profile state
  const [userProfile, setUserProfile] = useState<UserProfile>({
    student_id: user?.student_id || '',
    name: user?.name || '',
    email: user?.email || '',
    department: user?.department || '',
    avatar_url: null, // Changed from profile_image
    allergies: '',
    has_known_allergies: false,
    allergies_uncertain: false,
    addictions: '',
    phone_number: user?.phone || '',
    date_of_birth: user?.date_of_birth || '',
    emergency_contact_name: user?.emergency_contact_name || '',
    emergency_contact_phone: user?.emergency_contact_phone || '',
    medical_history: user?.medical_history || ''
  });
  
  // Form state for new appointment
  const [appointmentForm, setAppointmentForm] = useState<AppointmentForm>({
    specialization: '',
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

  // Utility Functions
  // 2. Update the checkProfileComplete function to work with current state
const checkProfileComplete = (profileData = userProfile): boolean => {
  const required: (keyof UserProfile)[] = ['name', 'email', 'department', 'phone_number', 'date_of_birth', 'emergency_contact_name', 'emergency_contact_phone'];
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
  if (file) {
    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      setUserProfile({...userProfile, avatar_url: e.target?.result as string}); // Changed from profile_image
    };
    reader.readAsDataURL(file);

    // Upload the actual file to server
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/profile/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload profile image');
      }

      const data = await response.json();
      console.log('Image upload response:', data);
      // Update with server response
      if (data.avatar_url) {
        setUserProfile(prev => ({...prev, avatar_url: data.avatar_url}));
      }
      setMessage({ type: 'success', text: 'Profile image uploaded successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      
    } catch (error) {
      console.error('Error uploading image:', error);
      setMessage({ type: 'error', text: 'Failed to upload profile image. Please try again.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
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
    setRescheduleForm({
      id: appointment.id,
      date: appointment.date,
      time: appointment.time
    });
    setShowRescheduleModal(true);
  };

  // API Functions
  const fetchSpecializations = async (): Promise<void> => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/student/doctors/availability`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load specializations');
      }
      
      const data: { doctors: Doctor[] } = await response.json();
const doctors = Array.isArray(data.doctors) ? data.doctors : [];
const uniqueSpecializations = [
  ...new Set(
    doctors
      .map((doc: Doctor) => doc.specialization)
      .filter((spec): spec is string => Boolean(spec && spec.trim()))
  )
].map((spec: string) => ({ id: spec, name: spec }));
      
      setSpecializations(uniqueSpecializations);
    } catch (error) {
      console.error('Error fetching specializations:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to load specializations. Please refresh the page and try again.' 
      });
      setSpecializations([]);
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

  // 1. Add a new function to fetch user profile from backend
const fetchUserProfile = async (): Promise<void> => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Fetched profile data:', data); // Debug log
      
      // Update userProfile state with fetched data
      const updatedProfile = {
        student_id: data.student_id || user?.student_id || '',
        name: data.name || user?.name || '',
        email: data.email || user?.email || '',
        department: data.department || user?.department || '',
        avatar_url: data.avatar_url || null,
        allergies: data.allergies || '',
        has_known_allergies: data.has_known_allergies || false,
        allergies_uncertain: data.allergies_uncertain || false,
        addictions: data.addictions || '',
        phone_number: data.phone_number || user?.phone || '',
        date_of_birth: data.date_of_birth || user?.date_of_birth || '',
        emergency_contact_name: data.emergency_contact_name || user?.emergency_contact_name || '',
        emergency_contact_phone: data.emergency_contact_phone || user?.emergency_contact_phone || '',
        medical_history: data.medical_history || user?.medical_history || ''
      };
      
      setUserProfile(updatedProfile);
      
      // Check if profile is complete based on fetched data
      const isComplete = checkProfileComplete(updatedProfile);
      console.log('Profile complete status:', isComplete, updatedProfile); // Debug log
      
    } else if (response.status === 404) {
      // Profile doesn't exist yet, keep current state
      console.log('Profile not found, using default values');
      setProfileComplete(false);
    } else {
      throw new Error('Failed to fetch profile');
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    // On error, assume profile is incomplete to be safe
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


const saveProfile = async (): Promise<void> => {
  setLoading(true);
  try {
    // Validate required fields before sending
    const required: (keyof UserProfile)[] = ['name', 'email', 'department', 'phone_number', 'date_of_birth', 'emergency_contact_name', 'emergency_contact_phone'];
    const missingFields = required.filter(field => !userProfile[field] || String(userProfile[field]).trim() === '');
    
    if (missingFields.length > 0) {
      const fieldNames = missingFields.map(field => {
        switch(field) {
          case 'phone_number': return 'Phone Number';
          case 'date_of_birth': return 'Date of Birth';
          case 'emergency_contact_name': return 'Emergency Contact Name';
          case 'emergency_contact_phone': return 'Emergency Contact Phone';
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

    const token = getAuthToken();
    console.log('Sending profile data:', userProfile);
    
    const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
      method: 'POST',
      headers: {  
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(userProfile)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.log('Validation errors:', errorData);
      
      if (errorData.errors) {
        const errorMessages = Object.values(errorData.errors).flat().join(', ');
        throw new Error(`Validation failed: ${errorMessages}`);
      }
      
      throw new Error(errorData.message || 'Failed to save profile');
    }
    
    // Check if profile is now complete
    const isComplete = checkProfileComplete();
    
    if (isComplete) {
      setMessage({ type: 'success', text: 'Profile completed and saved successfully!' });
    } else {
      setMessage({ type: 'success', text: 'Profile saved successfully!' });
    }
    
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  } catch (error) {
    console.error('Error saving profile:', error);
    setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save profile. Please try again.' });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }
  setLoading(false);
};
  

  const submitAppointment = async (): Promise<void> => {
  if (!checkProfileComplete()) {
    setMessage({ 
      type: 'error', 
      text: t('profile.complete_warning')
    });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    return;
  }

  if (hasPendingAppointments()) {
    setMessage({
      type: 'error',
      text: t('appointments.pending_warning')
    });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    return;
  }

  if (!appointmentForm.date || !appointmentForm.time || !appointmentForm.reason) {
    setMessage({ 
      type: 'error', 
      text: t('appointments.required_fields')
    });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    return;
  }

  try {
    setLoading(true);

    const response = await apiService.scheduleAppointment({
      specialization: appointmentForm.specialization,
      date: appointmentForm.date,
      time: appointmentForm.time,
      reason: appointmentForm.reason,
      urgency: appointmentForm.urgency, // This now supports normal, high, urgent
      department: appointmentForm.department
    });

    setMessage({
      type: 'success',
      text: response.message || t('appointments.submit_success')
    });

    setAppointmentForm({
      specialization: '',
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
    if (!rescheduleForm.date || !rescheduleForm.time) {
      setMessage({ type: 'error', text: 'Please select both date and time for rescheduling.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return;
    }

    setLoading(true);
    
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/student/appointments/${rescheduleForm.id}/reschedule`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          date: rescheduleForm.date, 
          time: rescheduleForm.time 
        })
      });
      
      if (!response.ok) {
        // Check if response is JSON before trying to parse
        let errorMessage = 'Failed to reschedule appointment';
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch (parseError) {
            console.error('Error parsing JSON response:', parseError);
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
              errorMessage = 'You are not authorized to reschedule this appointment.';
              break;
            case 401:
              errorMessage = 'Your session has expired. Please log in again.';
              break;
            case 400:
              errorMessage = 'Invalid rescheduling request. Please check your date and time.';
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
          successMessage = data.message || successMessage;
        } catch (parseError) {
          console.error('Error parsing success response JSON:', parseError);
        }
      }
      
      setMessage({ 
        type: 'success', 
        text: successMessage
      });
      
      setShowRescheduleModal(false);
      setRescheduleForm({ id: '', date: '', time: '' });
      fetchAppointments();
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to reschedule appointment. Please try again.';
      setMessage({ 
        type: 'error', 
        text: errorMessage
      });
    }
    
    setLoading(false);
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

const cancelAppointment = async (appointmentId: string): Promise<void> => {
  if (!confirm('Are you sure you want to cancel this appointment?')) {
    return;
  }

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
};

  // Constants
  const stats = getDashboardStats();
  
  const timeSlots: string[] = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
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
      // Load data in sequence to ensure profile completeness is checked after data loads
      await fetchUserProfile();
      await fetchSpecializations();
      await fetchAppointments();
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


  return (
    <>
      {/* Navigation Header - Updated for White Background */}
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
    height: '80px', // Fixed height instead of minHeight
    padding: 0,
    margin: 0
  }}
>
  <div 
    className="container-fluid d-flex align-items-center justify-content-between h-100"
    style={{
      padding: '0 1.5rem', // Consistent horizontal padding
      margin: 0
    }}
  >
    {/* Logo Section - Better proportions */}
    <div 
      className="navbar-brand"
      style={{
        display: 'flex',
        alignItems: 'center',
        marginRight: 0, // Remove fixed margin for flexibility
        padding: 0,
        minWidth: '280px' // Ensure consistent width
      }}
    >
      <img
        src="/logo6.png"
        alt="Final International University Logo"
        style={{
          width: '50px',
          height: '50px',
          objectFit: 'contain',
          borderRadius: '10px',
          marginRight: '12px' // Consistent spacing
        }}
      />
      <div>
        <h5 
          style={{
            color: '#212529', // Better contrast on white
            fontWeight: 'bold',
            fontSize: '1.25rem',
            marginBottom: '2px', // Tighter spacing
            lineHeight: 1.2
          }}
        >
          Final International University
        </h5>
        <small 
          style={{
            color: '#6c757d',
            fontSize: '0.875rem',
            lineHeight: 1
          }}
        >
          Medical Appointments
        </small>
      </div>
    </div>

    {/* Mobile menu toggle */}
    <button 
      className="navbar-toggler d-lg-none" 
      type="button" 
      data-bs-toggle="collapse" 
      data-bs-target="#navbarContent"
      aria-controls="navbarContent" 
      aria-expanded="false" 
      aria-label="Toggle navigation"
    >
      <span className="navbar-toggler-icon"></span>
    </button>

    {/* Navigation Menu - Better spacing and layout */}
    <div className="collapse navbar-collapse" id="navbarContent">
      {/* Center Navigation */}
      <ul 
        className="navbar-nav mx-auto mb-0" 
        style={{ 
          display: 'flex',
          alignItems: 'center',
          gap: '8px' // Consistent gap between nav items
        }}
      >
        <li className="nav-item">
          <button 
            className={`nav-link btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
            style={{
              borderRadius: '8px', // Consistent border radius
              border: 'none',
              margin: 0,
              padding: '10px 16px', // Better padding proportions
              fontWeight: 600,
              transition: 'all 0.3s ease',
              backgroundColor: activeTab === 'overview' ? '#dc3545' : 'transparent',
              color: activeTab === 'overview' ? 'white' : '#495057', // Better neutral color
              display: 'flex',
              alignItems: 'center',
              gap: '6px', // Space between icon and text
              minHeight: '44px' // Consistent button height
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
            <span>{t('nav.overview')}</span>
          </button>
        </li>
        
        <li className="nav-item">
          <button 
            className={`nav-link btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
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
            <User size={18} />
            <span>{t('nav.profile')}</span>
            {!profileComplete && (
              <span 
                className="badge bg-warning text-dark"
                style={{ 
                  fontSize: '0.7rem',
                  marginLeft: '4px'
                }}
              >
                !
              </span>
            )}
          </button>
        </li>
        
        <li className="nav-item">
          <button 
            className={`nav-link btn ${activeTab === 'request' ? 'active' : ''}`}
            onClick={() => setActiveTab('request')}
            style={{
              borderRadius: '8px',
              border: 'none',
              margin: 0,
              padding: '10px 16px',
              fontWeight: 600,
              transition: 'all 0.3s ease',
              backgroundColor: activeTab === 'request' ? '#dc3545' : 'transparent',
              color: activeTab === 'request' ? 'white' : '#495057',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              minHeight: '44px'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'request') {
                e.currentTarget.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
                e.currentTarget.style.color = '#dc3545';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'request') {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#495057';
              }
            }}
          >
            <FileText size={18} />
            <span>{t('nav.request')}</span>
          </button>
        </li>
        
        <li className="nav-item">
          <button 
            className={`nav-link btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
            style={{
              borderRadius: '8px',
              border: 'none',
              margin: 0,
              padding: '10px 16px',
              fontWeight: 600,
              transition: 'all 0.3s ease',
              backgroundColor: activeTab === 'history' ? '#dc3545' : 'transparent',
              color: activeTab === 'history' ? 'white' : '#495057',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              minHeight: '44px'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'history') {
                e.currentTarget.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
                e.currentTarget.style.color = '#dc3545';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'history') {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#495057';
              }
            }}
          >
            <History size={18} />
            <span>{t('nav.history')}</span>
          </button>
        </li>
      </ul>

      {/* Right side controls - Better alignment */}
      <div 
        className="d-flex align-items-center"
        style={{ 
          gap: '12px', // Consistent gap
          minWidth: '200px',
          justifyContent: 'flex-end'
        }}
      >
        {/* Language Switcher */}
        <div className="dropdown">
          <button 
            className="btn btn-outline-secondary dropdown-toggle" 
            data-bs-toggle="dropdown"
            style={{ 
              borderRadius: '25px',
              borderColor: '#6c757d', // Neutral for better contrast
              color: '#495057',
              backgroundColor: 'transparent',
              padding: '8px 16px',
              height: '40px' // Fixed height
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
                onClick={() => i18n.changeLanguage('en')}
                style={{
                  padding: '12px 20px',
                  transition: 'background-color 0.2s ease',
                  color: '#212529'
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
                onClick={() => i18n.changeLanguage('tr')}
                style={{
                  padding: '12px 20px',
                  transition: 'background-color 0.2s ease',
                  color: '#212529'
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
              padding: '6px 12px', // Tighter padding
              background: '#f8f9fa',
              color: '#212529',
              height: '40px' // Match language button height
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
            <div 
              className="rounded-circle me-2 d-flex align-items-center justify-content-center"
              style={{
                width: '28px', // Slightly smaller
                height: '28px',
                backgroundColor: '#dc3545',
                color: 'white'
              }}
            >
              {userProfile.avatar_url ? (
                <img 
                  src={userProfile.avatar_url}
                  alt="Profile" 
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <User size={16} />
              )}
            </div>
            <span className="fw-semibold d-none d-md-inline">
              {userProfile.name || 'Student'}
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
                          backgroundColor: '#dc3545',
                          color: 'white'
                        }}
                      >
                        {userProfile.avatar_url ? (
                          <img 
                            src={userProfile.avatar_url}
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
                        <div className="fw-semibold">{userProfile.name || 'Student'}</div>
                        <small className="text-muted">{userProfile.email}</small>
                        <div>
                          <small className="text-muted">ID: {userProfile.student_id}</small>
                        </div>
                        <div>
                          <small className="text-muted">{userProfile.department}</small>
                        </div>
                      </div>
                    </div>
                  </li>
                  
                  {/* Profile Status */}
                  <li>
                    <button 
                      className="dropdown-item d-flex align-items-center"
                      style={{
                        padding: '12px 20px',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      onClick={() => setActiveTab('profile')}
                    >
                      <User size={16} className="me-3" />
                      <div className="flex-grow-1">
                        Profile
                        {!profileComplete && (
                          <span className="badge bg-warning text-dark ms-2" style={{ fontSize: '0.7rem' }}>
                            Incomplete
                          </span>
                        )}
                      </div>
                    </button>
                  </li>

                  {/* Notifications */}
                  <li>
                    <button 
                      className="dropdown-item d-flex align-items-center"
                      style={{
                        padding: '12px 20px',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      onClick={() => setUnreadNotifications(0)}
                    >
                      <Bell size={16} className="me-3" />
                      <div className="flex-grow-1">
                        Notifications
                        {unreadNotifications > 0 && (
                          <span 
                            className="badge bg-danger rounded-pill ms-2"
                            style={{ fontSize: '0.7rem' }}
                          >
                            {unreadNotifications > 99 ? '99+' : unreadNotifications}
                          </span>
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
                        </div>
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
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Statistics Cards */}
                <div className="col-md-3 col-sm-6">
                  <div className="card stat-card">
                    <div className="card-body p-4 text-center">
                      <div className="stat-icon-wrapper stat-icon-primary">
                        <Calendar size={30} />
                      </div>
                      <h4 className="fw-bold mb-1 text-university-primary">{stats.total}</h4>
                      <p className="text-muted mb-0">{t('dashboard.total_appointments')}</p>
                    </div>
                  </div>
                </div>

                <div className="col-md-3 col-sm-6">
                  <div className="card stat-card">
                    <div className="card-body p-4 text-center">
                      <div className="stat-icon-wrapper stat-icon-success">
                        <CheckCircle size={30} />
                      </div>
                      <h4 className="fw-bold text-success mb-1">{stats.completed}</h4>
                      <p className="text-muted mb-0">Completed</p>
                    </div>
                  </div>
                </div>

                <div className="col-md-3 col-sm-6">
                  <div className="card stat-card">
                    <div className="card-body p-4 text-center">
                      <div className="stat-icon-wrapper stat-icon-warning">
                        <Clock size={30} />
                      </div>
                      <h4 className="fw-bold text-warning mb-1">{stats.pending}</h4>
                      <p className="text-muted mb-0">Pending</p>
                    </div>
                  </div>
                </div>

                <div className="col-md-3 col-sm-6">
                  <div className="card stat-card">
                    <div className="card-body p-4 text-center">
                      <div className="stat-icon-wrapper stat-icon-info">
                        <TrendingUp size={30} />
                      </div>
                      <h4 className="fw-bold text-info mb-1">{stats.upcoming}</h4>
                      <p className="text-muted mb-0">Upcoming</p>
                    </div>
                  </div>
                </div>

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

                {/* Recent Appointments */}
                {appointments.length > 0 && (
                  <div className="col-12">
                    <div className="card card-custom">
                      <div className="card-header bg-white border-0 pb-0">
                        <div className="d-flex justify-content-between align-items-center">
                          <h5 className="fw-bold mb-0">Recent Appointments</h5>
                          <button 
                            className="btn btn-sm btn-outline-primary-custom"
                            onClick={() => setActiveTab('history')}
                          >
                            View All
                          </button>
                        </div>
                      </div>
                      <div className="card-body p-4">
                        {appointments.slice(0, 3).map((appointment) => (
                          <div key={appointment.id} className="appointment-card">
                            <div className="me-3">
                              {getSpecialtyIcon(appointment.specialty)}
                            </div>
                            <div className="flex-grow-1">
                              <h6 className="mb-1 fw-semibold">{appointment.doctor}</h6>
                              <div className="d-flex align-items-center text-muted small">
                                <Calendar size={14} className="me-1" />
                                {new Date(appointment.date).toLocaleDateString()}
                                <Clock size={14} className="ms-3 me-1" />
                                {appointment.time}
                              </div>
                            </div>
                            <span className={getStatusBadge(appointment.status)}>
                              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                            </span>
                          </div>
                        ))}
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
                          className="profile-image-large"
                        />
                      ) : (
                        <div className="profile-image-placeholder">
                          <User size={60} className="text-university-primary" />
                        </div>
                      )}
                        <label 
                          htmlFor="profileImageInput" 
                          className="btn btn-sm profile-image-upload-btn"
                        >
                          <Camera size={16} />
                        </label>
                        <input 
                          id="profileImageInput"
                          type="file" 
                          accept="image/*" 
                          onChange={handleImageUpload}
                          style={{ display: 'none' }}
                        />
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
                      <label className="form-label fw-semibold">Date of Birth <span className="text-danger">*</span></label>
                      <input
                        type="date"
                        className="form-control form-control-custom form-control-lg"
                        value={userProfile.date_of_birth}
                        onChange={(e) => setUserProfile({...userProfile, date_of_birth: e.target.value})}
                        max={new Date().toISOString().split('T')[0]}
                        required
                      />
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
              <div className="card card-custom">
                <div className="card-header card-header-custom">
                  <h3 className="card-title-custom">
                    <FileText size={24} className="me-2" />
                    Request New Appointment
                  </h3>
                </div>
                <div className="card-body p-4">
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

                  <div className="row g-4">
                    {/* Specialization */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Specialization</label>
                      <select
                        className="form-select form-select-custom form-select-lg"
                        value={appointmentForm.specialization}
                        onChange={(e) => setAppointmentForm({...appointmentForm, specialization: e.target.value})}
                        disabled={loading || !profileComplete}
                      >
                        <option value="">Not specified (general consultation)</option>
                        {specializations.map((spec) => (
                          <option key={spec.id} value={spec.name}>
                            {spec.name}
                          </option>
                        ))}
                      </select>
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

                    {/* Date */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Date <span className="text-danger">*</span></label>
                      <input
                        type="date"
                        className="form-control form-control-custom form-control-lg"
                        value={appointmentForm.date}
                        onChange={(e) => setAppointmentForm({...appointmentForm, date: e.target.value})}
                        min={getMinDate()}
                        disabled={loading || !profileComplete}
                        required
                      />
                    </div>

                    {/* Time */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Time <span className="text-danger">*</span></label>
                      <select
                        className="form-select form-select-custom form-select-lg"
                        value={appointmentForm.time}
                        onChange={(e) => setAppointmentForm({...appointmentForm, time: e.target.value})}
                        disabled={loading || !appointmentForm.date || !profileComplete}
                        required
                      >
                        <option value="">Select a time slot</option>
                        {timeSlots.map((time) => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
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
                  </div>
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
                <div className="card-body p-4">
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
                              <td>{new Date(appointment.date).toLocaleDateString()}</td>
                              <td>{appointment.time}</td>
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
                                      onClick={() => openRescheduleModal(appointment)}
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
                                      onClick={() => cancelAppointment(appointment.id)}
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

                                  {!canRescheduleAppointment(appointment) && !canCancelAppointment(appointment) && (
                                    <span className="text-muted small">
                                      {appointment.status === 'completed' ? 'Completed' : 
                                      appointment.status === 'cancelled' ? 'Cancelled' : 
                                      'No actions'}
                                    </span>
                                  )}
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
            )}
          </div>
        </div>
      </div>

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="modal-backdrop show">
          <div className="modal modal-custom show">
            <div className="modal-content">
              <div className="modal-header modal-header-custom">
                <h5 className="modal-title">Reschedule Appointment</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowRescheduleModal(false)}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-control form-control-custom"
                    value={rescheduleForm.date}
                    onChange={(e) => setRescheduleForm({...rescheduleForm, date: e.target.value})}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Time</label>
                  <select
                    className="form-select form-select-custom"
                    value={rescheduleForm.time}
                    onChange={(e) => setRescheduleForm({...rescheduleForm, time: e.target.value})}
                    disabled={!rescheduleForm.date}
                  >
                    <option value="">Select a time slot</option>
                    {timeSlots.map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary-custom" 
                  onClick={() => setShowRescheduleModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary-custom"
                  onClick={submitReschedule}
                  disabled={loading || !rescheduleForm.date || !rescheduleForm.time}
                >
                  {loading ? (
                    <span className="loading-spinner me-2" role="status" aria-hidden="true"></span>
                  ) : (
                    <Edit size={16} className="me-2" />
                  )}
                  Reschedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  
  );
};

export default StudentAppointmentSystem;