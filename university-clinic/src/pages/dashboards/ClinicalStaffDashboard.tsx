
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Calendar, Clock, Users, FileText, Heart, Pill, AlertTriangle, Plus, 
  Edit, Trash2, Check, X, Search, Filter, Bell, Stethoscope, 
  Activity, BarChart3, History, User, CheckCircle, Thermometer, 
  TrendingUp, Clipboard, ClipboardCheck, ClipboardList, UserPlus, Globe, LogOut
} from 'lucide-react';
import { APPOINTMENT_STATUSES, getStatusText, getStatusBadgeClass } from '../../constants/appointmentStatuses';
// Add imports at the top
import RealTimeDashboard from '../../components/RealTimeDashboard';
import WalkInPatientManagement from '../../components/WalkInPatientManagement';
import { useTranslation } from 'react-i18next';
import websocketService from '../../services/websocket';

// API Configuration - Environment-based with fallback
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const CLINICAL_API_BASE = `${API_BASE_URL}/api/clinical`;

// Type definitions
interface User {
  id: string | number;
  name: string;
  email: string;
  staff_no?: string;
  department?: string;
  avatar?: string;
  role?: string;
  status?: string;
}

interface Patient {
  id: string | number;
  name: string;
  student_id: string;
  age?: number;
  department?: string;
  assigned_doctor?: string;
  status: string;
  phone?: string;
  email?: string;
  date_of_birth?: string;
  blood_type?: string;
  allergies?: string;
  chronic_conditions?: string;
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_phone?: string;
  emergency_contact_email?: string;
  medical_notes?: string;
}

interface Doctor {
  id: string | number;
  name?: string;
  full_name?: string;
  specialty: string;
  specialization?: string;
  department: string;
  phone: string;
  email: string;
  status?: string;
  availability_status?: string;
}

interface Appointment {
  id: string | number;
  patient?: {
    name: string;
    student_id: string;
    department: string;
  };
  patient_name?: string;
  student_id?: string;
  doctor?: string | Doctor; // Can be either string (from getAppointments) or Doctor object
  doctor_id?: string | number;
  date: string;
  time: string;
  duration?: number;
  type: string;
  status: string;
  priority?: string;
  reason?: string;
  notes?: string;
  room?: string;
  appointment_date?: string;
  appointment_time?: string;
  appointment_type?: string;
}

interface Medication {
  id: string | number;
  name?: string;
  medication_name?: string;
  generic?: string;
  generic_name?: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date?: string;
  instructions?: string;
  status: string;
  route?: string;
}

interface DashboardData {
  staff_member: {
    name?: string;
    staff_no?: string;
    department?: string;
    role?: string;
    shift?: string;
    phone?: string;
    email?: string;
  };
  today_overview: {
    date?: string;
    shift?: string;
    scheduled_appointments?: number;
    completed_tasks?: number;
    pending_tasks?: number;
    patients_seen?: number;
    urgent_cases?: number;
    pending_student_requests?: number; // Add this line
  };
  patient_queue: Array<{
    id: string | number;
    time: string;
    patient_name: string;
    student_id: string;
    status: string;
    priority: string;
    reason?: string;
    assigned_doctor: string;
  }>;
}

interface Filters {
  status: string;
  priority: string;
}

interface Message {
  type: 'success' | 'error' | 'warning' | '';
  text: string;
}

interface ClinicalStaffDashboardProps {
  user: User | null;
  onLogout: () => void;
}

interface ApiResponse<T = any> {
  data?: T;
  appointments?: T[];
  patients?: T[];
  medications?: T[];
  available_doctors?: T[];
  [key: string]: any;
}

interface MedicationFormProps {
  onSubmit: (data: Record<string, any>) => void;
  initialData?: Record<string, any>;
}

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

interface QuickTimeSlotsProps {
  selectedDate: string;
  onTimeSelect: (time: string) => void;
  formData: Record<string, any>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  checkDoctorAvailability: (date: string, time: string) => Promise<void>;
}

type TabType = 'overview' | 'appointments' | 'patients' | 'medications' | 'doctors' | 'walkin';

const Modal: React.FC<ModalProps> = ({ title, children, onClose }) => (
  <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
    <div className="modal-dialog modal-dialog-centered">
      <div className="modal-content" style={{ borderRadius: '1rem' }}>
        <div className="modal-header border-0 pb-0">
          <h5 className="modal-title fw-bold">{title}</h5>
          <button
            type="button"
            className="btn-close"
            onClick={onClose}
          />
        </div>
        <div className="modal-body pt-0">
          {children}
        </div>
      </div>
    </div>
  </div>
);

const MedicationForm: React.FC<MedicationFormProps> = React.memo(({ onSubmit, initialData = {} }) => {
  const [localFormData, setLocalFormData] = useState({
    name: initialData.name || '',
    generic_name: initialData.generic_name || '',
    dosage: initialData.dosage || '',
    frequency: initialData.frequency || 'daily',
    start_date: initialData.start_date || new Date().toISOString().split('T')[0],
    end_date: initialData.end_date || '',
    instructions: initialData.instructions || '',
    status: initialData.status || 'active'
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    onSubmit(localFormData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label">Medication Name *</label>
          <input
            type="text"
            className="form-control"
            value={localFormData.name}
            onChange={(e) => setLocalFormData({...localFormData, name: e.target.value})}
            required
          />
        </div>
        <div className="col-md-6">
          <label className="form-label">Generic Name</label>
          <input
            type="text"
            className="form-control"
            value={localFormData.generic_name}
            onChange={(e) => setLocalFormData({...localFormData, generic_name: e.target.value})}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label">Dosage *</label>
          <input
            type="text"
            className="form-control"
            value={localFormData.dosage}
            onChange={(e) => setLocalFormData({...localFormData, dosage: e.target.value})}
            required
          />
        </div>
        <div className="col-md-4">
          <label className="form-label">Frequency *</label>
          <select
            className="form-select"
            value={localFormData.frequency}
            onChange={(e) => setLocalFormData({...localFormData, frequency: e.target.value})}
            required
          >
            <option value="daily">Daily</option>
            <option value="twice_daily">Twice Daily</option>
            <option value="weekly">Weekly</option>
            <option value="as_needed">As Needed</option>
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label">Status *</label>
          <select
            className="form-select"
            value={localFormData.status}
            onChange={(e) => setLocalFormData({...localFormData, status: e.target.value})}
            required
          >
            <option value="active">Active</option>
            <option value="discontinued">Discontinued</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label">Start Date *</label>
          <input
            type="date"
            className="form-control"
            value={localFormData.start_date}
            onChange={(e) => setLocalFormData({...localFormData, start_date: e.target.value})}
            required
          />
        </div>
        <div className="col-md-6">
          <label className="form-label">End Date</label>
          <input
            type="date"
            className="form-control"
            value={localFormData.end_date}
            onChange={(e) => setLocalFormData({...localFormData, end_date: e.target.value})}
          />
        </div>
        <div className="col-12">
          <label className="form-label">Instructions</label>
          <textarea
            className="form-control"
            rows={3}
            value={localFormData.instructions}
            onChange={(e) => setLocalFormData({...localFormData, instructions: e.target.value})}
          />
        </div>
      </div>
      <div className="d-flex justify-content-end gap-2 mt-4">
        <button type="button" className="btn btn-outline-secondary" onClick={() => {}}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          {initialData.id ? 'Update' : 'Add'} Medication
        </button>
      </div>
    </form>
  );
});

const ClinicalStaffDashboard: React.FC<ClinicalStaffDashboardProps> = ({ user, onLogout }) => {

  const { t, i18n } = useTranslation();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  // State declarations with proper TypeScript types
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [studentRequests, setStudentRequests] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showModal, setShowModal] = useState<string>('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [filters, setFilters] = useState<Filters>({ 
    status: 'all', 
    priority: 'all' 
  });
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    staff_member: {},
    today_overview: {},
    patient_queue: []
  });
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [availableDoctors, setAvailableDoctors] = useState<Doctor[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [medicationSchedule, setMedicationSchedule] = useState<Medication[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [summary, setSummary] = useState<Record<string, any>>({});
  const [message, setMessage] = useState<Message>({ type: '', text: '' });
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);

  // Auth token - in production, this should come from secure storage or context
  const AUTH_TOKEN = localStorage.getItem('auth_token') || '16|iTGQGrMabQfgjprXw6xM01KTAmJc7AQ78qglIs4xd5fa9378';
  
  // API helper functions with proper typing
  const api = {
    get: async <T = any>(endpoint: string): Promise<ApiResponse<T>> => {
      try {
        const response = await fetch(`${CLINICAL_API_BASE}/${endpoint}`, {
          method: 'GET',
          headers: { 
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`HTTP ${response.status} response:`, errorText);
          throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
        
        const data = await response.json();
        return data;
      } catch (error) {
        console.error(`API GET Error for ${endpoint}:`, error);
        throw error;
      }
    },
    
    post: async <T = any>(endpoint: string, data: Record<string, any>): Promise<ApiResponse<T>> => {
      try {
        console.log(`POST to ${endpoint} with data:`, data);
        const response = await fetch(`${CLINICAL_API_BASE}/${endpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(data)
        });
        
        const responseText = await response.text();
        console.log(`Response from ${endpoint}:`, responseText);
        
        if (!response.ok) {
          console.error(`HTTP ${response.status} response:`, responseText);
          
          try {
            const errorData = JSON.parse(responseText);
            if (errorData.errors) {
              const validationErrors = Object.values(errorData.errors).flat().join(', ');
              throw new Error(`Validation errors: ${validationErrors}`);
            } else if (errorData.message) {
              throw new Error(errorData.message);
            }
          } catch (parseError) {
            // If parsing fails, use the original error
          }
          
          throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
        
        return JSON.parse(responseText);
      } catch (error) {
        console.error(`API POST Error for ${endpoint}:`, error);
        throw error;
      }
    },
    
    put: async <T = any>(endpoint: string, data: Record<string, any>): Promise<ApiResponse<T>> => {
      try {
        console.log(`PUT to ${endpoint} with data:`, data);
        const response = await fetch(`${CLINICAL_API_BASE}/${endpoint}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(data)
        });
        
        const responseText = await response.text();
        console.log(`Response from ${endpoint}:`, responseText);
        
        if (!response.ok) {
          console.error(`HTTP ${response.status} response:`, responseText);
          
          try {
            const errorData = JSON.parse(responseText);
            if (errorData.errors) {
              const validationErrors = Object.values(errorData.errors).flat().join(', ');
              throw new Error(`Validation errors: ${validationErrors}`);
            } else if (errorData.message) {
              throw new Error(errorData.message);
            }
          } catch (parseError) {
            // If parsing fails, use the original error
          }
          
          throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
        
        return JSON.parse(responseText);
      } catch (error) {
        console.error(`API PUT Error for ${endpoint}:`, error);
        throw error;
      }
    },
    
    delete: async <T = any>(endpoint: string): Promise<ApiResponse<T>> => {
      try {
        const response = await fetch(`${CLINICAL_API_BASE}/${endpoint}`, {
          method: 'DELETE',
          headers: { 
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }
        });
        
        const responseText = await response.text();
        console.log(`DELETE Response from ${endpoint}:`, responseText);
        
        if (!response.ok) {
          console.error(`HTTP ${response.status} response:`, responseText);
          throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
        
        return responseText ? JSON.parse(responseText) : { success: true };
      } catch (error) {
        console.error(`API DELETE Error for ${endpoint}:`, error);
        throw error;
      }
    }
  };

  // Basic API functions (shortened for brevity)
  const loadDashboardData = async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await api.get<any>('dashboard');
      
      // Map the response to match frontend expectations
      setDashboardData({
        staff_member: data.staff_member || {
          name: user?.name || "Clinical Staff",
          staff_no: user?.staff_no || "CS001",
          department: user?.department || "General"
        },
        today_overview: data.today_overview || {
          scheduled_appointments: 0,
          completed_tasks: 0,
          pending_tasks: 0,
          urgent_cases: 0
        },
        patient_queue: data.patient_queue || []
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setMessage({ type: 'error', text: `Failed to load dashboard data: ${(error as Error).message}` });
      
      // Fallback data
      setDashboardData({
        staff_member: {
          name: user?.name || "Clinical Staff",
          staff_no: user?.staff_no || "CS001",
          department: user?.department || "General"
        },
        today_overview: {
          scheduled_appointments: 0,
          completed_tasks: 0,
          pending_tasks: 0,
          urgent_cases: 0
        },
        patient_queue: []
      });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  const loadStudentRequests = async (): Promise<void> => {
  try {
    setLoading(true);
    const data = await api.get<any>('student-requests');
    setStudentRequests(data.student_requests || []);
  } catch (error) {
    console.error('Error loading student requests:', error);
    setMessage({ type: 'error', text: 'Failed to load student requests' });
  } finally {
    setLoading(false);
  }
};

  const loadAppointments = async (): Promise<void> => {
    try {
      setLoading(true);
      
      // Build query parameters properly
      const params = new URLSearchParams();
      if (filters.status && filters.status !== 'all') {
        params.append('status', filters.status);
      }
      if (filters.priority && filters.priority !== 'all') {
        params.append('priority', filters.priority);
      }
      
      const queryString = params.toString();
      const endpoint = queryString ? `appointments?${queryString}` : 'appointments';
      
      const data = await api.get<any>(endpoint);
      
      // The controller returns appointments directly, not wrapped in { appointments: [...] }
      setAppointments(data.appointments || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
      setMessage({ type: 'error', text: `Failed to load appointments: ${(error as Error).message}` });
      setAppointments([]);
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  const loadPatients = async (): Promise<void> => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      const queryString = params.toString();
      const endpoint = queryString ? `patients?${queryString}` : 'patients';
      
      const data = await api.get<any>(endpoint);
      
      // The controller returns patients directly, not wrapped
      setPatients(data.patients || []);
    } catch (error) {
      console.error('Error loading patients:', error);
      setMessage({ type: 'error', text: `Failed to load patients: ${(error as Error).message}` });
      setPatients([]);
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  const loadMedicationSchedule = async (): Promise<void> => {
    try {
      setLoading(true);
      const date = new Date().toISOString().split('T')[0];
      const data = await api.get<any>(`medication-schedule?date=${date}`);
      
      // The controller returns medications array directly
      setMedicationSchedule(data.medications || []);
    } catch (error) {
      console.error('Error loading medication schedule:', error);
      setMessage({ type: 'error', text: `Failed to load medication schedule: ${(error as Error).message}` });
      setMedicationSchedule([]);
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  const loadDoctors = async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await api.get<any>('doctors');
      
      // The controller returns { data: [...] } format
      setDoctors(data.data || []);
    } catch (error) {
      console.error('Error loading doctors:', error);
      setMessage({ type: 'error', text: `Failed to load doctors: ${(error as Error).message}` });
      setDoctors([]);
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  const checkDoctorAvailability = async (date: string, time: string): Promise<void> => {
    try {
      const params = new URLSearchParams({ date, time });
      const response = await api.get(`doctors/availability?${params}`);
      
      // The controller returns available_doctors array
      setAvailableDoctors(response.available_doctors || []);
    } catch (error) {
      console.error('Error checking doctor availability:', error);
      setAvailableDoctors([]);
    }
  };

  const createAppointment = async (appointmentData: Record<string, any>): Promise<void> => {
    try {
      setLoading(true);
      
      // Transform the data to match what the controller expects
      const transformedData = {
        patient_id: appointmentData.patient_id,
        doctor_id: appointmentData.doctor_id,
        appointment_date: appointmentData.appointment_date || appointmentData.date,
        appointment_time: appointmentData.appointment_time || appointmentData.time,
        appointment_type: appointmentData.appointment_type || appointmentData.type,
        priority: appointmentData.priority || 'normal',
        reason: appointmentData.reason || appointmentData.notes,
        duration: appointmentData.duration || 30
      };
      
      await api.post('appointments', transformedData);
      setMessage({ type: 'success', text: 'Appointment created successfully!' });
      loadAppointments();
      setShowModal('');
      setFormData({});
    } catch (error) {
      console.error('Error creating appointment:', error);
      setMessage({ type: 'error', text: `Error creating appointment: ${(error as Error).message}` });
    } finally {
      setLoading(false);
    }
  };

  const updateAppointment = async (id: string | number, appointmentData: Record<string, any>): Promise<void> => {
    try {
      setLoading(true);
      await api.put(`appointments/${id}`, appointmentData);
      setMessage({ type: 'success', text: 'Appointment updated successfully!' });
      loadAppointments();
      setShowModal('');
      setFormData({});
    } catch (error) {
      console.error('Error updating appointment:', error);
      setMessage({ type: 'error', text: `Error updating appointment: ${(error as Error).message}` });
    } finally {
      setLoading(false);
    }
  };

  const confirmAppointment = async (appointmentId: string | number, method: string): Promise<void> => {
    try {
      setLoading(true);
      await api.post(`appointments/${appointmentId}/confirm`, { method, custom_message: formData.custom_message });
      setMessage({ type: 'success', text: 'Appointment confirmation sent successfully!' });
      loadAppointments();
      setShowModal('');
      setFormData({});
    } catch (error) {
      console.error('Error confirming appointment:', error);
      setMessage({ type: 'error', text: `Error confirming appointment: ${(error as Error).message}` });
    } finally {
      setLoading(false);
    }
  };

  const updateVitals = async (patientId: string | number, vitalsData: Record<string, any>): Promise<void> => {
    try {
      setLoading(true);
      
      // Transform data to match controller expectations
      const transformedData = {
        blood_pressure_systolic: parseInt(vitalsData.blood_pressure_systolic),
        blood_pressure_diastolic: parseInt(vitalsData.blood_pressure_diastolic),
        heart_rate: parseInt(vitalsData.heart_rate),
        temperature: parseFloat(vitalsData.temperature),
        temperature_unit: vitalsData.temperature_unit || 'C',
        respiratory_rate: vitalsData.respiratory_rate ? parseInt(vitalsData.respiratory_rate) : null,
        oxygen_saturation: vitalsData.oxygen_saturation ? parseInt(vitalsData.oxygen_saturation) : null,
        notes: vitalsData.notes || ''
      };
      
      await api.post(`patients/${patientId}/vitals`, transformedData);
      setMessage({ type: 'success', text: 'Vital signs recorded successfully!' });
      setShowModal('');
      setFormData({});
    } catch (error) {
      console.error('Error recording vitals:', error);
      setMessage({ type: 'error', text: `Error recording vitals: ${(error as Error).message}` });
    } finally {
      setLoading(false);
    }
  };

  const recordMedication = async (patientId: string | number, medicationData: Record<string, any>): Promise<void> => {
    try {
      setLoading(true);
      await api.post(`patients/${patientId}/medications`, medicationData);
      setMessage({ type: 'success', text: 'Medication recorded successfully!' });
      setShowModal('');
      setFormData({});
    } catch (error) {
      console.error('Error recording medication:', error);
      setMessage({ type: 'error', text: `Error recording medication: ${(error as Error).message}` });
    } finally {
      setLoading(false);
    }
  };

  const loadMedications = async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await api.get<Medication[]>('medications');
      setMedications((data as any).medications || []);
    } catch (error) {
      console.error('Error loading medications:', error);
      setMessage({ type: 'error', text: `Failed to load medications: ${(error as Error).message}` });
      setMedications([]);
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };


  // Effects
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await Promise.all([
          loadDashboardData(),
          loadPatients(),
          loadDoctors(),
          loadStudentRequests() // Add this line
        ]);
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };
    
    loadInitialData();
  }, []);

  useEffect(() => {
    const loadTabData = async () => {
      try {
        switch (activeTab) {
          case 'appointments':
            await loadAppointments();
            break;
          case 'patients':
            await loadPatients();
            break;
          case 'medications':
            await loadMedicationSchedule();
            break;
          case 'doctors':
            await loadDoctors();
            break;
          case 'overview':
            await loadDashboardData();
            break;
        }
      } catch (error) {
        console.error(`Error loading data for ${activeTab} tab:`, error);
      }
    };

    loadTabData();
  }, [activeTab]);

// Update the WebSocket connection in ClinicalStaffDashboard.tsx
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        // Only connect if websocketService exists and is available
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

          const handleDashboardUpdate = (stats: any) => {
            setDashboardData(prev => ({
              ...prev,
              today_overview: stats.appointments || prev.today_overview
            }));
          };

          websocketService.onConnectionChange?.(handleConnectionChange);
          websocketService.onNotification?.(handleNewNotification);
          websocketService.onDashboardStatsUpdate?.(handleDashboardUpdate);
          websocketService.joinChannel?.('clinical-staff');

          return () => {
            websocketService.offConnectionChange?.(handleConnectionChange);
            websocketService.off?.('notification', handleNewNotification);
            websocketService.off?.('dashboard.updated', handleDashboardUpdate);
            websocketService.leaveChannel?.('clinical-staff');
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
  }, []);

  useEffect(() => {
    if (activeTab === 'appointments') {
      loadAppointments();
    }
  }, [filters.status, filters.priority]);

  // Helper functions
  const getStatusBadge = (status: string): string => {
    return getStatusBadgeClass(status);
  };

  const getPriorityBadge = (priority: string): string => {
    const badges: Record<string, string> = {
      urgent: 'badge bg-danger',
      high: 'badge bg-warning text-dark',
      normal: 'badge bg-info'
    };
    return badges[priority] || 'badge bg-secondary';
  };

  // Navigation Component
  // Updated Navigation Component with inline styles for ClinicalStaffDashboard.tsx

// Updated Navigation Component with inline styles for ClinicalStaffDashboard.tsx

const Navigation = () => (
  <nav 
    className="navbar navbar-expand-lg navbar-light"
    style={{
      background: 'linear-gradient(135deg, #ffffffff 0%, #ffffffff 100%)',
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
          alt="Final International University Logo"
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
            Final International University
          </h5>
          <small 
            style={{
              color: '#666',
              fontSize: '0.85rem'
            }}
          >
            Medical Appointments
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
        <ul className="navbar-nav me-auto mb-2 mb-lg-0">
          <li className="nav-item">
            <button 
              className={`nav-link btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
              style={{
                color: activeTab === 'overview' ? '#dc3545' : '#666',
                background: activeTab === 'overview' ? 'rgba(220, 53, 69, 0.1)' : 'none',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                transition: 'all 0.3s ease',
                margin: '0 4px',
                display: 'flex',
                alignItems: 'center',
                fontWeight: activeTab === 'overview' ? 600 : 'normal'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'overview') {
                  e.currentTarget.style.color = '#dc3545';
                  e.currentTarget.style.background = 'rgba(220, 53, 69, 0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'overview') {
                  e.currentTarget.style.color = '#666';
                  e.currentTarget.style.background = 'none';
                }
              }}
            >
              <BarChart3 size={18} className="me-2" />
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
              <Calendar size={18} className="me-2" />
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
              <Users size={18} className="me-2" />
              {t('nav.patients')}
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link btn ${activeTab === 'medications' ? 'active' : ''}`}
              onClick={() => setActiveTab('medications')}
              style={{
                color: activeTab === 'medications' ? '#dc3545' : '#666',
                background: activeTab === 'medications' ? 'rgba(220, 53, 69, 0.1)' : 'none',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                transition: 'all 0.3s ease',
                margin: '0 4px',
                display: 'flex',
                alignItems: 'center',
                fontWeight: activeTab === 'medications' ? 600 : 'normal'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'medications') {
                  e.currentTarget.style.color = '#dc3545';
                  e.currentTarget.style.background = 'rgba(220, 53, 69, 0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'medications') {
                  e.currentTarget.style.color = '#666';
                  e.currentTarget.style.background = 'none';
                }
              }}
            >
              <Pill size={18} className="me-2" />
              {t('nav.medications')}
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link btn ${activeTab === 'doctors' ? 'active' : ''}`}
              onClick={() => setActiveTab('doctors')}
              style={{
                color: activeTab === 'doctors' ? '#dc3545' : '#666',
                background: activeTab === 'doctors' ? 'rgba(220, 53, 69, 0.1)' : 'none',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                transition: 'all 0.3s ease',
                margin: '0 4px',
                display: 'flex',
                alignItems: 'center',
                fontWeight: activeTab === 'doctors' ? 600 : 'normal'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'doctors') {
                  e.currentTarget.style.color = '#dc3545';
                  e.currentTarget.style.background = 'rgba(220, 53, 69, 0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'doctors') {
                  e.currentTarget.style.color = '#666';
                  e.currentTarget.style.background = 'none';
                }
              }}
            >
              <User size={18} className="me-2" />
              {t('nav.doctors')}
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link btn ${activeTab === 'walkin' ? 'active' : ''}`}
              onClick={() => setActiveTab('walkin')}
              style={{
                color: activeTab === 'walkin' ? '#dc3545' : '#666',
                background: activeTab === 'walkin' ? 'rgba(220, 53, 69, 0.1)' : 'none',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                transition: 'all 0.3s ease',
                margin: '0 4px',
                display: 'flex',
                alignItems: 'center',
                fontWeight: activeTab === 'walkin' ? 600 : 'normal'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'walkin') {
                  e.currentTarget.style.color = '#dc3545';
                  e.currentTarget.style.background = 'rgba(220, 53, 69, 0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'walkin') {
                  e.currentTarget.style.color = '#666';
                  e.currentTarget.style.background = 'none';
                }
              }}
            >
              <UserPlus size={18} className="me-2" />
              {t('nav.walkin_patients', 'Walk-in Patients')}
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
                  backgroundColor: '#dc3545',
                  color: 'white'
                }}
              >
                <User size={18} />
              </div>
              <span className="fw-semibold">{user?.name || 'Clinical Staff'}</span>
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
                    <User size={20} />
                  </div>
                  <div>
                    <div className="fw-semibold">{user?.name || 'Clinical Staff'}</div>
                    <small className="text-muted">{user?.email || 'staff@hospital.com'}</small>
                    <div>
                      <small className="text-muted">Staff No: {user?.staff_no || 'CS001'}</small>
                    </div>
                  </div>
                </div>
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
                    {t('nav.notifications', 'Notifications')}
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
                  {t('nav.logout', 'Logout')}
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </nav>
);

  // Dashboard Overview Component
  const DashboardOverview: React.FC = () => (
  <div className="container-fluid py-4">
    <div className="row g-4">
      {/* Welcome Card */}
      <div className="col-12">
        <div
          className="card shadow-sm border-0"
          style={{
            borderRadius: '1rem',
            background: 'linear-gradient(135deg, #E53E3E 0%, #C53030 100%)',
          }}
        >
          <div className="card-body p-4 text-white">
            <div className="row align-items-center">
              <div className="col-md-8">
                <h3 className="mb-2">
                  {t('dashboard.welcome', {
                    name: user?.name || 'Clinical Staff',
                  })}
                </h3>
                <div className="d-flex align-items-center mb-1">
                  <User size={16} className="me-2 opacity-75" />
                  <span className="opacity-90">
                    Staff No: {user?.staff_no || 'N/A'}
                  </span>
                </div>
                <div className="d-flex align-items-center mb-1">
                  <Stethoscope size={16} className="me-2 opacity-75" />
                  <span className="opacity-75">
                    Department: {user?.department || 'General'}
                  </span>
                </div>
              </div>
              <div className="col-md-4 text-end">
                <User size={80} className="opacity-75" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
        <div className="col-md-3">
          <div
            className="card text-center border-0 shadow-sm"
            style={{ borderRadius: '0.75rem' }}
          >
            <div className="card-body">
              <Calendar size={32} className="text-primary mb-2" />
              <h4 className="fw-bold mb-1">
                {dashboardData.today_overview?.scheduled_appointments ?? 0}
              </h4>
              <p className="text-muted mb-0">
                {t('dashboard.scheduled_appointments', 'Scheduled Appointments')}
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div
            className="card text-center border-0 shadow-sm"
            style={{ borderRadius: '0.75rem' }}
          >
            <div className="card-body">
              <FileText size={32} className="text-info mb-2" />
              <h4 className="fw-bold mb-1">
                {dashboardData.today_overview?.pending_student_requests ?? 0}
              </h4>
              <p className="text-muted mb-0">
                Pending Requests
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div
            className="card text-center border-0 shadow-sm"
            style={{ borderRadius: '0.75rem' }}
          >
            <div className="card-body">
              <ClipboardList size={32} className="text-warning mb-2" />
              <h4 className="fw-bold mb-1">
                {dashboardData.today_overview?.pending_tasks ?? 0}
              </h4>
              <p className="text-muted mb-0">
                {t('dashboard.pending_tasks', 'Pending Tasks')}
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div
            className="card text-center border-0 shadow-sm"
            style={{ borderRadius: '0.75rem' }}
          >
            <div className="card-body">
              <AlertTriangle size={32} className="text-danger mb-2" />
              <h4 className="fw-bold mb-1">
                {dashboardData.today_overview?.urgent_cases ?? 0}
              </h4>
              <p className="text-muted mb-0">
                {t('dashboard.urgent_cases', 'Urgent Cases')}
              </p>
            </div>
          </div>
        </div>

      {/* Patient Queue */}
      <div className="col-12">
        <div
          className="card shadow-sm border-0"
          style={{ borderRadius: '1rem' }}
        >
          <div className="card-header bg-white border-0">
            <h5 className="fw-bold mb-0">Patient Queue</h5>
          </div>
          <div className="card-body">
            {dashboardData.patient_queue.length === 0 ? (
              <div className="text-muted text-center py-4">
                <Users size={32} className="mb-2" />
                <div>No patients in queue</div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Patient</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Doctor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.patient_queue.map((queueItem) => (
                      <tr key={queueItem.id}>
                        <td>{queueItem.time}</td>
                        <td>
                          {queueItem.patient_name} ({queueItem.student_id})
                        </td>
                        <td>
                          <span className={getStatusBadge(queueItem.status)}>
                            {queueItem.status}
                          </span>
                        </td>
                        <td>
                          <span
                            className={getPriorityBadge(queueItem.priority)}
                          >
                            {queueItem.priority}
                          </span>
                        </td>
                        <td>{queueItem.assigned_doctor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pending Student Requests */}
      <div className="col-12">
        <div
          className="card shadow-sm border-0"
          style={{ borderRadius: '1rem' }}
        >
          <div className="card-header bg-white border-0 d-flex justify-content-between align-items-center">
  <h5 className="fw-bold mb-0">Pending Student Requests</h5>
  <button
    className="btn btn-primary btn-sm"
    onClick={() => setActiveTab('appointments')}
    style={{ borderRadius: '0.5rem' }}
  >
    View All in Appointments
  </button>
</div>

          <div className="card-body">
            {studentRequests.length === 0 ? (
              <div className="text-muted text-center py-4">
                <FileText size={32} className="mb-2" />
                <div>No pending student requests</div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Requested Date</th>
                      <th>Specialization</th>
                      <th>Urgency</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentRequests.map((request) => (
                      <tr key={request.id}>
                        <td>{request.patient?.name}</td>
                        <td>
                          {request.date} {request.time}
                        </td>
                        <td>{request.specialization || 'General'}</td>
                        <td>
                          <span
                            className={getPriorityBadge(
                              request.priority || 'normal'
                            )}
                          >
                            {request.priority || 'normal'}
                          </span>
                        </td>
                        <td>
                          <span className={getStatusBadge(request.status)}>
                            {request.status}
                          </span>
                        </td>
                        <td>
  <button 
    className="btn btn-sm btn-outline-primary"
    onClick={() => setActiveTab('appointments')}
  >
    View Details
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
  </div>
);


// Appointments Tab Component
// Fixed AppointmentsTab Component - Replace the existing one in ClinicalStaffDashboard.tsx

const AppointmentsTab: React.FC = () => {
  // Combine appointments and student requests for display
  const combinedAppointments = useMemo(() => {
    const regularAppointments = appointments.map(apt => ({ ...apt, isStudentRequest: false }));
    const studentRequestAppointments = studentRequests.map(request => ({
      ...request,
      isStudentRequest: true,
      patient: request.patient ? {
        name: request.patient.name,
        student_id: request.patient.student_id || 'N/A',
        department: request.patient.department || 'N/A'
      } : {
        name: 'Unknown',
        student_id: 'N/A',
        department: 'N/A'
      },
      doctor: 'To be assigned',
      type: request.appointment_type || 'Student Request',
      appointment_type: request.appointment_type || 'Student Request',
      // FIX: Properly preserve the urgency/priority from the request
      priority: request.priority || request.urgency || 'normal', // Check both fields and preserve original value
      status: request.status || 'pending',
      date: request.date || request.requested_date,
      time: request.time || request.requested_time,
      reason: request.reason || request.message
    }));
    
    return [...regularAppointments, ...studentRequestAppointments].sort((a, b) => {
      // Sort by date, then by time
      const dateCompare = new Date(a.date || '1970-01-01').getTime() - new Date(b.date || '1970-01-01').getTime();
      if (dateCompare !== 0) return dateCompare;
      return (a.time || '00:00').localeCompare(b.time || '00:00');
    });
  }, [appointments, studentRequests]);

  return (
    <div className="container-fluid py-4">
      <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
        <div className="card-header" style={{ background: 'linear-gradient(135deg, #cf5454ff 0%, #fc4e4eff 100%)' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h3 className="card-title text-white mb-0 d-flex align-items-center">
              <Calendar size={24} className="me-2" />
              {t('appointments.management', 'Appointments Management')}
            </h3>
            <button 
              onClick={() => {
                setFormData({
                  patient_id: '',
                  doctor_id: '',
                  appointment_date: '',
                  appointment_time: '',
                  appointment_type: 'consultation',
                  priority: 'normal',
                  reason: ''
                });
                setShowModal('createAppointment');
              }}
              className="btn btn-light"
              style={{ borderRadius: '0.5rem' }}
            >
              <Plus size={16} className="me-1" />
              Schedule Appointment
            </button>
          </div>
        </div>
        <div className="card-body p-4">
          {/* Enhanced Filters */}
          <div className="row mb-4">
            <div className="col-md-3">
              <select
                className="form-select"
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
              >
                <option value="all">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="pending">Pending (Student Requests)</option>
                <option value="under_review">Under Review</option>
              </select>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={filters.priority}
                onChange={(e) => setFilters({...filters, priority: e.target.value})}
              >
                <option value="all">All Priorities</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="col-md-3">
              <button 
                onClick={() => {
                  loadAppointments();
                  loadStudentRequests();
                }}
                className="btn btn-primary"
              >
                <Filter size={16} className="me-1" />
                Apply Filters
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Patient</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Appointment Type</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Doctor</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </td>
                  </tr>
                ) : combinedAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-5 text-muted">
                      <Calendar size={48} className="text-muted mb-3" />
                      <p className="text-muted">No appointments or requests found</p>
                      <small className="text-muted">Try adjusting your filters</small>
                    </td>
                  </tr>
                ) : (
                  combinedAppointments
                    .filter(apt => {
                      // Apply filters
                      const statusMatch = filters.status === 'all' || apt.status === filters.status;
                      const priorityMatch = filters.priority === 'all' || (apt.priority || 'normal') === filters.priority;
                      return statusMatch && priorityMatch;
                    })
                    .map((apt) => {
                      // Debug log to check priority values
                      console.log('Appointment priority debug:', {
                        id: apt.id,
                        isStudentRequest: apt.isStudentRequest,
                        priority: apt.priority,
                        urgency: apt.urgency,
                        originalRequest: apt.isStudentRequest ? studentRequests.find(r => r.id === apt.id) : null
                      });
                      
                      return (
                        <tr key={`${apt.isStudentRequest ? 'request' : 'appointment'}-${apt.id}`}>
                          <td>
                            <span className={`badge ${apt.isStudentRequest ? 'bg-info' : 'bg-primary'}`}>
                              {apt.isStudentRequest ? 'Student Request' : 'Appointment'}
                            </span>
                          </td>
                          <td>
                            <div>
                              <strong>{apt.patient?.name || 'Unknown Patient'}</strong>
                              <br />
                              <small className="text-muted">{apt.patient?.student_id || 'N/A'}</small>
                            </div>
                          </td>
                          <td>{apt.date || 'Not set'}</td>
                          <td>{apt.time || 'Not set'}</td>
                          <td>
                            <span className="badge bg-info text-dark">
                              {apt.type || apt.appointment_type || 'General'}
                            </span>
                          </td>
                          <td>
                            <span className={getStatusBadge(apt.status)}>
                              {getStatusText(apt.status)}
                            </span>
                          </td>
                          <td>
                            {/* FIX: Display the correct priority with proper styling */}
                            <span className={getPriorityBadge(apt.priority || 'normal')}>
                              {(apt.priority || 'normal').toUpperCase()}
                            </span>
                          </td>
                          <td>
                            {typeof apt.doctor === 'string' 
                              ? apt.doctor 
                              : apt.doctor?.name || 'Unassigned'
                            }
                          </td>
                          <td>
                            <div className="btn-group btn-group-sm" role="group">
                              {apt.isStudentRequest ? (
                                <>
                                  <button 
                                    className="btn btn-outline-success"
                                    onClick={() => {
                                      setFormData({
                                        ...apt,
                                        appointmentId: apt.id,
                                        action: 'assign'
                                      });
                                      setShowModal('assignRequest');
                                    }}
                                  >
                                    Assign
                                  </button>
                                  <button 
                                    className="btn btn-outline-warning"
                                    onClick={() => {
                                      setFormData({
                                        ...apt,
                                        appointmentId: apt.id,
                                        action: 'review'
                                      });
                                      setShowModal('reviewRequest');
                                    }}
                                  >
                                    Review
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button 
                                    className="btn btn-outline-primary"
                                    onClick={() => {
                                      setFormData({...apt});
                                      setShowModal('editAppointment');
                                    }}
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button 
                                    className="btn btn-outline-success"
                                    onClick={() => {
                                      setFormData({ appointmentId: apt.id, method: 'sms' });
                                      setShowModal('confirm');
                                    }}
                                  >
                                    <Check size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

  // Patients Tab Component
  const PatientsTab: React.FC = () => (
    <div className="container-fluid py-4">
      <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
        <div className="card-header" style={{ background: 'linear-gradient(135deg, #e85555ff 0%, #d43434ff 100%)' }}>
          <h3 className="card-title text-white mb-0 d-flex align-items-center">
            <Users size={24} className="me-2" />
            {t('patients.management')}
          </h3>
        </div>
        <div className="card-body p-4">
          {/* Search */}
          <div className="row mb-4">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  placeholder="Search patients..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="form-control"
                />
              </div>
            </div>
          </div>

          {/* Patients List */}
          <div className="row g-4">
            {loading ? (
              <div className="col-12 text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="text-muted mt-2">Loading patients...</p>
              </div>
            ) : patients.length === 0 ? (
              <div className="col-12 text-center py-5">
                <Users size={48} className="text-muted mb-3" />
                <p className="text-muted">No patients found</p>
                <small className="text-muted">Try adjusting your search term</small>
              </div>
            ) : (
              patients.filter((patient: Patient) => 
                patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                patient.student_id?.includes(searchTerm) || false
              ).map((patient) => (
                <div key={patient.id} className="col-md-6 col-lg-4 col-xl-3">
                  <div className="card h-100 shadow-sm border-0" style={{ borderRadius: '1rem' }}>
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="card-title fw-semibold mb-0">{patient.name}</h5>
                        <span className={`${getStatusBadge(patient.status)}`}>
                          {patient.status}
                        </span>
                      </div>
                      <div className="text-muted small mb-3">
                        <p className="mb-1"><strong>ID:</strong> {patient.student_id}</p>
                        <p className="mb-1"><strong>Age:</strong> {patient.age}</p>
                        <p className="mb-1"><strong>Department:</strong> {patient.department}</p>
                        <p className="mb-0"><strong>Doctor:</strong> {patient.assigned_doctor || 'Unassigned'}</p>
                      </div>
                      <div className="d-flex gap-2">
                        <button 
  onClick={() => {
    setSelectedPatient(patient);
    setFormData({
      blood_pressure_systolic: '',
      blood_pressure_diastolic: '',
      heart_rate: '',
      temperature: '',
      temperature_unit: 'C',
      respiratory_rate: '',
      oxygen_saturation: '',
      notes: ''
    });
    setShowModal('vitals');
  }}
  className="btn btn-sm btn-outline-primary flex-grow-1"
  style={{ borderRadius: '0.5rem' }}
>
  <Heart size={16} className="me-1" />
  Vitals
</button>
                        <button 
                          onClick={() => {
                            setSelectedPatient(patient);
                            setShowModal('medication');
                          }}
                          className="btn btn-sm btn-outline-success flex-grow-1"
                          style={{ borderRadius: '0.5rem' }}
                        >
                          <Pill size={16} className="me-1" />
                          Meds
                        </button>
                        <button 
                          className="btn btn-sm btn-outline-info flex-grow-1"
                          style={{ borderRadius: '0.5rem' }}
                        >
                          <FileText size={16} className="me-1" />
                          Card
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Medications Tab Component
  const MedicationsTab: React.FC = () => (
    <div className="container-fluid py-4">
      <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
        <div className="card-header" style={{ background: 'linear-gradient(135deg, #e95454ff 0%, #e13737ff 100%)' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h3 className="card-title text-white mb-0 d-flex align-items-center">
              <Pill size={24} className="me-2" />
              {t('medications.schedule')}
            </h3>
            <button 
              onClick={() => setShowModal('addMedication')}
              className="btn btn-sm btn-light"
              style={{ borderRadius: '0.5rem' }}
            >
              <Plus size={16} className="me-1" />
              Add Medication
            </button>
          </div>
        </div>
        <div className="card-body p-4">
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th scope="col">Medication</th>
                  <th scope="col">Dosage</th>
                  <th scope="col">Frequency</th>
                  <th scope="col">Start Date</th>
                  <th scope="col">End Date</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </td>
                  </tr>
                ) : medicationSchedule.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-muted">
                      <Pill size={48} className="text-muted mb-3" />
                      <p className="text-muted">No medications found</p>
                      <small className="text-muted">Add medications to see them here</small>
                    </td>
                  </tr>
                ) : (
                  medicationSchedule.map((medication) => (
                    <tr key={medication.id}>
                      <td>
                        <strong>{medication.name || medication.medication_name}</strong>
                        {medication.generic || medication.generic_name ? (
                          <div className="text-muted small">{medication.generic || medication.generic_name}</div>
                        ) : null}
                      </td>
                      <td>{medication.dosage}</td>
                      <td>{medication.frequency}</td>
                      <td>{medication.start_date ? new Date(medication.start_date).toLocaleDateString() : 'N/A'}</td>
                      <td>{medication.end_date ? new Date(medication.end_date).toLocaleDateString() : 'Ongoing'}</td>
                      <td>
                        <span className={`badge ${medication.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>
                          {medication.status}
                        </span>
                      </td>
                      <td>
                        <button 
                          onClick={() => {
                            setSelectedMedication(medication);
                            setShowModal('editMedication');
                          }}
                          className="btn btn-sm btn-outline-primary me-2"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          className="btn btn-sm btn-outline-danger"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  // Doctors Tab Component
  const DoctorsTab: React.FC = () => (
    <div className="container-fluid py-4">
      <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
        <div className="card-header" style={{ background: 'linear-gradient(135deg, #ea6666ff 0%, #ed4141ff 100%)' }}>
          <h3 className="card-title text-white mb-0 d-flex align-items-center">
            <User size={24} className="me-2" />
            Available Doctors
          </h3>
        </div>
        <div className="card-body p-4">
          <div className="row g-4">
            {loading ? (
              <div className="col-12 text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="text-muted mt-2">Loading doctors...</p>
              </div>
            ) : doctors.length === 0 ? (
              <div className="col-12 text-center py-5">
                <User size={48} className="text-muted mb-3" />
                <p className="text-muted">No doctors found</p>
              </div>
            ) : (
              doctors.map((doctor) => (
                <div key={doctor.id} className="col-md-6 col-lg-4">
                  <div className="card h-100 shadow-sm border-0">
                    <div className="card-body">
                      <h5 className="card-title fw-semibold">
                        {doctor.name || doctor.full_name}
                      </h5>
                      <div className="text-muted small mb-3">
                        <p className="mb-1"><strong>Specialization:</strong> {doctor.specialty}</p>
                        <p className="mb-1"><strong>Department:</strong> {doctor.department}</p>
                        <p className="mb-1"><strong>Phone:</strong> {doctor.phone}</p>
                        <p className="mb-0"><strong>Email:</strong> {doctor.email}</p>
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                        <span className={`badge ${(doctor.status || 'active') === 'active' ? 'bg-success' : 'bg-secondary'}`}>
                          {doctor.status || 'active'}
                        </span>
                        <button 
                          className="btn btn-sm btn-primary"
                          style={{ borderRadius: '0.5rem' }}
                        >
                          Book Appointment
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
  <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa', paddingTop: '90px' }}>
      {/* Navigation */}
      <Navigation />

      {/* Message Display */}
      {message.text && (
        <div className="container-fluid px-4 pt-3">
          <div className={`alert ${message.type === 'success' ? 'alert-success' : message.type === 'error' ? 'alert-danger' : 'alert-warning'} alert-dismissible fade show`} 
               role="alert">
            <div className="d-flex align-items-center">
              {message.type === 'success' ? <CheckCircle size={20} className="me-2" /> : <X size={20} className="me-2" />}
              <div style={{ whiteSpace: 'pre-line' }}>{message.text}</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {activeTab === 'overview' && <DashboardOverview />}
      {activeTab === 'appointments' && <AppointmentsTab />}
      {activeTab === 'patients' && <PatientsTab />}
      {activeTab === 'medications' && <MedicationsTab />}
      {activeTab === 'doctors' && <DoctorsTab />}
      {activeTab === 'walkin' && (
  <WalkInPatientManagement 
    userRole="clinical_staff" 
    websocketService={websocketService}
  />
)}

           {/* Modals */}
      {showModal === 'createAppointment' && (
        <Modal title="Schedule New Appointment" onClose={() => setShowModal('')}>
          <form onSubmit={(e) => {
            e.preventDefault();
            createAppointment(formData);
          }}>
            <div className="mb-3">
              <label className="form-label">Patient <span className="text-danger">*</span></label>
              <select
                className="form-select"
                value={formData.patient_id || ''}
                onChange={(e) => setFormData({...formData, patient_id: e.target.value})}
                required
              >
                <option value="">Select Patient</option>
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name} ({patient.student_id})
                  </option>
                ))}
              </select>
            </div>
            
            {/* Date and Time selection */}
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <label className="form-label">Date <span className="text-danger">*</span></label>
                <input
                  type="date"
                  className="form-control"
                  value={formData.appointment_date || ''}
                  onChange={async (e) => {
                    const newFormData = { ...formData, appointment_date: e.target.value };
                    setFormData(newFormData);
                    
                    // Load available doctors when date changes
                    if (e.target.value && formData.appointment_time) {
                      await checkDoctorAvailability(e.target.value, formData.appointment_time);
                    }
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Time <span className="text-danger">*</span></label>
                <input
                  type="time"
                  className="form-control"
                  value={formData.appointment_time || ''}
                  onChange={async (e) => {
                    const newFormData = { ...formData, appointment_time: e.target.value };
                    setFormData(newFormData);
                    
                    // Load available doctors when time changes
                    if (e.target.value && formData.appointment_date) {
                      await checkDoctorAvailability(formData.appointment_date, e.target.value);
                    }
                  }}
                  required
                />
              </div>
            </div>
            
            {/* Quick Time Slots Component - Placeholder for now */}
            <div className="mb-3">
              <label className="form-label">Quick Time Slots</label>
              <div className="d-flex flex-wrap gap-2">
                {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'].map((time) => (
                  <button
                    key={time}
                    type="button"
                    className={`btn btn-sm ${formData.appointment_time === time ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={async () => {
                      const newFormData = { ...formData, appointment_time: time };
                      setFormData(newFormData);
                      if (formData.appointment_date) {
                        await checkDoctorAvailability(formData.appointment_date, time);
                      }
                    }}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Doctor selection - shows available doctors based on date/time */}
            <div className="mb-3">
              <label className="form-label">Available Doctors <span className="text-danger">*</span></label>
              <select
                className="form-select"
                value={formData.doctor_id || ''}
                onChange={(e) => setFormData({...formData, doctor_id: e.target.value})}
                required
                disabled={!formData.appointment_date || !formData.appointment_time}
              >
                <option value="">
                  {!formData.appointment_date || !formData.appointment_time 
                    ? 'Select date and time first' 
                    : availableDoctors.length === 0 
                    ? 'No doctors available for selected time' 
                    : 'Select Doctor'}
                </option>
                {availableDoctors.map(doctor => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name || doctor.full_name} - {doctor.specialty || doctor.specialization} ({doctor.department})
                    {doctor.availability_status && ` - ${doctor.availability_status}`}
                  </option>
                ))}
              </select>
              {formData.appointment_date && formData.appointment_time && availableDoctors.length === 0 && (
                <small className="text-warning">
                  No doctors are available at the selected date and time. Please choose a different slot.
                </small>
              )}
            </div>
            
            {/* Rest of form fields */}
            <div className="mb-3">
              <label className="form-label">Appointment Type <span className="text-danger">*</span></label>
              <select
                className="form-select"
                value={formData.appointment_type || ''}
                onChange={(e) => setFormData({...formData, appointment_type: e.target.value})}
                required
              >
                <option value="">Select Type</option>
                <option value="consultation">Consultation</option>
                <option value="follow_up">Follow-up</option>
                <option value="emergency">Emergency</option>
                <option value="vaccination">Vaccination</option>
                <option value="blood_test">Blood Test</option>
                <option value="physical_therapy">Physical Therapy</option>
              </select>
            </div>
            
            <div className="mb-3">
              <label className="form-label">Priority</label>
              <select
                className="form-select"
                value={formData.priority || 'normal'}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label">Notes</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Any additional notes or symptoms..."
                value={formData.notes || ''}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              ></textarea>
            </div>
            <div className="d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal('')}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Schedule Appointment
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showModal === 'editAppointment' && (
        <Modal title="Edit Appointment" onClose={() => setShowModal('')}>
          <form onSubmit={(e) => {
            e.preventDefault();
            updateAppointment(formData.id, formData);
          }}>
            <div className="mb-3">
              <label className="form-label">Patient</label>
              <input
                type="text"
                className="form-control"
                value={formData.patient?.name || ''}
                disabled
              />
            </div>
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={formData.date || ''}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Time</label>
                <input
                  type="time"
                  className="form-control"
                  value={formData.time || ''}
                  onChange={(e) => setFormData({...formData, time: e.target.value})}
                  required
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Appointment Type</label>
              <select
                className="form-select"
                value={formData.type || ''}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                required
              >
                <option value="consultation">Consultation</option>
                <option value="follow_up">Follow-up</option>
                <option value="emergency">Emergency</option>
                <option value="vaccination">Vaccination</option>
                <option value="blood_test">Blood Test</option>
                <option value="physical_therapy">Physical Therapy</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={formData.status || 'scheduled'}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
              >
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label">Priority</label>
              <select
                className="form-select"
                value={formData.priority || 'normal'}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label">Notes</label>
              <textarea
                className="form-control"
                rows={3}
                value={formData.reason || ''}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
              ></textarea>
            </div>
            <div className="d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal('')}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Update Appointment
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showModal === 'confirm' && (
        <Modal title="Confirm Appointment" onClose={() => setShowModal('')}>
          <form onSubmit={(e) => {
            e.preventDefault();
            confirmAppointment(formData.appointmentId, formData.method);
          }}>
            <div className="mb-3">
              <label className="form-label">Confirmation Method</label>
              <select
                className="form-select"
                value={formData.method || 'sms'}
                onChange={(e) => setFormData({...formData, method: e.target.value})}
                required
              >
                <option value="sms">SMS</option>
                <option value="email">Email</option>
                <option value="both">Both SMS and Email</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label">Custom Message (Optional)</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Custom confirmation message..."
                value={formData.custom_message || ''}
                onChange={(e) => setFormData({...formData, custom_message: e.target.value})}
              ></textarea>
            </div>
            <div className="d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal('')}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Send Confirmation
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showModal === 'vitals' && selectedPatient && (
        <Modal title={`Record Vital Signs - ${selectedPatient.name}`} onClose={() => setShowModal('')}>
          <form onSubmit={(e) => {
            e.preventDefault();
            updateVitals(selectedPatient.id, formData);
          }}>
            <div className="row g-3">
  <div className="col-md-6">
    <label className="form-label">Systolic BP (mmHg) *</label>
    <input
      type="number"
      className="form-control"
      placeholder="120"
      min="60"
      max="250"
      value={formData.blood_pressure_systolic || ''}
      onChange={(e) => setFormData({...formData, blood_pressure_systolic: e.target.value})}
      required
    />
  </div>
  <div className="col-md-6">
    <label className="form-label">Diastolic BP (mmHg) *</label>
    <input
      type="number"
      className="form-control"
      placeholder="80"
      min="40"
      max="150"
      value={formData.blood_pressure_diastolic || ''}
      onChange={(e) => setFormData({...formData, blood_pressure_diastolic: e.target.value})}
      required
    />
  </div>
  <div className="col-md-6">
    <label className="form-label">Heart Rate (bpm) *</label>
    <input
      type="number"
      className="form-control"
      placeholder="72"
      min="30"
      max="200"
      value={formData.heart_rate || ''}
      onChange={(e) => setFormData({...formData, heart_rate: e.target.value})}
      required
    />
  </div>
  <div className="col-md-4">
    <label className="form-label">Temperature *</label>
    <input
      type="number"
      step="0.1"
      className="form-control"
      placeholder="36.6"
      min="30"
      max="45"
      value={formData.temperature || ''}
      onChange={(e) => setFormData({...formData, temperature: e.target.value})}
      required
    />
  </div>
  <div className="col-md-2">
    <label className="form-label">Unit *</label>
    <select
      className="form-select"
      value={formData.temperature_unit || 'C'}
      onChange={(e) => setFormData({...formData, temperature_unit: e.target.value})}
      required
    >
      <option value="C">°C</option>
      <option value="F">°F</option>
    </select>
  </div>
  <div className="col-md-6">
    <label className="form-label">Respiratory Rate (breaths/min)</label>
    <input
      type="number"
      className="form-control"
      placeholder="16"
      min="8"
      max="40"
      value={formData.respiratory_rate || ''}
      onChange={(e) => setFormData({...formData, respiratory_rate: e.target.value})}
    />
  </div>
  <div className="col-md-6">
    <label className="form-label">Oxygen Saturation (%)</label>
    <input
      type="number"
      className="form-control"
      placeholder="98"
      min="70"
      max="100"
      value={formData.oxygen_saturation || ''}
      onChange={(e) => setFormData({...formData, oxygen_saturation: e.target.value})}
    />
  </div>
  <div className="col-12">
    <label className="form-label">Notes</label>
    <textarea
      className="form-control"
      rows={3}
      placeholder="Any observations or concerns..."
      value={formData.notes || ''}
      onChange={(e) => setFormData({...formData, notes: e.target.value})}
    />
  </div>
</div>
            <div className="d-flex justify-content-end gap-2 mt-4">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal('')}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Record Vitals
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showModal === 'medication' && selectedPatient && (
        <Modal title={`Record Medication - ${selectedPatient.name}`} onClose={() => setShowModal('')}>
          <form onSubmit={(e) => {
            e.preventDefault();
            recordMedication(selectedPatient.id, formData);
          }}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Medication Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.medication_name || ''}
                  onChange={(e) => setFormData({...formData, medication_name: e.target.value})}
                  required
                />
              </div>
              <div className="col-md-6">
  <label className="form-label">Administration Time *</label>
  <input
    type="datetime-local"
    className="form-control"
    value={formData.administration_time || ''}
    onChange={(e) => setFormData({...formData, administration_time: e.target.value})}
    required
  />
</div>

<div className="col-md-6">
  <label className="form-label">Prescribing Doctor *</label>
  <input
    type="text"
    className="form-control"
    value={formData.prescribing_doctor || ''}
    onChange={(e) => setFormData({...formData, prescribing_doctor: e.target.value})}
    required
  />
</div>
              <div className="col-md-6">
                <label className="form-label">Dosage *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., 500mg, 1 tablet"
                  value={formData.dosage || ''}
                  onChange={(e) => setFormData({...formData, dosage: e.target.value})}
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Frequency *</label>
                <select
                  className="form-select"
                  value={formData.frequency || 'daily'}
                  onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                  required
                >
                  <option value="daily">Daily</option>
                  <option value="twice_daily">Twice Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="as_needed">As Needed</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Route *</label>
                <select
                  className="form-select"
                  value={formData.route || 'oral'}
                  onChange={(e) => setFormData({...formData, route: e.target.value})}
                  required
                >
                  <option value="oral">Oral</option>
                  <option value="topical">Topical</option>
                  <option value="injection">Injection</option>
                  <option value="inhalation">Inhalation</option>
                  <option value="sublingual">Sublingual</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Start Date *</label>
                <input
                  type="date"
                  className="form-control"
                  value={formData.start_date || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={formData.end_date || ''}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                />
              </div>
              <div className="col-12">
                <label className="form-label">Instructions</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Special instructions for the patient..."
                  value={formData.instructions || ''}
                  onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                />
              </div>
            </div>
            <div className="d-flex justify-content-end gap-2 mt-4">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal('')}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Record Medication
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showModal === 'viewMedicalCard' && (
        <Modal title="Medical Card" onClose={() => setShowModal('')}>
          <div className="card mb-3">
            <div className="card-header bg-light">
              <h5 className="mb-0">Patient Information</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <p><strong>Name:</strong> {formData.patient_name}</p>
                  <p><strong>Student ID:</strong> {formData.student_id}</p>
                  <p><strong>Date of Birth:</strong> {formData.date_of_birth}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>Blood Type:</strong> {formData.blood_type || 'Unknown'}</p>
                  <p><strong>Allergies:</strong> {formData.allergies || 'None recorded'}</p>
                  <p><strong>Chronic Conditions:</strong> {formData.chronic_conditions || 'None recorded'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-header bg-light">
              <h5 className="mb-0">Emergency Contact</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <p><strong>Name:</strong> {formData.emergency_contact_name}</p>
                  <p><strong>Relationship:</strong> {formData.emergency_contact_relationship}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>Phone:</strong> {formData.emergency_contact_phone}</p>
                  <p><strong>Email:</strong> {formData.emergency_contact_email || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header bg-light">
              <h5 className="mb-0">Medical Notes</h5>
            </div>
            <div className="card-body">
              <p>{formData.medical_notes || 'No additional medical notes.'}</p>
            </div>
          </div>

          <div className="d-flex justify-content-end mt-3">
            <button 
              className="btn btn-outline-secondary" 
              onClick={() => setShowModal('')}
            >
              Close
            </button>
          </div>
        </Modal>
      )}

      {showModal === 'addMedication' && (
        <Modal title="Add New Medication" onClose={() => setShowModal('')}>
          <MedicationForm 
            onSubmit={async (data) => {
              try {
                setLoading(true);
                await api.post('medications', data);
                setMessage({ type: 'success', text: 'Medication added successfully!' });
                loadMedicationSchedule();
                setShowModal('');
              } catch (error) {
                console.error('Error adding medication:', error);
                setMessage({ type: 'error', text: `Error adding medication: ${(error as Error).message}` });
              } finally {
                setLoading(false);
              }
            }}
          />
        </Modal>
      )}

      {showModal === 'editMedication' && selectedMedication && (
        <Modal title="Edit Medication" onClose={() => setShowModal('')}>
          <MedicationForm 
            initialData={selectedMedication}
            onSubmit={async (data) => {
              try {
                setLoading(true);
                await api.put(`medications/${selectedMedication.id}`, data);
                setMessage({ type: 'success', text: 'Medication updated successfully!' });
                loadMedicationSchedule();
                setShowModal('');
              } catch (error) {
                console.error('Error updating medication:', error);
                setMessage({ type: 'error', text: `Error updating medication: ${(error as Error).message}` });
              } finally {
                setLoading(false);
              }
            }}
          />
        </Modal>
      )}

      {/* Add these new modals */}
{showModal === 'assignRequest' && (
  <Modal title="Assign Student Request" onClose={() => setShowModal('')}>
    <form onSubmit={async (e) => {
      e.preventDefault();
      try {
        setLoading(true);
        await api.post(`student-requests/${formData.appointmentId}/assign`, {
          doctor_id: formData.doctor_id,
          notes: formData.notes
        });
        setMessage({ type: 'success', text: 'Student request assigned successfully!' });
        loadStudentRequests();
        loadAppointments();
        setShowModal('');
      } catch (error) {
        setMessage({ type: 'error', text: `Error assigning request: ${(error as Error).message}` });
      } finally {
        setLoading(false);
      }
    }}>
      <div className="mb-3">
        <label className="form-label">Student</label>
        <input
          type="text"
          className="form-control"
          value={formData.patient?.name || 'Unknown Student'}
          disabled
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Assign to Doctor *</label>
        <select
          className="form-select"
          value={formData.doctor_id || ''}
          onChange={(e) => setFormData({...formData, doctor_id: e.target.value})}
          required
        >
          <option value="">Select Doctor</option>
          {doctors.map(doctor => (
            <option key={doctor.id} value={doctor.id}>
              {doctor.name} - {doctor.specialty} ({doctor.department})
            </option>
          ))}
        </select>
      </div>
      <div className="mb-3">
        <label className="form-label">Notes</label>
        <textarea
          className="form-control"
          rows={3}
          value={formData.notes || ''}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
        />
      </div>
      <div className="d-flex justify-content-end gap-2">
        <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal('')}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          Assign Request
        </button>
      </div>
    </form>
  </Modal>
)}

{showModal === 'reviewRequest' && (
  <Modal title="Review Student Request" onClose={() => setShowModal('')}>
    <div className="mb-3">
      <h6>Request Details</h6>
      <div className="card bg-light">
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <p><strong>Student:</strong> {formData.patient?.name || 'Unknown'}</p>
              <p><strong>Student ID:</strong> {formData.patient?.student_id || 'N/A'}</p>
            </div>
            <div className="col-md-6">
              <p><strong>Requested Date:</strong> {formData.date || 'Not specified'}</p>
              <p><strong>Priority:</strong> <span className={getPriorityBadge(formData.priority || 'normal')}>{formData.priority || 'normal'}</span></p>
            </div>
          </div>
          <p><strong>Reason:</strong> {formData.reason || 'No reason provided'}</p>
        </div>
      </div>
    </div>
    
    <form onSubmit={async (e) => {
      e.preventDefault();
      try {
        setLoading(true);
        if (formData.reviewAction === 'approve') {
          await api.post(`student-requests/${formData.appointmentId}/approve`, {
            doctor_id: formData.doctor_id,
            notes: formData.reviewNotes
          });
          setMessage({ type: 'success', text: 'Student request approved!' });
        } else {
          await api.post(`student-requests/${formData.appointmentId}/reject`, {
            rejection_reason: formData.rejectionReason,
            notes: formData.reviewNotes
          });
          setMessage({ type: 'success', text: 'Student request rejected!' });
        }
        loadStudentRequests();
        loadAppointments();
        setShowModal('');
      } catch (error) {
        setMessage({ type: 'error', text: `Error processing request: ${(error as Error).message}` });
      } finally {
        setLoading(false);
      }
    }}>
      <div className="mb-3">
        <label className="form-label">Action *</label>
        <select
          className="form-select"
          value={formData.reviewAction || ''}
          onChange={(e) => setFormData({...formData, reviewAction: e.target.value})}
          required
        >
          <option value="">Select Action</option>
          <option value="approve">Approve & Assign</option>
          <option value="reject">Reject</option>
        </select>
      </div>
      
      {formData.reviewAction === 'approve' && (
        <div className="mb-3">
          <label className="form-label">Assign to Doctor *</label>
          <select
            className="form-select"
            value={formData.doctor_id || ''}
            onChange={(e) => setFormData({...formData, doctor_id: e.target.value})}
            required
          >
            <option value="">Select Doctor</option>
            {doctors.map(doctor => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.name} - {doctor.specialty}
              </option>
            ))}
          </select>
        </div>
      )}
      
      {formData.reviewAction === 'reject' && (
        <div className="mb-3">
          <label className="form-label">Rejection Reason *</label>
          <textarea
            className="form-control"
            rows={3}
            value={formData.rejectionReason || ''}
            onChange={(e) => setFormData({...formData, rejectionReason: e.target.value})}
            required
          />
        </div>
      )}
      
      <div className="mb-3">
        <label className="form-label">Notes</label>
        <textarea
          className="form-control"
          rows={2}
          value={formData.reviewNotes || ''}
          onChange={(e) => setFormData({...formData, reviewNotes: e.target.value})}
        />
      </div>
      
      <div className="d-flex justify-content-end gap-2">
        <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal('')}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          {formData.reviewAction === 'approve' ? 'Approve & Assign' : 'Reject Request'}
        </button>
      </div>
    </form>
  </Modal>
)}
    </div>
  );
};

export default ClinicalStaffDashboard;