
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Calendar, Clock, Users, FileText, Heart, Pill, AlertTriangle, Plus, 
  Edit, Trash2, Check, X, Search, Filter, Bell, Stethoscope, 
  Activity, BarChart3, History, User, CheckCircle, Thermometer, 
  TrendingUp, Clipboard, ClipboardCheck, ClipboardList, UserPlus, Settings, Globe, Camera, LogOut, RotateCcw
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  ArcElement,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { APPOINTMENT_STATUSES, getStatusText, getStatusBadgeClass } from '../../constants/appointmentStatuses';
// Add imports at the top
import RealTimeDashboard from '../../components/RealTimeDashboard';
import WalkInPatientManagement from '../../components/WalkInPatientManagement';
import { useTranslation } from 'react-i18next';
import websocketService from '../../services/websocket';
import NotificationSystem from '../../components/NotificationSystem';
import PatientVitalsViewer from '../../components/clinical/PatientVitalsViewer';
import EnhancedMedicalCardViewer from '../../components/clinical/EnhancedMedicalCardViewer';
import MedicationManagement from '../../components/clinical/MedicationManagement';
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  ArcElement,
);

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
  phone?: string;
  avatar_url?: string | null;
}

interface Patient {
  id: string | number;
  name: string;
  student_id: string;
  staff_no?: string;  // ADD THIS LINE
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
  total_patients?: number;      // ADD THIS LINE
  patients_today?: number;       // ADD THIS LINE
}

interface Appointment {
  id: string | number;
  patient_id?: string | number;
  patient_name?: string;
  student_id?: string;
  doctor?: string | Doctor;
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
  created_at?: string;  // ADD THIS LINE
  updated_at?: string;  // ADD THIS LINE TOO
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
    date: string;
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

interface Holiday {
  id: string | number;
  name: string;
  start_date: string;
  end_date: string;
  type: string;
  blocks_appointments: boolean;
}

interface QuickTimeSlotsProps {
  selectedDate: string;
  onTimeSelect: (time: string) => void;
  formData: Record<string, any>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  checkDoctorAvailability: (date: string, time: string) => Promise<void>;
}

type TabType = 'overview' | 'appointments' | 'patients' | 'medications' | 'doctors' | 'walkin' | 'profile' | 'settings';

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
          <label className="form-label">Medication Name <span className="text-danger">*</span></label>
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
          <label className="form-label">Dosage <span className="text-danger">*</span></label>
          <input
            type="text"
            className="form-control"
            value={localFormData.dosage}
            onChange={(e) => setLocalFormData({...localFormData, dosage: e.target.value})}
            required
          />
        </div>
        <div className="col-md-4">
          <label className="form-label">Frequency <span className="text-danger">*</span></label>
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
          <label className="form-label">Status <span className="text-danger">*</span></label>
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
          <label className="form-label">Start Date <span className="text-danger">*</span></label>
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
  const [urgentRequests, setUrgentRequests] = useState<any[]>([]); // ADD THIS LINE


  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  const [showVitalsViewer, setShowVitalsViewer] = useState(false);
  const [showMedicalCard, setShowMedicalCard] = useState(false);
  const [showMedicationManagement, setShowMedicationManagement] = useState(false);

  const [userProfile, setUserProfile] = useState({
    staff_no: user?.staff_no || '',
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    date_of_birth: '',
    gender: '',
    avatar_url: user?.avatar_url || null,
    department: user?.department || ''
  });

  const [profileLoading, setProfileLoading] = useState<boolean>(false);
  const [profileSaving, setProfileSaving] = useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [kpiData, setKpiData] = useState<Record<string, any> | null>(null);

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
      
      // Load both dashboard data and student requests in parallel
      const [dashboardResponse, studentRequestsResponse] = await Promise.all([
        api.get<any>('dashboard'),
        api.get<any>('student-requests')
      ]);

      // Set KPI data from the response
      setKpiData(dashboardResponse.kpi_data);
      
      // Calculate pending student requests count
      const pendingStudentRequests = (studentRequestsResponse.student_requests || [])
        .filter((request: any) => ['pending', 'under_review'].includes(request.status));
      
      // Map the response to match frontend expectations
      setDashboardData({
        staff_member: dashboardResponse.staff_member || {
          name: user?.name || "Clinical Staff",
          staff_no: user?.staff_no || "CS001",
          department: user?.department || "General"
        },
        today_overview: {
          ...dashboardResponse.today_overview,
          scheduled_appointments: dashboardResponse.today_overview?.scheduled_appointments || 0,
          completed_tasks: dashboardResponse.today_overview?.completed_tasks || 0,
          pending_tasks: dashboardResponse.today_overview?.pending_tasks || 0,
          urgent_cases: dashboardResponse.today_overview?.urgent_cases || 0,
          // Add the calculated pending student requests count
          pending_student_requests: pendingStudentRequests.length
        },
        patient_queue: dashboardResponse.patient_queue || []
      });
      
      // Update student requests state as well
      setStudentRequests(studentRequestsResponse.student_requests || []);
      
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
          urgent_cases: 0,
          pending_student_requests: 0
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

  const loadUrgentRequests = async () => {
    try {
      const response = await fetch(`${CLINICAL_API_BASE}/urgent-queue`, {
        headers: { 
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });
      const data = await response.json();
      setUrgentRequests(data.urgent_requests || []);
    } catch (error) {
      console.error('Error loading urgent requests:', error);
      setUrgentRequests([]);
    }
  };


  // Chart configurations
  const appointmentsTrendData = {
    labels: kpiData?.appointments_trend?.map((item: any) => item.day) || [],
    datasets: [
      {
        label: 'Daily Appointments',
        data: kpiData?.appointments_trend?.map((item: any) => item.count) || [],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const statusDistributionData = {
    labels: kpiData?.patient_status_distribution?.map((item: any) => item.status) || [],
    datasets: [
      {
        data: kpiData?.patient_status_distribution?.map((item: any) => item.count) || [],
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)',
          'rgba(255, 99, 132, 0.8)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const priorityData = {
    labels: kpiData?.priority_distribution?.map((item: any) => item.priority) || [],
    datasets: [
      {
        data: kpiData?.priority_distribution?.map((item: any)=> item.count) || [],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)', // Normal - Green
          'rgba(249, 115, 22, 0.8)', // High - Orange  
          'rgba(239, 68, 68, 0.8)',  // Urgent - Red
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(249, 115, 22, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const departmentWorkloadData = {
    labels: kpiData?.department_workload?.map((item: any)=> item.department) || [],
    datasets: [
      {
        label: 'Appointments',
        data: (kpiData?.department_workload ?? []).map((item: any) => item.appointments),
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 1,
      },
    ],
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

  const checkDateAvailability = async (date: string): Promise<boolean> => {
  try {
    const response = await api.get(`holidays/check-availability?date=${date}&staff_type=clinical`);
    
    if (!response.is_available) {
      const blockingHoliday = response.blocking_holidays?.[0];
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
  method: 'GET',
  headers: { 
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});
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

  const createAppointment = async (): Promise<void> => {
  try {
    // Validation
    if (!formData.patient_id || !formData.appointment_date || 
        !formData.appointment_time || !formData.reason?.trim()) {
      setMessage({ type: 'error', text: t('appointments.required_fields') });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return;
    }

    // Check if appointment date is in the past
    const appointmentDate = new Date(formData.appointment_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (appointmentDate < today) {
      setMessage({ type: 'error', text: 'Cannot schedule appointments in the past' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return;
    }

    // NEW: Check if date is blocked by holidays
    if (isDateBlocked(formData.appointment_date)) {
      const blockingHoliday = holidays.find(h => 
        h.blocks_appointments && 
        formData.appointment_date >= h.start_date && 
        formData.appointment_date <= h.end_date
      );
      
      setMessage({
        type: 'error',
        text: `Selected date is not available. ${blockingHoliday ? `Reason: ${blockingHoliday.name}` : 'University holiday period'}`
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return;
    }

    // Double-check with server
    const isAvailable = await checkDateAvailability(formData.appointment_date);
    if (!isAvailable) {
      return; // Stop if date is blocked
    }

    // Check for duplicate appointments (keep your existing logic)
    const duplicateAppointment = appointments.find(apt => 
      apt.patient_id?.toString() === formData.patient_id &&
      apt.date === formData.appointment_date &&
      apt.time === formData.appointment_time &&
      apt.status !== 'cancelled'
    );

    if (duplicateAppointment) {
      setMessage({ type: 'error', text: 'This time slot is already booked' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return;
    }

    // Transform the data to match what the controller expects
    const transformedData = {
      patient_id: formData.patient_id,
      doctor_id: formData.doctor_id,
      appointment_date: formData.appointment_date,
      appointment_time: formData.appointment_time,
      appointment_type: formData.appointment_type || formData.type,
      priority: formData.priority || 'normal',
      reason: formData.reason || formData.notes,
      duration: formData.duration || 30
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

  // Add at the top of component (same as Academic Staff)
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

  const fetchProfile = async (): Promise<void> => {
  setProfileLoading(true);
  try {
    const response = await fetch(`${CLINICAL_API_BASE}/profile`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    });
    
    console.log('Profile fetch response status:', response.status);
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log('Profile data received:', data);
        setUserProfile({
          staff_no: data.staff_no || '',
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          date_of_birth: data.date_of_birth || '',
          gender: data.gender || '',
          avatar_url: data.avatar_url || null,
          department: data.department || ''
        });
      } else {
        const text = await response.text();
        console.error('Non-JSON response received:', text.substring(0, 500));
        showMessage('error', 'Server returned invalid response format');
      }
    } else {
      console.error('Failed to fetch profile. Status:', response.status);
      const errorText = await response.text();
      console.error('Error response:', errorText.substring(0, 500));
      showMessage('error', `Failed to fetch profile: ${response.status}`);
    }
  } catch (error) {
    console.error('Network error fetching profile:', error);
    showMessage('error', 'Network error fetching profile');
  } finally {
    setProfileLoading(false);
  }
};

const saveProfile = async (e?: React.FormEvent): Promise<void> => {
  e?.preventDefault();
  setProfileSaving(true);
  try {
    console.log('Saving profile with data:', userProfile);
    
    const response = await fetch(`${CLINICAL_API_BASE}/profile`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        name: userProfile.name,
        phone: userProfile.phone,
        date_of_birth: userProfile.date_of_birth,
        gender: userProfile.gender
      })
    });

    console.log('Profile save response status:', response.status);
    
    const contentType = response.headers.get('content-type');
    const responseText = await response.text();
    
    if (response.ok) {
      if (contentType && contentType.includes('application/json')) {
        const data = JSON.parse(responseText);
        showMessage('success', 'Profile updated successfully!');
        if (data.user) {
          setUserProfile(prev => ({
            ...prev,
            ...data.user
          }));
        }
      } else {
        console.error('Non-JSON success response:', responseText.substring(0, 500));
        showMessage('success', 'Profile updated (but received unexpected response)');
      }
    } else {
      console.error('Profile save failed. Status:', response.status);
      console.error('Response text:', responseText);
      
      let errorMessage = `Failed to update profile (${response.status})`;
      
      if (contentType && contentType.includes('application/json')) {
        try {
          const errorData = JSON.parse(responseText);
          if (errorData.errors) {
            const validationErrors = Object.entries(errorData.errors)
              .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
              .join('; ');
            errorMessage = `Validation errors: ${validationErrors}`;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          console.error('Failed to parse error JSON:', parseError);
        }
      } else {
        // It's HTML - show generic error
        errorMessage = 'Server error occurred. Please check the backend.';
      }
      
      showMessage('error', errorMessage);
    }
  } catch (error) {
    console.error('Network error saving profile:', error);
    showMessage('error', `Network error: ${(error as Error).message}`);
  } finally {
    setProfileSaving(false);
  }
};

  const handleImageUpload = async (file: File | null): Promise<void> => {
    if (!file) return;
    
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (file.size > maxSize) {
      showMessage('error', 'File size must be less than 5MB');
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      showMessage('error', 'Invalid file type. Please upload JPEG, PNG, GIF, or WebP');
      return;
    }
    
    setProfileSaving(true);
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/profile/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setUserProfile(prev => ({ ...prev, avatar_url: data.avatar_url }));
        showMessage('success', 'Profile photo updated successfully!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        showMessage('error', errorData.message || 'Failed to upload photo');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      showMessage('error', 'Failed to upload photo');
    } finally {
      setProfileSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePhotoRemove = async (): Promise<void> => {
  setProfileSaving(true);
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/profile/avatar`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });

    if (response.ok) {
      setUserProfile(prev => ({ ...prev, avatar_url: null }));
      showMessage('success', 'Profile photo removed successfully!');
    } else {
      const errorData = await response.json().catch(() => ({}));
      showMessage('error', errorData.message || 'Failed to remove photo');
    }
  } catch (error) {
    console.error('Error removing photo:', error);
    showMessage('error', 'Failed to remove photo');
  } finally {
    setProfileSaving(false);
  }
};

  // Helper function for displaying messages
  const showMessage = (type: 'success' | 'error', text: string): void => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
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

  const handleApproveRequest = async (
    requestId: string | number, 
    doctorId: string | number, 
    notes: string = '',
    status: string = 'waiting'
  ) => {
    try {
      setLoading(true);
      await api.post(`student-requests/${requestId}/approve`, {
        doctor_id: doctorId,
        notes,
        status
      });
      
      setMessage({ type: 'success', text: 'Student request approved and assigned!' });
      
      // Refresh all relevant data
      await Promise.all([
        loadStudentRequests(),
        loadAppointments(),
        loadDashboardData(),
        loadUrgentRequests() // ADD THIS LINE - Refresh urgent requests
      ]);
      
      // Trigger walk-in refresh
      window.dispatchEvent(new CustomEvent('refreshWalkIn'));
      
      // Switch to walk-in tab to show the assigned patient
      setActiveTab('walkin');
      
      setShowModal('');
    } catch (error) {
      console.error('Error approving request:', error);
      setMessage({ type: 'error', text: `Error approving request: ${(error as Error).message}` });
    } finally {
      setLoading(false);
    }
  };
  
  
  const QuickTimeSlots: React.FC<QuickTimeSlotsProps> = ({ selectedDate, onTimeSelect, formData, setFormData, checkDoctorAvailability }) => {
    const timeSlots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
    
    if (isDateBlocked(selectedDate)) {
      return (
        <div className="mb-3">
          <label className="form-label">Quick Time Slots</label>
          <div className="alert alert-warning" role="alert">
            <AlertTriangle size={16} className="me-2" />
            Time slots not available - selected date is blocked by university holidays
          </div>
        </div>
      );
    }

    return (
      <div className="mb-3">
        <label className="form-label">Quick Time Slots</label>
        <div className="d-flex flex-wrap gap-2">
          {timeSlots.map((time) => (
            <button
              key={time}
              type="button"
              className={`btn btn-sm ${formData.appointment_time === time ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={async () => {
                const newFormData = { ...formData, appointment_time: time };
                setFormData(newFormData);
                if (selectedDate) {
                  await checkDoctorAvailability(selectedDate, time);
                }
              }}
              disabled={isDateBlocked(selectedDate)}
            >
              {time}
            </button>
          ))}
        </div>
      </div>
    );
  };

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
        min={new Date().toISOString().split('T')[0]}
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
      <div className="alert alert-danger d-flex align-items-start" role="alert">
        <AlertTriangle size={20} className="me-2 mt-1 flex-shrink-0" />
        <div>
          <strong>Date Not Available:</strong> {blockingHoliday ? ` ${blockingHoliday.name}` : ' University holiday period'}
          <br />
          <small>Holiday period: {blockingHoliday?.start_date} to {blockingHoliday?.end_date}</small>
        </div>
      </div>
    );
  };


  // Effects
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await Promise.all([
          loadDashboardData(),
          loadPatients(),
          loadDoctors(),
          loadStudentRequests(), // Add this line
          loadUrgentRequests(),
          fetchHolidays(), // Add this line
          loadPatients()
        ]);
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };
    
    loadInitialData();
  }, []);

    // Add this useEffect to load profile when profile tab is selected
useEffect(() => {
  if (activeTab === 'profile') {
    fetchProfile();
  }
}, [activeTab]);

// Add this useEffect near your other effects
useEffect(() => {
  // This will ensure the profile photo is updated in real-time
  // when userProfile.avatar_url changes
}, [userProfile.avatar_url]);

  useEffect(() => {
  // Define the handler for dashboard stats update
  const handleDashboardUpdate = () => {
    loadDashboardData();
  };

  const connectWebSocket = () => {
    try {
      if (websocketService?.tryConnect) {
        websocketService.tryConnect();
        
        const handleConnectionChange = (connected: boolean) => {
          setIsConnected(connected);
        };
        
        const handleStudentRequestUpdate = () => {
          loadStudentRequests();
          loadDashboardData();
        };

        // Use your service's specific methods
        websocketService.onConnectionChange(handleConnectionChange);
        websocketService.onDashboardStatsUpdate(handleDashboardUpdate);
        
        // For custom events, get the underlying socket
        const socket = websocketService.getSocket();
        if (socket) {
          socket.on('student.request.created', handleStudentRequestUpdate);
          socket.on('student.request.updated', handleStudentRequestUpdate);
        }
        
        websocketService.joinChannel('clinical-staff');

        return () => {
          websocketService.offConnectionChange(handleConnectionChange);
          websocketService.off('dashboard.updated', handleDashboardUpdate);
          websocketService.off('student.request.created', handleStudentRequestUpdate);
          websocketService.off('student.request.updated', handleStudentRequestUpdate);
          websocketService.leaveChannel('clinical-staff');
        };
      }
    } catch (error) {
      console.warn('WebSocket connection failed:', error);
      setIsConnected(false);
    }
    
    return () => {};
  };

  const cleanup = connectWebSocket();
  return () => {
    if (cleanup) cleanup();
    websocketService?.disconnect();
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
      fontWeight: activeTab === 'profile' ? 600 : 'normal'
    }}
    onMouseEnter={(e) => {
      if (activeTab !== 'profile') {
        e.currentTarget.style.color = '#dc3545';
        e.currentTarget.style.background = 'rgba(220, 53, 69, 0.05)';
      }
    }}
    onMouseLeave={(e) => {
      if (activeTab !== 'profile') {
        e.currentTarget.style.color = '#666';
        e.currentTarget.style.background = 'none';
      }
    }}
  >
    <User size={18} className="me-2" />
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
              <AvatarDisplay 
                src={userProfile.avatar_url} 
                size={32}
                fallbackColor="#dc3545"
              />
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
                  <AvatarDisplay 
                    src={userProfile.avatar_url} 
                    size={40}
                    fallbackColor="#dc3545"
                    className="me-3"
                  />
                  <div>
                    <div className="fw-semibold">{user?.name || 'Clinical Staff'}</div>
                    <small className="text-muted">{user?.email || 'staff@hospital.com'}</small>
                    <div>
                      <small className="text-muted">Staff No: {user?.staff_no || 'CS001'}</small>
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
// Dashboard Overview Component - CORRECTED VERSION
const DashboardOverview: React.FC = () => {
  // Add refs for each chart
  const appointmentsTrendRef = useRef<ChartJS<"line"> | null>(null);
  const statusDistributionRef = useRef<ChartJS<"doughnut"> | null>(null);
  const priorityRef = useRef<ChartJS<"doughnut"> | null>(null);
  const departmentWorkloadRef = useRef<ChartJS<"bar"> | null>(null);

  // Add cleanup effect
  useEffect(() => {
    return () => {
      // Cleanup charts on component unmount
      appointmentsTrendRef.current?.destroy();
      statusDistributionRef.current?.destroy();
      priorityRef.current?.destroy();
      departmentWorkloadRef.current?.destroy();
    };
  }, []);

  // Add null check for kpiData first
  if (!kpiData) {
    return (
      <div className="container-fluid py-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading charts...</span>
          </div>
        </div>
      </div>
    );
  }

  // Define variables only once
  const weeklyMetrics = kpiData.weekly_metrics || {};
  const responseTime = kpiData.response_times || {};

  // Chart configurations - DEFINE ONLY ONCE
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  // Chart data configurations - DEFINE ONLY ONCE
  const appointmentsTrendData = {
    labels: kpiData.appointments_trend?.map((item: any) => item.day) || [],
    datasets: [
      {
        label: 'Daily Appointments',
        data: kpiData.appointments_trend?.map((item: any) => item.count) || [],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const statusDistributionData = {
    labels: kpiData.patient_status_distribution?.map((item: any) => item.status) || [],
    datasets: [
      {
        data: kpiData.patient_status_distribution?.map((item: any) => item.count) || [],
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)',
          'rgba(255, 99, 132, 0.8)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const priorityData = {
    labels: kpiData.priority_distribution?.map((item: any) => item.priority) || [],
    datasets: [
      {
        data: kpiData.priority_distribution?.map((item: any) => item.count) || [],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)', // Normal - Green
          'rgba(249, 115, 22, 0.8)', // High - Orange  
          'rgba(239, 68, 68, 0.8)',  // Urgent - Red
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(249, 115, 22, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const departmentWorkloadData = {
    labels: kpiData.department_workload?.map((item: any) => item.department) || [],
    datasets: [
      {
        label: 'Appointments',
        data: kpiData.department_workload?.map((item: any) => item.appointments) || [],
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 1,
      },
    ],
  };

 return (
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
            <div className="d-flex justify-content-between align-items-center">
              {/* Left side - Text content */}
              <div className="flex-grow-1">
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
              
              {/* Right side - Avatar pushed to far right 
              <div className="flex-shrink-0 ms-4">
                <AvatarDisplay 
                  src={userProfile.avatar_url} 
                  size={80}
                  fallbackColor="#ffffff"
                  className="opacity-90"
                />
              </div>*/}
            </div>
          </div>
        </div>
      </div>

        {/* Enhanced Statistics Cards with click handlers */}
        <div className="col-md-3">
          <div
            className="card text-center border-0 shadow-sm h-100"
            style={{ 
              borderRadius: '0.75rem',
              cursor: 'pointer',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onClick={() => setActiveTab('appointments')}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
            }}
          >
            <div className="card-body">
              <Calendar size={32} className="text-primary mb-2" />
              <h4 className="fw-bold mb-1">
                {dashboardData.today_overview?.scheduled_appointments ?? 0}
              </h4>
              <p className="text-muted mb-0 small">
                {t('dashboard.scheduled_appointments', 'Scheduled Appointments')}
              </p>
              <small className="text-primary">Click to view</small>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div
            className="card text-center border-0 shadow-sm h-100"
            style={{ 
              borderRadius: '0.75rem',
              cursor: 'pointer',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onClick={() => setActiveTab('appointments')}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
            }}
          >
            <div className="card-body">
              <FileText size={32} className="text-info mb-2" />
              <h4 className="fw-bold mb-1">
                {dashboardData.today_overview?.pending_student_requests ?? 0}
              </h4>
              <p className="text-muted mb-0 small">
                Pending Student Requests
              </p>
              <small className="text-info">Click to manage</small>
              {(dashboardData.today_overview?.pending_student_requests ?? 0) > 0 && (
                <div className="mt-2">
                  <span className="badge bg-warning text-dark">
                    Needs Attention
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div
            className="card text-center border-0 shadow-sm h-100"
            style={{ 
              borderRadius: '0.75rem',
              cursor: 'pointer',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onClick={() => {
              setMessage({ type: 'warning', text: 'Tasks management coming soon!' });
              setTimeout(() => setMessage({ type: '', text: '' }), 3000);
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
            }}
          >
            <div className="card-body">
              <ClipboardList size={32} className="text-warning mb-2" />
              <h4 className="fw-bold mb-1">
                {dashboardData.today_overview?.pending_tasks ?? 0}
              </h4>
              <p className="text-muted mb-0 small">
                {t('dashboard.pending_tasks', 'Pending Tasks')}
              </p>
              <small className="text-warning">Click to view</small>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div
            className="card text-center border-0 shadow-sm h-100"
            style={{ 
              borderRadius: '0.75rem',
              cursor: 'pointer',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onClick={() => {
              setFilters({ status: 'all', priority: 'urgent' });
              setActiveTab('appointments');
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
            }}
          >
            <div className="card-body">
              <AlertTriangle size={32} className="text-danger mb-2" />
              <h4 className="fw-bold mb-1">
                {dashboardData.today_overview?.urgent_cases ?? 0}
              </h4>
              <p className="text-muted mb-0 small">
                {t('dashboard.urgent_cases', 'Urgent Cases')}
              </p>
              <small className="text-danger">Click to view urgent</small>
              {(dashboardData.today_overview?.urgent_cases ?? 0) > 0 && (
                <div className="mt-2">
                  <span className="badge bg-danger">
                    Immediate Action Required
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="col-12">
          <h5 className="fw-bold mb-3 d-flex align-items-center">
            <TrendingUp size={20} className="me-2 text-primary" />
            Weekly Performance Metrics
          </h5>
          <div className="row g-3">
            <div className="col-md-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body text-center">
                  <CheckCircle size={32} className="text-success mb-2" />
                  <h3 className="fw-bold mb-1">{weeklyMetrics.appointments_completed || 0}</h3>
                  <p className="text-muted mb-0 small">Appointments Completed</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body text-center">
                  <Users size={32} className="text-info mb-2" />
                  <h3 className="fw-bold mb-1">{weeklyMetrics.medications_administered || 0}</h3>
                  <p className="text-muted mb-0 small">Medications Administered</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body text-center">
                  <TrendingUp size={32} className="text-warning mb-2" />
                  <h3 className="fw-bold mb-1">{weeklyMetrics.vital_signs_recorded || 0}</h3>
                  <p className="text-muted mb-0 small">Vital Signs Recorded</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body text-center">
                  <Clock size={32} className="text-primary mb-2" />
                  <h3 className="fw-bold mb-1">{responseTime.avg_response_time_minutes || 0}min</h3>
                  <p className="text-muted mb-0 small">Avg Response Time</p>
                  <div className="mt-2">
                    <div 
                      className="progress" 
                      style={{ height: '4px' }}
                    >
                      <div 
                        className="progress-bar bg-success" 
                        style={{ width: `${responseTime.performance_score || 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 1 - CORRECTED */}
        <div className="col-md-8">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white border-0">
              <h6 className="fw-bold mb-0">Appointments Trend (Last 7 Days)</h6>
            </div>
            <div className="card-body">
              <div style={{ height: '300px' }}>
                <Line 
                  key="appointments-trend"
                  ref={appointmentsTrendRef}
                  data={appointmentsTrendData} 
                  options={chartOptions} 
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white border-0">
              <h6 className="fw-bold mb-0">Priority Distribution</h6>
            </div>
            <div className="card-body">
              <div style={{ height: '300px' }}>
                <Doughnut 
                  key="priority-distribution"
                  ref={priorityRef}
                  data={priorityData} 
                  options={doughnutOptions} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 2 - CORRECTED */}
        <div className="col-md-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white border-0">
              <h6 className="fw-bold mb-0">Patient Status Today</h6>
            </div>
            <div className="card-body">
              <div style={{ height: '300px' }}>
                <Doughnut 
                  key="status-distribution"
                  ref={statusDistributionRef}
                  data={statusDistributionData} 
                  options={doughnutOptions} 
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white border-0">
              <h6 className="fw-bold mb-0">Department Workload</h6>
            </div>
            <div className="card-body">
              <div style={{ height: '300px' }}>
                <Bar 
                  key="department-workload"
                  ref={departmentWorkloadRef}
                  data={departmentWorkloadData} 
                  options={chartOptions} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Response Time Performance */}
        <div className="col-12">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white border-0">
              <h6 className="fw-bold mb-0 d-flex align-items-center justify-content-between">
                Response Time Performance
                <span className={`badge ${
                  (responseTime.performance_score || 0) >= 80 ? 'bg-success' : 
                  (responseTime.performance_score || 0) >= 60 ? 'bg-warning' : 'bg-danger'
                }`}>
                  {responseTime.performance_score || 0}% Score
                </span>
              </h6>
            </div>
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <p className="mb-2">
                    Average response time to student requests: 
                    <strong className="ms-2">{responseTime.avg_response_time_minutes || 0} minutes</strong>
                  </p>
                  <p className="mb-3 text-muted small">
                    Target: {responseTime.target_response_time || 30} minutes
                  </p>
                  <div className="progress" style={{ height: '12px' }}>
                    <div 
                      className={`progress-bar ${
                        (responseTime.performance_score || 0) >= 80 ? 'bg-success' : 
                        (responseTime.performance_score || 0) >= 60 ? 'bg-warning' : 'bg-danger'
                      }`}
                      style={{ width: `${responseTime.performance_score || 0}%` }}
                    ></div>
                  </div>
                </div>
                <div className="col-md-4 text-center">
                  {(responseTime.performance_score || 0) >= 80 ? (
                    <CheckCircle size={48} className="text-success" />
                  ) : (
                    <AlertTriangle size={48} className="text-warning" />
                  )}
                  <p className="mt-2 mb-0 small text-muted">
                    {(responseTime.performance_score || 0) >= 80 ? 'Excellent Performance' : 
                     (responseTime.performance_score || 0) >= 60 ? 'Good Performance' : 'Needs Improvement'}
                  </p>
                </div>
              </div>
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
        <th>Date</th>
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
          <td>{formatDate(queueItem.date)}</td>
          <td>{formatTime(queueItem.time)}</td>
          <td>{queueItem.patient_name} ({queueItem.student_id})</td>
          <td>
            <span className={getStatusBadge(queueItem.status)}>
              {queueItem.status}
            </span>
          </td>
          <td>
            <span className={getPriorityBadge(queueItem.priority)}>
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

        {/* Pending Student Requests with enhanced display */}
        <div className="col-12">
          <div
            className="card shadow-sm border-0"
            style={{ borderRadius: '1rem' }}
          >
            <div className="card-header bg-white border-0 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold mb-0">
                Pending Student Requests 
                {(dashboardData.today_overview?.pending_student_requests ?? 0) > 0 && (
                  <span className="badge bg-warning text-dark ms-2">
                    {dashboardData.today_overview.pending_student_requests}
                  </span>
                )}
              </h5>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setActiveTab('appointments')}
                style={{ borderRadius: '0.5rem' }}
              >
                View All Appointments
              </button>
            </div>
            <div className="card-body">
              {studentRequests.filter(req => ['pending', 'under_review'].includes(req.status)).length === 0 ? (
                <div className="text-muted text-center py-4">
                  <FileText size={32} className="mb-2" />
                  <div>No pending student requests</div>
                  <small>All requests have been processed</small>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Time</th>
                        <th>Date</th>
                        <th>Specialization</th>
                        <th>Urgency</th>
                        <th>Status</th>
                        <th>Time Waiting</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentRequests
                        .filter(request => ['pending', 'under_review'].includes(request.status))
                        .slice(0, 5)
                        .map((request) => {
                          const requestDate = new Date(request.created_at || request.date);
                          const now = new Date();
                          const hoursWaiting = Math.floor((now.getTime() - requestDate.getTime()) / (1000 * 60 * 60));
                          
                          return (
                            <tr key={request.id}>
                              <td>
                                <div>
                                  <strong>{request.patient?.name}</strong>
                                  <br />
                                  <small className="text-muted">{request.patient?.student_id}</small>
                                </div>
                              </td>
                              <td>
                                {request.created_at 
                                  ? new Date(request.created_at).toLocaleDateString('en-US', { 
                                      year: 'numeric', 
                                      month: 'short', 
                                      day: 'numeric' 
                                    })
                                  : new Date(request.date).toLocaleDateString('en-US', { 
                                      year: 'numeric', 
                                      month: 'short', 
                                      day: 'numeric' 
                                    })
                                }
                              </td>
                              <td>
                                {request.date 
                                  ? new Date(request.date).toLocaleDateString('en-US', { 
                                      year: 'numeric', 
                                      month: 'short', 
                                      day: 'numeric' 
                                    })
                                  : 'Not set'
                                }
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
                                <span className={`badge ${hoursWaiting > 24 ? 'bg-danger' : hoursWaiting > 4 ? 'bg-warning text-dark' : 'bg-success'}`}>
                                  {hoursWaiting}h
                                </span>
                              </td>
                              <td>
                                <button 
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => {
                                    setFormData({
                                      ...request,
                                      appointmentId: request.id,
                                      action: 'review'
                                    });
                                    setShowModal('reviewRequest');
                                  }}
                                >
                                  Review
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                  {studentRequests.filter(req => ['pending', 'under_review'].includes(req.status)).length > 5 && (
                    <div className="text-center mt-3">
                      <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => setActiveTab('appointments')}
                      >
                        View {studentRequests.filter(req => ['pending', 'under_review'].includes(req.status)).length - 5} more requests
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


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
      priority: request.priority || request.urgency || 'normal',
      status: request.status || 'pending',
      date: request.date || request.requested_date,
      time: request.time || request.requested_time,
      reason: request.reason || request.message
    }));
    
    return [...regularAppointments, ...studentRequestAppointments].sort((a, b) => {
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
                <option value="rejected">Rejected</option>
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
                  <th style={{ fontWeight: 'normal' }}>Type</th>
                  <th style={{ fontWeight: 'normal' }}>Patient</th>
                  <th style={{ fontWeight: 'normal' }}>Date</th>
                  <th style={{ fontWeight: 'normal' }}>Time</th>
                  <th style={{ fontWeight: 'normal' }}>Appointment Type</th>
                  <th style={{ fontWeight: 'normal' }}>Status</th>
                  <th style={{ fontWeight: 'normal' }}>Priority</th>
                  <th style={{ fontWeight: 'normal' }}>Doctor</th>
                  <th style={{ fontWeight: 'normal' }}>Actions</th>
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
                      const statusMatch = filters.status === 'all' || apt.status === filters.status;
                      const priorityMatch = filters.priority === 'all' || (apt.priority || 'normal') === filters.priority;
                      return statusMatch && priorityMatch;
                    })
                    .map((apt) => {
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
                          <td>
  {apt.date ? formatDate(apt.date) : 'Not set'}
</td>
                          <td>
  {apt.time ? formatTime(apt.time) : 'Not set'}
</td>
                          <td>
                            <span className="badge bg-info text-dark">
                              {apt.type || apt.appointment_type || 'General'}
                            </span>
                          </td>
                          <td>
                            {/* Keep rejected status as rejected, others use default styling */}
                            {apt.isStudentRequest && apt.status === 'rejected' ? (
                              <span className="badge bg-danger">
                                Rejected
                              </span>
                            ) : (
                              <span className={getStatusBadge(apt.status)}>
                                {getStatusText(apt.status)}
                              </span>
                            )}
                          </td>
                          <td>
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
                                  {/* Show assign button for pending/under_review requests */}
                                  {['pending', 'under_review'].includes(apt.status) && (
                                    <button 
                                      className="btn btn-outline-primary"
                                      onClick={() => {
                                        setFormData({
                                          ...apt,
                                          appointmentId: apt.id,
                                          action: 'assign'
                                        });
                                        setShowModal('assignRequest');
                                      }}
                                    >
                                      Assign Doctor
                                    </button>
                                  )}
                                  
                                  {/* Show approve & schedule button for pending/under_review */}
                                  {['pending', 'under_review'].includes(apt.status) && (
                                    <button 
                                      className="btn btn-outline-success"
                                      onClick={() => {
                                        setFormData({
                                          ...apt,
                                          appointmentId: apt.id,
                                          action: 'approve'
                                        });
                                        setShowModal('reviewRequest');
                                      }}
                                    >
                                      Approve & Schedule
                                    </button>
                                  )}

                                  {/* Show "Ready for Doctor" button for assigned/scheduled requests */}
                                  {['assigned', 'scheduled'].includes(apt.status) && (
                                    <button 
                                      className="btn btn-success"
                                      disabled
                                    >
                                      <Check size={14} className="me-1" />
                                      Ready for Doctor
                                    </button>
                                  )}

                                  {/* Show reopen button for rejected requests */}
                                  {apt.status === 'rejected' && (
                                    <button 
                                      className="btn btn-outline-info"
                                      onClick={() => {
                                        setFormData({
                                          ...apt,
                                          appointmentId: apt.id,
                                          action: 'reopen'
                                        });
                                        setShowModal('reopenRequest');
                                      }}
                                    >
                                      <RotateCcw size={14} className="me-1" />
                                      Reopen
                                    </button>
                                  )}
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

  {/* Patients Table */}
  <div className="table-responsive">
  <table className="table table-hover align-middle">
    <thead>
      <tr>
        <th style={{ fontWeight: 'normal' }}>Patient Name</th>
        <th style={{ fontWeight: 'normal' }}>Student ID</th>
        <th style={{ fontWeight: 'normal' }}>Staff No</th>
        <th style={{ fontWeight: 'normal' }}>Age</th>
        <th style={{ fontWeight: 'normal' }}>Department</th>
        <th style={{ fontWeight: 'normal' }}>Assigned Doctor</th>
        <th style={{ fontWeight: 'normal' }}>Actions</th>
      </tr>
    </thead>
    <tbody>
      {loading ? (
        <tr>
          <td colSpan={7} className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted mt-2">Loading patients...</p>
          </td>
        </tr>
      ) : patients.length === 0 ? (
        <tr>
          <td colSpan={7} className="text-center py-5">
            <Users size={48} className="text-muted mb-3" />
            <p className="text-muted">No patients found</p>
            <small className="text-muted">Try adjusting your search term</small>
          </td>
        </tr>
      ) : (
        patients.filter((patient: Patient) => 
          patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          patient.student_id?.includes(searchTerm) || false
        ).map((patient) => (
          <tr key={patient.id}>
            <td>{patient.name}</td>
            <td>{patient.student_id || 'N/A'}</td>
            <td>{patient.staff_no || 'N/A'}</td>
            <td>{patient.age || 'N/A'}</td>
            <td>{patient.department || 'N/A'}</td>
            <td>{patient.assigned_doctor || 'Unassigned'}</td>
            <td>
              <div className="btn-group btn-group-sm" role="group">
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
                  className="btn btn-outline-primary"
                  title="Record Vitals"
                >
                  <Heart size={16} />
                </button>
                {/* NEW: View Vitals History */}
                <button 
                  onClick={() => {
                    setSelectedPatient(patient);
                    setShowVitalsViewer(true);
                  }}
                  className="btn btn-outline-info"
                  title="View Vitals History"
                >
                  <Activity size={16} />
                </button>
                
                {/* NEW: Enhanced Medical Card */}
                <button 
                  onClick={() => {
                    setSelectedPatient(patient);
                    setShowMedicalCard(true);
                  }}
                  className="btn btn-outline-success"
                  title="View Medical Card"
                >
                  <FileText size={16} />
                </button>
              </div>
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

  // Medications Tab Component
  const MedicationsTab: React.FC = () => (
  <div className="container-fluid py-4">
    <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
      <div className="card-header" style={{ background: 'linear-gradient(135deg, #e95454ff 0%, #e13737ff 100%)' }}>
        <div className="d-flex justify-content-between align-items-center">
          <h3 className="card-title text-white mb-0 d-flex align-items-center">
            <Pill size={24} className="me-2" />
            {t('medications.management', 'Medication Management')}
          </h3>
          <button 
            onClick={() => setShowMedicationManagement(true)}
            className="btn btn-sm btn-light"
            style={{ borderRadius: '0.5rem' }}
          >
            <Plus size={16} className="me-1" />
            Manage Medications
          </button>
        </div>
      </div>
      <div className="card-body p-4">
        <div className="alert alert-info">
          <Pill size={20} className="me-2" />
          <strong>Medication Management System</strong>
          <p className="mb-0 mt-2">
            Click "Manage Medications" to:
          </p>
          <ul className="mb-0 mt-2">
            <li>View and administer medications prescribed by doctors</li>
            <li>Record minor treatments (headaches, minor injuries, etc.)</li>
            <li>Track medication administration history</li>
          </ul>
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
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th style={{ fontWeight: 'normal' }}>Doctor Name</th>
                <th style={{ fontWeight: 'normal' }}>Specialization</th>
                <th style={{ fontWeight: 'normal' }}>Department</th>
                <th style={{ fontWeight: 'normal' }}>Phone</th>
                <th style={{ fontWeight: 'normal' }}>Email</th>
                <th style={{ fontWeight: 'normal' }}>Patients</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-muted mt-2">Loading doctors...</p>
                  </td>
                </tr>
              ) : doctors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5">
                    <User size={48} className="text-muted mb-3" />
                    <p className="text-muted">No doctors found</p>
                  </td>
                </tr>
              ) : (
                doctors.map((doctor) => (
                  <tr key={doctor.id}>
                    <td>
                      <div className="d-flex align-items-center">
                        <div 
                          className="rounded-circle me-2 d-flex align-items-center justify-content-center"
                          style={{
                            width: '32px',
                            height: '32px',
                            backgroundColor: '#e3f2fd',
                            color: '#1976d2'
                          }}
                        >
                          <Stethoscope size={16} />
                        </div>
                        {doctor.name || doctor.full_name}
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-info text-dark">
                        {doctor.specialty || doctor.specialization}
                      </span>
                    </td>
                    <td>{doctor.department}</td>
                    <td>{doctor.phone}</td>
                    <td>{doctor.email}</td>
                    <td>
                      <div className="d-flex flex-column">
                        <div className="d-flex align-items-center mb-1">
                          <Users size={14} className="me-1 text-primary" />
                          <span className="badge bg-primary me-2">
                            {doctor.total_patients || 0}
                          </span>
                          <small className="text-muted">Total</small>
                        </div>
                        <div className="d-flex align-items-center">
                          <Activity size={14} className="me-1 text-success" />
                          <span className="badge bg-success me-2">
                            {doctor.patients_today || 0}
                          </span>
                          <small className="text-muted">Today</small>
                        </div>
                      </div>
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

  const AvatarDisplay: React.FC<{
  src?: string | null;
  size: number;
  className?: string;
  fallbackColor?: string;
}> = ({ src, size, className = "", fallbackColor = "#dc3545" }) => {
  const [hasError, setHasError] = useState(false);
  
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
          backgroundColor: fallbackColor === "#ffffff" ? "rgba(255, 255, 255, 0.2)" : 
                         fallbackColor === "#dc3545" ? "#fee2e2" : "rgba(220, 53, 69, 0.1)",
          color: fallbackColor === "#ffffff" ? "#ffffff" : fallbackColor,
          overflow: 'hidden',
          border: fallbackColor === "#ffffff" ? '2px solid rgba(255, 255, 255, 0.3)' : 'none'
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
        objectFit: 'cover',
        border: fallbackColor === "#ffffff" ? '2px solid rgba(255, 255, 255, 0.3)' : 'none'
      }}
      onError={() => setHasError(true)}
      onLoad={() => setHasError(false)}
    />
  );
};

  const ProfileTab: React.FC = () => (
  <div className="container-fluid py-4">
    <div className="row g-4">
      {/* Personal Information Card */}
      <div className="col-12 col-lg-8">
        <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
          <div 
            className="card-header border-0" 
            style={{ 
              background: 'linear-gradient(135deg, #E53E3E 0%, #C53030 100%)',
              borderRadius: '1rem 1rem 0 0' 
            }}
          >
            <h5 className="card-title mb-0 text-white d-flex align-items-center">
              <User size={20} className="me-2" />
              Personal Information
            </h5>
          </div>
          <div className="card-body p-4">
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
                  {/* Staff Number - Read Only */}
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-semibold">
                      Staff Number <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={userProfile.staff_no}
                      disabled
                      style={{ backgroundColor: '#f8f9fa' }}
                    />
                    <div className="form-text">Staff number cannot be changed</div>
                  </div>

                  {/* Email - Read Only */}
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-semibold">
                      Email Address <span className="text-danger">*</span>
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      value={userProfile.email}
                      disabled
                      style={{ backgroundColor: '#f8f9fa' }}
                    />
                    <div className="form-text">Email cannot be changed</div>
                  </div>

                  {/* Full Name */}
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-semibold">
                      Full Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={userProfile.name}
                      onChange={(e) => {
  const value = e.target.value;
  setUserProfile(prev => ({ ...prev, name: value }));
}}
                      required
                      placeholder="Enter your full name"
                    />
                  </div>

                  {/* Phone Number */}
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-semibold">
                      Phone Number <span className="text-danger">*</span>
                    </label>
                    <PhoneInput
                      country={'tr'}
                      value={userProfile.phone}
                      onChange={(phone) => setUserProfile({ ...userProfile, phone })}
                      placeholder="Enter your phone number"
                      inputProps={{
                        className: 'form-control',
                        required: true
                      }}
                      containerClass="phone-input-container w-100"
                    />
                  </div>

                  {/* Date of Birth */}
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-semibold">
                      Date of Birth <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={userProfile.date_of_birth}
                      onChange={(e) => setUserProfile({ ...userProfile, date_of_birth: e.target.value })}
                      max={new Date(new Date().setFullYear(new Date().getFullYear() - 21)).toISOString().split('T')[0]}
                      required
                    />
                    <div className="form-text">Must be at least 21 years old</div>
                  </div>

                  {/* Gender */}
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-semibold">
                      Gender <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={userProfile.gender}
                      onChange={(e) => setUserProfile({ ...userProfile, gender: e.target.value })}
                      required
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                  </div>

                  {/* Department - Read Only */}
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-semibold">Department</label>
                    <input
                      type="text"
                      className="form-control"
                      value={userProfile.department}
                      disabled
                      style={{ backgroundColor: '#f8f9fa' }}
                    />
                  </div>
                </div>

                {/* Save Button */}
                <div className="mt-4 d-flex gap-2">
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={profileSaving}
                    style={{ 
                      background: 'linear-gradient(135deg, #E53E3E 0%, #C53030 100%)',
                      border: 'none' 
                    }}
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

      {/* Profile Picture Card */}
      <div className="col-12 col-lg-4">
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
            
            {/* Photo Guidelines */}
            <div className="accordion" id="photoGuidelines">
              <div className="accordion-item" style={{ border: 'none', background: 'transparent' }}>
                <h2 className="accordion-header">
                  <button 
                    className="accordion-button collapsed"
                    type="button" 
                    data-bs-toggle="collapse" 
                    data-bs-target="#photoGuidelinesCollapse"
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
                    Photo Guidelines
                  </button>
                </h2>
                <div 
                  id="photoGuidelinesCollapse" 
                  className="accordion-collapse collapse"
                  data-bs-parent="#photoGuidelines"
                >
                  <div className="accordion-body" style={{ padding: '16px 0' }}>
                    <div className="text-start" style={{ fontSize: '0.875rem' }}>
                      <div className="mb-2">
                        <CheckCircle size={14} className="text-success me-2" />
                        <strong>Types:</strong> JPEG, PNG, GIF, WebP
                      </div>
                      <div className="mb-2">
                        <CheckCircle size={14} className="text-success me-2" />
                        <strong>Size:</strong> Maximum 5MB
                      </div>
                      <div className="mb-2">
                        <CheckCircle size={14} className="text-success me-2" />
                        <strong>Format:</strong> Square (1:1 ratio) recommended
                      </div>
                      <div className="mb-2">
                        <CheckCircle size={14} className="text-success me-2" />
                        <strong>Quality:</strong> Professional appearance
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

      {/* ADD THIS URGENT ALERT BANNER HERE */}
      {urgentRequests.length > 0 && (
        <div className="container-fluid px-4">
          <div className="alert alert-danger d-flex align-items-center" role="alert">
            <AlertTriangle size={24} className="me-3" />
            <div className="flex-grow-1">
              <h5 className="alert-heading mb-1">
                URGENT: {urgentRequests.length} cases need immediate attention
              </h5>
              <p className="mb-0">
                These urgent requests should be processed before scheduled appointments.
              </p>
            </div>
            <button 
              className="btn btn-danger btn-sm"
              onClick={() => {
                setActiveTab('appointments');
                setFilters({ status: 'all', priority: 'urgent' });
              }}
            >
              Process Urgent Cases
            </button>
          </div>
        </div>
      )}



      {/* Main Content */}
      {activeTab === 'overview' && <DashboardOverview />}
      {activeTab === 'appointments' && <AppointmentsTab />}
      {activeTab === 'patients' && <PatientsTab />}
      {activeTab === 'medications' && <MedicationsTab />}
      {activeTab === 'doctors' && <DoctorsTab />}
      {activeTab === 'profile' && <ProfileTab />} 
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
            createAppointment();
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
            
            {/* Enhanced Date and Time selection */}
{/* Enhanced Date and Time selection */}
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <label className="form-label">Date <span className="text-danger">*</span></label>
                <EnhancedDateInput
                  value={formData.appointment_date || ''}
                  onChange={async (selectedDate) => {
                    const newFormData = { ...formData, appointment_date: selectedDate };
                    setFormData(newFormData);
                    
                    // Load available doctors when date changes
                    if (selectedDate && formData.appointment_time) {
                      await checkDoctorAvailability(selectedDate, formData.appointment_time);
                    }
                  }}
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
                    const selectedTime = e.target.value;
                    
                    if (formData.appointment_date && isDateBlocked(formData.appointment_date)) {
                      setMessage({
                        type: 'error',
                        text: 'Please select a valid date first'
                      });
                      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
                      return;
                    }

                    const newFormData = { ...formData, appointment_time: selectedTime };
                    setFormData(newFormData);
                    
                    if (selectedTime && formData.appointment_date) {
                      await checkDoctorAvailability(formData.appointment_date, selectedTime);
                    }
                  }}
                  required
                  disabled={formData.appointment_date && isDateBlocked(formData.appointment_date)}
                />
              </div>
            </div>
            
            {/* Holiday Warning */}
            <HolidayWarning selectedDate={formData.appointment_date || ''} />
            
            {/* Quick Time Slots */}
            <QuickTimeSlots
              selectedDate={formData.appointment_date || ''}
              onTimeSelect={(time) => setFormData({...formData, appointment_time: time})}
              formData={formData}
              setFormData={setFormData}
              checkDoctorAvailability={checkDoctorAvailability}
            />
            
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
        <Modal
          title={`Record Vital Signs - ${selectedPatient.name}`}
          onClose={() => setShowModal('')}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (
                !formData.blood_pressure_systolic ||
                !formData.blood_pressure_diastolic ||
                !formData.heart_rate ||
                !formData.temperature
              ) {
                setMessage({
                  type: 'error',
                  text: 'Please fill in all required fields before recording vitals.',
                });
                setTimeout(() => setMessage({ type: '', text: '' }), 4000);
                return;
              }
              updateVitals(selectedPatient.id, formData);
            }}
          >
            <div className="row g-3">
              {/* Systolic BP */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Systolic BP (mmHg) <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="120"
                  min="60"
                  max="250"
                  value={formData.blood_pressure_systolic || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      blood_pressure_systolic: e.target.value,
                    })
                  }
                  required
                />
                {!formData.blood_pressure_systolic && (
                  <div className="form-text text-danger fst-italic small">
                    Please enter systolic blood pressure
                  </div>
                )}
              </div>

              {/* Diastolic BP */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Diastolic BP (mmHg) <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="80"
                  min="40"
                  max="150"
                  value={formData.blood_pressure_diastolic || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      blood_pressure_diastolic: e.target.value,
                    })
                  }
                  required
                />
                {!formData.blood_pressure_diastolic && (
                  <div className="form-text text-danger fst-italic small">
                    Please enter diastolic blood pressure
                  </div>
                )}
              </div>

              {/* Heart Rate */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Heart Rate (bpm) <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="72"
                  min="30"
                  max="200"
                  value={formData.heart_rate || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, heart_rate: e.target.value })
                  }
                  required
                />
                {!formData.heart_rate && (
                  <div className="form-text text-danger fst-italic small">
                    Please enter heart rate
                  </div>
                )}
              </div>

              {/* Temperature */}
              <div className="col-md-4">
                <label className="form-label fw-semibold">
                  Temperature <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="form-control"
                  placeholder="36.6"
                  min="30"
                  max="45"
                  value={formData.temperature || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, temperature: e.target.value })
                  }
                  required
                />
                {!formData.temperature && (
                  <div className="form-text text-danger fst-italic small">
                    Please enter temperature
                  </div>
                )}
              </div>

              {/* Unit */}
              <div className="col-md-2">
                <label className="form-label fw-semibold">
                  Unit <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select"
                  value={formData.temperature_unit || 'C'}
                  onChange={(e) =>
                    setFormData({ ...formData, temperature_unit: e.target.value })
                  }
                  required
                >
                  <option value="C">°C</option>
                  <option value="F">°F</option>
                </select>
              </div>

              {/* Respiratory Rate */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">Respiratory Rate (breaths/min)</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="16"
                  min="8"
                  max="40"
                  value={formData.respiratory_rate || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, respiratory_rate: e.target.value })
                  }
                />
              </div>

              {/* Oxygen Saturation */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">Oxygen Saturation (%)</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="98"
                  min="70"
                  max="100"
                  value={formData.oxygen_saturation || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, oxygen_saturation: e.target.value })
                  }
                />
              </div>

              {/* Notes */}
              <div className="col-12">
                <label className="form-label fw-semibold">Notes</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Any observations or concerns..."
                  value={formData.notes || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="d-flex justify-content-end gap-2 mt-4">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowModal('')}
              >
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
                <label className="form-label">Medication Name <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.medication_name || ''}
                  onChange={(e) => setFormData({...formData, medication_name: e.target.value})}
                  required
                />
              </div>
              <div className="col-md-6">
  <label className="form-label">Administration Time <span className="text-danger">*</span></label>
  <input
    type="datetime-local"
    className="form-control"
    value={formData.administration_time || ''}
    onChange={(e) => setFormData({...formData, administration_time: e.target.value})}
    required
  />
</div>

<div className="col-md-6">
  <label className="form-label">Prescribing Doctor <span className="text-danger">*</span></label>
  <input
    type="text"
    className="form-control"
    value={formData.prescribing_doctor || ''}
    onChange={(e) => setFormData({...formData, prescribing_doctor: e.target.value})}
    required
  />
</div>
              <div className="col-md-6">
                <label className="form-label">Dosage <span className="text-danger">*</span></label>
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
                <label className="form-label">Frequency <span className="text-danger">*</span></label>
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
                <label className="form-label">Route <span className="text-danger">*</span></label>
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
                <label className="form-label">Start Date <span className="text-danger">*</span></label>
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
      await handleApproveRequest(
        formData.appointmentId, 
        formData.doctor_id, 
        formData.notes || '',
        'waiting'
      );
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
        <label className="form-label">Current Request</label>
        <div className="card bg-light">
          <div className="card-body">
            <p className="mb-1"><strong>Date:</strong> {formData.date || 'Not specified'}</p>
            <p className="mb-1"><strong>Time:</strong> {formData.time || 'Not specified'}</p>
            <p className="mb-1"><strong>Priority:</strong> <span className={getPriorityBadge(formData.priority || 'normal')}>{(formData.priority || 'normal').toUpperCase()}</span></p>
            <p className="mb-0"><strong>Reason:</strong> {formData.reason || 'No reason provided'}</p>
          </div>
        </div>
      </div>
      <div className="mb-3">
        <label className="form-label">Assign to Doctor <span className="text-danger">*</span></label>
        <select
          className="form-select"
          value={formData.doctor_id || ''}
          onChange={(e) => setFormData({...formData, doctor_id: e.target.value})}
          required
        >
          <option value="">Select Doctor</option>
          {doctors.map(doctor => (
            <option key={doctor.id} value={doctor.id}>
              {doctor.name} - {doctor.specialty || doctor.specialization} ({doctor.department})
            </option>
          ))}
        </select>
      </div>
      <div className="mb-3">
        <label className="form-label">Staff Notes (Optional)</label>
        <textarea
          className="form-control"
          rows={3}
          value={formData.notes || ''}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          placeholder="Add any notes for the doctor..."
        />
      </div>
      <div className="d-flex justify-content-end gap-2">
        <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal('')}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={!formData.doctor_id}>
          Assign & Approve Request
        </button>
      </div>
    </form>
  </Modal>
)}

{showModal === 'reviewRequest' && (
  <Modal title="Review Student Request" onClose={() => setShowModal('')}>
    {/* ... keep the existing display code ... */}
    
    <form onSubmit={async (e) => {
      e.preventDefault();
      try {
        setLoading(true);
        if (formData.reviewAction === 'approve') {
          // USE handleApproveRequest HERE
          await handleApproveRequest(
            formData.appointmentId, 
            formData.doctor_id, 
            formData.reviewNotes,
            'scheduled' // or 'waiting' depending on your workflow
          );
        } else {
          // Keep existing reject logic
          await api.post(`student-requests/${formData.appointmentId}/reject`, {
            rejection_reason: formData.rejectionReason,
            notes: formData.reviewNotes
          });
          setMessage({ type: 'success', text: 'Student request rejected!' });
          loadStudentRequests();
          loadAppointments();
          setShowModal('');
        }
      } catch (error) {
        setMessage({ type: 'error', text: `Error processing request: ${(error as Error).message}` });
      } finally {
        setLoading(false);
      }
    }}>
      <div className="mb-3">
        <label className="form-label">Action <span className="text-danger">*</span></label>
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
          <label className="form-label">Assign to Doctor <span className="text-danger">*</span></label>
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
          <label className="form-label">Rejection Reason<span className="text-danger">*</span></label>
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

{/* Vitals Viewer Modal */}
{showVitalsViewer && selectedPatient && (
  <PatientVitalsViewer
    patientId={selectedPatient.id}
    patientName={selectedPatient.name}
    onClose={() => {
      setShowVitalsViewer(false);
      setSelectedPatient(null);
    }}
    authToken={AUTH_TOKEN}
    apiBaseUrl={API_BASE_URL}
  />
)}

{/* Enhanced Medical Card Modal */}
{showMedicalCard && selectedPatient && (
  <EnhancedMedicalCardViewer
    patientId={selectedPatient.id}
    onClose={() => {
      setShowMedicalCard(false);
      setSelectedPatient(null);
    }}
    authToken={AUTH_TOKEN}
    apiBaseUrl={API_BASE_URL}
  />
)}

{/* Medication Management Modal */}
{showMedicationManagement && (
  <MedicationManagement
    onClose={() => setShowMedicationManagement(false)}
    authToken={AUTH_TOKEN}
    apiBaseUrl={API_BASE_URL}
    currentUser={user}
    patients={patients} 
  />
)}
    </div>
  );
};

export default ClinicalStaffDashboard;