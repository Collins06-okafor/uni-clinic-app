import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, Users, FileText, Heart, Pill, AlertTriangle, Plus, 
  Edit, Trash2, Check, X, Search, Filter, Bell, Stethoscope, 
  Activity, BarChart3, History, User, CheckCircle, Thermometer, 
  TrendingUp, Clipboard, ClipboardCheck, ClipboardList
} from 'lucide-react';

const ClinicalStaffDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showModal, setShowModal] = useState('');
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ status: 'all', priority: 'all', date: new Date().toISOString().split('T')[0] });
  const [searchTerm, setSearchTerm] = useState('');
  const [dashboardData, setDashboardData] = useState({
    staff_member: {},
    today_overview: {},
    patient_queue: []
  });
  const [doctors, setDoctors] = useState([]);
const [availableDoctors, setAvailableDoctors] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [medicationSchedule, setMedicationSchedule] = useState([]);
  const [medications, setMedications] = useState([]);
  const [summary, setSummary] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedMedication, setSelectedMedication] = useState(null);
  
  // Your backend token - in production, this should come from props or secure storage
  const AUTH_TOKEN = '16|iTGQGrMabQfgjprXw6xM01KTAmJc7AQ78qglIs4xd5fa9378';
  
  // Configure your backend URL
  const API_BASE_URL = 'http://localhost:8000'; // Adjust this to your backend URL

  // API calls with your token
  const api = {
    get: async (endpoint) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/clinical/${endpoint}`, {
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
    
    post: async (endpoint, data) => {
      try {
        console.log(`POST to ${endpoint} with data:`, data);
        const response = await fetch(`${API_BASE_URL}/api/clinical/${endpoint}`, {
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
          
          // Try to parse error response for validation details
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
    
    put: async (endpoint, data) => {
      try {
        console.log(`PUT to ${endpoint} with data:`, data);
        const response = await fetch(`${API_BASE_URL}/api/clinical/${endpoint}`, {
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
          
          // Try to parse error response for validation details
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
    
    delete: async (endpoint) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/clinical/${endpoint}`, {
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

  const handleDeleteMedication = async (medicationId) => {
    if (window.confirm('Are you sure you want to delete this medication?')) {
      try {
        setLoading(true);
        await api.delete(`medications/${medicationId}`);
        setMessage({ type: 'success', text: 'Medication deleted successfully!' });
        loadMedications();
      } catch (error) {
        console.error('Error deleting medication:', error);
        setMessage({ type: 'error', text: `Error deleting medication: ${error.message}` });
      } finally {
        setLoading(false);
      }
    }
  };

  // Load dashboard data
  useEffect(() => {
  loadDashboardData();
  // Don't load all doctors on mount - we'll load available ones when needed
}, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('Loading dashboard data...');
      const data = await api.get('dashboard');
      console.log('Dashboard data received:', data);
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setMessage({ type: 'error', text: `Failed to load dashboard data: ${error.message}` });
      
      // Set some fallback data for demonstration
      setDashboardData({
        staff_member: { name: user?.name || "Clinical Staff", staff_no: user?.staff_no || "CS001", department: user?.department || "General" },
        today_overview: { scheduled_appointments: 0, completed_tasks: 0, pending_tasks: 0, urgent_cases: 0 },
        patient_queue: []
      });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  // Load appointments - fix the endpoint
const loadAppointments = async () => {
  try {
    setLoading(true);
    console.log('Loading appointments with filters:', filters);
    const params = new URLSearchParams({
      date: filters.date,
      status: filters.status,
      priority: filters.priority
    }).toString();
    
    // Changed from 'available-doctors' to 'appointments'
    const data = await api.get(`appointments?${params}`);
    console.log('Appointments data received:', data);
    setAppointments(data.appointments || []); // Match backend response structure
  } catch (error) {
    console.error('Error loading appointments:', error);
    setMessage({ type: 'error', text: `Failed to load appointments: ${error.message}` });
    setAppointments([]);
  } finally {
    setLoading(false);
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }
};

  // Load patients
  const loadPatients = async () => {
    try {
      setLoading(true);
      console.log('Loading patients...');
      const data = await api.get('patients');
      console.log('Patients data received:', data);
      setPatients(data.patients || []);
    } catch (error) {
      console.error('Error loading patients:', error);
      setMessage({ type: 'error', text: `Failed to load patients: ${error.message}` });
      setPatients([]); // Set empty array as fallback
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  // Load medication schedule
  const loadMedicationSchedule = async () => {
  try {
    console.log('Loading medication schedule...');
    const data = await api.get(`medication-schedule?date=${filters.date}`);
    console.log('Medication schedule data received:', data);
    setMedicationSchedule(data.medications || []); // Match backend response structure
  } catch (error) {
    console.error('Error loading medication schedule:', error);
    setMessage({ type: 'error', text: `Failed to load medication schedule: ${error.message}` });
    setMedicationSchedule([]);
  } finally {
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }
};

  // Load doctors - fix the endpoint and data structure
const loadDoctors = async () => {
  try {
    setLoading(true);
    console.log('Loading all doctors...');
    
    // Get all doctors by calling the available doctors endpoint without date/time filters
    const data = await api.get('available-doctors');
    console.log('Doctors data received:', data);
    
    // Handle the response structure from getAvailableDoctors
    if (data.available_doctors) {
      setDoctors(data.available_doctors);
    } else if (data.data) {
      setDoctors(data.data);
    } else {
      setDoctors([]);
    }
  } catch (error) {
    console.error('Error loading doctors:', error);
    setMessage({ type: 'error', text: `Failed to load doctors: ${error.message}` });
    setDoctors([]);
  } finally {
    setLoading(false);
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }
};


// Load available doctors based on date and time
const loadAvailableDoctors = async (date, time) => {
  try {
    console.log('Loading available doctors for:', date, time);
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (time) params.append('time', time);
    
    // Fixed endpoint call
    const data = await api.get(`available-doctors?${params.toString()}`);
    console.log('Available doctors data received:', data);
    return data.available_doctors || [];
  } catch (error) {
    console.error('Error loading available doctors:', error);
    setMessage({ type: 'error', text: `Failed to load available doctors: ${error.message}` });
    return [];
  }
};

  // Create appointment with proper data structure
  const createAppointment = async (appointmentData) => {
  try {
    // Use selected doctor or find first available doctor
    let doctorId = appointmentData.doctor_id;
    if (!doctorId && doctors.length > 0) {
      doctorId = doctors[0].id;
    }
    
    // Fallback to user ID if no doctors available
    if (!doctorId) {
      doctorId = user?.id || 1;
    }

    // Transform the data to match backend expectations
    const transformedData = {
      patient_id: parseInt(appointmentData.patient_id),
      doctor_id: doctorId,
      date: appointmentData.appointment_date || new Date().toISOString().split('T')[0],
      time: appointmentData.appointment_time || '09:00',
      type: appointmentData.appointment_type || 'consultation',
      duration: 30, // Default duration
      priority: appointmentData.priority || 'normal',
      reason: appointmentData.notes || 'Medical consultation',
      status: 'scheduled'
    };
    
    console.log('Creating appointment with transformed data:', transformedData);
    const result = await api.post('appointments/schedule', transformedData);
    console.log('Appointment created:', result);
    
    setMessage({ type: 'success', text: 'Appointment created successfully!' });
    loadAppointments();
    setShowModal('');
    setFormData({});
  } catch (error) {
    console.error('Error creating appointment:', error);
    setMessage({ type: 'error', text: `Error creating appointment: ${error.message}` });
  }
  setTimeout(() => setMessage({ type: '', text: '' }), 5000);
};

  // Update appointment
  const updateAppointment = async (id, updateData) => {
    try {
      console.log('Updating appointment:', id, updateData);
      const result = await api.put(`appointments/${id}`, updateData);
      console.log('Appointment updated:', result);
      setMessage({ type: 'success', text: 'Appointment updated successfully!' });
      loadAppointments();
      setShowModal('');
      setFormData({});
    } catch (error) {
      console.error('Error updating appointment:', error);
      setMessage({ type: 'error', text: `Error updating appointment: ${error.message}` });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // Delete appointment
  const deleteAppointment = async (id) => {
    if (window.confirm('Are you sure you want to delete this appointment?')) {
      try {
        console.log('Deleting appointment:', id);
        await api.delete(`appointments/${id}`);
        setMessage({ type: 'success', text: 'Appointment deleted successfully!' });
        loadAppointments();
      } catch (error) {
        console.error('Error deleting appointment:', error);
        setMessage({ type: 'error', text: `Error deleting appointment: ${error.message}` });
      }
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  // Update patient vitals
  const updateVitals = async (patientId, vitalsData) => {
    try {
      console.log('Recording vitals for patient:', patientId, vitalsData);
      
      // Transform vitals data to match backend expectations
      const transformedVitals = {
        blood_pressure_systolic: vitalsData.blood_pressure ? parseInt(vitalsData.blood_pressure.split('/')[0]) : null,
        blood_pressure_diastolic: vitalsData.blood_pressure ? parseInt(vitalsData.blood_pressure.split('/')[1]) : null,
        heart_rate: vitalsData.heart_rate ? parseInt(vitalsData.heart_rate) : null,
        temperature: vitalsData.temperature ? parseFloat(vitalsData.temperature) : null,
        temperature_unit: 'C', // Default to Celsius
        respiratory_rate: vitalsData.respiratory_rate ? parseInt(vitalsData.respiratory_rate) : null,
        oxygen_saturation: vitalsData.oxygen_saturation ? parseInt(vitalsData.oxygen_saturation) : null,
        notes: vitalsData.notes || ''
      };
      
      const result = await api.put(`patients/${patientId}/vital-signs`, transformedVitals);
      console.log('Vitals recorded:', result);
      
      setMessage({ type: 'success', text: 'Vital signs recorded successfully!' });
      if (result.alerts && result.alerts.length > 0) {
        const alertMessages = result.alerts.map(alert => `${alert.type}: ${alert.message}`).join('\\n');
        setMessage({ type: 'warning', text: `ALERTS:\\n${alertMessages}` });
      }
      setShowModal('');
      setFormData({});
    } catch (error) {
      console.error('Error recording vitals:', error);
      setMessage({ type: 'error', text: `Error recording vital signs: ${error.message}` });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // Record medication
  const recordMedication = async (patientId, medicationData) => {
    try {
      console.log('Recording medication for patient:', patientId, medicationData);
      const result = await api.post(`patients/${patientId}/medication`, medicationData);
      console.log('Medication recorded:', result);
      setMessage({ type: 'success', text: 'Medication recorded successfully!' });
      loadMedicationSchedule();
      setShowModal('');
      setFormData({});
    } catch (error) {
      console.error('Error recording medication:', error);
      setMessage({ type: 'error', text: `Error recording medication: ${error.message}` });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // Confirm appointment
  const confirmAppointment = async (appointmentId, method) => {
    try {
      console.log('Confirming appointment:', appointmentId, method);
      const result = await api.post(`appointments/${appointmentId}/confirm`, {
        method: method,
        custom_message: formData.custom_message
      });
      console.log('Confirmation sent:', result);
      setMessage({ type: 'success', text: 'Confirmation sent successfully!' });
      loadAppointments();
      setShowModal('');
      setFormData({});
    } catch (error) {
      console.error('Error sending confirmation:', error);
      setMessage({ type: 'error', text: `Error sending confirmation: ${error.message}` });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const fetchMedications = async (patientId = null) => {
    try {
      setLoading(true);
      let endpoint = `medication-schedule?date=${new Date().toISOString().split('T')[0]}`;
      if (patientId) {
        endpoint = `patients/${patientId}/medications`;
      }
      
      const data = await api.get(endpoint);
      console.log('Medications data:', data);
      return data.medications || data.data || [];
    } catch (error) {
      console.error('Error fetching medications:', error);
      setMessage({ type: 'error', text: `Failed to load medications: ${error.message}` });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const loadMedications = async (patientId = null) => {
    const medications = await fetchMedications(patientId);
    setMedicationSchedule(medications);
    return medications;
  };

  // Get medical card
  const getMedicalCard = async (patientId) => {
    try {
      console.log('Loading medical card for patient:', patientId);
      const data = await api.get(`patients/${patientId}/medical-card`);
      console.log('Medical card loaded:', data);
      setFormData(data);
      setShowModal('viewMedicalCard');
    } catch (error) {
      console.error('Error loading medical card:', error);
      setMessage({ type: 'error', text: `Error loading medical card: ${error.message}` });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  const checkDoctorAvailability = async (date, time) => {
  if (!date || !time) return;
  
  try {
    const available = await loadAvailableDoctors(date, time);
    setAvailableDoctors(available);
    
    // If currently selected doctor is not available, clear selection
    if (formData.doctor_id && !available.find(doc => doc.id === parseInt(formData.doctor_id))) {
      setFormData(prev => ({...prev, doctor_id: ''}));
      setMessage({ 
        type: 'warning', 
        text: 'Selected doctor is not available at this time. Please choose another doctor.' 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  } catch (error) {
    console.error('Error checking doctor availability:', error);
  }
};

  // Update medical card
  const updateMedicalCard = async (patientId, cardData) => {
    try {
      console.log('Updating medical card for patient:', patientId, cardData);
      const result = await api.post(`patients/${patientId}/medical-card`, cardData);
      console.log('Medical card updated:', result);
      setMessage({ type: 'success', text: 'Medical card updated successfully!' });
      setShowModal('');
      setFormData({});
    } catch (error) {
      console.error('Error updating medical card:', error);
      setMessage({ type: 'error', text: `Error updating medical card: ${error.message}` });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // Filter appointments by urgency
  const filterByUrgency = (urgency) => {
    setFilters({...filters, priority: urgency});
  };

  // Filtered appointments
  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch = apt.patient?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         apt.patient?.student_id?.includes(searchTerm) || false;
    const matchesStatus = filters.status === 'all' || apt.status === filters.status;
    const matchesPriority = filters.priority === 'all' || apt.priority === filters.priority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Filtered patients
  const filteredPatients = patients.filter(patient => 
    patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.student_id?.includes(searchTerm) || false
  );

  const MedicationForm = ({ onSubmit, initialData = {} }) => {
    const [formData, setFormData] = useState({
      name: initialData.name || '',
      generic_name: initialData.generic_name || '',
      dosage: initialData.dosage || '',
      frequency: initialData.frequency || 'daily',
      start_date: initialData.start_date || new Date().toISOString().split('T')[0],
      end_date: initialData.end_date || '',
      instructions: initialData.instructions || '',
      status: initialData.status || 'active'
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      onSubmit(formData);
    };


    return (
      <form onSubmit={handleSubmit}>
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Medication Name *</label>
            <input
              type="text"
              className="form-control"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Generic Name</label>
            <input
              type="text"
              className="form-control"
              value={formData.generic_name}
              onChange={(e) => setFormData({...formData, generic_name: e.target.value})}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Dosage *</label>
            <input
              type="text"
              className="form-control"
              value={formData.dosage}
              onChange={(e) => setFormData({...formData, dosage: e.target.value})}
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Frequency *</label>
            <select
              className="form-select"
              value={formData.frequency}
              onChange={(e) => setFormData({...formData, frequency: e.target.value})}
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
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
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
              value={formData.start_date}
              onChange={(e) => setFormData({...formData, start_date: e.target.value})}
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">End Date</label>
            <input
              type="date"
              className="form-control"
              value={formData.end_date}
              onChange={(e) => setFormData({...formData, end_date: e.target.value})}
            />
          </div>
          <div className="col-12">
            <label className="form-label">Instructions</label>
            <textarea
              className="form-control"
              rows="3"
              value={formData.instructions}
              onChange={(e) => setFormData({...formData, instructions: e.target.value})}
            ></textarea>
          </div>
        </div>
        <div className="d-flex justify-content-end gap-2 mt-4">
          <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal('')}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {initialData.id ? 'Update' : 'Add'} Medication
          </button>
        </div>
      </form>
    );
  };

  // Load data when tabs change - separated to avoid infinite loops
  useEffect(() => {
    if (activeTab === 'appointments') {
      loadAppointments();
    }
    if (activeTab === 'patients') {
      loadPatients();
    }
    if (activeTab === 'medications') {
      loadMedicationSchedule();
    }
    if (activeTab === 'doctors') {
    loadDoctors();
  }
  }, [activeTab]);

  // Reload appointments when filters change
  useEffect(() => {
    if (activeTab === 'appointments') {
      loadAppointments();
    }
  }, [filters.status, filters.priority, filters.date]);

  // Reload medications when date filter changes
  useEffect(() => {
    if (activeTab === 'medications') {
      loadMedications();
    }
  }, [activeTab]);

  useEffect(() => {
    fetchMedications();
  }, []);

  // Get status badge class
  const getStatusBadge = (status) => {
    const badges = {
      scheduled: 'badge bg-primary',
      confirmed: 'badge bg-success',
      in_progress: 'badge bg-warning text-dark',
      completed: 'badge bg-secondary',
      cancelled: 'badge bg-danger',
      active: 'badge bg-success'
    };
    return badges[status] || 'badge bg-secondary';
  };

  // Get priority badge class
  const getPriorityBadge = (priority) => {
    const badges = {
      urgent: 'badge bg-danger',
      high: 'badge bg-warning text-dark',
      normal: 'badge bg-info'
    };
    return badges[priority] || 'badge bg-secondary';
  };

  // Dashboard Overview Component
  const DashboardOverview = () => (
    <div className="row g-4">
      {/* Welcome Card */}
      <div className="col-12">
        <div className="card shadow-sm border-0" style={{ borderRadius: '1rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <div className="card-body p-4 text-white">
            <div className="row align-items-center">
              <div className="col-md-8">
                <h3 className="mb-2">Welcome back, {dashboardData.staff_member?.name || user?.name || 'Clinical Staff'}!</h3>
                <p className="mb-1 opacity-90">Staff No: {dashboardData.staff_member?.staff_no || user?.staff_no || 'CS001'}</p>
                <p className="mb-0 opacity-75">Department: {dashboardData.staff_member?.department || user?.department || 'General'}</p>
                <button 
                  onClick={onLogout}
                  className="btn btn-outline-light btn-sm mt-3"
                  style={{ borderRadius: '0.5rem' }}
                >
                  Logout
                </button>
              </div>
              <div className="col-md-4 text-end">
                <User size={80} className="opacity-75" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards - Only show if they have actual data */}
      {(dashboardData.today_overview?.scheduled_appointments > 0 || 
        dashboardData.today_overview?.completed_tasks > 0 || 
        dashboardData.today_overview?.pending_tasks > 0 || 
        dashboardData.today_overview?.urgent_cases > 0) && (
        <>
          <div className="col-md-3 col-sm-6">
            <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1rem' }}>
              <div className="card-body p-4 text-center">
                <div className="d-inline-flex align-items-center justify-content-center mb-3" 
                     style={{ width: '60px', height: '60px', backgroundColor: '#e3f2fd', borderRadius: '50%' }}>
                  <Calendar size={30} className="text-primary" />
                </div>
                <h4 className="fw-bold text-primary mb-1">{dashboardData.today_overview?.scheduled_appointments || 0}</h4>
                <p className="text-muted mb-0">Scheduled</p>
              </div>
            </div>
          </div>

          <div className="col-md-3 col-sm-6">
            <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1rem' }}>
              <div className="card-body p-4 text-center">
                <div className="d-inline-flex align-items-center justify-content-center mb-3" 
                     style={{ width: '60px', height: '60px', backgroundColor: '#e8f5e8', borderRadius: '50%' }}>
                  <CheckCircle size={30} className="text-success" />
                </div>
                <h4 className="fw-bold text-success mb-1">{dashboardData.today_overview?.completed_tasks || 0}</h4>
                <p className="text-muted mb-0">Completed</p>
              </div>
            </div>
          </div>

          <div className="col-md-3 col-sm-6">
            <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1rem' }}>
              <div className="card-body p-4 text-center">
                <div className="d-inline-flex align-items-center justify-content-center mb-3" 
                     style={{ width: '60px', height: '60px', backgroundColor: '#fff3cd', borderRadius: '50%' }}>
                  <Clock size={30} className="text-warning" />
                </div>
                <h4 className="fw-bold text-warning mb-1">{dashboardData.today_overview?.pending_tasks || 0}</h4>
                <p className="text-muted mb-0">Pending</p>
              </div>
            </div>
          </div>

          <div className="col-md-3 col-sm-6">
            <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1rem' }}>
              <div className="card-body p-4 text-center">
                <div className="d-inline-flex align-items-center justify-content-center mb-3" 
                     style={{ width: '60px', height: '60px', backgroundColor: '#ffebee', borderRadius: '50%' }}>
                  <AlertTriangle size={30} className="text-danger" />
                </div>
                <h4 className="fw-bold text-danger mb-1">{dashboardData.today_overview?.urgent_cases || 0}</h4>
                <p className="text-muted mb-0">Urgent</p>
              </div>
            </div>
          </div>
        </>
      )}

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
                  style={{ borderRadius: '0.75rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                  onClick={() => {
                    setActiveTab('appointments');
                    setShowModal('createAppointment');
                  }}
                >
                  <Plus size={24} className="mb-2" />
                  <div className="fw-semibold">New Appointment</div>
                  <small className="opacity-75">Schedule a new appointment</small>
                </button>
              </div>
              
              <div className="col-md-4">
                <button 
                  className="btn btn-outline-primary w-100 py-3" 
                  style={{ borderRadius: '0.75rem' }}
                  onClick={() => setActiveTab('patients')}
                >
                  <Users size={24} className="mb-2" />
                  <div className="fw-semibold">Patient List</div>
                  <small className="text-muted">View all patients</small>
                </button>
              </div>
              
              <div className="col-md-4">
                <button 
                  className="btn btn-outline-success w-100 py-3" 
                  style={{ borderRadius: '0.75rem' }}
                  onClick={() => setActiveTab('medications')}
                >
                  <Pill size={24} className="mb-2" />
                  <div className="fw-semibold">Medications</div>
                  <small className="text-muted">View medication schedule</small>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Patient Queue - Only show if there's actual data */}
      {dashboardData.patient_queue && dashboardData.patient_queue.length > 0 && (
        <div className="col-12">
          <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
            <div className="card-header bg-white border-0 pb-0">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="fw-bold mb-0">Patient Queue</h5>
                <div className="d-flex align-items-center">
                  <Clock size={18} className="me-2 text-muted" />
                  <span className="text-muted">{new Date().toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
            <div className="card-body p-4">
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th scope="col">Time</th>
                      <th scope="col">Patient</th>
                      <th scope="col">Status</th>
                      <th scope="col">Priority</th>
                      <th scope="col">Doctor</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.patient_queue.map((patient, index) => (
                      <tr key={index}>
                        <td>{patient.time}</td>
                        <td>
                          <div>
                            <p className="fw-semibold mb-0">{patient.patient_name}</p>
                            <small className="text-muted">{patient.student_id}</small>
                          </div>
                        </td>
                        <td>
                          <span className={`${getStatusBadge(patient.status)}`}>
                            {patient.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          <span className={`${getPriorityBadge(patient.priority)}`}>
                            {patient.priority}
                          </span>
                        </td>
                        <td>{patient.assigned_doctor}</td>
                        <td>
                          <button 
                            onClick={() => {
                              setFormData({appointmentId: patient.id});
                              setShowModal('confirm');
                            }}
                            className="btn btn-sm btn-outline-primary"
                            style={{ borderRadius: '0.5rem' }}
                          >
                            <Bell size={16} className="me-1" />
                            Notify
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Appointments Management Component
  const AppointmentsManagement = () => (
    <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
      <div className="card-header bg-gradient" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <h3 className="card-title text-white mb-0 d-flex align-items-center">
          <Calendar size={24} className="me-2" />
          Appointments Management
        </h3>
      </div>
      <div className="card-body p-4">
        {/* Filters */}
        <div className="row g-3 mb-4">
          <div className="col-md-3">
            <label className="form-label fw-semibold">Date</label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters({...filters, date: e.target.value})}
              className="form-control"
            />
          </div>
          <div className="col-md-3">
            <label className="form-label fw-semibold">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="form-select"
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label fw-semibold">Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({...filters, priority: e.target.value})}
              className="form-select"
            >
              <option value="all">All Priorities</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label fw-semibold">Search</label>
            <div className="input-group">
              <span className="input-group-text">
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-control"
              />
            </div>
          </div>
        </div>

        {/* Quick filter buttons */}
        <div className="d-flex flex-wrap gap-2 mb-4">
          <button 
            onClick={() => filterByUrgency('urgent')}
            className="btn btn-sm btn-danger"
            style={{ borderRadius: '0.5rem' }}
          >
            Urgent Only
          </button>
          <button 
            onClick={() => filterByUrgency('high')}
            className="btn btn-sm btn-warning"
            style={{ borderRadius: '0.5rem' }}
          >
            High Priority
          </button>
          <button 
            onClick={() => filterByUrgency('all')}
            className="btn btn-sm btn-secondary"
            style={{ borderRadius: '0.5rem' }}
          >
            All Priorities
          </button>
          <button 
            onClick={() => setShowModal('createAppointment')}
            className="btn btn-sm btn-primary ms-auto"
            style={{ borderRadius: '0.5rem' }}
          >
            <Plus size={16} className="me-1" />
            New Appointment
          </button>
        </div>

        {/* Appointments List */}
        <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Patient</th>
              <th scope="col">Doctor</th>
              <th scope="col">Type</th>
              <th scope="col">Status</th>
              <th scope="col">Priority</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="text-muted mt-2">Loading appointments...</p>
                </td>
              </tr>
            ) : filteredAppointments.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-5">
                  <Calendar size={48} className="text-muted mb-3" />
                  <p className="text-muted">No appointments found</p>
                  <small className="text-muted">Try adjusting your filters or create a new appointment</small>
                </td>
              </tr>
            ) : (
              filteredAppointments.map((appointment) => (
                <tr key={appointment.id}>
                  <td>{appointment.time}</td>
                  <td>
                    <div>
                      {/* Handle different data structures */}
                      <p className="fw-semibold mb-0">
                        {appointment.patient?.name || appointment.patient_name}
                      </p>
                      <small className="text-muted">
                        {appointment.patient?.student_id || appointment.student_id}
                      </small>
                    </div>
                  </td>
                  <td>{appointment.doctor?.name || appointment.doctor}</td>
                  <td>{appointment.type}</td>
                  <td>
                    <span className={`${getStatusBadge(appointment.status)}`}>
                      {appointment.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <span className={`${getPriorityBadge(appointment.priority)}`}>
                      {appointment.priority}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex gap-2">
                      <button 
                        onClick={() => {
                          setFormData(appointment);
                          setShowModal('editAppointment');
                        }}
                        className="btn btn-sm btn-outline-primary"
                        style={{ borderRadius: '0.5rem' }}
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => deleteAppointment(appointment.id)}
                        className="btn btn-sm btn-outline-danger"
                        style={{ borderRadius: '0.5rem' }}
                      >
                        <Trash2 size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          setFormData({appointmentId: appointment.id});
                          setShowModal('confirm');
                        }}
                        className="btn btn-sm btn-outline-success"
                        style={{ borderRadius: '0.5rem' }}
                      >
                        <Check size={16} />
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
);

  // Patients Management Component
  const PatientsManagement = () => (
    <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
      <div className="card-header bg-gradient" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <h3 className="card-title text-white mb-0 d-flex align-items-center">
          <Users size={24} className="me-2" />
          Patients Management
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
                onChange={(e) => setSearchTerm(e.target.value)}
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
          ) : filteredPatients.length === 0 ? (
            <div className="col-12 text-center py-5">
              <Users size={48} className="text-muted mb-3" />
              <p className="text-muted">No patients found</p>
              <small className="text-muted">Try adjusting your search term</small>
            </div>
          ) : (
            filteredPatients.map((patient) => (
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
                        onClick={() => getMedicalCard(patient.id)}
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
  );

  // Medication Schedule Component
  const MedicationSchedule = () => (
    <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
      <div className="card-header bg-gradient" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="d-flex justify-content-between align-items-center">
          <h3 className="card-title text-white mb-0 d-flex align-items-center">
            <Pill size={24} className="me-2" />
            Medication Schedule
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
                  <td colSpan="7" className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : medicationSchedule.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted">
                    <Pill size={48} className="text-muted mb-3" />
                    <p className="text-muted">No medications found</p>
                    <small className="text-muted">Add medications to see them here</small>
                  </td>
                </tr>
              ) : (
                medicationSchedule.map((medication) => (
                  <tr key={medication.id}>
    <td>
      <strong>{medication.medication_name}</strong> {/* Changed from medication.name */}
      {medication.generic && ( /* Changed from generic_name */
        <div className="text-muted small">{medication.generic}</div>
      )}
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
                        onClick={() => handleDeleteMedication(medication.id)}
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
  );

  // Modal Components
  const Modal = ({ title, children, onClose }) => (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content" style={{ borderRadius: '1rem' }}>
          <div className="modal-header border-0 pb-0">
            <h5 className="modal-title fw-bold">{title}</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
            ></button>
          </div>
          <div className="modal-body pt-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  const DoctorsManagement = () => (
  <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
    <div className="card-header bg-gradient" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
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
                  {/* Handle both 'name' and 'full_name' properties */}
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
                      onClick={() => {
                        setFormData({
                          patient_id: '',
                          doctor_id: doctor.id,
                          appointment_date: new Date().toISOString().split('T')[0],
                          appointment_time: '09:00'
                        });
                        setShowModal('createAppointment');
                      }}
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
);

 const QuickTimeSlots = ({ selectedDate, onTimeSelect }) => {
  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30'
  ];

  return (
    <div className="mb-3">
      <label className="form-label">Quick Time Selection</label>
      <div className="d-flex flex-wrap gap-2">
        {timeSlots.map(time => (
          <button
            key={time}
            type="button"
            className={`btn btn-sm ${formData.appointment_time === time ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={async () => {
              setFormData(prev => ({...prev, appointment_time: time}));
              onTimeSelect(time);
              if (selectedDate) {
                await checkDoctorAvailability(selectedDate, time);
              }
            }}
            style={{ borderRadius: '0.5rem' }}
          >
            {time}
          </button>
        ))}
      </div>
    </div>
  );
};

  return (
    <div className="container-fluid py-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <div className="row justify-content-center">
        <div className="col-12 col-xl-10">
          {/* Header */}
          <div className="text-center mb-5">
            <div className="d-inline-flex align-items-center justify-content-center mb-3" 
                 style={{ width: '80px', height: '80px', backgroundColor: '#0d6efd', borderRadius: '50%' }}>
              <Stethoscope size={40} className="text-white" />
            </div>
            <h1 className="display-5 fw-bold text-dark mb-2">Clinical Staff Dashboard</h1>
            <p className="lead text-muted">Manage patient care, appointments, and medical records</p>
          </div>

          {/* Message Display */}
          {message.text && (
            <div className={`alert ${message.type === 'success' ? 'alert-success' : message.type === 'error' ? 'alert-danger' : 'alert-warning'} alert-dismissible fade show mb-4`} 
                 role="alert">
              <div className="d-flex align-items-center">
                {message.type === 'success' ? <CheckCircle size={20} className="me-2" /> : <X size={20} className="me-2" />}
                <div style={{ whiteSpace: 'pre-line' }}>{message.text}</div>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-white border-0 p-0">
              <ul className="nav nav-pills nav-fill p-3" id="pills-tab" role="tablist">
                <li className="nav-item" role="presentation">
                  <button 
                    className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''} fw-semibold`}
                    onClick={() => setActiveTab('dashboard')}
                    type="button"
                    style={{ borderRadius: '0.5rem' }}
                  >
                    <BarChart3 size={18} className="me-2" />
                    Dashboard
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button 
                    className={`nav-link ${activeTab === 'appointments' ? 'active' : ''} fw-semibold`}
                    onClick={() => setActiveTab('appointments')}
                    type="button"
                    style={{ borderRadius: '0.5rem' }}
                  >
                    <Calendar size={18} className="me-2" />
                    Appointments
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button 
                    className={`nav-link ${activeTab === 'patients' ? 'active' : ''} fw-semibold`}
                    onClick={() => setActiveTab('patients')}
                    type="button"
                    style={{ borderRadius: '0.5rem' }}
                  >
                    <Users size={18} className="me-2" />
                    Patients
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button 
                    className={`nav-link ${activeTab === 'medications' ? 'active' : ''} fw-semibold`}
                    onClick={() => setActiveTab('medications')}
                    type="button"
                    style={{ borderRadius: '0.5rem' }}
                  >
                    <Pill size={18} className="me-2" />
                    Medications
                  </button>
                </li>
                <li className="nav-item" role="presentation">
  <button 
    className={`nav-link ${activeTab === 'doctors' ? 'active' : ''} fw-semibold`}
    onClick={() => setActiveTab('doctors')}
    type="button"
    style={{ borderRadius: '0.5rem' }}
  >
    <User size={18} className="me-2" />
    Doctors
  </button>
</li>
              </ul>
            </div>
          </div>

          {/* Main Content */}
          {activeTab === 'dashboard' && <DashboardOverview />}
          {activeTab === 'appointments' && <AppointmentsManagement />}
          {activeTab === 'patients' && <PatientsManagement />}
          {activeTab === 'medications' && <MedicationSchedule />}
          {activeTab === 'doctors' && <DoctorsManagement />}

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
      
      {/* Date and Time selection with quick slots */}
      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <label className="form-label">Date <span className="text-danger">*</span></label>
          <input
            type="date"
            className="form-control"
            value={formData.appointment_date || ''}
            onChange={async (e) => {
              const newFormData = {...formData, appointment_date: e.target.value};
              setFormData(newFormData);
              
              // Load available doctors when date changes
              if (e.target.value && newFormData.appointment_time) {
                await checkDoctorAvailability(e.target.value, newFormData.appointment_time);
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
              const newFormData = {...formData, appointment_time: e.target.value};
              setFormData(newFormData);
              
              // Load available doctors when time changes
              if (e.target.value && newFormData.appointment_date) {
                await checkDoctorAvailability(newFormData.appointment_date, e.target.value);
              }
            }}
            required
          />
        </div>
      </div>
      
      {/* Quick Time Slots */}
      <QuickTimeSlots 
        selectedDate={formData.appointment_date}
        onTimeSelect={async (time) => {
          if (formData.appointment_date) {
            await checkDoctorAvailability(formData.appointment_date, time);
          }
        }}
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
              {doctor.name} - {doctor.specialization} ({doctor.department})
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
      
      {/* Rest of your form fields */}
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
          rows="3"
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
                    rows="3"
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
                    rows="3"
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
                    <label className="form-label">Blood Pressure (mmHg)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="120/80"
                      value={formData.blood_pressure || ''}
                      onChange={(e) => setFormData({...formData, blood_pressure: e.target.value})}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Heart Rate (bpm)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="72"
                      value={formData.heart_rate || ''}
                      onChange={(e) => setFormData({...formData, heart_rate: e.target.value})}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Temperature (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control"
                      placeholder="36.6"
                      value={formData.temperature || ''}
                      onChange={(e) => setFormData({...formData, temperature: e.target.value})}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Respiratory Rate (breaths/min)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="16"
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
                      min="0"
                      max="100"
                      value={formData.oxygen_saturation || ''}
                      onChange={(e) => setFormData({...formData, oxygen_saturation: e.target.value})}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Notes</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="Any observations or concerns..."
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    ></textarea>
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
                      value={formData.name || ''}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
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
                      rows="3"
                      placeholder="Special instructions for the patient..."
                      value={formData.instructions || ''}
                      onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                    ></textarea>
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
                    loadMedications();
                    setShowModal('');
                  } catch (error) {
                    console.error('Error adding medication:', error);
                    setMessage({ type: 'error', text: `Error adding medication: ${error.message}` });
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
                    loadMedications();
                    setShowModal('');
                  } catch (error) {
                    console.error('Error updating medication:', error);
                    setMessage({ type: 'error', text: `Error updating medication: ${error.message}` });
                  } finally {
                    setLoading(false);
                  }
                }}
              />
            </Modal>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClinicalStaffDashboard;