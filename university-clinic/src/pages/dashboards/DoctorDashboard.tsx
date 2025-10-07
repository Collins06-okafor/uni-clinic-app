import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, FileText, Pill, User, Plus, Search, Eye, Edit, CheckCircle, XCircle, Stethoscope, Heart, Brain, Thermometer, BarChart3, Activity, TrendingUp, Check, Globe, X, Archive, Settings, Save, Camera, AlertTriangle, LogOut } from 'lucide-react';
import RealTimeDashboard from '../../components/RealTimeDashboard';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import i18n from '../../services/i18n';
import WalkInAlert from '../../components/WalkInAlert';
import websocketService from '../../services/websocket';


// Types
interface User {
  id: number;
  name: string;
  email: string;
  specialization?: string;
}

interface Patient {
  id: number;
  name: string;
  email: string;
  student_id?: string;
  staff_id?: string;
  department: string;
  role: string;
}

interface Appointment {
  id: number;
  patient_id: number;
  date: string;
  time: string;
  reason: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  patient?: Patient;
}

interface Medication {
  name: string;
  dosage: string;
  instructions: string;
  start_date: string;
  end_date: string;
  frequency?: string; // Add this
}

interface Prescription {
  id: number;
  patient_id: number;
  medications: Medication[];
  notes: string;
  status: string;
  created_at: string;
  patient?: Patient;
}

interface Message {
  type: 'success' | 'error' | '';
  text: string;
}

interface AvailabilityForm {
  available_days: string[];
  working_hours_start: string;
  working_hours_end: string;
  is_available?: boolean;
  break_start?: string;
  break_end?: string;
}

interface AppointmentForm {
  patient_id: string;
  date: string;
  time: string;
  reason: string;
}

interface MedicalRecordForm {
  diagnosis: string;
  treatment: string;
  notes: string;
  visit_date: string;
  has_prescription: boolean;  // Add this
  medications: Medication[]; 
}

interface MedicalRecord {
  id: number;
  patient_id: number;
  doctor_id: number;
  diagnosis: string;
  treatment: string;
  notes?: string;
  visit_date: string;
  created_at: string;
  doctor?: {
    id: number;
    name: string;
  };
}

interface PrescriptionForm {
  patient_id: string;
  medications: Medication[];
  notes: string;
}

interface RescheduleForm {
  new_date: string;
  new_time: string;
  reschedule_reason: string;
}

interface PatientDetails {
  medical_info?: {
    blood_type?: string;
    allergies?: string;
    emergency_contact?: string;
    last_visit?: string;
  };
  visit_history?: Array<{
    date: string;
    doctor: string;
    diagnosis: string;
    treatment: string;
    notes?: string;
  }>;
}

interface MedicalCard {
  patient_name: string;
  patient_id: string;
  card_number: string;
  blood_type?: string;
  allergies?: string;
  emergency_contact?: string;
  issued_date: string;
  chronic_conditions?: string;
  current_medications?: string;
}

interface WeeklyStats {
  appointments: number[];
  patients: number[];
  completed: number[];
}

interface MonthlyData {
  month: string;
  appointments: number;
  patients: number;
  revenue: number;
}

interface DoctorProfile {
  name: string;
  email: string;
  specialization: string;
  medical_license_number?: string;
  staff_no?: string;
  phone?: string;
  bio?: string;
  avatar_url?: string | null;
  date_of_birth?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  years_of_experience?: number;
  certifications?: string;
  languages_spoken?: string;
}

interface Holiday {
  id: string | number;
  name: string;
  start_date: string;
  end_date: string;
  type: string;
  blocks_appointments: boolean;
}

// Add this new interface for the completion report
interface CompletionReport {
  diagnosis: string;
  treatment_provided: string;
  medications_prescribed: string;
  recommendations: string;
  follow_up_required: boolean;
  follow_up_date?: string;
  notes: string;
}

interface RescheduleForm {
  new_date: string;
  new_time: string;
  reschedule_reason: string;
}

interface EnhancedDoctorDashboardProps {
  user: User;
  onLogout?: () => void;
}

interface DoctorDashboardProps {
  user: User | null;
  onLogout: () => void;
}

// API Configuration - Fixed to use Vite environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const DOCTOR_API_BASE = `${API_BASE_URL}/api/doctor`;

// Constants
const APPOINTMENT_STATUSES = {
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed', 
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const;

const getStatusText = (status: string): string => {
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const getStatusBadgeClass = (status: string): string => {
  const badgeClasses = {
    scheduled: 'badge bg-warning text-dark',
    confirmed: 'badge bg-info text-white',
    completed: 'badge bg-success',
    cancelled: 'badge bg-danger'
  };
  return badgeClasses[status as keyof typeof badgeClasses] || 'badge bg-secondary';
};

const EnhancedDoctorDashboard: React.FC<EnhancedDoctorDashboardProps> = ({ user, onLogout }) => {

   const { t, i18n } = useTranslation();

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showModal, setShowModal] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [message, setMessage] = useState<Message>({ type: '', text: '' });
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedPatients, setSelectedPatients] = useState<Set<number>>(new Set());
  const [appointmentFilter, setAppointmentFilter] = useState<string>('all');
  const [patientMedicalRecords, setPatientMedicalRecords] = useState<MedicalRecord[]>([]);
const [patientPrescriptions, setPatientPrescriptions] = useState<Prescription[]>([]);
const [showPatientHistory, setShowPatientHistory] = useState<boolean>(false);
const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
const [walkInAlerts, setWalkInAlerts] = useState<any[]>([]);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile>({
    name: user?.name || '',
    email: user?.email || '',
    specialization: user?.specialization || '',
    medical_license_number: '',
    staff_no: '',
    phone: '',
    bio: '',
    avatar_url: null,
    date_of_birth: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    years_of_experience: 0,
    certifications: '',
    languages_spoken: ''
  });
const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
  appointments: [0, 0, 0, 0, 0, 0, 0],
  patients: [0, 0, 0, 0, 0, 0, 0],
  completed: [0, 0, 0, 0, 0, 0, 0]
});
const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
const [kpiData, setKpiData] = useState({
  totalAppointments: 0,
  totalPatients: 0,
  completedAppointments: 0,
  activePrescriptions: 0,
  pendingAppointments: 0,
  todayAppointments: 0
});
  
  // Form states
  const [availabilityForm, setAvailabilityForm] = useState<AvailabilityForm>({
    available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    working_hours_start: '09:00',
    working_hours_end: '17:00',
    is_available: true,
    break_start: '',
    break_end: ''
  });
  
  const [appointmentForm, setAppointmentForm] = useState<AppointmentForm>({
    patient_id: '',
    date: '',
    time: '',
    reason: ''
  });
  
  const [medicalRecordForm, setMedicalRecordForm] = useState<MedicalRecordForm>({
    diagnosis: '',
    treatment: '',
    notes: '',
    visit_date: new Date().toISOString().split('T')[0],
    has_prescription: false,
  medications: [{
    name: '',
    dosage: '',
    instructions: '',
    start_date: '',
    end_date: '',
    frequency: 'daily'
  }]
  });
  
  const [prescriptionForm, setPrescriptionForm] = useState<PrescriptionForm>({
    patient_id: '',
    medications: [{
      name: '',
      dosage: '',
      instructions: '',
      start_date: '',
      end_date: '',
      frequency: 'daily'
    }],
    notes: ''
  });

  // Add this state for the completion report
const [completionReport, setCompletionReport] = useState<CompletionReport>({
  diagnosis: '',
  treatment_provided: '',
  medications_prescribed: '',
  recommendations: '',
  follow_up_required: false,
  follow_up_date: '',
  notes: ''
});

const [rescheduleForm, setRescheduleForm] = useState<RescheduleForm>({
  new_date: '',
  new_time: '',
  reschedule_reason: ''
});

  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  // Time slots for appointments
  
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'An unexpected error occurred';
};

  // Get dashboard statistics
  // Updated stats calculation using real data
const getDashboardStats = () => {
  // Get today's date in YYYY-MM-DD format
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = today.toISOString().split('T')[0];
  
  console.log('Today string:', todayString);
  console.log('Sample appointments:', appointments.slice(0, 3).map(a => ({
    id: a.id,
    date: a.date,
    patient: a.patient?.name
  })));
  
  // FIX: Handle both ISO timestamp and date-only formats
  const todayAppointments = appointments.filter(apt => {
    if (!apt.date) return false;
    
    // Handle ISO timestamp: "2025-10-07T10:00:00.000000Z"
    // Handle date-only: "2025-10-07"
    const aptDateStr = apt.date.split('T')[0];
    const matches = aptDateStr === todayString;
    
    if (matches) {
      console.log('✓ Today appointment found:', {
        patient: apt.patient?.name,
        date: apt.date,
        status: apt.status
      });
    }
    
    return matches;
  }).length;
  
  console.log('Today appointments count:', todayAppointments);
  
  const upcomingAppointments = appointments.filter(apt => {
    const aptDateStr = apt.date.split('T')[0];
    return aptDateStr >= todayString && (apt.status === 'scheduled' || apt.status === 'confirmed');
  }).length;
  
  const completedAppointments = appointments.filter(apt => 
    apt.status === 'completed'
  ).length;
  
  const activePrescriptions = prescriptions.filter(p => 
    p.status === 'active'
  ).length;
  
  return {
    total: appointments.length,
    today: todayAppointments,
    upcoming: upcomingAppointments,
    completed: completedAppointments,
    patients: patients.length,
    prescriptions: activePrescriptions
  };
};

  const stats = getDashboardStats();

  // Add this function to fetch real KPI data
  const fetchKPIData = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch(`${DOCTOR_API_BASE}/dashboard`, {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load dashboard: HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Dashboard data received:', data);
      console.log('Weekly stats from API:', data.weekly_stats);
      
      // Update KPI data safely
      if (data.today_statistics) {
        setKpiData({
          totalAppointments: data.today_statistics.total_appointments || 0,
          totalPatients: data.patient_statistics?.total_active_patients || 0,
          completedAppointments: data.today_statistics.completed_appointments || 0,
          activePrescriptions: data.prescription_statistics?.active_prescriptions || 0,
          pendingAppointments: data.today_statistics.scheduled_appointments || 0,
          todayAppointments: data.today_statistics.total_appointments || 0
        });
      }
      
      // PRIORITY: Use API weekly stats if available
      if (data.weekly_stats) {
        console.log('Setting weekly stats from API:', data.weekly_stats);
        setWeeklyStats({
          appointments: data.weekly_stats.appointments || [0, 0, 0, 0, 0, 0, 0],
          patients: data.weekly_stats.patients || [0, 0, 0, 0, 0, 0, 0],
          completed: data.weekly_stats.completed || [0, 0, 0, 0, 0, 0, 0]
        });
        // Mark that we have API data to prevent local overwrite
        localStorage.setItem('hasApiWeeklyStats', 'true');
      } else {
        // Only fetch separately if no API data
        await fetchWeeklyStats();
      }
      
    } catch (error) {
      console.error('Error fetching KPI data:', error);
      setMessage({ 
        type: 'error', 
        text: getErrorMessage(error) || 'Failed to load dashboard statistics' 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      
      // Try to fetch weekly stats separately if dashboard fails
      try {
        await fetchWeeklyStats();
      } catch (weeklyError) {
        console.error('Error fetching weekly stats as fallback:', weeklyError);
      }
    }
    setLoading(false);
  };

// Add function to fetch weekly statistics
const fetchWeeklyStats = async (): Promise<void> => {
  try {
    const response = await fetch(`${DOCTOR_API_BASE}/statistics?period=week`, {
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.weekly_stats) {
      setWeeklyStats({
        appointments: data.weekly_stats.appointments || [0, 0, 0, 0, 0, 0, 0],
        patients: data.weekly_stats.patients || [0, 0, 0, 0, 0, 0, 0],
        completed: data.weekly_stats.completed || [0, 0, 0, 0, 0, 0, 0]
      });
    }
    
  } catch (error) {
    console.error('Error fetching weekly statistics:', error);
    // Keep the current mock data as fallback
  }
};

// Add holiday checking function
const checkDateAvailability = async (date: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/holidays/check-availability?date=${date}&staff_type=clinical`, {
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.is_available) {
      const blockingHoliday = data.blocking_holidays?.[0];
      setMessage({
        type: 'error',
        text: `Cannot schedule appointments on ${date}. ${blockingHoliday?.name ? `Reason: ${blockingHoliday.name}` : 'University holiday period'}`
      });
      
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking date availability:', error);
    return true; // Allow booking if check fails
  }
};

// Add function to fetch holidays and generate blocked dates
const fetchHolidays = async (): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/holidays`, {
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const holidaysList = data.holidays || [];
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

// Add helper function to check if a date is blocked
const isDateBlocked = (dateString: string): boolean => {
  return blockedDates.includes(dateString);
};

  const fetchAppointments = async (): Promise<void> => {
  setLoading(true);
  try {
    const response = await fetch(`${DOCTOR_API_BASE}/appointments`, {
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const allApts = data.appointments || [];
    
    // ADD THIS DEBUGGING
    console.log('=== APPOINTMENTS FETCHED ===');
    console.log('Total appointments:', allApts.length);
    console.log('Today date:', new Date().toISOString().split('T')[0]);
    console.log('Sample appointment dates:', allApts.slice(0, 5).map((a: Appointment) => ({
      id: a.id,
      date: a.date,
      patient: a.patient?.name
    })));
    
    setAppointments(allApts);
    setFilteredAppointments(allApts);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    setMessage({ type: 'error', text: 'Failed to load appointments' });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }
  setLoading(false);
};

  const saveProfile = async (): Promise<void> => {
  try {
    setLoading(true);
    
    const profileData = {
      name: doctorProfile.name,
      phone: doctorProfile.phone,
      bio: doctorProfile.bio,
      specialization: doctorProfile.specialization,
      medical_license_number: doctorProfile.medical_license_number,
      staff_no: doctorProfile.staff_no
    };
    
    const response = await fetch(`${DOCTOR_API_BASE}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(profileData)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    setMessage({ type: 'success', text: 'Profile updated successfully!' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  } catch (error) {
    console.error('Profile save error:', error);
    setMessage({ 
      type: 'error', 
      text: getErrorMessage(error) || 'Failed to update profile' 
    });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }
  setLoading(false);
};

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
  const file = event.target.files?.[0];
  if (!file) return;
  
  try {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setMessage({ 
        type: 'error', 
        text: 'Please select a valid image file (JPEG, PNG, GIF, or WebP)' 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      setMessage({ 
        type: 'error', 
        text: 'Image file size must be less than 5MB' 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return;
    }
    
    setLoading(true);
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    // Log the request details for debugging
    console.log('Uploading avatar:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      endpoint: `${DOCTOR_API_BASE}/avatar`
    });
    
    const response = await fetch(`${DOCTOR_API_BASE}/avatar`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        // Don't set Content-Type header for FormData - browser sets it automatically with boundary
      },
      body: formData
    });
    
    console.log('Upload response status:', response.status);
    
    if (!response.ok) {
      let errorMessage = `Upload failed: HTTP ${response.status}`;
      
      try {
        const errorData = await response.json();
        console.error('Server error response:', errorData);
        errorMessage = errorData.message || errorData.error || errorMessage;
        
        // Handle specific error cases
        if (response.status === 413) {
          errorMessage = 'File is too large. Please choose a smaller image.';
        } else if (response.status === 415) {
          errorMessage = 'Unsupported file type. Please choose a JPEG, PNG, GIF, or WebP image.';
        } else if (response.status === 422) {
          errorMessage = errorData.errors ? 
            Object.values(errorData.errors).flat().join(', ') : 
            'Invalid file data provided.';
        }
      } catch (parseError) {
        console.error('Could not parse error response:', parseError);
        // Try to get text response if JSON parsing fails
        try {
          const textResponse = await response.text();
          console.error('Error response text:', textResponse);
          if (textResponse.includes('File too large')) {
            errorMessage = 'File is too large. Please choose a smaller image.';
          }
        } catch (textError) {
          console.error('Could not get text response:', textError);
        }
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    console.log('Upload successful:', data);
    
    // Update the profile with new avatar URL
    setDoctorProfile(prev => ({ 
      ...prev, 
      avatar_url: data.avatar_url || data.url || data.path 
    }));
    
    setMessage({ 
      type: 'success', 
      text: 'Profile image updated successfully!' 
    });
    
    // Clear the file input
    event.target.value = '';
    
  } catch (error) {
    console.error('Image upload error:', error);
    setMessage({ 
      type: 'error', 
      text: getErrorMessage(error) || 'Failed to upload image. Please try again.' 
    });
  } finally {
    setLoading(false);
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }
};

  const handlePhotoRemove = async (): Promise<void> => {
  if (!doctorProfile.avatar_url) {
    setMessage({ type: 'error', text: 'No profile photo to remove' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    return;
  }
  
  try {
    setLoading(true);
    
    console.log('Removing avatar from:', `${DOCTOR_API_BASE}/avatar`);
    
    const response = await fetch(`${DOCTOR_API_BASE}/avatar`, { 
      method: 'DELETE',
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log('Remove response status:', response.status);
    
    if (!response.ok) {
      let errorMessage = `Remove failed: HTTP ${response.status}`;
      
      try {
        const errorData = await response.json();
        console.error('Remove error response:', errorData);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (parseError) {
        console.error('Could not parse remove error response:', parseError);
      }
      
      throw new Error(errorMessage);
    }
    
    // Update profile to remove avatar
    setDoctorProfile(prev => ({ ...prev, avatar_url: null }));
    
    setMessage({ 
      type: 'success', 
      text: 'Profile photo removed successfully!' 
    });
    
  } catch (error) {
    console.error('Photo removal error:', error);
    setMessage({ 
      type: 'error', 
      text: getErrorMessage(error) || 'Failed to remove photo. Please try again.' 
    });
  } finally {
    setLoading(false);
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }
};

const fetchDoctorProfile = async (): Promise<void> => {
  try {
    setLoading(true);
    const response = await fetch(`${DOCTOR_API_BASE}/profile`, {
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to load profile: HTTP ${response.status}`);
    }
    
    const profileData = await response.json();
    
    setDoctorProfile({
      name: profileData.name || '',
      email: profileData.email || '',
      specialization: profileData.specialization || '',
      medical_license_number: profileData.medical_license_number || '',
      staff_no: profileData.staff_no || '',
      phone: profileData.phone || '',
      bio: profileData.bio || '',
      avatar_url: profileData.avatar_url || null,
      date_of_birth: profileData.date_of_birth || '',
      emergency_contact_name: profileData.emergency_contact_name || '',
      emergency_contact_phone: profileData.emergency_contact_phone || '',
      years_of_experience: profileData.years_of_experience || 0,
      certifications: profileData.certifications || '',
      languages_spoken: profileData.languages_spoken || ''
    });
    
  } catch (error) {
    console.error('Error fetching doctor profile:', error);
    setMessage({ 
      type: 'error', 
      text: getErrorMessage(error) || 'Failed to load profile' 
    });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }
  setLoading(false);
};

const handleProfileInputChange = (field: keyof DoctorProfile, value: string | number) => {
  setDoctorProfile(prev => ({
    ...prev,
    [field]: value
  }));
};

const togglePatientSelection = (patientId: number): void => {
  setSelectedPatients(prev => {
    const newSet = new Set(prev);
    if (newSet.has(patientId)) {
      newSet.delete(patientId);
    } else {
      newSet.add(patientId);
    }
    return newSet;
  });
};

const rescheduleAppointment = async (): Promise<void> => {
  if (!selectedAppointment) return;
  
  try {
    // Validation
    if (!rescheduleForm.new_date || !rescheduleForm.new_time || !rescheduleForm.reschedule_reason.trim()) {
      setMessage({ type: 'error', text: 'Please fill in all fields for rescheduling' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return;
    }

    // Check if new date is blocked
    if (isDateBlocked(rescheduleForm.new_date)) {
      setMessage({ type: 'error', text: 'Selected date is not available due to holidays' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return;
    }

    setLoading(true);
    
    // Use the existing status endpoint
    const response = await fetch(`${DOCTOR_API_BASE}/appointments/${selectedAppointment.id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        date: rescheduleForm.new_date,
        time: rescheduleForm.new_time,
        reschedule_reason: rescheduleForm.reschedule_reason,
        status: 'scheduled' // Reset to scheduled after reschedule
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to reschedule appointment');
    }
    
    setMessage({ type: 'success', text: 'Appointment rescheduled successfully!' });
    setShowModal('');
    setRescheduleForm({ new_date: '', new_time: '', reschedule_reason: '' });
    fetchAppointments();
  } catch (error: any) {
    console.error('Error rescheduling appointment:', error);
    setMessage({ type: 'error', text: error.message || 'Failed to reschedule appointment' });
  } finally {
    setLoading(false);
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }
};

const toggleSelectAllPatients = (): void => {
  if (selectedPatients.size === filteredPatients.length) {
    setSelectedPatients(new Set());
  } else {
    setSelectedPatients(new Set(filteredPatients.map((patient: Patient) => patient.id)));
  }
};

const archiveSelectedPatients = async (): Promise<void> => {
  if (selectedPatients.size === 0) return;
  
  try {
    const response = await fetch(`${API_BASE_URL}/doctor/patients/archive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ patient_ids: Array.from(selectedPatients) })
    });
    
    if (!response.ok) throw new Error('Failed to archive patients');
    
    setMessage({ type: 'success', text: `${selectedPatients.size} patients archived successfully` });
    setSelectedPatients(new Set());
    fetchPatients();
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  } catch (error) {
    setMessage({ type: 'error', text: 'Failed to archive patients' });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }
};

  const filterAppointmentsByDate = (date: string): void => {
    if (!date) {
      setFilteredAppointments(appointments);
    } else {
      const filtered = appointments.filter(apt => {
        const appointmentDate = new Date(apt.date).toISOString().split('T')[0];
        return appointmentDate === date;
      });
      setFilteredAppointments(filtered);
    }
  };

  const handleDateChange = (date: string): void => {
    setSelectedDate(date);
    filterAppointmentsByDate(date);
  };

 const fetchPatients = async (): Promise<void> => {
  setLoading(true);
  try {
    const response = await fetch(`${DOCTOR_API_BASE}/patients`, {
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    let patientsArray: Patient[] = [];
    if (Array.isArray(data.patients)) {
      patientsArray = data.patients;
    } else if (data.patients && data.patients.data) {
      patientsArray = data.patients.data;
    }
    
    setPatients(patientsArray || []);
  } catch (error) {
    console.error('Error fetching patients:', error);
    setMessage({ type: 'error', text: 'Failed to load patients' });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }
  setLoading(false);
};

  const fetchPrescriptions = async (): Promise<void> => {
    setLoading(true);
    try {
      console.log('Fetching prescriptions...');
      const response = await fetch(`${DOCTOR_API_BASE}/prescriptions`, {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Prescriptions data:', data); // Add this debug line
      
      setPrescriptions(data.prescriptions || []);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
      setMessage({ type: 'error', text: 'Failed to load prescriptions' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
    setLoading(false);
  };

  const getStatusColor = (status: string): string => {
  const statusColors = {
    active: '#28a745',
    completed: '#6c757d', 
    cancelled: '#dc3545'
  };
  return statusColors[status as keyof typeof statusColors] || '#6c757d';
};

// Fetch medical records for a specific patient
const fetchPatientMedicalRecords = async (patientId: number): Promise<void> => {
  try {
    setLoading(true);
    const response = await fetch(`${DOCTOR_API_BASE}/patients/${patientId}/medical-records`, {
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    setPatientMedicalRecords(data.medical_records || []);
  } catch (error) {
    console.error('Error fetching patient medical records:', error);
    setMessage({ type: 'error', text: 'Failed to load medical records' });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }
  setLoading(false);
};

// Fetch prescriptions for a specific patient
const fetchPatientPrescriptions = async (patientId: number): Promise<void> => {
  try {
    const response = await fetch(`${DOCTOR_API_BASE}/prescriptions?patient_id=${patientId}`, {
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    setPatientPrescriptions(data.prescriptions?.data || []);
  } catch (error) {
    console.error('Error fetching patient prescriptions:', error);
  }
};

  // Fixed prescription medication handler
  const updateMedicationField = (index: number, field: keyof Medication, value: string) => {
    setPrescriptionForm(prev => {
      const newMedications = [...prev.medications];
      newMedications[index] = {
        ...newMedications[index],
        [field]: value
      };
      return {
        ...prev,
        medications: newMedications
      };
    });
  };

  // Updated availability form handler
const updateAvailability = async (): Promise<void> => {
  try {
    // Validation
    if (availabilityForm.available_days.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one available day' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return;
    }

    if (!availabilityForm.working_hours_start || !availabilityForm.working_hours_end) {
      setMessage({ type: 'error', text: 'Please set working hours' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return;
    }

    // Time validation
    const startTime = new Date(`2000-01-01T${availabilityForm.working_hours_start}`);
    const endTime = new Date(`2000-01-01T${availabilityForm.working_hours_end}`);
    
    if (startTime >= endTime) {
      setMessage({ type: 'error', text: 'End time must be after start time' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return;
    }

    setLoading(true);
    const response = await fetch(`${DOCTOR_API_BASE}/availability`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        available_days: availabilityForm.available_days,
        working_hours_start: availabilityForm.working_hours_start,
        working_hours_end: availabilityForm.working_hours_end
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    setMessage({ type: 'success', text: 'Availability updated successfully!' });
    setShowModal('');
  } catch (error: any) {
    console.error('Error updating availability:', error);
    setMessage({ type: 'error', text: error.message || 'Failed to update availability' });
  }
  setLoading(false);
  setTimeout(() => setMessage({ type: '', text: '' }), 5000);
};

const getAvailableTimeSlots = (selectedDate: string): string[] => {
  if (!selectedDate) return timeSlots;
  
  // If date is blocked by holidays, return empty array
  if (isDateBlocked(selectedDate)) {
    return [];
  }
  
  // Filter out booked time slots for the selected date
  const bookedSlots = appointments
    .filter(apt => 
      apt.date === selectedDate && 
      (apt.status === 'scheduled' || apt.status === 'confirmed')
    )
    .map(apt => apt.time);
  
  return timeSlots.filter(slot => !bookedSlots.includes(slot));
};


  const handleAppointmentAction = async (appointment: Appointment, action: string): Promise<void> => {
  try {
    if (action === 'complete') {
      // Show completion report modal instead of directly completing
      setSelectedAppointment(appointment);
      setShowModal('completionReport');
      return;
    }
    
    let updateData: { status?: string } = {};
    let successMessage = '';
    
    switch (action) {
      case 'confirm':
        updateData = { status: 'confirmed' };
        successMessage = 'Appointment confirmed successfully!';
        break;
      case 'cancel':
        updateData = { status: 'cancelled' };
        successMessage = 'Appointment cancelled successfully!';
        break;
      case 'reschedule':
        setSelectedAppointment(appointment);
        setShowModal('reschedule');
        return;
      default:
        throw new Error('Invalid action');
    }
    
    const response = await fetch(`${DOCTOR_API_BASE}/appointments/${appointment.id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to ${action} appointment`);
    }
    
    setMessage({ type: 'success', text: successMessage });
    fetchAppointments();
  } catch (error: any) {
    console.error(`Error ${action}ing appointment:`, error);
    setMessage({ type: 'error', text: error.message || `Failed to ${action} appointment` });
  }
  setTimeout(() => setMessage({ type: '', text: '' }), 5000);
};

const completeAppointmentWithReport = async (): Promise<void> => {
  if (!selectedAppointment) return;
  
  try {
    // Validate required fields
    if (!completionReport.diagnosis.trim() || !completionReport.treatment_provided.trim()) {
      setMessage({ type: 'error', text: 'Diagnosis and treatment provided are required' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return;
    }
    
    setLoading(true);
    
    // Use the existing status update endpoint
    const response = await fetch(`${DOCTOR_API_BASE}/appointments/${selectedAppointment.id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        status: 'completed',
        completion_report: completionReport  // Include the report data
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to complete appointment');
    }
    
    setMessage({ type: 'success', text: 'Appointment completed with report!' });
    setShowModal('');
    
    // Reset the completion report
    setCompletionReport({
      diagnosis: '',
      treatment_provided: '',
      medications_prescribed: '',
      recommendations: '',
      follow_up_required: false,
      follow_up_date: '',
      notes: ''
    });
    
    fetchAppointments();
  } catch (error: any) {
    console.error('Error completing appointment:', error);
    setMessage({ type: 'error', text: error.message || 'Failed to complete appointment' });
  } finally {
    setLoading(false);
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }
};

// Add this function to handle modal cleanup
const closeModal = (): void => {
  setShowModal('');
  setSelectedAppointment(null);
  setSelectedPatient(null);
  // Reset forms
  setAppointmentForm({ patient_id: '', date: '', time: '', reason: '' });
  setMedicalRecordForm({ 
    diagnosis: '', 
    treatment: '', 
    notes: '', 
    visit_date: new Date().toISOString().split('T')[0],
  has_prescription: false,
  medications: [{
    name: '',
    dosage: '',
    instructions: '',
    start_date: '',
    end_date: '',
    frequency: 'daily'
  }]
  });
};

// Enhanced time slot generation based on availability
const generateTimeSlots = (): string[] => {
  const slots: string[] = [];
  const start = availabilityForm.working_hours_start || '09:00';
  const end = availabilityForm.working_hours_end || '17:00';
  const breakStart = availabilityForm.break_start;
  const breakEnd = availabilityForm.break_end;
  
  // Convert time strings to minutes for easier calculation
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };
  
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  const breakStartMinutes = breakStart ? timeToMinutes(breakStart) : null;
  const breakEndMinutes = breakEnd ? timeToMinutes(breakEnd) : null;
  
  // Generate 30-minute slots
  for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
    // Skip break time
    if (breakStartMinutes && breakEndMinutes && 
        minutes >= breakStartMinutes && minutes < breakEndMinutes) {
      continue;
    }
    slots.push(minutesToTime(minutes));
  }
  
  return slots;
};

// Replace the static timeSlots array with:
const timeSlots = generateTimeSlots();

// Function to validate appointment conflicts
const validateAppointmentTime = (date: string, time: string, patientId: string): string | null => {
  // Check if the date is in the past
  const appointmentDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (appointmentDate < today) {
    return 'Cannot schedule appointments in the past';
  }
  
  // Check if it's a weekend (assuming Monday-Friday working days)
  const dayOfWeek = appointmentDate.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday = 0, Saturday = 6
    const dayName = dayOfWeek === 0 ? 'Sunday' : 'Saturday';
    if (!availabilityForm.available_days.includes(dayName)) {
      return `Doctor is not available on ${dayName}`;
    }
  }
  
  // Check for existing appointments at the same time
  const conflictingAppointment = appointments.find(apt => 
    apt.date === date &&
    apt.time === time &&
    apt.status !== 'cancelled'
  );
  
  if (conflictingAppointment) {
    return 'This time slot is already booked';
  }
  
  // Check if patient already has an appointment on the same day
  const patientAppointmentSameDay = appointments.find(apt => 
    apt.patient_id.toString() === patientId &&
    apt.date === date &&
    apt.status !== 'cancelled'
  );
  
  if (patientAppointmentSameDay) {
    return 'Patient already has an appointment on this date';
  }
  
  return null; // No conflicts
};

  const viewAppointmentDetails = (appointment: Appointment): void => {
    setSelectedAppointment(appointment);
    setShowModal('viewAppointment');
  };

  // Add this function with your other functions like viewAppointmentDetails
const viewPrescriptionDetails = (prescription: Prescription): void => {
  setSelectedPrescription(prescription);
  setShowModal('viewPrescription');
};

  // Enhanced createAppointment function (replace your existing one)
const createAppointment = async (): Promise<void> => {
  try {
    // Validation
    if (!appointmentForm.patient_id || !appointmentForm.date || 
        !appointmentForm.time || !appointmentForm.reason.trim()) {
      setMessage({ type: 'error', text: t('appointments.required_fields') });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return;
    }

    // Check if appointment date is in the past
    const appointmentDate = new Date(appointmentForm.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (appointmentDate < today) {
      setMessage({ type: 'error', text: 'Cannot schedule appointments in the past' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return;
    }

    // NEW: Check if date is blocked by holidays
    if (isDateBlocked(appointmentForm.date)) {
      const blockingHoliday = holidays.find(h => 
        h.blocks_appointments && 
        appointmentForm.date >= h.start_date && 
        appointmentForm.date <= h.end_date
      );
      
      setMessage({
        type: 'error',
        text: `Selected date is not available. ${blockingHoliday ? `Reason: ${blockingHoliday.name}` : 'University holiday period'}`
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return;
    }

    // Double-check with server
    const isAvailable = await checkDateAvailability(appointmentForm.date);
    if (!isAvailable) {
      return; // Stop if date is blocked
    }

    // Check for duplicate appointments (keep your existing logic)
    const duplicateAppointment = appointments.find(apt => 
      apt.patient_id.toString() === appointmentForm.patient_id &&
      apt.date === appointmentForm.date &&
      apt.time === appointmentForm.time &&
      apt.status !== 'cancelled'
    );

    if (duplicateAppointment) {
      setMessage({ type: 'error', text: 'This time slot is already booked' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return;
    }

    const response = await fetch(`${API_BASE_URL}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        patient_id: appointmentForm.patient_id,
        date: appointmentForm.date,
        time: appointmentForm.time,
        reason: appointmentForm.reason.trim()
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    setMessage({ type: 'success', text: 'Appointment created successfully!' });
    setShowModal('');
    setAppointmentForm({ patient_id: '', date: '', time: '', reason: '' });
    fetchAppointments();
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  } catch (error: any) {
    console.error('Error creating appointment:', error);
    setMessage({ type: 'error', text: error.message || 'Failed to create appointment' });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }
};

  const createMedicalRecord = async (): Promise<void> => {
  if (!selectedPatient) return;
  
  try {
    // Validation
    if (!medicalRecordForm.diagnosis.trim() || !medicalRecordForm.treatment.trim()) {
      setMessage({ type: 'error', text: 'Diagnosis and treatment are required' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return;
    }

    // If medications are prescribed, validate them
    if (medicalRecordForm.has_prescription) {
      const invalidMeds = medicalRecordForm.medications.filter(med => 
        !med.name || !med.dosage || !med.instructions || !med.start_date || !med.end_date
      );
      
      if (invalidMeds.length > 0) {
        setMessage({ type: 'error', text: 'Please fill all medication fields' });
        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
        return;
      }
    }

    const response = await fetch(`${DOCTOR_API_BASE}/patients/${selectedPatient.id}/medical-records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        diagnosis: medicalRecordForm.diagnosis,
        treatment: medicalRecordForm.treatment,
        notes: medicalRecordForm.notes,
        visit_date: medicalRecordForm.visit_date,
        // Include prescription data if medications are prescribed
        has_prescription: medicalRecordForm.has_prescription,
        medications: medicalRecordForm.has_prescription ? medicalRecordForm.medications : []
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    setMessage({ 
      type: 'success', 
      text: medicalRecordForm.has_prescription 
        ? 'Medical record and prescription created successfully!' 
        : 'Medical record created successfully!' 
    });
    
    setShowModal('viewPatient');
    
    // Reset form
    setMedicalRecordForm({ 
      diagnosis: '', 
      treatment: '', 
      notes: '', 
      visit_date: new Date().toISOString().split('T')[0],
      has_prescription: false,
      medications: [{
        name: '',
        dosage: '',
        instructions: '',
        start_date: '',
        end_date: '',
        frequency: 'daily'
      }]
    });
    
    // Refresh data
    if (showPatientHistory) {
      fetchPatientMedicalRecords(selectedPatient.id);
      fetchPatientPrescriptions(selectedPatient.id);
    }
    
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  } catch (error) {
    console.error('Error creating medical record:', error);
    setMessage({ type: 'error', text: getErrorMessage(error) || 'Failed to create medical record' });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }
};

  const createPrescription = async (): Promise<void> => {
    try {
      if (!prescriptionForm.patient_id) {
        setMessage({ type: 'error', text: 'Please select a patient' });
        return;
      }

      const invalidMedications = prescriptionForm.medications.filter(med => 
        !med.name || !med.dosage || !med.instructions || !med.start_date || !med.end_date
      );
      
      if (invalidMedications.length > 0) {
        setMessage({ type: 'error', text: 'Please fill all fields for each medication' });
        return;
      }

      const formattedPrescription = {
        patient_id: prescriptionForm.patient_id,
        notes: prescriptionForm.notes,
        medications: prescriptionForm.medications.map(med => ({
          name: med.name,
          dosage: med.dosage,
          instructions: med.instructions,
          start_date: formatDateForAPI(med.start_date),
          end_date: formatDateForAPI(med.end_date),
          frequency: med.frequency || 'daily'
        }))
      };

      console.log('Sending prescription data:', formattedPrescription);

      // FIX: Use DOCTOR_API_BASE instead of API_BASE_URL
      const response = await fetch(`${DOCTOR_API_BASE}/prescriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formattedPrescription)
      });
      
      const responseText = await response.text();
      let responseData: any;
      
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        console.error('Failed to parse response as JSON:', responseText);
        responseData = { message: responseText };
      }
      
      if (!response.ok) {
        if (response.status === 500) {
          console.error('Server error details:', responseData);
          throw new Error(`Server error: ${responseData.message || 'Internal server error'}`);
        }
        
        if (response.status === 422 && responseData.errors) {
          const errorMessages = Object.values(responseData.errors).flat().join(', ');
          throw new Error(`Validation error: ${errorMessages}`);
        }
        
        throw new Error(`HTTP error! status: ${response.status}, message: ${responseData.message || 'Unknown error'}`);
      }
      
      setMessage({ type: 'success', text: 'Prescription created successfully!' });
      setShowModal('');
      setPrescriptionForm({
        patient_id: '',
        medications: [{ name: '', dosage: '', instructions: '', start_date: '', end_date: '', frequency: 'daily' }],
        notes: ''
      });

      fetchPrescriptions();

      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } catch (error: any) {
      console.error('Error creating prescription:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to create prescription. Please check console for details.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  const formatDateForAPI = (dateString: string): string => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateString);
      return dateString;
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };

  const addMedication = (): void => {
    setPrescriptionForm(prev => ({
      ...prev,
      medications: [...prev.medications, { name: '', dosage: '', instructions: '', start_date: '', end_date: '', frequency: 'daily' }]
    }));
  };

  const removeMedication = (index: number): void => {
    setPrescriptionForm(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }));
  };

  const formatTime = (timeString: string | undefined): string => {
  if (!timeString) return '';
  
  try {
    // Handle "10:00:00" or "10:00" format
    const timeParts = timeString.split(':');
    let hours = parseInt(timeParts[0]);
    const minutes = timeParts[1];
    
    // Convert to 12-hour format with AM/PM
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; // Convert 0 to 12 for midnight
    
    return `${hours}:${minutes} ${period}`;
  } catch (error) {
    console.error('Error formatting time:', error);
    return timeString;
  }
};

// Format date nicely
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '';
  
  try {
    // Handle "2025-10-07" format
    const datePart = dateString.split('T')[0];
    const date = new Date(datePart + 'T00:00:00');
    
    // Format as "Oct 7, 2025" or use toLocaleDateString for user's locale
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

const formatDateTime = (dateString: string): { date: string; time: string } => {
  return {
    date: formatDate(dateString),
    time: formatTime(dateString)
  };
};

  

  useEffect(() => {
    if (activeTab === 'appointments') fetchAppointments();
    if (activeTab === 'patients') fetchPatients();
    if (activeTab === 'prescriptions') fetchPrescriptions();
    // Load data based on active tab
  if (activeTab === 'dashboard') {
    fetchKPIData();
    fetchHolidays();
  }
  if (activeTab === 'profile') {
    fetchDoctorProfile();
  }
  }, [activeTab]);

  useEffect(() => {
  console.log('=== APPOINTMENTS STATE CHANGED ===');
  console.log('Appointments loaded:', appointments.length);
  console.log('Sample appointments:', appointments.slice(0, 3));
  console.log('Stats being calculated...');
  
  if (appointments.length > 0) {
    const stats = getDashboardStats();
    console.log('Calculated stats:', stats);
  }
}, [appointments]);

  useEffect(() => {
    if (appointments.length > 0) {
      if (selectedDate) {
        filterAppointmentsByDate(selectedDate);
      } else {
        setFilteredAppointments(appointments);
      }
    } else {
      setFilteredAppointments([]);
    }
  }, [appointments, selectedDate]);

  useEffect(() => {
  // Fetch patients on component mount for appointment/prescription modals
  fetchPatients();
}, []);

useEffect(() => {
  // Clear any previous API data flags
  localStorage.removeItem('hasApiWeeklyStats');
  
  // Fetch initial data when component mounts
  fetchKPIData();
  fetchHolidays();
  
  // Set up interval to refresh data every 5 minutes
  const interval = setInterval(() => {
    localStorage.removeItem('hasApiWeeklyStats');
    fetchKPIData(); // Only call this - it handles weekly stats
  }, 5 * 60 * 1000);
  
  return () => clearInterval(interval);
}, []);

useEffect(() => {
  const connectWebSocket = () => {
    try {
      websocketService.tryConnect();
      
      // Listen for patient walk-in alerts
      websocketService.onPatientWalkedIn((alert) => {
        console.log('Patient walked in alert received:', alert);
        
        // Add to alerts array
        setWalkInAlerts(prev => [...prev, { ...alert, id: Date.now() }]);
        
        // Refresh appointments list
        fetchAppointments();
        
        // Show browser notification if permitted
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Patient Walked In!', {
            body: `${alert.patient.name} is ready for consultation`,
            icon: '/logo6.png',
            tag: 'walk-in-' + alert.appointment_id
          });
        }
      });

      // Join doctor's personal channel
      websocketService.joinChannel(`doctor.${user.id}`);

      return () => {
        websocketService.off('patient.walked.in');
        websocketService.leaveChannel(`doctor.${user.id}`);
      };
    } catch (error) {
      console.warn('WebSocket connection failed:', error);
    }
  };

  const cleanup = connectWebSocket();
  return () => {
    if (cleanup) cleanup();
  };
}, [user.id]);

// Request browser notification permission on mount
useEffect(() => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}, []);



  const filteredPatients = (Array.isArray(patients) ? patients : (patients as any).data || []).filter((patient: Patient) => 
    patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.student_id?.includes(searchTerm)
  );

  const getStatusBadge = (status: string): string => {
    return getStatusBadgeClass(status);
  };

  const getMinDate = (): string => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const ChartCard = ({ title, data, color, type = 'line' }: { 
  title: string; 
  data: number[]; 
  color: string;
  type?: 'line' | 'bar';
}) => {
  const max = Math.max(...data);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  return (
    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1rem' }}>
      <div className="card-body p-4">
        <h6 className="fw-bold mb-3">{title}</h6>
        <div className="d-flex align-items-end justify-content-between" style={{ height: '120px' }}>
          {data.map((value, index) => (
            <div key={index} className="d-flex flex-column align-items-center flex-grow-1">
              <div 
                className="mb-2 rounded-top" 
                style={{
                  height: `${(value / max) * 80}px`,
                  width: '20px',
                  backgroundColor: color,
                  minHeight: '5px'
                }}
              />
              <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                {days[index]}
              </small>
            </div>
          ))}
        </div>
        <div className="mt-2 text-center">
          <h4 className="mb-0" style={{ color }}>{data.reduce((a, b) => a + b, 0)}</h4>
          <small className="text-muted">This Week</small>
        </div>
      </div>
    </div>
  );
};
  
// Add these components inside the EnhancedDoctorDashboard component
const EnhancedDateInput = ({ value, onChange, disabled = false, required = false }: { 
  value: string; 
  onChange: (date: string) => void; 
  disabled?: boolean; 
  required?: boolean; 
}) => (
  <div>
    <input
      type="date"
      className="form-control"
      value={value}
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
            text: `Selected date is not available. ${
              blockingHoliday ? `Reason: ${blockingHoliday.name}` : 'University holiday period'
            }`
          });
          setTimeout(() => setMessage({ type: '', text: '' }), 3000);
          return;
        }
        
        onChange(selectedDate);
      }}
      min={getMinDate()}
      disabled={disabled}
      required={required}
      style={{
        backgroundColor: value && isDateBlocked(value) ? '#ffe6e6' : undefined
      }}
    />
    {value && isDateBlocked(value) && (
      <small className="text-danger">
        This date is not available due to university holidays
      </small>
    )}
  </div>
);

const HolidayWarning = ({ selectedDate }: { selectedDate: string }) => {
  if (!selectedDate || !isDateBlocked(selectedDate)) return null;
  
  const blockingHoliday = holidays.find(h => 
    h.blocks_appointments && 
    selectedDate >= h.start_date && 
    selectedDate <= h.end_date
  );
  
  return (
    <div className="alert alert-warning mt-2" role="alert">
      <div className="d-flex align-items-center">
        <AlertTriangle size={20} className="me-2" />
        <div>
          <strong>Date Not Available:</strong> {blockingHoliday ? ` ${blockingHoliday.name}` : ' University holiday period'}
          <br />
          <small>
            Holiday period: {blockingHoliday?.start_date} to {blockingHoliday?.end_date}
          </small>
        </div>
      </div>
    </div>
  );
};

  const DashboardOverview = () => (
  <div className="row g-3 g-md-4">
    {/* Welcome Card - Mobile responsive */}
    <div className="col-12">
      <div className="card shadow-sm border-0" style={{ borderRadius: '1rem', background: universityTheme.gradient }}>
        <div className="card-body p-3 p-md-4 text-white">
          <div className="row align-items-center">
            <div className="col-12 col-md-8 text-center text-md-start">
              <h3 className="mb-2" style={{ fontSize: 'clamp(1.2rem, 4vw, 1.5rem)' }}>
                {t('dashboard.welcome_doctor', { name: user.name })}
              </h3>
              <p className="mb-1 opacity-90 small">{user.email}</p>
              <p className="mb-0 opacity-75 small">{t('dashboard.specialization')}: {user.specialization}</p>
            </div>
            <div className="col-12 col-md-4 text-center text-md-end mt-3 mt-md-0">
              {doctorProfile.avatar_url ? (
                <img 
                  src={doctorProfile.avatar_url}
                  alt="Profile" 
                  style={{
                    width: 'clamp(60px, 15vw, 80px)', // Responsive avatar size
                    height: 'clamp(60px, 15vw, 80px)',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid rgba(255,255,255,0.3)'
                  }}
                />
              ) : (
                <User size={60} className="opacity-75" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Statistics Cards - Better mobile layout */}
    {[
      { icon: Calendar, color: universityTheme.primary, value: stats.total, label: t('dashboard.total_appointments'), extra: `Today: ${stats.today}` },
      { icon: Users, color: universityTheme.secondary, value: stats.patients, label: t('dashboard.total_patients') },
      { icon: Pill, color: '#ffc107', value: stats.prescriptions, label: t('dashboard.prescriptions') },
      { icon: CheckCircle, color: universityTheme.accent, value: stats.completed, label: t('dashboard.completed') }
    ].map((stat, index) => (
      <div key={index} className="col-6 col-lg-3">
        <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1rem' }}>
          <div className="card-body p-3 p-md-4 text-center">
            <div className="d-inline-flex align-items-center justify-content-center mb-3" 
                style={{ 
                  width: 'clamp(50px, 12vw, 60px)', 
                  height: 'clamp(50px, 12vw, 60px)',  
                  borderRadius: '50%' 
                }}>
              <stat.icon size={24} style={{ color: stat.color }} />
            </div>
            <h4 className="fw-bold mb-1" style={{ 
              color: stat.color,
              fontSize: 'clamp(1.2rem, 5vw, 1.5rem)'
            }}>
              {loading ? '...' : stat.value}
            </h4>
            <p className="text-muted mb-0 small">{stat.label}</p>
            {stat.extra && <small className="text-muted d-block">{stat.extra}</small>}
          </div>
        </div>
      </div>
    ))}

      {/* Charts - Mobile responsive stacking */}
    <div className="col-12">
      <div className="row g-3 g-md-4">
        {[
          { title: "Weekly Appointments", data: weeklyStats.appointments, color: universityTheme.primary },
          { title: "Patients Seen", data: weeklyStats.patients, color: universityTheme.secondary },
          { title: "Completed Sessions", data: weeklyStats.completed, color: universityTheme.accent }
        ].map((chart, index) => (
          <div key={index} className="col-12 col-md-6 col-lg-4">
            <ChartCard 
              title={chart.title} 
              data={chart.data}
              color={chart.color}
            />
          </div>
        ))}
      </div>
    </div>

      {/* Quick Actions with translations */}
      <div className="col-12">
  <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
    <div className="card-header bg-white border-0 pb-0">
      <h5 className="fw-bold mb-0">{t('dashboard.quick_actions')}</h5>
    </div>
    <div className="card-body p-4">
      <div className="row g-3">
        <div className="col-md-4">
          <button 
            className="btn btn-primary w-100 py-3 border-0" 
            style={{ borderRadius: '0.75rem', background: universityTheme.gradient }}
            onClick={() => setShowModal('appointment')}
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
            <Plus size={24} className="mb-2" />
            <div className="fw-semibold">{t('dashboard.new_appointment')}</div>
            <small className="opacity-75">{t('dashboard.schedule_new_appointment')}</small>
          </button>
        </div>
        
        <div className="col-md-4">
          <button 
            className="btn btn-outline-primary w-100 py-3" 
            style={{ 
              borderRadius: '0.75rem',
              borderColor: universityTheme.accent,
              color: universityTheme.accent,
              transition: 'all 0.3s ease'
            }}
            onClick={() => setActiveTab('patients')}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#c52e3dff';
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.borderColor = '#c52e3dff';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = universityTheme.accent;
              e.currentTarget.style.borderColor = universityTheme.accent;
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Users size={24} className="mb-2" />
            <div className="fw-semibold">{t('dashboard.manage_patients')}</div>
            <small className="text-muted">{t('dashboard.view_manage_patient_records')}</small>
          </button>
        </div>
        
        <div className="col-md-4">
          <button 
            className="btn btn-outline-success w-100 py-3" 
            style={{ 
              borderRadius: '0.75rem',
              borderColor: universityTheme.accent,
              color: universityTheme.accent,
              transition: 'all 0.3s ease'
            }}
            onClick={() => {
              if (patients.length === 0) {
                fetchPatients();
              }
              setShowModal('prescription');
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#c92c3cff';
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.borderColor = '#c52e3dff';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = universityTheme.accent;
              e.currentTarget.style.borderColor = universityTheme.accent;
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Pill size={24} className="mb-2" />
            <div className="fw-semibold">{t('dashboard.create_prescription')}</div>
            <small className="text-muted">{t('dashboard.issue_new_medication')}</small>
          </button>
        </div>
      </div>
    </div>
  </div>
</div>

      {/* Recent Appointments with translations */}
      {appointments.length > 0 && (
        <div className="col-12">
          <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
            <div className="card-header bg-white border-0 pb-0">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="fw-bold mb-0">{t('dashboard.todays_appointments')}</h5>
                <button 
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => {
                    setActiveTab('appointments');
                    setSelectedDate('');
                    setFilteredAppointments(appointments);
                  }}
                  style={{ borderRadius: '0.5rem' }}
                >
                  {t('dashboard.view_all')}
                </button>
              </div>
            </div>
            <div className="card-body p-4">
              {appointments.slice(0, 3).map((appointment) => (
                <div key={appointment.id} className="d-flex align-items-center p-3 bg-light rounded-3 mb-3">
                  <div 
                    className="rounded-circle me-3 d-flex align-items-center justify-content-center"
                    style={{
                      width: '48px',
                      height: '48px',
                      backgroundColor: universityTheme.primary + '20',
                      color: universityTheme.primary
                    }}
                  >
                    <User size={24} />
                  </div>
                  <div className="flex-grow-1">
                    <h6 className="mb-1 fw-semibold">{appointment.patient?.name}</h6>
                    <div className="d-flex align-items-center flex-wrap gap-3">
                      <div className="d-flex align-items-center">
                        <Calendar size={14} className="me-1 text-primary" />
                        <small className="text-muted">{formatDate(appointment.date)}</small>
                      </div>
                      <div className="d-flex align-items-center">
                        <Clock size={14} className="me-1 text-success" />
                        <small className="fw-semibold text-success">{formatTime(appointment.time)}</small>
                      </div>
                    </div>
                    <small className="text-muted">{appointment.reason}</small>
                  </div>
                  <span className={`${getStatusBadge(appointment.status)} small`}>
                    {t(`status.${appointment.status}`)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );


const AppointmentsTab = () => (
  <div className="card shadow-sm">
    {/* Card Header */}
    <div className="card-header" style={{ background: universityTheme.gradient }}>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
        {/* Left: Title */}
        <h3 className="card-title text-white mb-0 d-flex align-items-center">
          <Calendar size={24} className="me-2" />
          {t('nav.appointments')} ({filteredAppointments.length})
        </h3>

        {/* Right: Controls */}
        <div className="d-flex align-items-center flex-wrap gap-2">
          <button
            onClick={() => {
              setSelectedDate('');
              setFilteredAppointments(appointments);
            }}
            className="btn btn-sm btn-light"
          >
            {t('appointments.all_appointments')}
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="form-control form-control-sm"
            style={{
              width: '150px',
              height: '32px',
              padding: '4px 6px',
              fontSize: '0.85rem'
            }}
          />

          <button
            onClick={() => setShowModal('availability')}
            className="btn btn-warning btn-sm"
          >
            <Settings size={16} className="me-1 d-none d-sm-inline" />
            {t('appointments.set_availability')}
          </button>

          <button
            onClick={() => setShowModal('appointment')}
            className="btn btn-light btn-sm"
          >
            <Plus size={16} className="me-1" />
            {t('appointments.new_appointment')}
          </button>
        </div>
      </div>
    </div>

    {/* Card Body */}
    <div className="card-body p-2 p-md-4">
      {/* Filters */}
      <div className="d-flex flex-wrap gap-1 mb-3">
        {[
          { value: 'all', label: 'All', count: appointments.length },
          { value: 'scheduled', label: 'Scheduled', count: appointments.filter(a => a.status === 'scheduled').length },
          { value: 'confirmed', label: 'Confirmed', count: appointments.filter(a => a.status === 'confirmed').length },
          { value: 'completed', label: 'Completed', count: appointments.filter(a => a.status === 'completed').length }
        ].map(filter => (
          <button
            key={filter.value}
            className={`btn ${appointmentFilter === filter.value ? 'btn-primary' : 'btn-outline-primary'} btn-sm flex-fill flex-sm-grow-0`}
            onClick={() => {
              setAppointmentFilter(filter.value);
              if (filter.value === 'all') {
                setFilteredAppointments(appointments);
              } else {
                setFilteredAppointments(appointments.filter(apt => apt.status === filter.value));
              }
            }}
            style={{ fontSize: '0.75rem' }}
          >
            {filter.label} ({filter.count})
          </button>
        ))}
      </div>

      {/* Mobile card layout */}
      <div className="d-block d-lg-none">
        {filteredAppointments.map(appointment => (
          <div key={appointment.id} className="card mb-2 border">
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div className="flex-grow-1">
                  <h6 className="mb-1 fw-semibold">{appointment.patient?.name}</h6>
                  <small className="text-muted">{appointment.patient?.student_id}</small>
                </div>
                <span className={`${getStatusBadgeClass(appointment.status)} small`}>
                  {t(`status.${appointment.status}`)}
                </span>
              </div>
              
              <div className="mb-2">
                <div className="d-flex align-items-center mb-1">
                  <Calendar size={14} className="me-2 text-primary" />
                  <span className="fw-semibold text-primary">{formatDate(appointment.date)}</span>
                </div>
                <div className="d-flex align-items-center mb-1">
                  <Clock size={14} className="me-2 text-success" />
                  <span className="fw-semibold text-success">{formatTime(appointment.time)}</span>
                </div>
                <small className="text-muted d-block mt-2">{appointment.reason}</small>
              </div>
              
              <div className="d-flex gap-1 flex-wrap">
                <button 
                  className="btn btn-sm btn-outline-primary flex-fill" 
                  onClick={() => viewAppointmentDetails(appointment)}
                >
                  <Eye size={14} className="me-1" />
                  View
                </button>
                {appointment.status === 'scheduled' && (
                  <button 
                    className="btn btn-sm btn-outline-success flex-fill" 
                    onClick={() => handleAppointmentAction(appointment, 'confirm')}
                  >
                    <Check size={14} className="me-1" />
                    Confirm
                  </button>
                )}
                {appointment.status === 'confirmed' && (
                  <button 
                    className="btn btn-sm btn-outline-info flex-fill" 
                    onClick={() => handleAppointmentAction(appointment, 'complete')}
                  >
                    <CheckCircle size={14} className="me-1" />
                    Complete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

       {/* Desktop table layout */}
      <div className="d-none d-lg-block">
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th style={{ width: '25%' }}>{t('common.patient')}</th>
                <th style={{ width: '15%' }}>Date</th>
                <th style={{ width: '12%' }}>Time</th>
                <th style={{ width: '25%' }}>{t('appointments.reason')}</th>
                <th style={{ width: '13%' }}>{t('common.status')}</th>
                <th style={{ width: '10%' }} className="text-center">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.map(appointment => (
                <tr key={appointment.id}>
                  <td>
                    <div className="d-flex align-items-center">
                      <div 
                        className="rounded-circle me-3 d-flex align-items-center justify-content-center"
                        style={{
                          width: '40px',
                          height: '40px',
                          backgroundColor: universityTheme.primary + '20',
                          color: universityTheme.primary
                        }}
                      >
                        <User size={20} />
                      </div>
                      <div>
                        <div className="fw-semibold">{appointment.patient?.name}</div>
                        <small className="text-muted">{appointment.patient?.student_id}</small>
                      </div>
                    </div>
                  </td>
                  
                  <td>
                    <div className="d-flex align-items-center">
                      <Calendar size={16} className="me-2 text-primary" />
                      <div>
                        <div className="fw-semibold">{formatDate(appointment.date)}</div>
                        <small className="text-muted">{formatDate(appointment.date)}</small>
                      </div>
                    </div>
                  </td>
                  
                  <td>
                    <div className="d-flex align-items-center">
                      <Clock size={16} className="me-2 text-success" />
                      <span className="fw-semibold badge bg-success-subtle text-success px-3 py-2">
                        {formatTime(appointment.time)}
                      </span>
                    </div>
                  </td>
                  
                  <td>
                    <div className="text-truncate" style={{ maxWidth: '200px' }} title={appointment.reason}>
                      {appointment.reason}
                    </div>
                  </td>
                  
                  <td>
                    <span className={`${getStatusBadgeClass(appointment.status)}`}>
                      {t(`status.${appointment.status}`)}
                    </span>
                  </td>
                  
                  <td>
                    <div className="d-flex gap-1 justify-content-center">
                      <button 
                        className="btn btn-sm btn-outline-primary" 
                        onClick={() => viewAppointmentDetails(appointment)}
                        title={t('common.view_details')}
                      >
                        <Eye size={16} />
                      </button>
                      {appointment.status === 'scheduled' && (
                        <button 
                          className="btn btn-sm btn-outline-success" 
                          onClick={() => handleAppointmentAction(appointment, 'confirm')}
                          title={t('appointments.confirm')}
                        >
                          <Check size={16} />
                        </button>
                      )}
                      {appointment.status === 'confirmed' && (
                        <button 
                          className="btn btn-sm btn-outline-info" 
                          onClick={() => handleAppointmentAction(appointment, 'complete')}
                          title={t('appointments.mark_complete')}
                        >
                          <CheckCircle size={16} />
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
    </div>
  </div>
);




  const PatientsTab = () => (
  <div className="card shadow-sm">
    <div className="card-header" style={{ background: universityTheme.gradient }}>
      <div className="d-flex justify-content-between align-items-center">
        <h3 className="card-title text-white mb-0 d-flex align-items-center">
          <Users size={24} className="me-2" />
          Patients ({filteredPatients.length} total, {selectedPatients.size} selected)
        </h3>
        <div className="d-flex gap-2 align-items-center">
          {selectedPatients.size > 0 && (
            <button
              onClick={archiveSelectedPatients}
              className="btn btn-warning btn-sm"
            >
              <Archive size={16} className="me-1" />
              Archive ({selectedPatients.size})
            </button>
          )}
          <div className="input-group" style={{ maxWidth: '280px' }}>
            <span className="input-group-text bg-white border-end-0">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control form-control-sm border-start-0"
            />
          </div>
        </div>
      </div>
    </div>
    
    <div className="card-body p-0">
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">Loading patients...</p>
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="text-center py-5">
          <Users size={48} className="text-muted mb-3" />
          <p className="text-muted">
            {searchTerm ? `No patients found matching "${searchTerm}"` : 'No patients found'}
          </p>
        </div>
      ) : (
        <>
          {/* Table Header with select all */}
          <div className="p-3 bg-light border-bottom">
            <div className="form-check d-flex align-items-center">
              <input
                className="form-check-input me-2"
                type="checkbox"
                checked={selectedPatients.size === filteredPatients.length && filteredPatients.length > 0}
                onChange={toggleSelectAllPatients}
              />
              <label className="form-check-label fw-semibold">
                Select All ({filteredPatients.length} patients)
              </label>
            </div>
          </div>

          {/* Patients Table */}
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: "50px" }} className="border-0">
                    <span className="visually-hidden">Select</span>
                  </th>
                  <th className="border-0 fw-semibold">Patient</th>
                  <th className="border-0 fw-semibold">ID</th>
                  <th className="border-0 fw-semibold">Contact</th>
                  <th className="border-0 fw-semibold">Department</th>
                  <th className="border-0 fw-semibold">Role</th>
                  <th className="border-0 fw-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((patient: Patient) => (
                  <tr 
                    key={patient.id} 
                    className={`${selectedPatients.has(patient.id) ? 'table-primary' : ''}`}
                    style={{ 
                      backgroundColor: selectedPatients.has(patient.id) ? 'rgba(13, 110, 253, 0.1)' : 'transparent',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <td className="align-middle">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={selectedPatients.has(patient.id)}
                          onChange={() => togglePatientSelection(patient.id)}
                        />
                      </div>
                    </td>
                    
                    <td className="align-middle">
                      <div className="d-flex align-items-center">
                        <div 
                          className="rounded-circle me-3 d-flex align-items-center justify-content-center"
                          style={{
                            width: '40px',
                            height: '40px',
                            backgroundColor: universityTheme.primary + '20',
                            color: universityTheme.primary
                          }}
                        >
                          <User size={20} />
                        </div>
                        <div>
                          <div className="fw-semibold text-dark">{patient.name}</div>
                          <small className="text-muted">Patient #{patient.id}</small>
                        </div>
                      </div>
                    </td>
                    
                    <td className="align-middle">
                      <span className="badge bg-light text-dark border">
                        {patient.student_id || patient.staff_id || 'N/A'}
                      </span>
                    </td>
                    
                    <td className="align-middle">
                      <div>
                        <div className="fw-medium">{patient.email}</div>
                        <small className="text-muted">Email</small>
                      </div>
                    </td>
                    
                    <td className="align-middle">
                      <span className="text-dark">{patient.department}</span>
                    </td>
                    
                    <td className="align-middle">
                      <span 
                        className="badge"
                        style={{
                          backgroundColor: patient.role === 'student' ? '#e3f2fd' : '#f3e5f5',
                          color: patient.role === 'student' ? '#1976d2' : '#7b1fa2'
                        }}
                      >
                        {patient.role}
                      </span>
                    </td>
                    
                    <td className="align-middle text-center">
                      <div className="btn-group" role="group">
                        <button 
                          onClick={() => {setSelectedPatient(patient); setShowModal('viewPatient');}}
                          className="btn btn-sm btn-outline-primary"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => {setSelectedPatient(patient); setShowModal('medicalRecord');}}
                          className="btn btn-sm btn-outline-success"
                          title="Add Medical Record"
                        >
                          <FileText size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer with pagination info */}
          <div className="p-3 bg-light border-top">
            <div className="d-flex justify-content-between align-items-center">
              <small className="text-muted">
                Showing {filteredPatients.length} of {patients.length} patients
                {searchTerm && ` (filtered by "${searchTerm}")`}
              </small>
              {selectedPatients.size > 0 && (
                <small className="text-primary fw-semibold">
                  {selectedPatients.size} patient{selectedPatients.size !== 1 ? 's' : ''} selected
                </small>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  </div>
);

  const PrescriptionsTab = () => (
  <div className="card shadow-sm">
    <div className="card-header" style={{ background: universityTheme.gradient }}>
      <div className="d-flex justify-content-between align-items-center">
        <h3 className="card-title text-white mb-0 d-flex align-items-center">
          <Pill size={24} className="me-2" />
          Prescriptions ({prescriptions.length})
        </h3>
        <button
          onClick={() => setShowModal('prescription')}
          className="btn btn-light btn-sm"
          style={{ borderRadius: '0.5rem' }}
        >
          <Plus size={16} className="me-1" />
          New Prescription
        </button>
      </div>
    </div>
    
    <div className="card-body p-4">
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">Loading prescriptions...</p>
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="text-center py-5">
          <Pill size={48} className="text-muted mb-3" />
          <p className="text-muted">No prescriptions found</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Date</th>
                <th>Medications</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.map(prescription => (
                <tr key={prescription.id}>
                  <td>
                    <div className="d-flex align-items-center">
                      <div className="me-2">
                        <User size={20} className="text-primary" />
                      </div>
                      <div>
                        <div className="fw-semibold">{prescription.patient?.name}</div>
                        <small className="text-muted">{prescription.patient?.student_id}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>
                      <div>{new Date(prescription.created_at).toLocaleDateString()}</div>
                      <small className="text-muted">{new Date(prescription.created_at).toLocaleTimeString()}</small>
                    </div>
                  </td>
                  <td>
                    <div>
                      <div className="fw-semibold">{prescription.medications?.length || 0} medications</div>
                      {prescription.medications?.slice(0, 2).map((med, index) => (
                        <div key={index} className="small text-muted">
                          {med.name} - {med.dosage}
                        </div>
                      ))}
                      {(prescription.medications?.length || 0) > 2 && (
                        <small className="text-muted">
                          +{(prescription.medications?.length || 0) - 2} more
                        </small>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={getStatusBadge(prescription.status)}>
                      {prescription.status.charAt(0).toUpperCase() + prescription.status.slice(1)}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn btn-sm btn-outline-primary" 
                      onClick={() => viewPrescriptionDetails(prescription)}
                      title="View Details"
                    >
                      <Eye size={16} />
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
);

  const ProfileTab = () => (
    <div className="card shadow-sm">
      <div className="card-header" style={{ background: universityTheme.gradient }}>
        <h3 className="card-title text-white mb-0 d-flex align-items-center">
          <Settings size={24} className="me-2" />
          Doctor Profile
        </h3>
      </div>
      <div className="card-body p-4">
        <div className="row g-4">
          {/* Profile Image */}
<div className="col-12 text-center">
  <div className="position-relative d-inline-block">
    {doctorProfile.avatar_url ? (
      <img 
        src={doctorProfile.avatar_url}
        alt="Profile" 
        className="rounded-circle"
        style={{ width: '120px', height: '120px', objectFit: 'cover' }}
      />
    ) : (
      <div 
        className="rounded-circle d-flex align-items-center justify-content-center"
        style={{ 
          width: '120px', 
          height: '120px', 
          backgroundColor: universityTheme.light,
          border: `3px solid ${universityTheme.primary}`
        }}
      >
        <User size={40} style={{ color: universityTheme.primary }} />
      </div>
    )}
    <label 
      htmlFor="avatarInput" 
      className="btn btn-sm btn-primary position-absolute bottom-0 end-0 rounded-circle p-2"
      style={{ cursor: 'pointer' }}
    >
      <Camera size={16} />
    </label>
    <input 
      id="avatarInput"
      type="file" 
      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" 
      onChange={handleImageUpload}
      style={{ display: 'none' }}
    />
  </div>
  
  {/* Remove button */}
  {doctorProfile.avatar_url && (
    <div className="mt-2">
      <button
        className="btn btn-sm btn-outline-danger"
        onClick={handlePhotoRemove}
      >
        Remove Photo
      </button>
    </div>
  )}
  
  {/* Photo Guidelines Dropdown */}
  <div className="mt-3">
    <div className="accordion" id="doctorPhotoGuidelines">
      <div className="accordion-item" style={{ border: 'none', background: 'transparent' }}>
        <h2 className="accordion-header" id="doctorPhotoGuidelinesHeading">
          <button 
            className="accordion-button collapsed"
            type="button" 
            data-bs-toggle="collapse" 
            data-bs-target="#doctorPhotoGuidelinesCollapse" 
            aria-expanded="false" 
            aria-controls="doctorPhotoGuidelinesCollapse"
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
            Professional Photo Guidelines
          </button>
        </h2>
        <div 
          id="doctorPhotoGuidelinesCollapse" 
          className="accordion-collapse collapse" 
          aria-labelledby="doctorPhotoGuidelinesHeading" 
          data-bs-parent="#doctorPhotoGuidelines"
        >
          <div className="accordion-body" style={{ padding: '16px 0' }}>
            <div 
              className="photo-requirements text-start"
              style={{
                background: '#f8f9fa',
                border: '1px solid #e9ecef',
                borderRadius: '8px',
                padding: '16px',
                maxWidth: '400px',
                margin: '0 auto'
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
                      <small className="text-muted">High-resolution, well-lit, clear image</small>
                    </div>
                  </div>
                </div>
                
                <div className="col-12">
                  <div className="d-flex align-items-start">
                    <CheckCircle size={16} className="text-success me-2 mt-1 flex-shrink-0" />
                    <div>
                      <strong className="text-dark">Medical Professional:</strong>
                      <br />
                      <small className="text-muted">Professional attire, appropriate for patient interaction</small>
                    </div>
                  </div>
                </div>
                
                <div className="col-12">
                  <div className="d-flex align-items-start">
                    <CheckCircle size={16} className="text-success me-2 mt-1 flex-shrink-0" />
                    <div>
                      <strong className="text-dark">Patient Trust:</strong>
                      <br />
                      <small className="text-muted">Friendly, approachable appearance for patient directory</small>
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

          {/* Rest of your form fields... */}
          <div className="col-md-6">
            <label className="form-label fw-semibold">Full Name</label>
            <input
              type="text"
              className="form-control"
              value={doctorProfile.name}
              onChange={(e) => setDoctorProfile(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label fw-semibold">Email</label>
            <input
              type="email"
              className="form-control"
              value={doctorProfile.email}
              onChange={(e) => setDoctorProfile(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label fw-semibold">Specialization</label>
            <input
              type="text"
              className="form-control"
              value={doctorProfile.specialization}
              onChange={(e) => setDoctorProfile(prev => ({ ...prev, specialization: e.target.value }))}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label fw-semibold">Medical License Number</label>
            <input
              type="text"
              className="form-control"
              value={doctorProfile.medical_license_number}
              onChange={(e) => setDoctorProfile(prev => ({ ...prev, medical_license_number: e.target.value }))}
            />
          </div>

          <div className="col-12">
            <label className="form-label fw-semibold">Bio</label>
            <textarea
              className="form-control"
              rows={4}
              value={doctorProfile.bio}
              onChange={(e) => setDoctorProfile(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell patients about yourself..."
            />
          </div>

          {/* Save Button */}
          <div className="col-12">
            <button 
              className="btn btn-success"
              onClick={saveProfile}
              disabled={loading}
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm me-2" />
              ) : (
                <Save size={18} className="me-2" />
              )}
              Save Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // University theme colors to match logo6.png
  const universityTheme = {
    primary: '#1e40af', // Deep blue
    secondary: '#059669', // Medical green
    accent: '#dc2626', // Medical red
    light: '#e0f2fe', // Light blue
    gradient: 'linear-gradient(135deg, #af1e1eff 0%, #c33939ff 100%)'
  };

  // Navigation
  // Updated Navigation Component for DoctorDashboard.tsx with white background and user dropdown

const Navigation = () => (
  <nav 
    className="navbar navbar-expand-lg navbar-light"
    style={{
      background: 'white',
      border: 'none',
      borderBottom: 'none',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1030,
      minHeight: '70px', // Reduced height for mobile
      padding: '0.5rem 1rem' // Better mobile padding
    }}
  >
    <div className="container-fluid px-2 px-md-3">
      {/* Logo - Mobile optimized */}
      <div 
        className="navbar-brand me-2"
        style={{
          display: 'flex',
          alignItems: 'center',
          color: '#333',
          fontSize: '0.9rem' // Smaller on mobile
        }}
      >
        <img
          src="/logo6.png"
          alt="Final International University"
          style={{
            width: '35px', // Smaller logo on mobile
            height: '35px',
            borderRadius: '6px',
            objectFit: 'cover',
            marginRight: '8px'
          }}
          className="d-none d-sm-block" // Hide on very small screens
        />
        <div>
          <h5 
            style={{
              color: '#333',
              fontWeight: 600,
              margin: 0,
              fontSize: 'clamp(0.9rem, 2.5vw, 1.25rem)', // Responsive font size
              lineHeight: 1.2
            }}
            className="d-none d-md-block" // Hide brand text on mobile
          >
            {t('login.brand_name')}
          </h5>
          <small 
            style={{
              color: '#666',
              fontSize: 'clamp(0.7rem, 2vw, 0.85rem)'
            }}
            className="d-none d-lg-block" // Hide subtitle on tablet and below
          >
            {t('nav.medical_portal')}
          </small>
        </div>
      </div>

      {/* Mobile menu toggle */}
      <button 
        className="navbar-toggler border-0 p-1" 
        type="button" 
        data-bs-toggle="collapse" 
        data-bs-target="#navbarContent"
        aria-controls="navbarContent" 
        aria-expanded="false" 
        aria-label="Toggle navigation"
        style={{
          boxShadow: 'none',
          outline: 'none'
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
          gap: '8px' // Consistent gap between nav items
        }}
      >
          <li className="nav-item">
            <button
              className={`nav-link btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
              style={{
                color: activeTab === 'dashboard' ? '#dc3545' : '#666',
                background: activeTab === 'dashboard' ? 'rgba(220, 53, 69, 0.1)' : 'none',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                transition: 'all 0.3s ease',
                margin: '0 4px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                minWidth: '120px', // Ensure consistent button width
                fontWeight: activeTab === 'dashboard' ? 600 : 'normal',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'dashboard') {
                  e.currentTarget.style.color = '#dc3545';
                  e.currentTarget.style.background = 'rgba(220, 53, 69, 0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'dashboard') {
                  e.currentTarget.style.color = '#666';
                  e.currentTarget.style.background = 'none';
                }
              }}
            >
              <BarChart3 size={16} className="me-1" />
              {t('nav.overview')}
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link btn ${activeTab === 'appointments' ? 'active' : ''}`}
              onClick={() => setActiveTab('appointments')}
              style={{
                color: activeTab === 'appointments' ? '#dc3545' : '#666',
                background: activeTab === 'appointments' ? 'rgba(220, 53, 69, 0.1)' : 'none',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                transition: 'all 0.3s ease',
                margin: '0 4px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                minWidth: '120px',
                justifyContent: 'center',
                fontWeight: activeTab === 'appointments' ? 600 : 'normal'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'appointments') {
                  e.currentTarget.style.color = '#dc3545';
                  e.currentTarget.style.background = 'rgba(220, 53, 69, 0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'appointments') {
                  e.currentTarget.style.color = '#666';
                  e.currentTarget.style.background = 'none';
                }
              }}
            >
              <Calendar size={16} className="me-1" />
              {t('nav.appointments')}
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link btn ${activeTab === 'patients' ? 'active' : ''}`}
              onClick={() => setActiveTab('patients')}
              style={{
                color: activeTab === 'patients' ? '#dc3545' : '#666',
                background: activeTab === 'patients' ? 'rgba(220, 53, 69, 0.1)' : 'none',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                transition: 'all 0.3s ease',
                margin: '0 4px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                minWidth: '120px',
                justifyContent: 'center',
                fontWeight: activeTab === 'patients' ? 600 : 'normal'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'patients') {
                  e.currentTarget.style.color = '#dc3545';
                  e.currentTarget.style.background = 'rgba(220, 53, 69, 0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'patients') {
                  e.currentTarget.style.color = '#666';
                  e.currentTarget.style.background = 'none';
                }
              }}
            >
              <Users size={16} className="me-1" />
              {t('nav.patients')}
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link btn ${activeTab === 'prescriptions' ? 'active' : ''}`}
              onClick={() => setActiveTab('prescriptions')}
              style={{
                color: activeTab === 'prescriptions' ? '#dc3545' : '#666',
                background: activeTab === 'prescriptions' ? 'rgba(220, 53, 69, 0.1)' : 'none',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                transition: 'all 0.3s ease',
                margin: '0 4px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                minWidth: '120px',
                justifyContent: 'center',
                fontWeight: activeTab === 'prescriptions' ? 600 : 'normal'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'prescriptions') {
                  e.currentTarget.style.color = '#dc3545';
                  e.currentTarget.style.background = 'rgba(220, 53, 69, 0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'prescriptions') {
                  e.currentTarget.style.color = '#666';
                  e.currentTarget.style.background = 'none';
                }
              }}
            >
              <Pill size={16} className="me-1" />
              {t('nav.medications')}
            </button>
          </li>
          <li className="nav-item">
  <button
    className={`nav-link btn ${activeTab === 'profile' ? 'active' : ''}`}
    onClick={() => setActiveTab('profile')}
    style={{
      color: activeTab === 'profile' ? '#dc3545' : '#666',
      background: activeTab === 'profile' ? 'rgba(220, 53, 69, 0.1)' : 'none',
      border: 'none',
      padding: '8px 16px',
      borderRadius: '8px',
      transition: 'all 0.3s ease',
      margin: '0 4px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      minWidth: '120px',
      justifyContent: 'center',
      fontWeight: activeTab === 'profile' ? 600 : 'normal'
    }}
  >
    <Settings size={16} className="me-1" />
    Profile
  </button>
</li>
        </ul>
        
        {/* Right side: User Dropdown with Language inside */}
<div className="d-flex align-items-center ms-auto">
  {/* User Profile Dropdown */}
  <div className="dropdown">
    <button 
      className="btn btn-light dropdown-toggle d-flex align-items-center" 
      data-bs-toggle="dropdown"
      style={{ 
        borderRadius: '25px',
        border: '2px solid #e0e0e0',
        padding: '8px 16px',
        background: 'white',
        color: '#333'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#f8f9fa';
        e.currentTarget.style.borderColor = '#d0d0d0';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'white';
        e.currentTarget.style.borderColor = '#e0e0e0';
      }}
    >
      <div 
        className="rounded-circle me-2 d-flex align-items-center justify-content-center"
        style={{
          width: '32px',
          height: '32px',
          backgroundColor: doctorProfile.avatar_url ? 'transparent' : '#dc3545',
          color: 'white',
          overflow: 'hidden'
        }}
      >
        {doctorProfile.avatar_url ? (
          <img 
            src={doctorProfile.avatar_url}
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
              backgroundColor: doctorProfile.avatar_url ? 'transparent' : '#dc3545',
              color: 'white',
              overflow: 'hidden'
            }}
          >
            {doctorProfile.avatar_url ? (
              <img 
                src={doctorProfile.avatar_url}
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
            <div className="fw-semibold">Dr. {user.name}</div>
            <small className="text-muted">{user.email}</small>
            <div>
              <small className="text-muted">{t('dashboard.specialization')}: {user.specialization}</small>
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
      <li>
        {onLogout && (
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
        )}
      </li>
    </ul>
  </div>
</div>
      </div>
    </div>
  </nav>
);

  // Message Alert
  const MessageAlert = () => (
    message.text && (
      <div className={`alert alert-${message.type === 'error' ? 'danger' : 'success'} alert-dismissible fade show`} role="alert">
        {message.text}
        <button
          type="button"
          className="btn-close"
          onClick={() => setMessage({ type: '', text: '' })}
        ></button>
      </div>
    )
  );

  // Main render
   return (
    <div className="min-vh-100" style={{ backgroundColor: '#f8f9fa', paddingTop: '90px' }}>
      <Navigation />

      {/* Walk-in Alerts */}
    {walkInAlerts.map((alert) => (
      <WalkInAlert
        key={alert.id}
        alert={alert}
        onDismiss={() => {
          setWalkInAlerts(prev => prev.filter(a => a.id !== alert.id));
        }}
        onView={(appointmentId) => {
          const appointment = appointments.find(apt => apt.id.toString() === appointmentId);
          if (appointment) {
            setSelectedAppointment(appointment);
            setShowModal('viewAppointment');
          }
          setWalkInAlerts(prev => prev.filter(a => a.id !== alert.id));
        }}
      />
    ))}
      
      <div className="container-fluid px-4">
        <MessageAlert />
        
        {activeTab === 'dashboard' && <DashboardOverview />}
        {activeTab === 'appointments' && <AppointmentsTab />}
        {activeTab === 'patients' && <PatientsTab />}
        {activeTab === 'prescriptions' && <PrescriptionsTab />}
        {activeTab === 'profile' && <ProfileTab />}

        {/* Modals */}
{showModal && (
  <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
    <div className={`modal-dialog ${showModal === 'viewPatient' ? 'modal-lg' : ''}`}>
      <div className="modal-content" style={{ borderRadius: '1rem' }}>
        
        {/* Set Availability Modal */}
        {showModal === 'availability' && (
          <>
            <div className="modal-header" style={{ background: universityTheme.gradient }}>
              <h5 className="modal-title text-white">
                <Clock size={20} className="me-2" />
                Set Availability
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setShowModal('')}
              ></button>
            </div>
            <div className="modal-body p-4">
              <div className="mb-3">
                <label className="form-label fw-semibold">Available Days</label>
                <div className="row">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <div key={day} className="col-6 col-md-4 mb-2">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={availabilityForm.available_days.includes(day)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAvailabilityForm(prev => ({
                                ...prev,
                                available_days: [...prev.available_days, day]
                              }));
                            } else {
                              setAvailabilityForm(prev => ({
                                ...prev,
                                available_days: prev.available_days.filter(d => d !== day)
                              }));
                            }
                          }}
                        />
                        <label className="form-check-label">{day}</label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Start Time</label>
                  <input
                    type="time"
                    className="form-control"
                    value={availabilityForm.working_hours_start}
                    onChange={(e) => setAvailabilityForm(prev => ({
                      ...prev,
                      working_hours_start: e.target.value
                    }))}
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">End Time</label>
                  <input
                    type="time"
                    className="form-control"
                    value={availabilityForm.working_hours_end}
                    onChange={(e) => setAvailabilityForm(prev => ({
                      ...prev,
                      working_hours_end: e.target.value
                    }))}
                  />
                </div>
              </div>
              
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Break Start (Optional)</label>
                  <input
                    type="time"
                    className="form-control"
                    value={availabilityForm.break_start || ''}
                    onChange={(e) => setAvailabilityForm(prev => ({
                      ...prev,
                      break_start: e.target.value
                    }))}
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Break End (Optional)</label>
                  <input
                    type="time"
                    className="form-control"
                    value={availabilityForm.break_end || ''}
                    onChange={(e) => setAvailabilityForm(prev => ({
                      ...prev,
                      break_end: e.target.value
                    }))}
                  />
                </div>
              </div>
              
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={availabilityForm.is_available || true}
                  onChange={(e) => setAvailabilityForm(prev => ({
                    ...prev,
                    is_available: e.target.checked
                  }))}
                />
                <label className="form-check-label">Currently Available</label>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowModal('')}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={updateAvailability}
                style={{ background: universityTheme.gradient, border: 'none' }}
              >
                Save Availability
              </button>
            </div>
          </>
        )}
        
        {/* New Appointment Modal */}
        {showModal === 'appointment' && (
          <>
            <div className="modal-header" style={{ background: universityTheme.gradient }}>
              <h5 className="modal-title text-white">
                <Plus size={20} className="me-2" />
                New Appointment
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setShowModal('')}
              ></button>
            </div>
            <div className="modal-body p-4">
              <div className="mb-3">
                <label className="form-label fw-semibold">Patient *</label>
                <select
                  className="form-select"
                  value={appointmentForm.patient_id}
                  onChange={(e) => setAppointmentForm(prev => ({
                    ...prev,
                    patient_id: e.target.value
                  }))}
                  required
                >
                  <option value="">Select a patient</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name} - {patient.student_id || patient.staff_id}
                    </option>
                  ))}
                </select>
                {!appointmentForm.patient_id && (
                  <div className="form-text text-danger">Please select a patient</div>
                )}
              </div>
              
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Date *</label>
                  <EnhancedDateInput
                    value={appointmentForm.date}
                    onChange={(date) => setAppointmentForm(prev => ({
                      ...prev,
                      date: date
                    }))}
                    required
                  />
                  <HolidayWarning selectedDate={appointmentForm.date} />
                  {!appointmentForm.date && !isDateBlocked(appointmentForm.date) && (
                    <div className="form-text text-danger">Please select a date</div>
                  )}
                </div>
                
                {/* ADD THE TIME SELECTION HERE */}
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Time *</label>
                  <select
                    className="form-select"
                    value={appointmentForm.time}
                    onChange={(e) => setAppointmentForm(prev => ({
                      ...prev,
                      time: e.target.value
                    }))}
                    required
                    disabled={!appointmentForm.date || isDateBlocked(appointmentForm.date)}
                  >
                    <option value="">Select time</option>
                    {getAvailableTimeSlots(appointmentForm.date).map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                  {!appointmentForm.time && (
                    <div className="form-text text-danger">Please select a time</div>
                  )}
                </div>
              </div>
              
              <div className="mb-3">
                <label className="form-label fw-semibold">Reason for Visit *</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={appointmentForm.reason}
                  onChange={(e) => setAppointmentForm(prev => ({
                    ...prev,
                    reason: e.target.value
                  }))}
                  placeholder="Describe the reason for this appointment..."
                  required
                />
                {!appointmentForm.reason && (
                  <div className="form-text text-danger">Please provide a reason for the visit</div>
                )}
              </div>
              
              {appointmentForm.date && appointmentForm.time && (
                <div className="alert alert-info">
                  <Clock size={16} className="me-2" />
                  Appointment scheduled for: {new Date(appointmentForm.date).toLocaleDateString()} at {appointmentForm.time}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowModal('');
                  setAppointmentForm({ patient_id: '', date: '', time: '', reason: '' });
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  // Validation before creating appointment
                  if (!appointmentForm.patient_id || !appointmentForm.date || 
                      !appointmentForm.time || !appointmentForm.reason.trim()) {
                    setMessage({ type: 'error', text: 'Please fill in all required fields' });
                    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
                    return;
                  }
                  createAppointment();
                }}
                style={{ background: universityTheme.gradient, border: 'none' }}
              >
                Create Appointment
              </button>
            </div>
          </>
        )}
        
        {/* View Appointment Details Modal */}
        {showModal === 'viewAppointment' && selectedAppointment && (
          <>
            <div className="modal-header" style={{ background: universityTheme.gradient }}>
              <h5 className="modal-title text-white">
                <Eye size={20} className="me-2" />
                Appointment Details
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={closeModal}
              ></button>
            </div>
            <div className="modal-body p-4">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold text-muted small">PATIENT</label>
                  <div className="fw-semibold">{selectedAppointment.patient?.name}</div>
                  <div className="text-muted small">{selectedAppointment.patient?.student_id}</div>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold text-muted small">STATUS</label>
                  <div>
                    <span className={getStatusBadge(selectedAppointment.status)}>
                      {selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold text-muted small">DATE</label>
                  <div className="fw-semibold">
                    <Calendar size={16} className="me-2" />
                    {formatDate(selectedAppointment.date)}  {/* ← CHANGED */}
                  </div>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold text-muted small">TIME</label>
                  <div className="fw-semibold">
                    <Clock size={16} className="me-2" />
                    {formatTime(selectedAppointment.date)}  {/* ← CHANGED */}
                  </div>
                </div>
              </div>
              
              <div className="mb-3">
                <label className="form-label fw-semibold text-muted small">REASON FOR VISIT</label>
                <div className="p-3 bg-light rounded" style={{ borderRadius: '0.75rem' }}>
                  {selectedAppointment.reason}
                </div>
              </div>
              
              <div className="mb-3">
                <label className="form-label fw-semibold text-muted small">PATIENT CONTACT</label>
                <div className="fw-semibold">{selectedAppointment.patient?.email}</div>
                <div className="text-muted small">{selectedAppointment.patient?.department}</div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowModal('')}
              >
                Close
              </button>
              {selectedAppointment.status === 'scheduled' && (
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => {
                    handleAppointmentAction(selectedAppointment, 'confirm');
                    setShowModal('');
                  }}
                >
                  Confirm Appointment
                </button>
              )}
              {selectedAppointment.status === 'confirmed' && (
                <button
                  type="button"
                  className="btn btn-info"
                  onClick={() => {
                    handleAppointmentAction(selectedAppointment, 'complete');
                    setShowModal('');
                  }}
                >
                  Mark Complete
                </button>
              )}
            </div>
          </>
        )}
        
        {/* Medical Record Modal */}
        {showModal === 'medicalRecord' && selectedPatient && (
          <>
            <div className="modal-header" style={{ background: universityTheme.gradient }}>
              <h5 className="modal-title text-white">
                <FileText size={20} className="me-2" />
                Add Medical Record - {selectedPatient.name}
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setShowModal('')}
              ></button>
            </div>
            <div className="modal-body p-4">
              <div className="mb-3">
                <label className="form-label fw-semibold">Visit Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={medicalRecordForm.visit_date}
                  onChange={(e) => setMedicalRecordForm(prev => ({
                    ...prev,
                    visit_date: e.target.value
                  }))}
                />
              </div>
              
              <div className="mb-3">
                <label className="form-label fw-semibold">Diagnosis *</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={medicalRecordForm.diagnosis}
                  onChange={(e) => setMedicalRecordForm(prev => ({
                    ...prev,
                    diagnosis: e.target.value
                  }))}
                  placeholder="Enter diagnosis..."
                  required
                />
              </div>
              
              <div className="mb-3">
                <label className="form-label fw-semibold">Treatment *</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={medicalRecordForm.treatment}
                  onChange={(e) => setMedicalRecordForm(prev => ({
                    ...prev,
                    treatment: e.target.value
                  }))}
                  placeholder="Enter treatment plan..."
                  required
                />
              </div>
              
              <div className="mb-3">
                <label className="form-label fw-semibold">Additional Notes</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={medicalRecordForm.notes}
                  onChange={(e) => setMedicalRecordForm(prev => ({
                    ...prev,
                    notes: e.target.value
                  }))}
                  placeholder="Any additional observations or notes..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowModal('')}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={createMedicalRecord}
                style={{ background: universityTheme.gradient, border: 'none' }}
              >
                Save Record
              </button>
            </div>
          </>
        )}

        {/* ADD THE VIEW PATIENT DETAILS MODAL HERE */}
        {/* Enhanced View Patient Details Modal */}
{showModal === 'viewPatient' && selectedPatient && (
  <>
    <div className="modal-header" style={{ background: universityTheme.gradient }}>
      <h5 className="modal-title text-white">
        <User size={20} className="me-2" />
        Patient Details - {selectedPatient.name}
      </h5>
      <button
        type="button"
        className="btn-close btn-close-white"
        onClick={() => {
          setShowModal('');
          setShowPatientHistory(false);
          setPatientMedicalRecords([]);
          setPatientPrescriptions([]);
        }}
      ></button>
    </div>
    <div className="modal-body p-4" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
      {/* Basic Patient Information */}
      <div className="row mb-4">
        <div className="col-md-6 mb-3">
          <label className="form-label fw-semibold text-muted small">NAME</label>
          <div className="fw-semibold">{selectedPatient.name}</div>
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label fw-semibold text-muted small">ID</label>
          <div className="fw-semibold">{selectedPatient.student_id || selectedPatient.staff_id}</div>
        </div>
      </div>
      
      <div className="row mb-4">
        <div className="col-md-6 mb-3">
          <label className="form-label fw-semibold text-muted small">EMAIL</label>
          <div className="fw-semibold">{selectedPatient.email}</div>
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label fw-semibold text-muted small">ROLE</label>
          <div className="fw-semibold">{selectedPatient.role}</div>
        </div>
      </div>
      
      <div className="mb-4">
        <label className="form-label fw-semibold text-muted small">DEPARTMENT</label>
        <div className="fw-semibold">{selectedPatient.department}</div>
      </div>

      <hr />

      {/* Medical History Section */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="fw-bold mb-0">
            <FileText size={18} className="me-2" />
            Medical History & Records
          </h6>
          {!showPatientHistory ? (
            <button
              className="btn btn-outline-info btn-sm"
              onClick={() => {
                setShowPatientHistory(true);
                fetchPatientMedicalRecords(selectedPatient.id);
                fetchPatientPrescriptions(selectedPatient.id);
              }}
            >
              <Eye size={16} className="me-1" />
              View Full History
            </button>
          ) : (
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={() => {
                setShowPatientHistory(false);
                setPatientMedicalRecords([]);
                setPatientPrescriptions([]);
              }}
            >
              Hide History
            </button>
          )}
        </div>

        {showPatientHistory && (
          <div>
            {loading ? (
              <div className="text-center py-3">
                <div className="spinner-border spinner-border-sm text-primary" />
                <p className="mt-2 text-muted">Loading medical history...</p>
              </div>
            ) : (
              <div className="row">
                {/* Medical Records Column */}
                <div className="col-md-6">
                  <h6 className="text-primary mb-3">
                    <Stethoscope size={16} className="me-1" />
                    Visit Records ({patientMedicalRecords.length})
                  </h6>
                  {patientMedicalRecords.length === 0 ? (
                    <div className="text-center py-3 bg-light rounded">
                      <FileText size={24} className="text-muted mb-2" />
                      <p className="text-muted mb-0">No medical records found</p>
                    </div>
                  ) : (
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {patientMedicalRecords.map((record) => (
                        <div key={record.id} className="card mb-2">
                          <div className="card-body p-3">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <small className="text-muted">
                                {new Date(record.visit_date).toLocaleDateString()}
                              </small>
                              <small className="text-muted">
                                Dr. {record.doctor?.name}
                              </small>
                            </div>
                            <div className="mb-2">
                              <strong className="text-primary">Diagnosis:</strong>
                              <div className="small">{record.diagnosis}</div>
                            </div>
                            <div className="mb-2">
                              <strong className="text-success">Treatment:</strong>
                              <div className="small">{record.treatment}</div>
                            </div>
                            {record.notes && (
                              <div>
                                <strong className="text-warning">Notes:</strong>
                                <div className="small text-muted">{record.notes}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Prescriptions Column */}
                <div className="col-md-6">
                  <h6 className="text-success mb-3">
                    <Pill size={16} className="me-1" />
                    Prescriptions ({patientPrescriptions.length})
                  </h6>
                  {patientPrescriptions.length === 0 ? (
                    <div className="text-center py-3 bg-light rounded">
                      <Pill size={24} className="text-muted mb-2" />
                      <p className="text-muted mb-0">No prescriptions found</p>
                    </div>
                  ) : (
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {patientPrescriptions.map((prescription) => (
                        <div key={prescription.id} className="card mb-2">
                          <div className="card-body p-3">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <small className="text-muted">
                                {new Date(prescription.created_at).toLocaleDateString()}
                              </small>
                              <span className={`badge ${getStatusBadge(prescription.status)} badge-sm`}>
                                {prescription.status}
                              </span>
                            </div>
                            {prescription.medications?.map((med, index) => (
                              <div key={index} className="mb-2 p-2 bg-light rounded">
                                <div className="fw-semibold small">{med.name}</div>
                                <div className="small text-muted">{med.dosage} - {med.instructions}</div>
                                <div className="small text-muted">
                                  {med.start_date} to {med.end_date}
                                </div>
                              </div>
                            ))}
                            {prescription.notes && (
                              <div className="small text-muted mt-2">
                                <strong>Notes:</strong> {prescription.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    <div className="modal-footer">
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => setShowModal('')}
      >
        Close
      </button>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => {
          setShowModal('medicalRecord');
        }}
        style={{ background: universityTheme.gradient, border: 'none' }}
      >
        <Plus size={16} className="me-1" />
        Add Medical Record
      </button>
    </div>
  </>
)}
        
        {/* Prescription Modal */}
        {showModal === 'prescription' && (
          <>
            <div className="modal-header" style={{ background: universityTheme.gradient }}>
              <h5 className="modal-title text-white">
                <Pill size={20} className="me-2" />
                Create Prescription
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setShowModal('')}
              ></button>
            </div>
            <div className="modal-body p-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="mb-3">
                <label className="form-label fw-semibold">Patient *</label>
                <select
                  className="form-select"
                  value={prescriptionForm.patient_id}
                  onChange={(e) => setPrescriptionForm(prev => ({
                    ...prev,
                    patient_id: e.target.value
                  }))}
                  required
                >
                  <option value="">Select a patient</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name} - {patient.student_id || patient.staff_id}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label className="form-label fw-semibold">Medications</label>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={addMedication}
                  >
                    <Plus size={16} className="me-1" />
                    Add Medication
                  </button>
                </div>
                
                {prescriptionForm.medications.map((medication, index) => (
                  <div key={index} className="card mb-2">
                    <div className="card-body p-3">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h6 className="mb-0">Medication {index + 1}</h6>
                        {prescriptionForm.medications.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => removeMedication(index)}
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                      
                      <div className="row">
                        <div className="col-md-6 mb-2">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Medication name *"
                            value={medication.name}
                            onChange={(e) => {
                              const newMedications = [...prescriptionForm.medications];
                              newMedications[index].name = e.target.value;
                              setPrescriptionForm(prev => ({
                                ...prev,
                                medications: newMedications
                              }));
                            }}
                          />
                        </div>
                        <div className="col-md-6 mb-2">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Dosage *"
                            value={medication.dosage}
                            onChange={(e) => {
                              const newMedications = [...prescriptionForm.medications];
                              newMedications[index].dosage = e.target.value;
                              setPrescriptionForm(prev => ({
                                ...prev,
                                medications: newMedications
                              }));
                            }}
                          />
                        </div>
                      </div>
                      
                      <div className="mb-2">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Instructions *"
                          value={medication.instructions}
                          onChange={(e) => {
                            const newMedications = [...prescriptionForm.medications];
                            newMedications[index].instructions = e.target.value;
                            setPrescriptionForm(prev => ({
                              ...prev,
                              medications: newMedications
                            }));
                          }}
                        />
                      </div>
                      
                      <div className="row">
                        <div className="col-md-6">
                          <input
                            type="date"
                            className="form-control form-control-sm"
                            value={medication.start_date}
                            onChange={(e) => {
                              const newMedications = [...prescriptionForm.medications];
                              newMedications[index].start_date = e.target.value;
                              setPrescriptionForm(prev => ({
                                ...prev,
                                medications: newMedications
                              }));
                            }}
                          />
                        </div>
                        <div className="col-md-6">
                          <input
                            type="date"
                            className="form-control form-control-sm"
                            value={medication.end_date}
                            onChange={(e) => {
                              const newMedications = [...prescriptionForm.medications];
                              newMedications[index].end_date = e.target.value;
                              setPrescriptionForm(prev => ({
                                ...prev,
                                medications: newMedications
                              }));
                            }}
                          />
                        </div>
                         <div className="col-md-4 mb-2">
    <select
      className="form-control form-control-sm"
      value={medication.frequency || 'daily'}
      onChange={(e) => {
        const newMedications = [...prescriptionForm.medications];
        newMedications[index].frequency = e.target.value;
        setPrescriptionForm(prev => ({
          ...prev,
          medications: newMedications
        }));
      }}
    >
      <option value="daily">Daily</option>
      <option value="twice_daily">Twice Daily</option>
      <option value="weekly">Weekly</option>
      <option value="as_needed">As Needed</option>
    </select>
  </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mb-3">
                <label className="form-label fw-semibold">Additional Notes</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={prescriptionForm.notes}
                  onChange={(e) => setPrescriptionForm(prev => ({
                    ...prev,
                    notes: e.target.value
                  }))}
                  placeholder="Any additional notes or instructions..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowModal('')}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={createPrescription}
                style={{ background: universityTheme.gradient, border: 'none' }}
              >
                Create Prescription
              </button>
            </div>
          </>
        )}

        {/* View Prescription Details Modal */}
{showModal === 'viewPrescription' && selectedPrescription && (
  <>
    <div className="modal-header" style={{ background: universityTheme.gradient }}>
      <h5 className="modal-title text-white">
        <Pill size={20} className="me-2" />
        Prescription Details - {selectedPrescription.patient?.name}
      </h5>
      <button
        type="button"
        className="btn-close btn-close-white"
        onClick={() => setShowModal('')}
      ></button>
    </div>
    <div className="modal-body p-4">
      <div className="row mb-3">
        <div className="col-md-6">
          <label className="form-label fw-semibold text-muted small">PATIENT</label>
          <div className="fw-semibold">{selectedPrescription.patient?.name}</div>
          <div className="text-muted small">{selectedPrescription.patient?.student_id}</div>
        </div>
        <div className="col-md-6">
          <label className="form-label fw-semibold text-muted small">STATUS</label>
          <div>
            <span className={getStatusBadge(selectedPrescription.status)}>
              {selectedPrescription.status.charAt(0).toUpperCase() + selectedPrescription.status.slice(1)}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-3">
        <label className="form-label fw-semibold text-muted small">ISSUED DATE</label>
        <div className="fw-semibold">
          <Calendar size={16} className="me-2" />
          {new Date(selectedPrescription.created_at).toLocaleDateString()}
        </div>
      </div>

      <div className="mb-3">
        <label className="form-label fw-semibold text-muted small">MEDICATIONS</label>
        {selectedPrescription.medications?.map((med, index) => (
          <div key={index} className="card mb-2">
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <h6 className="mb-0 fw-bold">{med.name}</h6>
                <span className="badge bg-secondary">{med.frequency || 'daily'}</span>
              </div>
              <div className="row">
                <div className="col-md-6">
                  <small className="text-muted">Dosage:</small>
                  <div>{med.dosage}</div>
                </div>
                <div className="col-md-6">
                  <small className="text-muted">Duration:</small>
                  <div>{med.start_date} to {med.end_date}</div>
                </div>
              </div>
              <div className="mt-2">
                <small className="text-muted">Instructions:</small>
                <div>{med.instructions}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedPrescription.notes && (
        <div className="mb-3">
          <label className="form-label fw-semibold text-muted small">NOTES</label>
          <div className="p-3 bg-light rounded">
            {selectedPrescription.notes}
          </div>
        </div>
      )}
    </div>
    <div className="modal-footer">
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => setShowModal('')}
      >
        Close
      </button>
    </div>
  </>
)}

        {/* Completion Report Modal */}
{showModal === 'completionReport' && selectedAppointment && (
  <>
    <div className="modal-header" style={{ background: universityTheme.gradient }}>
      <h5 className="modal-title text-white">
        <FileText size={20} className="me-2" />
        Complete Appointment - {selectedAppointment.patient?.name}
      </h5>
      <button
        type="button"
        className="btn-close btn-close-white"
        onClick={() => setShowModal('')}
      ></button>
    </div>
    <div className="modal-body p-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
      <div className="alert alert-info">
        <strong>Appointment Details:</strong><br />
        Date: {formatDate(selectedAppointment.date)}<br />  {/* ← CHANGED */}
        Time: {formatTime(selectedAppointment.date)}<br />  {/* ← CHANGED */}
        Reason: {selectedAppointment.reason}
      </div>

      <div className="mb-3">
        <label className="form-label fw-semibold">Diagnosis *</label>
        <textarea
          className="form-control"
          rows={3}
          value={completionReport.diagnosis}
          onChange={(e) => setCompletionReport(prev => ({
            ...prev,
            diagnosis: e.target.value
          }))}
          placeholder="Enter the diagnosis for this visit..."
          required
        />
      </div>

      <div className="mb-3">
        <label className="form-label fw-semibold">Treatment Provided *</label>
        <textarea
          className="form-control"
          rows={3}
          value={completionReport.treatment_provided}
          onChange={(e) => setCompletionReport(prev => ({
            ...prev,
            treatment_provided: e.target.value
          }))}
          placeholder="Describe the treatment provided during this visit..."
          required
        />
      </div>

      <div className="mb-3">
        <label className="form-label fw-semibold">Medications Prescribed</label>
        <textarea
          className="form-control"
          rows={3}
          value={completionReport.medications_prescribed}
          onChange={(e) => setCompletionReport(prev => ({
            ...prev,
            medications_prescribed: e.target.value
          }))}
          placeholder="List any medications prescribed (name, dosage, instructions)..."
        />
      </div>

      <div className="mb-3">
        <label className="form-label fw-semibold">Recommendations</label>
        <textarea
          className="form-control"
          rows={3}
          value={completionReport.recommendations}
          onChange={(e) => setCompletionReport(prev => ({
            ...prev,
            recommendations: e.target.value
          }))}
          placeholder="Any recommendations for the patient (lifestyle, diet, exercise, etc.)..."
        />
      </div>

      <div className="mb-3">
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            checked={completionReport.follow_up_required}
            onChange={(e) => setCompletionReport(prev => ({
              ...prev,
              follow_up_required: e.target.checked,
              follow_up_date: e.target.checked ? prev.follow_up_date : ''
            }))}
          />
          <label className="form-check-label fw-semibold">
            Follow-up appointment required
          </label>
        </div>
      </div>

      {completionReport.follow_up_required && (
        <div className="mb-3">
          <label className="form-label fw-semibold">Recommended Follow-up Date</label>
          <input
            type="date"
            className="form-control"
            value={completionReport.follow_up_date}
            onChange={(e) => setCompletionReport(prev => ({
              ...prev,
              follow_up_date: e.target.value
            }))}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
      )}

      <div className="mb-3">
        <label className="form-label fw-semibold">Additional Notes</label>
        <textarea
          className="form-control"
          rows={3}
          value={completionReport.notes}
          onChange={(e) => setCompletionReport(prev => ({
            ...prev,
            notes: e.target.value
          }))}
          placeholder="Any additional notes or observations..."
        />
      </div>
    </div>
    <div className="modal-footer">
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => setShowModal('')}
      >
        Cancel
      </button>
      <button
        type="button"
        className="btn btn-success"
        onClick={completeAppointmentWithReport}
        disabled={loading || !completionReport.diagnosis.trim() || !completionReport.treatment_provided.trim()}
      >
        {loading ? (
          <span className="spinner-border spinner-border-sm me-2" />
        ) : (
          <CheckCircle size={16} className="me-2" />
        )}
        Complete Appointment
      </button>
    </div>
  </>
)}

{/* Reschedule Appointment Modal */}
{showModal === 'reschedule' && selectedAppointment && (
  <>
    <div className="modal-header" style={{ background: universityTheme.gradient }}>
      <h5 className="modal-title text-white">
        <Edit size={20} className="me-2" />
        Reschedule Appointment - {selectedAppointment.patient?.name}
      </h5>
      <button
        type="button"
        className="btn-close btn-close-white"
        onClick={() => setShowModal('')}
      ></button>
    </div>
    <div className="modal-body p-4">
      <div className="alert alert-info">
        <strong>Current Appointment:</strong><br />
        Date: {formatDate(selectedAppointment.date)}<br />  {/* ← CHANGED */}
        Time: {formatTime(selectedAppointment.date)}<br />  {/* ← CHANGED */}
        Reason: {selectedAppointment.reason}
      </div>
      <div className="row">
        <div className="col-md-6 mb-3">
          <label className="form-label fw-semibold">New Date *</label>
          <EnhancedDateInput
            value={rescheduleForm.new_date}
            onChange={(date) => setRescheduleForm(prev => ({
              ...prev,
              new_date: date
            }))}
            required
          />
          <HolidayWarning selectedDate={rescheduleForm.new_date} />
        </div>
        
        <div className="col-md-6 mb-3">
          <label className="form-label fw-semibold">New Time *</label>
          <select
            className="form-select"
            value={rescheduleForm.new_time}
            onChange={(e) => setRescheduleForm(prev => ({
              ...prev,
              new_time: e.target.value
            }))}
            required
            disabled={!rescheduleForm.new_date || isDateBlocked(rescheduleForm.new_date)}
          >
            <option value="">Select time</option>
            {getAvailableTimeSlots(rescheduleForm.new_date).map(slot => (
              <option key={slot} value={slot}>{slot}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="mb-3">
        <label className="form-label fw-semibold">Reason for Rescheduling *</label>
        <textarea
          className="form-control"
          rows={3}
          value={rescheduleForm.reschedule_reason}
          onChange={(e) => setRescheduleForm(prev => ({
            ...prev,
            reschedule_reason: e.target.value
          }))}
          placeholder="Please explain why this appointment needs to be rescheduled..."
          required
        />
      </div>
    </div>
    <div className="modal-footer">
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => {
          setShowModal('');
          setRescheduleForm({ new_date: '', new_time: '', reschedule_reason: '' });
        }}
      >
        Cancel
      </button>
      <button
        type="button"
        className="btn btn-warning"
        onClick={rescheduleAppointment}
        disabled={loading || !rescheduleForm.new_date || !rescheduleForm.new_time || !rescheduleForm.reschedule_reason.trim()}
      >
        {loading ? (
          <span className="spinner-border spinner-border-sm me-2" />
        ) : (
          <Edit size={16} className="me-2" />
        )}
        Reschedule Appointment
      </button>
    </div>
  </>
)}
        
      </div>
    </div>
  </div>
)}
      </div>
    </div>

    
  );
};

export default EnhancedDoctorDashboard;