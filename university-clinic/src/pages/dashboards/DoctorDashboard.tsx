import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, FileText, Pill, User, Plus, Search, Eye, Edit, CheckCircle, XCircle, Stethoscope, Heart, Brain, Thermometer, BarChart3, Activity, TrendingUp, Check, Globe, X, Archive, Settings, Save, Camera } from 'lucide-react';
import RealTimeDashboard from '../../components/RealTimeDashboard';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import i18n from '../../services/i18n';


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
    visit_date: new Date().toISOString().split('T')[0]
  });
  
  const [prescriptionForm, setPrescriptionForm] = useState<PrescriptionForm>({
    patient_id: '',
    medications: [{
      name: '',
      dosage: '',
      instructions: '',
      start_date: '',
      end_date: ''
    }],
    notes: ''
  });

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
    const today = new Date().toISOString().split('T')[0];
    
    const todayAppointments = appointments.filter(apt => 
      apt.date === today
    ).length;
    
    const upcomingAppointments = appointments.filter(apt => 
      new Date(apt.date) >= new Date() && (apt.status === 'scheduled' || apt.status === 'confirmed')
    ).length;
    
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
      
      if (data.weekly_stats) {
        setWeeklyStats({
          appointments: data.weekly_stats.appointments || [0, 0, 0, 0, 0, 0, 0],
          patients: data.weekly_stats.patients || [0, 0, 0, 0, 0, 0, 0],
          completed: data.weekly_stats.completed || [0, 0, 0, 0, 0, 0, 0]
        });
      }
      
    } catch (error) {
      console.error('Error fetching KPI data:', error);
      setMessage({ 
        type: 'error', 
        text: getErrorMessage(error) || 'Failed to load dashboard statistics' 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
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
    setPrescriptions(data.prescriptions?.data || []);
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    setMessage({ type: 'error', text: 'Failed to load prescriptions' });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }
  setLoading(false);
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
    let updateData: { status?: string } = {};
    let successMessage = '';
    
    switch (action) {
      case 'confirm':
        updateData = { status: 'confirmed' };
        successMessage = 'Appointment confirmed successfully!';
        break;
      case 'complete':
        updateData = { status: 'completed' };
        successMessage = 'Appointment marked as completed!';
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
    
    const response = await fetch(`${API_BASE_URL}/doctor/appointments/${appointment.id}/status`, {
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
    fetchAppointments(); // Refresh the appointments list
  } catch (error: any) {
    console.error(`Error ${action}ing appointment:`, error);
    setMessage({ type: 'error', text: error.message || `Failed to ${action} appointment` });
  }
  setTimeout(() => setMessage({ type: '', text: '' }), 5000);
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
    visit_date: new Date().toISOString().split('T')[0] 
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

    // Check for duplicate appointments (same patient, same date/time)
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
      const response = await fetch(`${API_BASE_URL}/doctor/patients/${selectedPatient.id}/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(medicalRecordForm)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setMessage({ type: 'success', text: 'Medical record created successfully!' });
      setShowModal('');
      setMedicalRecordForm({ diagnosis: '', treatment: '', notes: '', visit_date: new Date().toISOString().split('T')[0] });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } catch (error) {
      console.error('Error creating medical record:', error);
      setMessage({ type: 'error', text: 'Failed to create medical record' });
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
          end_date: formatDateForAPI(med.end_date)
        }))
      };

      console.log('Sending prescription data:', formattedPrescription);

      const response = await fetch(`${API_BASE_URL}/doctor/prescriptions`, {
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
        medications: [{ name: '', dosage: '', instructions: '', start_date: '', end_date: '' }],
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
      medications: [...prev.medications, { name: '', dosage: '', instructions: '', start_date: '', end_date: '' }]
    }));
  };

  const removeMedication = (index: number): void => {
    setPrescriptionForm(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }));
  };

  

  useEffect(() => {
    if (activeTab === 'appointments') fetchAppointments();
    if (activeTab === 'patients') fetchPatients();
    if (activeTab === 'prescriptions') fetchPrescriptions();
    // Load data based on active tab
  if (activeTab === 'dashboard') {
    fetchKPIData();
  }
  if (activeTab === 'profile') {
    fetchDoctorProfile();
  }
  }, [activeTab]);

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
  // Fetch initial data when component mounts
  fetchKPIData();
  fetchWeeklyStats();
  
  // Set up interval to refresh data every 5 minutes
  const interval = setInterval(() => {
    fetchKPIData();
    fetchWeeklyStats();
  }, 5 * 60 * 1000); // 5 minutes
  
  return () => clearInterval(interval);
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
  

  const DashboardOverview = () => (
    <div className="row g-4">
      {/* Welcome Card */}
      <div className="col-12">
        <div className="card shadow-sm border-0" style={{ borderRadius: '1rem', background: universityTheme.gradient }}>
          <div className="card-body p-4 text-white">
            <div className="row align-items-center">
              <div className="col-md-8">
                <h3 className="mb-2">{t('dashboard.welcome_doctor', { name: user.name })}</h3>
                <p className="mb-1 opacity-90">{user.email}</p>
                <p className="mb-0 opacity-75">{t('dashboard.specialization')}: {user.specialization}</p>
              </div>
              <div className="col-md-4 text-end">
                {doctorProfile.avatar_url ? (
                  <img 
                    src={doctorProfile.avatar_url}
                    alt="Profile" 
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '3px solid rgba(255,255,255,0.3)'
                    }}
                  />
                ) : (
                  <User size={80} className="opacity-75" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards with real data */}
      <div className="col-md-3 col-sm-6">
        <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1rem' }}>
          <div className="card-body p-4 text-center">
            <div className="d-inline-flex align-items-center justify-content-center mb-3" 
                style={{ width: '60px', height: '60px', backgroundColor: universityTheme.light, borderRadius: '50%' }}>
              <Calendar size={30} style={{ color: universityTheme.primary }} />
            </div>
            <h4 className="fw-bold mb-1" style={{ color: universityTheme.primary }}>
              {loading ? '...' : stats.total}
            </h4>
            <p className="text-muted mb-0">{t('dashboard.total_appointments')}</p>
            <small className="text-muted">Today: {stats.today}</small>
          </div>
        </div>
      </div>

      <div className="col-md-3 col-sm-6">
        <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1rem' }}>
          <div className="card-body p-4 text-center">
            <div className="d-inline-flex align-items-center justify-content-center mb-3" 
                style={{ width: '60px', height: '60px', backgroundColor: '#dcfdf7', borderRadius: '50%' }}>
              <Users size={30} style={{ color: universityTheme.secondary }} />
            </div>
            <h4 className="fw-bold mb-1" style={{ color: universityTheme.secondary }}>
              {loading ? '...' : stats.patients}
            </h4>
            <p className="text-muted mb-0">{t('dashboard.total_patients')}</p>
          </div>
        </div>
      </div>

      <div className="col-md-3 col-sm-6">
        <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1rem' }}>
          <div className="card-body p-4 text-center">
            <div className="d-inline-flex align-items-center justify-content-center mb-3" 
                style={{ width: '60px', height: '60px', backgroundColor: '#fef3c7', borderRadius: '50%' }}>
              <Pill size={30} className="text-warning" />
            </div>
            <h4 className="fw-bold text-warning mb-1">
              {loading ? '...' : stats.prescriptions}
            </h4>
            <p className="text-muted mb-0">{t('dashboard.prescriptions')}</p>
          </div>
        </div>
      </div>

      <div className="col-md-3 col-sm-6">
        <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1rem' }}>
          <div className="card-body p-4 text-center">
            <div className="d-inline-flex align-items-center justify-content-center mb-3" 
                style={{ width: '60px', height: '60px', backgroundColor: '#fee2e2', borderRadius: '50%' }}>
              <CheckCircle size={30} style={{ color: universityTheme.accent }} />
            </div>
            <h4 className="fw-bold mb-1" style={{ color: universityTheme.accent }}>
              {loading ? '...' : stats.completed}
            </h4>
            <p className="text-muted mb-0">{t('dashboard.completed')}</p>
          </div>
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
                    borderColor: universityTheme.primary,
                    color: universityTheme.primary
                  }}
                  onClick={() => setActiveTab('patients')}
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
                    borderColor: universityTheme.secondary,
                    color: universityTheme.secondary
                  }}
                  onClick={() => {
                    if (patients.length === 0) {
                      fetchPatients();
                    }
                    setShowModal('prescription');
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
                  <div className="me-3">
                    <User size={24} className="text-primary" />
                  </div>
                  <div className="flex-grow-1">
                    <h6 className="mb-1 fw-semibold">{appointment.patient?.name}</h6>
                    <div className="d-flex align-items-center text-muted small">
                      <Calendar size={14} className="me-1" />
                      {new Date(appointment.date).toLocaleDateString()}
                      <Clock size={14} className="ms-3 me-1" />
                      {appointment.time}
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
      {/* Charts Row */}
    <div className="col-12">
      <div className="row g-4">
        <div className="col-md-4">
          <ChartCard 
            title="Weekly Appointments" 
            data={weeklyStats.appointments}
            color={universityTheme.primary}
          />
        </div>
        <div className="col-md-4">
          <ChartCard 
            title="Patients Seen" 
            data={weeklyStats.patients}
            color={universityTheme.secondary}
          />
        </div>
        <div className="col-md-4">
          <ChartCard 
            title="Completed Sessions" 
            data={weeklyStats.completed}
            color={universityTheme.accent}
          />
        </div>
      </div>
    </div>
    </div>
  );


  const AppointmentsTab = () => (
    <div className="card shadow-sm">
      <div className="card-header" style={{ background: universityTheme.gradient }}>
        <div className="d-flex justify-content-between align-items-center">
          <h3 className="card-title text-white mb-0 d-flex align-items-center">
            <Calendar size={24} className="me-2" />
            {t('nav.appointments')} ({filteredAppointments.length})
          </h3>
          <div className="d-flex gap-2">
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
              style={{ maxWidth: '150px' }}
            />
            <button
              onClick={() => setShowModal('availability')}
              className="btn btn-warning btn-sm"
            >
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
      <div className="card-body p-4">
  <div className="d-flex gap-2 mb-3">
    <div className="btn-group" role="group">
      {[
        { value: 'all', label: 'All', count: appointments.length },
        { value: 'scheduled', label: 'Scheduled', count: appointments.filter(a => a.status === 'scheduled').length },
        { value: 'confirmed', label: 'Confirmed', count: appointments.filter(a => a.status === 'confirmed').length },
        { value: 'completed', label: 'Completed', count: appointments.filter(a => a.status === 'completed').length },
        { value: 'cancelled', label: 'Cancelled', count: appointments.filter(a => a.status === 'cancelled').length }
      ].map(filter => (
        <button
          key={filter.value}
          className={`btn ${appointmentFilter === filter.value ? 'btn-primary' : 'btn-outline-primary'} btn-sm`}
          onClick={() => {
            setAppointmentFilter(filter.value);
            if (filter.value === 'all') {
              setFilteredAppointments(appointments);
            } else {
              setFilteredAppointments(appointments.filter(apt => apt.status === filter.value));
            }
          }}
        >
          {filter.label} ({filter.count})
        </button>
      ))}
    </div>
  </div>
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">{t('common.loading')}</span>
            </div>
            <p className="text-muted">{t('appointments.loading_appointments')}</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="text-center py-5">
            <Calendar size={48} className="text-muted mb-3" />
            <p className="text-muted">
              {selectedDate 
                ? t('appointments.no_appointments_for_date', { date: selectedDate })
                : t('appointments.no_appointments')
              }
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>{t('common.patient')}</th>
                  <th>{t('appointments.date_time')}</th>
                  <th>{t('appointments.reason')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map(appointment => (
                  <tr key={appointment.id}>
                    <td>
                      <div className="d-flex align-items-center">
                        <div className="me-2">
                          <User size={20} className="text-primary" />
                        </div>
                        <div>
                          <div className="fw-semibold">{appointment.patient?.name}</div>
                          <small className="text-muted">{appointment.patient?.student_id}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center">
                        <Calendar size={14} className="me-1 text-muted" />
                        {new Date(appointment.date).toLocaleDateString()}
                        <Clock size={14} className="ms-3 me-1 text-muted" />
                        {appointment.time}
                      </div>
                    </td>
                    <td>{appointment.reason}</td>
                    <td>
                      <span className={`${getStatusBadgeClass(appointment.status)}`}>
                        {t(`status.${appointment.status}`)}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-1">
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
                        <button 
                          className="btn btn-sm btn-outline-secondary" 
                          onClick={() => handleAppointmentAction(appointment, 'reschedule')}
                          title={t('appointments.reschedule')}
                        >
                          <Edit size={16} />
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
  );

  const PatientsTab = () => (
    <div className="card shadow-sm">
      <div className="card-header" style={{ background: universityTheme.gradient }}>
  <div className="d-flex justify-content-between align-items-center">
    <h3 className="card-title text-white mb-0 d-flex align-items-center">
      <Users size={24} className="me-2" />
      Patients ({selectedPatients.size} selected)
    </h3>
    <div className="d-flex gap-2">
      {selectedPatients.size > 0 && (
        <button
          onClick={archiveSelectedPatients}
          className="btn btn-warning btn-sm"
        >
          <Archive size={16} className="me-1" />
          Archive Selected ({selectedPatients.size})
        </button>
      )}
      <div className="form-check text-white">
        <input
          className="form-check-input"
          type="checkbox"
          checked={selectedPatients.size === filteredPatients.length && filteredPatients.length > 0}
          onChange={toggleSelectAllPatients}
        />
        <label className="form-check-label">
          Select All
        </label>
      </div>
      <div className="input-group" style={{ maxWidth: '250px' }}>
        <span className="input-group-text bg-white border-end-0">
          <Search size={16} />
        </span>
        <input
          type="text"
          placeholder="Search patients..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-control form-control-sm border-start-0"
        />
      </div>
    </div>
  </div>
</div>
      <div className="card-body p-4">
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
            <p className="text-muted">No patients found</p>
          </div>
        ) : (
          <div className="row g-4">
            {filteredPatients.map((patient: Patient) => (
              <div key={patient.id} className="col-md-6 col-lg-4">
  <div className={`card h-100 shadow-sm border-0 ${selectedPatients.has(patient.id) ? 'border-primary' : ''}`} style={{ borderRadius: '1rem' }}>
    <div className="card-body">
      <div className="d-flex align-items-start mb-3">
        <div className="form-check me-3">
          <input
            className="form-check-input"
            type="checkbox"
            checked={selectedPatients.has(patient.id)}
            onChange={() => togglePatientSelection(patient.id)}
          />
        </div>
        <div className="me-3">
          <div className="bg-primary bg-opacity-10 p-3 rounded-circle">
            <User size={24} className="text-primary" />
          </div>
        </div>
        <div>
          <h5 className="mb-0 fw-semibold">{patient.name}</h5>
          <small className="text-muted">{patient.student_id || patient.staff_id}</small>
        </div>
      </div>
      
      <div className="mb-3">
        <div className="d-flex align-items-center mb-2">
          <small className="text-muted">Email:</small>
          <small className="ms-2">{patient.email}</small>
        </div>
        <div className="d-flex align-items-center mb-2">
          <small className="text-muted">Department:</small>
          <small className="ms-2">{patient.department}</small>
        </div>
        <div className="d-flex align-items-center">
          <small className="text-muted">Role:</small>
          <small className="ms-2">{patient.role}</small>
        </div>
      </div>
      
      <div className="d-flex gap-2">
        <button 
          onClick={() => {setSelectedPatient(patient); setShowModal('medicalRecord');}}
          className="btn btn-sm btn-success flex-grow-1"
          style={{ borderRadius: '0.5rem' }}
        >
          <FileText size={16} className="me-1" />
          Add Record
        </button>
        <button 
          onClick={() => {setSelectedPatient(patient); setShowModal('viewPatient');}}
          className="btn btn-sm btn-outline-primary flex-grow-1"
          style={{ borderRadius: '0.5rem' }}
        >
          <Eye size={16} className="me-1" />
          Details
        </button>
      </div>
    </div>
  </div>
</div>
            ))}
          </div>
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
            Prescriptions
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
          <div className="row g-4">
            {prescriptions.map(prescription => (
              <div key={prescription.id} className="col-12">
                <div className="card border-0 shadow-sm" style={{ borderRadius: '1rem' }}>
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <h5 className="mb-1 fw-bold">{prescription.patient?.name}</h5>
                        <p className="text-muted small">Issued: {new Date(prescription.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className={`${getStatusBadge(prescription.status)}`}>
                        {prescription.status.charAt(0).toUpperCase() + prescription.status.slice(1)}
                      </span>
                    </div>
                    
                    <div className="mb-3">
                      <h6 className="fw-semibold mb-2">Medications:</h6>
                      {prescription.medications?.map((med: Medication, index: number) => (
                        <div key={index} className="bg-light p-3 rounded mb-2">
                          <div className="d-flex justify-content-between">
                            <div className="fw-semibold">{med.name}</div>
                            <small className="text-muted">{med.dosage}</small>
                          </div>
                          <small className="text-muted d-block mb-1">Instructions: {med.instructions}</small>
                          <small className="text-muted">Duration: {med.start_date} to {med.end_date}</small>
                        </div>
                      ))}
                    </div>
                    
                    {prescription.notes && (
                      <div className="alert alert-light border-0 mb-0" style={{ backgroundColor: '#f8f9fa', borderRadius: '0.75rem' }}>
                        <small><strong>Notes:</strong> {prescription.notes}</small>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
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
                accept="image/*" 
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </div>
            {/* Add remove button */}
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
      height: '85px'
    }}
  >
    <div className="container-fluid">
      {/* Logo */}
      <div 
        className="navbar-brand"
        style={{
          display: 'flex',
          alignItems: 'center',
          color: '#333'
        }}
      >
        <img
          src="/logo6.png"
          alt="Final International University"
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '8px',
            objectFit: 'cover',
            marginRight: '15px'
          }}
        />
        <div>
          <h5 
            style={{
              color: '#333',
              fontWeight: 600,
              margin: 0,
              fontSize: '1.25rem',
              lineHeight: 1.2
            }}
          >
            {t('login.brand_name')}
          </h5>
          <small 
            style={{
              color: '#666',
              fontSize: '0.85rem'
            }}
          >
            {t('nav.medical_portal')}
          </small>
        </div>
      </div>

      {/* Mobile menu toggle */}
      <button 
        className="navbar-toggler" 
        type="button" 
        data-bs-toggle="collapse" 
        data-bs-target="#navbarContent"
        aria-controls="navbarContent" 
        aria-expanded="false" 
        aria-label="Toggle navigation"
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
        
        {/* Right side: Language and User Dropdown */}
        <div className="d-flex align-items-center ms-auto">
          {/* Language Switcher */}
          <div className="dropdown me-3">
            <button 
              className="btn btn-outline-secondary dropdown-toggle" 
              data-bs-toggle="dropdown"
              style={{ 
                borderRadius: '25px',
                borderColor: '#dc3545',
                color: '#dc3545'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(220, 53, 69, 0.1)';
                e.currentTarget.style.borderColor = '#dc3545';
                e.currentTarget.style.color = '#dc3545';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = '#dc3545';
                e.currentTarget.style.color = '#dc3545';
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
                    transition: 'background-color 0.2s ease'
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
                    transition: 'background-color 0.2s ease'
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
              <span className="fw-semibold">Dr. {user.name}</span>
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
                    <User size={16} className="me-3" />
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
                  <input
                    type="date"
                    className="form-control"
                    value={appointmentForm.date}
                    min={getMinDate()}
                    onChange={(e) => setAppointmentForm(prev => ({
                      ...prev,
                      date: e.target.value
                    }))}
                    required
                  />
                  {!appointmentForm.date && (
                    <div className="form-text text-danger">Please select a date</div>
                  )}
                </div>
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
                >
                  <option value="">Select time</option>
                  {getAvailableTimeSlots(appointmentForm.date).map(time => (
                    <option key={time} value={time}>{time}</option>
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
                    {new Date(selectedAppointment.date).toLocaleDateString()}
                  </div>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold text-muted small">TIME</label>
                  <div className="fw-semibold">
                    <Clock size={16} className="me-2" />
                    {selectedAppointment.time}
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
                onClick={() => setShowModal('')}
              ></button>
            </div>
            <div className="modal-body p-4">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold text-muted small">NAME</label>
                  <div className="fw-semibold">{selectedPatient.name}</div>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold text-muted small">ID</label>
                  <div className="fw-semibold">{selectedPatient.student_id || selectedPatient.staff_id}</div>
                </div>
              </div>
              
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold text-muted small">EMAIL</label>
                  <div className="fw-semibold">{selectedPatient.email}</div>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold text-muted small">ROLE</label>
                  <div className="fw-semibold">{selectedPatient.role}</div>
                </div>
              </div>
              
              <div className="mb-3">
                <label className="form-label fw-semibold text-muted small">DEPARTMENT</label>
                <div className="fw-semibold">{selectedPatient.department}</div>
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
        
      </div>
    </div>
  </div>
)}
      </div>
    </div>

    
  );
};

export default EnhancedDoctorDashboard;