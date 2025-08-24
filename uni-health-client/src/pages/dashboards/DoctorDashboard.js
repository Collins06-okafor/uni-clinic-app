import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, FileText, Pill, User, Plus, Search, Eye, Edit, CheckCircle, XCircle, Stethoscope, Heart, Brain, Thermometer, BarChart3, Activity, TrendingUp } from 'lucide-react';
import { APPOINTMENT_STATUSES, getStatusText, getStatusBadgeClass } from '../../constants/appointmentStatuses';
import api from '../../services/api';

const EnhancedDoctorDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showModal, setShowModal] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const API_BASE_URL = 'http://127.0.0.1:8000/api';
  
  // Form states
  const [availabilityForm, setAvailabilityForm] = useState({
    available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    working_hours_start: '09:00',
    working_hours_end: '17:00'
  });
  
  const [appointmentForm, setAppointmentForm] = useState({
    patient_id: '',
    date: '',
    time: '',
    reason: ''
  });
  
  const [medicalRecordForm, setMedicalRecordForm] = useState({
    diagnosis: '',
    treatment: '',
    notes: '',
    visit_date: new Date().toISOString().split('T')[0]
  });
  
  const [prescriptionForm, setPrescriptionForm] = useState({
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
  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
  ];

  // Get dashboard statistics
  const getDashboardStats = () => {
    const today = new Date();
    const upcomingAppointments = appointments.filter(apt => 
      new Date(apt.date) >= today && (apt.status === 'scheduled' || apt.status === 'confirmed')
    ).length;
    
    const completedAppointments = appointments.filter(apt => 
      apt.status === 'completed'
    ).length;
    
    return {
      total: appointments.length,
      upcoming: upcomingAppointments,
      completed: completedAppointments,
      patients: patients.length,
      prescriptions: prescriptions.length
    };
  };

  const stats = getDashboardStats();

  const fetchAppointments = async () => {
  setLoading(true);
  try {
    const response = await fetch(`${API_BASE_URL}/doctor/appointments?date=${selectedDate}`, {
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
    setAppointments(data.appointments || []);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    setMessage({ type: 'error', text: 'Failed to load appointments' });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }
  setLoading(false);
};

  // 3. Fix fetchPatients function (around line 103)
const fetchPatients = async () => {
  setLoading(true);
  try {
    const response = await fetch(`${API_BASE_URL}/doctor/patients`, {
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
    setPatients(data.patients?.data || []);
  } catch (error) {
    console.error('Error fetching patients:', error);
    setMessage({ type: 'error', text: 'Failed to load patients' });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }
  setLoading(false);
};

  // 4. Fix fetchPrescriptions function (around line 119)
const fetchPrescriptions = async () => {
  setLoading(true);
  try {
    const response = await fetch(`${API_BASE_URL}/doctor/prescriptions`, {
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

  const updateAvailability = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/doctor/availability`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(availabilityForm)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    setMessage({ type: 'success', text: 'Availability updated successfully!' });
    setShowModal('');
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  } catch (error) {
    console.error('Error updating availability:', error);
    setMessage({ type: 'error', text: 'Failed to update availability' });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }
};

// Add doctor availability management:

const setAvailability = async (availabilityData) => {
  try {
    await api.put('doctor/availability', {
      available_days: availabilityData.days,
      working_hours_start: availabilityData.startTime,
      working_hours_end: availabilityData.endTime,
      special_dates: availabilityData.specialDates || []
    });
    setMessage({ type: 'success', text: 'Availability updated successfully' });
  } catch (error) {
    setMessage({ type: 'error', text: 'Failed to update availability' });
  }
};

// Add appointment confirmation/rescheduling:
const handleAppointmentAction = async (appointmentId, action, data = {}) => {
  try {
    let updateData = {};
    
    switch (action) {
      case 'confirm':
        updateData = { 
          status: APPOINTMENT_STATUSES.CONFIRMED, 
          confirmed_at: new Date().toISOString() 
        };
        break;
      case 'reschedule':
        updateData = { 
          status: APPOINTMENT_STATUSES.RESCHEDULED,
          new_date: data.newDate,
          new_time: data.newTime,
          reschedule_reason: data.reason
        };
        break;
    }
    
    await api.put(`appointments/${appointmentId}`, updateData);
    fetchAppointments();
  } catch (error) {
    setMessage({ type: 'error', text: `Failed to ${action} appointment` });
  }
};

  // Fix createAppointment function
const createAppointment = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(appointmentForm)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    setMessage({ type: 'success', text: 'Appointment created successfully!' });
    setShowModal('');
    setAppointmentForm({ patient_id: '', date: '', time: '', reason: '' });
    fetchAppointments();
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  } catch (error) {
    console.error('Error creating appointment:', error);
    setMessage({ type: 'error', text: 'Failed to create appointment' });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }
};

  // Fix createMedicalRecord function
const createMedicalRecord = async () => {
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

  // Fix createPrescription function
const createPrescription = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/doctor/prescriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(prescriptionForm)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    setMessage({ type: 'success', text: 'Prescription created successfully!' });
    setShowModal('');
    setPrescriptionForm({
      patient_id: '',
      medications: [{ name: '', dosage: '', instructions: '', start_date: '', end_date: '' }],
      notes: ''
    });
    fetchPrescriptions();
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  } catch (error) {
    console.error('Error creating prescription:', error);
    setMessage({ type: 'error', text: 'Failed to create prescription' });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }
};

  const addMedication = () => {
    setPrescriptionForm(prev => ({
      ...prev,
      medications: [...prev.medications, { name: '', dosage: '', instructions: '', start_date: '', end_date: '' }]
    }));
  };

  const removeMedication = (index) => {
    setPrescriptionForm(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }));
  };

  

  useEffect(() => {
    if (activeTab === 'appointments') fetchAppointments();
    if (activeTab === 'patients') fetchPatients();
    if (activeTab === 'prescriptions') fetchPrescriptions();
  }, [activeTab, selectedDate]);

  const filteredPatients = patients.filter(patient => 
    patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.student_id?.includes(searchTerm)
  );

  const getStatusBadge = (status) => {
  return getStatusBadgeClass(status);
};

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const DashboardOverview = () => (
    <div className="row g-4">
      {/* Welcome Card */}
      <div className="col-12">
        <div className="card shadow-sm border-0" style={{ borderRadius: '1rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <div className="card-body p-4 text-white">
            <div className="row align-items-center">
              <div className="col-md-8">
                <h3 className="mb-2">Welcome back, Dr. {user.name}!</h3>
                <p className="mb-1 opacity-90">{user.email}</p>
                <p className="mb-0 opacity-75">Specialization: {user.specialization}</p>
              </div>
              <div className="col-md-4 text-end">
                <User size={80} className="opacity-75" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="col-md-3 col-sm-6">
        <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1rem' }}>
          <div className="card-body p-4 text-center">
            <div className="d-inline-flex align-items-center justify-content-center mb-3" 
                 style={{ width: '60px', height: '60px', backgroundColor: '#e3f2fd', borderRadius: '50%' }}>
              <Calendar size={30} className="text-primary" />
            </div>
            <h4 className="fw-bold text-primary mb-1">{stats.total}</h4>
            <p className="text-muted mb-0">Total Appointments</p>
          </div>
        </div>
      </div>

      <div className="col-md-3 col-sm-6">
        <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1rem' }}>
          <div className="card-body p-4 text-center">
            <div className="d-inline-flex align-items-center justify-content-center mb-3" 
                 style={{ width: '60px', height: '60px', backgroundColor: '#e8f5e8', borderRadius: '50%' }}>
              <Users size={30} className="text-success" />
            </div>
            <h4 className="fw-bold text-success mb-1">{stats.patients}</h4>
            <p className="text-muted mb-0">Total Patients</p>
          </div>
        </div>
      </div>

      <div className="col-md-3 col-sm-6">
        <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1rem' }}>
          <div className="card-body p-4 text-center">
            <div className="d-inline-flex align-items-center justify-content-center mb-3" 
                 style={{ width: '60px', height: '60px', backgroundColor: '#fff3cd', borderRadius: '50%' }}>
              <Pill size={30} className="text-warning" />
            </div>
            <h4 className="fw-bold text-warning mb-1">{stats.prescriptions}</h4>
            <p className="text-muted mb-0">Prescriptions</p>
          </div>
        </div>
      </div>

      <div className="col-md-3 col-sm-6">
        <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1rem' }}>
          <div className="card-body p-4 text-center">
            <div className="d-inline-flex align-items-center justify-content-center mb-3" 
                 style={{ width: '60px', height: '60px', backgroundColor: '#f3e5f5', borderRadius: '50%' }}>
              <CheckCircle size={30} className="text-info" />
            </div>
            <h4 className="fw-bold text-info mb-1">{stats.completed}</h4>
            <p className="text-muted mb-0">Completed</p>
          </div>
        </div>
      </div>

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
                  onClick={() => setShowModal('appointment')}
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
                  <div className="fw-semibold">Manage Patients</div>
                  <small className="text-muted">View and manage patient records</small>
                </button>
              </div>
              
              <div className="col-md-4">
                <button 
                  className="btn btn-outline-success w-100 py-3" 
                  style={{ borderRadius: '0.75rem' }}
                  onClick={() => setShowModal('prescription')}
                >
                  <Pill size={24} className="mb-2" />
                  <div className="fw-semibold">Create Prescription</div>
                  <small className="text-muted">Issue new medication</small>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Appointments */}
      {appointments.length > 0 && (
        <div className="col-12">
          <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
            <div className="card-header bg-white border-0 pb-0">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="fw-bold mb-0">Today's Appointments</h5>
                <button 
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => setActiveTab('appointments')}
                  style={{ borderRadius: '0.5rem' }}
                >
                  View All
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
                    {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
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
      <div className="card-header bg-gradient" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="d-flex justify-content-between align-items-center">
          <h3 className="card-title text-white mb-0 d-flex align-items-center">
            <Calendar size={24} className="me-2" />
            Appointments
          </h3>
          <div className="d-flex gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="form-control form-control-sm"
              style={{ maxWidth: '150px' }}
            />
            <button
              onClick={() => setShowModal('appointment')}
              className="btn btn-light btn-sm"
              style={{ borderRadius: '0.5rem' }}
            >
              <Plus size={16} className="me-1" />
              New Appointment
            </button>
          </div>
        </div>
      </div>
      <div className="card-body p-4">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted">Loading appointments...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-5">
            <Calendar size={48} className="text-muted mb-3" />
            <p className="text-muted">No appointments found for selected date</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Date & Time</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map(appointment => (
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
                      <span className={`${getStatusBadge(appointment.status)}`}>
                        {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary me-2">
                        <Eye size={16} />
                      </button>
                      <button className="btn btn-sm btn-outline-secondary">
                        <Edit size={16} />
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

  const PatientsTab = () => (
    <div className="card shadow-sm">
      <div className="card-header bg-gradient" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="d-flex justify-content-between align-items-center">
          <h3 className="card-title text-white mb-0 d-flex align-items-center">
            <Users size={24} className="me-2" />
            Patients
          </h3>
          <div className="d-flex gap-2">
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
            {filteredPatients.map(patient => (
              <div key={patient.id} className="col-md-6 col-lg-4">
                <div className="card h-100 shadow-sm border-0" style={{ borderRadius: '1rem' }}>
                  <div className="card-body">
                    <div className="d-flex align-items-center mb-3">
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
      <div className="card-header bg-gradient" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
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
                      {prescription.medications?.map((med, index) => (
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

  // Modals
  const AvailabilityModal = () => (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content" style={{ borderRadius: '1rem' }}>
          <div className="modal-header border-0 pb-0">
            <h5 className="modal-title fw-bold">Set Availability</h5>
            <button
              type="button"
              className="btn-close"
              onClick={() => setShowModal('')}
            ></button>
          </div>
          <div className="modal-body pt-0">
            <div className="mb-4">
              <label className="form-label fw-semibold">Available Days</label>
              <div className="row g-2">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                  <div key={day} className="col-6 col-md-4">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id={`day-${day}`}
                        checked={availabilityForm.available_days.includes(day)}
                        onChange={(e) => {
                          const days = e.target.checked 
                            ? [...availabilityForm.available_days, day]
                            : availabilityForm.available_days.filter(d => d !== day);
                          setAvailabilityForm(prev => ({ ...prev, available_days: days }));
                        }}
                      />
                      <label className="form-check-label" htmlFor={`day-${day}`}>
                        {day}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mb-3">
              <label className="form-label fw-semibold">Working Hours</label>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Start Time</label>
                  <input
                    type="time"
                    className="form-control"
                    value={availabilityForm.working_hours_start}
                    onChange={(e) => setAvailabilityForm(prev => ({ ...prev, working_hours_start: e.target.value }))}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">End Time</label>
                  <input
                    type="time"
                    className="form-control"
                    value={availabilityForm.working_hours_end}
                    onChange={(e) => setAvailabilityForm(prev => ({ ...prev, working_hours_end: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer border-0">
            <button
              onClick={() => setShowModal('')}
              className="btn btn-outline-secondary"
              style={{ borderRadius: '0.5rem' }}
            >
              Cancel
            </button>
            <button
              onClick={updateAvailability}
              className="btn btn-primary"
              style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '0.5rem'
              }}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const AppointmentModal = () => (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content" style={{ borderRadius: '1rem' }}>
          <div className="modal-header border-0 pb-0">
            <h5 className="modal-title fw-bold">Schedule Appointment</h5>
            <button
              type="button"
              className="btn-close"
              onClick={() => setShowModal('')}
            ></button>
          </div>
          <div className="modal-body pt-0">
            <div className="mb-3">
              <label className="form-label fw-semibold">Patient</label>
              <select
                className="form-select"
                value={appointmentForm.patient_id}
                onChange={(e) => setAppointmentForm(prev => ({ ...prev, patient_id: e.target.value }))}
              >
                <option value="">Select Patient</option>
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name} ({patient.student_id || patient.staff_id})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={appointmentForm.date}
                  onChange={(e) => setAppointmentForm(prev => ({ ...prev, date: e.target.value }))}
                  min={getMinDate()}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Time</label>
                <select
                  className="form-select"
                  value={appointmentForm.time}
                  onChange={(e) => setAppointmentForm(prev => ({ ...prev, time: e.target.value }))}
                >
                  <option value="">Select time...</option>
                  {timeSlots.map((time) => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="mb-3">
              <label className="form-label fw-semibold">Reason</label>
              <textarea
                className="form-control"
                rows="3"
                value={appointmentForm.reason}
                onChange={(e) => setAppointmentForm(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Reason for appointment"
              />
            </div>
          </div>
          <div className="modal-footer border-0">
            <button
              onClick={() => setShowModal('')}
              className="btn btn-outline-secondary"
              style={{ borderRadius: '0.5rem' }}
            >
              Cancel
            </button>
            <button
              onClick={createAppointment}
              className="btn btn-primary"
              style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '0.5rem'
              }}
            >
              Schedule Appointment
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const MedicalRecordModal = () => (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content" style={{ borderRadius: '1rem' }}>
          <div className="modal-header border-0 pb-0">
            <h5 className="modal-title fw-bold">
              Medical Record for {selectedPatient?.name}
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={() => setShowModal('')}
            ></button>
          </div>
          <div className="modal-body pt-0">
            <div className="mb-3">
              <label className="form-label fw-semibold">Visit Date</label>
              <input
                type="date"
                className="form-control"
                value={medicalRecordForm.visit_date}
                onChange={(e) => setMedicalRecordForm(prev => ({ ...prev, visit_date: e.target.value }))}
              />
            </div>
            
            <div className="mb-3">
              <label className="form-label fw-semibold">Diagnosis</label>
              <textarea
                className="form-control"
                rows="3"
                value={medicalRecordForm.diagnosis}
                onChange={(e) => setMedicalRecordForm(prev => ({ ...prev, diagnosis: e.target.value }))}
                placeholder="Patient diagnosis"
              />
            </div>
            
            <div className="mb-3">
              <label className="form-label fw-semibold">Treatment</label>
              <textarea
                className="form-control"
                rows="3"
                value={medicalRecordForm.treatment}
                onChange={(e) => setMedicalRecordForm(prev => ({ ...prev, treatment: e.target.value }))}
                placeholder="Treatment plan"
              />
            </div>
            
            <div className="mb-3">
              <label className="form-label fw-semibold">Notes</label>
              <textarea
                className="form-control"
                rows="2"
                value={medicalRecordForm.notes}
                onChange={(e) => setMedicalRecordForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes"
              />
            </div>
          </div>
          <div className="modal-footer border-0">
            <button
              onClick={() => setShowModal('')}
              className="btn btn-outline-secondary"
              style={{ borderRadius: '0.5rem' }}
            >
              Cancel
            </button>
            <button
              onClick={createMedicalRecord}
              className="btn btn-primary"
              style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '0.5rem'
              }}
            >
              Save Record
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const PrescriptionModal = () => (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content" style={{ borderRadius: '1rem' }}>
          <div className="modal-header border-0 pb-0">
            <h5 className="modal-title fw-bold">Create Prescription</h5>
            <button
              type="button"
              className="btn-close"
              onClick={() => setShowModal('')}
            ></button>
          </div>
          <div className="modal-body pt-0">
            <div className="mb-3">
              <label className="form-label fw-semibold">Patient</label>
              <select
                className="form-select"
                value={prescriptionForm.patient_id}
                onChange={(e) => setPrescriptionForm(prev => ({ ...prev, patient_id: e.target.value }))}
              >
                <option value="">Select Patient</option>
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name} ({patient.student_id || patient.staff_id})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="form-label fw-semibold">Medications</label>
                <button
                  onClick={addMedication}
                  type="button"
                  className="btn btn-sm btn-primary"
                  style={{ borderRadius: '0.5rem' }}
                >
                  <Plus size={16} className="me-1" />
                  Add Medication
                </button>
              </div>
              
              {prescriptionForm.medications.map((med, index) => (
                <div key={index} className="border p-3 rounded mb-3">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Medication Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={med.name}
                        onChange={(e) => {
                          const newMeds = [...prescriptionForm.medications];
                          newMeds[index].name = e.target.value;
                          setPrescriptionForm(prev => ({ ...prev, medications: newMeds }));
                        }}
                        placeholder="e.g., Amoxicillin"
                      />
                    </div>
                    
                    <div className="col-md-6">
                      <label className="form-label">Dosage</label>
                      <input
                        type="text"
                        className="form-control"
                        value={med.dosage}
                        onChange={(e) => {
                          const newMeds = [...prescriptionForm.medications];
                          newMeds[index].dosage = e.target.value;
                          setPrescriptionForm(prev => ({ ...prev, medications: newMeds }));
                        }}
                        placeholder="e.g., 500mg"
                      />
                    </div>
                    
                    <div className="col-12">
                      <label className="form-label">Instructions</label>
                      <input
                        type="text"
                        className="form-control"
                        value={med.instructions}
                        onChange={(e) => {
                          const newMeds = [...prescriptionForm.medications];
                          newMeds[index].instructions = e.target.value;
                          setPrescriptionForm(prev => ({ ...prev, medications: newMeds }));
                        }}
                        placeholder="e.g., Take twice daily with food"
                      />
                    </div>
                    
                    <div className="col-md-6">
                      <label className="form-label">Start Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={med.start_date}
                        onChange={(e) => {
                          const newMeds = [...prescriptionForm.medications];
                          newMeds[index].start_date = e.target.value;
                          setPrescriptionForm(prev => ({ ...prev, medications: newMeds }));
                        }}
                      />
                    </div>
                    
                    <div className="col-md-6">
                      <label className="form-label">End Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={med.end_date}
                        onChange={(e) => {
                          const newMeds = [...prescriptionForm.medications];
                          newMeds[index].end_date = e.target.value;
                          setPrescriptionForm(prev => ({ ...prev, medications: newMeds }));
                        }}
                      />
                    </div>
                  </div>
                  
                  {prescriptionForm.medications.length > 1 && (
                    <button
                      onClick={() => removeMedication(index)}
                      type="button"
                      className="btn btn-sm btn-link text-danger mt-2"
                    >
                      Remove Medication
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mb-3">
              <label className="form-label fw-semibold">Notes</label>
              <textarea
                className="form-control"
                rows="3"
                value={prescriptionForm.notes}
                onChange={(e) => setPrescriptionForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes for the prescription"
              />
            </div>
          </div>
          <div className="modal-footer border-0">
            <button
              onClick={() => setShowModal('')}
              className="btn btn-outline-secondary"
              style={{ borderRadius: '0.5rem' }}
            >
              Cancel
            </button>
            <button
              onClick={createPrescription}
              className="btn btn-primary"
              style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '0.5rem'
              }}
            >
              Create Prescription
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const ViewPatientModal = () => {
    const [patientDetails, setPatientDetails] = useState(null);
    const [medicalCard, setMedicalCard] = useState(null);
    const [patientTab, setPatientTab] = useState('info');

    useEffect(() => {
      if (selectedPatient && showModal === 'viewPatient') {
        // Fetch patient details and medical card
        fetchPatientDetails();
        fetchMedicalCard();
      }
    }, [selectedPatient, showModal]);

    const fetchPatientDetails = async () => {
      try {
        const response = await fetch(`/api/doctor/patients/${selectedPatient.id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        setPatientDetails(data);
      } catch (error) {
        console.error('Error fetching patient details:', error);
      }
    };

    const fetchMedicalCard = async () => {
      try {
        const response = await fetch(`/api/doctor/patients/${selectedPatient.id}/medical-card`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        setMedicalCard(data);
      } catch (error) {
        console.error('Error fetching medical card:', error);
      }
    };

    return (
      <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content" style={{ borderRadius: '1rem' }}>
            <div className="modal-header border-0 pb-0">
              <div className="d-flex justify-content-between align-items-center w-100">
                <h5 className="modal-title fw-bold">Patient Details - {selectedPatient?.name}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal('')}
                ></button>
              </div>
              
              <ul className="nav nav-tabs mt-3 border-0">
                <li className="nav-item">
                  <button
                    className={`nav-link ${patientTab === 'info' ? 'active' : ''}`}
                    onClick={() => setPatientTab('info')}
                  >
                    Personal Info
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${patientTab === 'medical' ? 'active' : ''}`}
                    onClick={() => setPatientTab('medical')}
                  >
                    Medical History
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${patientTab === 'card' ? 'active' : ''}`}
                    onClick={() => setPatientTab('card')}
                  >
                    Medical Card
                  </button>
                </li>
              </ul>
            </div>
            <div className="modal-body pt-0">
              {patientTab === 'info' && (
                <div className="row g-3">
                  <div className="col-md-6">
                    <h6 className="fw-semibold mb-3">Personal Information</h6>
                    <div className="mb-3">
                      <small className="text-muted d-block">Full Name</small>
                      <p className="mb-0">{selectedPatient.name}</p>
                    </div>
                    <div className="mb-3">
                      <small className="text-muted d-block">ID Number</small>
                      <p className="mb-0">{selectedPatient.student_id || selectedPatient.staff_id}</p>
                    </div>
                    <div className="mb-3">
                      <small className="text-muted d-block">Email</small>
                      <p className="mb-0">{selectedPatient.email}</p>
                    </div>
                    <div className="mb-3">
                      <small className="text-muted d-block">Department</small>
                      <p className="mb-0">{selectedPatient.department}</p>
                    </div>
                  </div>
                  
                  <div className="col-md-6">
                    <h6 className="fw-semibold mb-3">Medical Information</h6>
                    <div className="mb-3">
                      <small className="text-muted d-block">Blood Type</small>
                      <p className="mb-0">{patientDetails?.medical_info?.blood_type || 'Not recorded'}</p>
                    </div>
                    <div className="mb-3">
                      <small className="text-muted d-block">Allergies</small>
                      <p className="mb-0">{patientDetails?.medical_info?.allergies || 'None recorded'}</p>
                    </div>
                    <div className="mb-3">
                      <small className="text-muted d-block">Emergency Contact</small>
                      <p className="mb-0">{patientDetails?.medical_info?.emergency_contact || 'Not provided'}</p>
                    </div>
                    <div className="mb-3">
                      <small className="text-muted d-block">Last Visit</small>
                      <p className="mb-0">{patientDetails?.medical_info?.last_visit || 'No previous visits'}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {patientTab === 'medical' && (
                <div>
                  <h6 className="fw-semibold mb-3">Medical History</h6>
                  {patientDetails?.visit_history?.length > 0 ? (
                    patientDetails.visit_history.map((visit, index) => (
                      <div key={index} className="border p-3 rounded mb-3">
                        <div className="d-flex justify-content-between mb-2">
                          <h6 className="fw-semibold mb-0">Visit on {visit.date}</h6>
                          <small className="text-muted">Dr. {visit.doctor}</small>
                        </div>
                        <div className="mb-2">
                          <small className="text-muted d-block">Diagnosis</small>
                          <p className="mb-0">{visit.diagnosis}</p>
                        </div>
                        <div className="mb-2">
                          <small className="text-muted d-block">Treatment</small>
                          <p className="mb-0">{visit.treatment}</p>
                        </div>
                        {visit.notes && (
                          <div>
                            <small className="text-muted d-block">Notes</small>
                            <p className="mb-0">{visit.notes}</p>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <FileText size={48} className="text-muted mb-3" />
                      <p className="text-muted">No medical history available</p>
                    </div>
                  )}
                </div>
              )}
              
              {patientTab === 'card' && (
                <div>
                  <h6 className="fw-semibold mb-3">Medical Card</h6>
                  {medicalCard ? (
                    <div className="bg-gradient p-4 rounded-3 text-white" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                      <div className="d-flex justify-content-between mb-4">
                        <div>
                          <h5 className="fw-bold mb-0">{medicalCard.patient_name}</h5>
                          <small className="opacity-75">{medicalCard.patient_id}</small>
                        </div>
                        <div className="text-end">
                          <small className="opacity-75">Medical Card</small>
                          <h5 className="fw-bold mb-0">{medicalCard.card_number}</h5>
                        </div>
                      </div>
                      
                      <div className="row g-3 mb-3">
                        <div className="col-md-6">
                          <small className="opacity-75">Blood Type</small>
                          <p className="fw-semibold mb-0">{medicalCard.blood_type || 'Not recorded'}</p>
                        </div>
                        <div className="col-md-6">
                          <small className="opacity-75">Allergies</small>
                          <p className="fw-semibold mb-0">{medicalCard.allergies || 'None'}</p>
                        </div>
                        <div className="col-md-6">
                          <small className="opacity-75">Emergency Contact</small>
                          <p className="fw-semibold mb-0">{medicalCard.emergency_contact || 'Not provided'}</p>
                        </div>
                        <div className="col-md-6">
                          <small className="opacity-75">Issued Date</small>
                          <p className="fw-semibold mb-0">{medicalCard.issued_date}</p>
                        </div>
                      </div>
                      
                      {medicalCard.chronic_conditions && (
                        <div className="mb-3">
                          <small className="opacity-75">Chronic Conditions</small>
                          <p className="fw-semibold mb-0">{medicalCard.chronic_conditions}</p>
                        </div>
                      )}
                      
                      {medicalCard.current_medications && (
                        <div>
                          <small className="opacity-75">Current Medications</small>
                          <p className="fw-semibold mb-0">{medicalCard.current_medications}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <FileText size={48} className="text-muted mb-3" />
                      <p className="text-muted">No medical card found for this patient</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer border-0">
              <button
                onClick={() => setShowModal('')}
                className="btn btn-outline-secondary"
                style={{ borderRadius: '0.5rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container-fluid py-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      {/* Message Display */}
      {message.text && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'} alert-dismissible fade show mb-4`} 
             role="alert">
          <div className="d-flex align-items-center">
            {message.type === 'success' ? <CheckCircle size={20} className="me-2" /> : <XCircle size={20} className="me-2" />}
            {message.text}
          </div>
        </div>
      )}

      <div className="row justify-content-center">
        <div className="col-12 col-xl-10">
          {/* Header */}
          <div className="text-center mb-5">
            <div className="d-inline-flex align-items-center justify-content-center mb-3" 
                 style={{ width: '80px', height: '80px', backgroundColor: '#0d6efd', borderRadius: '50%' }}>
              <Stethoscope size={40} className="text-white" />
            </div>
            <h1 className="display-5 fw-bold text-dark mb-2">Doctor Portal</h1>
            <p className="lead text-muted">Manage your patients, appointments, and prescriptions</p>
          </div>

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
                    className={`nav-link ${activeTab === 'prescriptions' ? 'active' : ''} fw-semibold`}
                    onClick={() => setActiveTab('prescriptions')}
                    type="button"
                    style={{ borderRadius: '0.5rem' }}
                  >
                    <Pill size={18} className="me-2" />
                    Prescriptions
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Main Content */}
          {!loading && (
            <>
              {activeTab === 'dashboard' && <DashboardOverview />}
              {activeTab === 'appointments' && <AppointmentsTab />}
              {activeTab === 'patients' && <PatientsTab />}
              {activeTab === 'prescriptions' && <PrescriptionsTab />}
            </>
          )}

          {/* Logout Button */}
          {onLogout && (
            <div className="text-center mt-5">
              <button 
                className="btn btn-outline-danger btn-lg px-4" 
                onClick={onLogout}
                style={{ borderRadius: '0.75rem' }}
              >
                <User size={20} className="me-2" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showModal === 'availability' && <AvailabilityModal />}
      {showModal === 'appointment' && <AppointmentModal />}
      {showModal === 'medicalRecord' && <MedicalRecordModal />}
      {showModal === 'prescription' && <PrescriptionModal />}
      {showModal === 'viewPatient' && <ViewPatientModal />}
    </div>
  );
};

export default EnhancedDoctorDashboard;