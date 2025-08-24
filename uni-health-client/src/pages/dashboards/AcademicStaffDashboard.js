// src/pages/dashboards/AcademicStaffDashboard.js
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, FileText, History, Edit, X, CheckCircle, Stethoscope, Heart, Brain, Thermometer, BarChart3, Activity, Users, TrendingUp, Phone, Mail, LogOut, AlertTriangle } from 'lucide-react';

const AcademicStaffDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [appointments, setAppointments] = useState([]);
  const [medicalHistory, setMedicalHistory] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Form states
  const [appointmentForm, setAppointmentForm] = useState({
    doctor_id: '',
    date: '',
    time: '',
    reason: ''
  });
  
  const [rescheduleForm, setRescheduleForm] = useState({
    appointmentId: '',
    date: '',
    time: ''
  });

  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  // University theme colors matching student dashboard
  const universityTheme = {
    primary: '#E53E3E',
    secondary: '#C53030',
    light: '#FED7D7'
  };

  // Available time slots
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
  const getSpecialtyIcon = (specialization) => {
    switch (specialization) {
      case 'General Practice':
      case 'General Medicine': 
        return <Stethoscope className="text-danger" size={16} />;
      case 'Cardiology': 
        return <Heart className="text-danger" size={16} />;
      case 'Dermatology': 
        return <Thermometer className="text-warning" size={16} />;
      case 'Psychiatry': 
        return <Brain className="text-info" size={16} />;
      default: 
        return <Stethoscope className="text-danger" size={16} />;
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      scheduled: 'badge text-white',
      confirmed: 'badge bg-success',
      completed: 'badge bg-secondary',
      cancelled: 'badge bg-danger',
      rescheduled: 'badge bg-warning text-dark'
    };
    return badges[status] || 'badge bg-secondary';
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchDashboardData();
    fetchDoctors();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/academic-staff/dashboard', {
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

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/academic-staff/appointments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAppointments(data.appointments);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      showMessage('error', 'Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  };

  const fetchMedicalHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/academic-staff/medical-history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMedicalHistory(data.medical_history);
      }
    } catch (error) {
      console.error('Error fetching medical history:', error);
      showMessage('error', 'Failed to fetch medical history');
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/academic-staff/doctor-availability', {
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

  const fetchAvailableSlots = async (doctorId, date) => {
    if (!date) return;
    
    try {
      const url = doctorId 
        ? `http://127.0.0.1:8000/api/academic-staff/available-slots?doctor_id=${doctorId}&date=${date}`
        : `http://127.0.0.1:8000/api/academic-staff/available-slots?date=${date}`;
        
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

  const handleScheduleAppointment = async (e) => {
    e.preventDefault();
    
    if (!appointmentForm.date || !appointmentForm.time || !appointmentForm.reason) {
      showMessage('error', 'Please fill in all required fields (date, time, and reason).');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/academic-staff/schedule-appointment', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(appointmentForm)
      });

      const data = await response.json();

      if (response.ok) {
        showMessage('success', data.message);
        setAppointmentForm({ doctor_id: '', date: '', time: '', reason: '' });
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

  const handleRescheduleAppointment = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/academic-staff/reschedule-appointment/${rescheduleForm.appointmentId}`, {
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

  const handleCancelAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;

    setLoading(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/academic-staff/cancel-appointment/${appointmentId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        showMessage('success', data.message);
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

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'appointments') {
      fetchAppointments();
    } else if (tab === 'medical-history') {
      fetchMedicalHistory();
    }
  };

  // Handle form changes
  const handleAppointmentFormChange = (field, value) => {
    setAppointmentForm(prev => ({ ...prev, [field]: value }));
    
    if (field === 'doctor_id' || field === 'date') {
      const doctorId = field === 'doctor_id' ? value : appointmentForm.doctor_id;
      const date = field === 'date' ? value : appointmentForm.date;
      fetchAvailableSlots(doctorId, date);
    }
  };

  const openRescheduleModal = (appointment) => {
    setRescheduleForm({
      appointmentId: appointment.id,
      date: appointment.date,
      time: appointment.time
    });
    setShowRescheduleModal(true);
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <div className="container-fluid" style={{ minHeight: '100vh' }}>
      {/* Navigation Header */}
      <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm mb-4">
        <div className="container-fluid">
          {/* Logo */}
<div className="navbar-brand d-flex align-items-center">
  <img
    src="/logo6.png"
    alt="FIU Logo"
    style={{
      width: '50px',
      height: '50px',
      borderRadius: '10px',
      objectFit: 'cover'
    }}
    className="me-3"
  />
  <div>
    <h5 className="mb-0 fw-bold" style={{ color: universityTheme.primary }}>
      Final International University
    </h5>
    <small className="text-muted">Academic Staff Medical Portal</small>
  </div>
</div>


          {/* Navigation Menu */}
          <ul className="nav nav-pills mx-auto">
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'overview' ? 'active' : ''} fw-semibold`}
                onClick={() => handleTabChange('overview')}
                style={{ 
                  borderRadius: '0.5rem',
                  backgroundColor: activeTab === 'overview' ? universityTheme.primary : 'transparent',
                  color: activeTab === 'overview' ? 'white' : universityTheme.primary,
                  border: 'none'
                }}
              >
                <BarChart3 size={18} className="me-2" />
                Overview
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'schedule' ? 'active' : ''} fw-semibold`}
                onClick={() => handleTabChange('schedule')}
                style={{ 
                  borderRadius: '0.5rem',
                  backgroundColor: activeTab === 'schedule' ? universityTheme.primary : 'transparent',
                  color: activeTab === 'schedule' ? 'white' : universityTheme.primary,
                  border: 'none'
                }}
              >
                <Calendar size={18} className="me-2" />
                Schedule Appointment
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'appointments' ? 'active' : ''} fw-semibold`}
                onClick={() => handleTabChange('appointments')}
                style={{ 
                  borderRadius: '0.5rem',
                  backgroundColor: activeTab === 'appointments' ? universityTheme.primary : 'transparent',
                  color: activeTab === 'appointments' ? 'white' : universityTheme.primary,
                  border: 'none'
                }}
              >
                <FileText size={18} className="me-2" />
                My Appointments
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'medical-history' ? 'active' : ''} fw-semibold`}
                onClick={() => handleTabChange('medical-history')}
                style={{ 
                  borderRadius: '0.5rem',
                  backgroundColor: activeTab === 'medical-history' ? universityTheme.primary : 'transparent',
                  color: activeTab === 'medical-history' ? 'white' : universityTheme.primary,
                  border: 'none'
                }}
              >
                <History size={18} className="me-2" />
                Medical History
              </button>
            </li>
          </ul>

          {/* Logout Button */}
          {onLogout && (
            <button 
              className="btn btn-outline-danger"
              onClick={onLogout}
              style={{ borderRadius: '0.5rem' }}
            >
              <LogOut size={18} className="me-2" />
              Logout
            </button>
          )}
        </div>
      </nav>

      <div className="row justify-content-center">
        <div className="col-12 col-xl-10">
          {/* Message Display */}
          {message.text && (
            <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'} alert-dismissible fade show mb-4`} 
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
                <div className="card shadow-sm border-0" style={{ borderRadius: '1rem', backgroundColor: universityTheme.primary }}>
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
                         style={{ width: '60px', height: '60px', backgroundColor: universityTheme.light, borderRadius: '50%' }}>
                      <Calendar size={30} style={{ color: universityTheme.primary }} />
                    </div>
                    <h4 className="fw-bold mb-1" style={{ color: universityTheme.primary }}>{stats.total}</h4>
                    <p className="text-muted mb-0">Total Appointments</p>
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
                    <h4 className="fw-bold text-success mb-1">{stats.completed}</h4>
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
                    <h4 className="fw-bold text-warning mb-1">{stats.pending}</h4>
                    <p className="text-muted mb-0">Pending</p>
                  </div>
                </div>
              </div>

              <div className="col-md-3 col-sm-6">
                <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '1rem' }}>
                  <div className="card-body p-4 text-center">
                    <div className="d-inline-flex align-items-center justify-content-center mb-3" 
                         style={{ width: '60px', height: '60px', backgroundColor: '#f3e5f5', borderRadius: '50%' }}>
                      <TrendingUp size={30} className="text-info" />
                    </div>
                    <h4 className="fw-bold text-info mb-1">{stats.upcoming}</h4>
                    <p className="text-muted mb-0">Upcoming</p>
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
                          style={{ borderRadius: '0.75rem', backgroundColor: universityTheme.primary }}
                          onClick={() => setActiveTab('schedule')}
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
                            backgroundColor: 'transparent'
                          }}
                          onClick={() => setActiveTab('appointments')}
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
                            border: '2px solid #28a745',
                            color: '#28a745',
                            backgroundColor: 'transparent'
                          }}
                          onClick={() => setActiveTab('medical-history')}
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
              {appointments.length > 0 && (
                <div className="col-12">
                  <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
                    <div className="card-header bg-white border-0 pb-0">
                      <div className="d-flex justify-content-between align-items-center">
                        <h5 className="fw-bold mb-0">Recent Appointments</h5>
                        <button 
                          className="btn btn-sm"
                          onClick={() => setActiveTab('appointments')}
                          style={{ 
                            borderRadius: '0.5rem',
                            border: `1px solid ${universityTheme.primary}`,
                            color: universityTheme.primary
                          }}
                        >
                          View All
                        </button>
                      </div>
                    </div>
                    <div className="card-body p-4">
                      {appointments.slice(0, 3).map((appointment) => (
                        <div key={appointment.id} className="d-flex align-items-center p-3 bg-light rounded-3 mb-3">
                          <div className="me-3">
                            <Stethoscope style={{ color: universityTheme.primary }} size={16} />
                          </div>
                          <div className="flex-grow-1">
                            <h6 className="mb-1 fw-semibold">Dr. {appointment.doctor}</h6>
                            <div className="d-flex align-items-center text-muted small">
                              <Calendar size={14} className="me-1" />
                              {new Date(appointment.date).toLocaleDateString()}
                              <Clock size={14} className="ms-3 me-1" />
                              {appointment.time}
                            </div>
                          </div>
                          <span className={`${getStatusBadge(appointment.status)} small`}
                                style={appointment.status === 'scheduled' ? { backgroundColor: universityTheme.primary } : {}}>
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

          {/* Schedule Appointment Tab */}
          {activeTab === 'schedule' && (
            <div className="row">
              <div className="col-md-8">
                <div className="card shadow-sm">
                  <div className="card-header" style={{ backgroundColor: universityTheme.primary }}>
                    <h3 className="card-title text-white mb-0 d-flex align-items-center">
                      <Calendar size={24} className="me-2" />
                      Schedule New Appointment
                    </h3>
                  </div>
                  <div className="card-body p-4">
                    <form onSubmit={handleScheduleAppointment}>
                      <div className="row g-4">
                        <div className="col-12">
                          <label className="form-label fw-semibold">Select Doctor (Optional)</label>
                          <select 
                            className="form-select form-select-lg"
                            value={appointmentForm.doctor_id}
                            onChange={(e) => handleAppointmentFormChange('doctor_id', e.target.value)}
                          >
                            <option value="">Any available doctor</option>
                            {doctors.map(doctor => (
                              <option key={doctor.id} value={doctor.id}>
                                Dr. {doctor.name} - {doctor.specialization}
                              </option>
                            ))}
                          </select>
                          <div className="form-text">Leave blank to be assigned to any available doctor</div>
                        </div>

                        <div className="col-md-6">
                          <label className="form-label fw-semibold">Appointment Date <span className="text-danger">*</span></label>
                          <input 
                            type="date"
                            className="form-control form-control-lg"
                            value={appointmentForm.date}
                            onChange={(e) => handleAppointmentFormChange('date', e.target.value)}
                            min={getMinDate()}
                            required
                          />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label fw-semibold">Available Time Slots <span className="text-danger">*</span></label>
                          <select 
                            className="form-select form-select-lg"
                            value={appointmentForm.time}
                            onChange={(e) => handleAppointmentFormChange('time', e.target.value)}
                            required
                            disabled={!appointmentForm.date}
                          >
                            <option value="">
                              {!appointmentForm.date ? 'Select date first' : 'Choose a time slot...'}
                            </option>
                            {availableSlots.map(slot => (
                              <option key={slot} value={slot}>{slot}</option>
                            ))}
                          </select>
                        </div>

                        <div className="col-12">
                          <label className="form-label fw-semibold">Reason for Visit <span className="text-danger">*</span></label>
                          <textarea 
                            className="form-control"
                            rows="4"
                            value={appointmentForm.reason}
                            onChange={(e) => handleAppointmentFormChange('reason', e.target.value)}
                            placeholder="Describe your health concerns or reason for the appointment..."
                            maxLength="500"
                            required
                            style={{ resize: 'none' }}
                          />
                          <div className="form-text">{appointmentForm.reason.length}/500 characters</div>
                        </div>

                        <div className="col-12">
                          <button 
                            type="submit" 
                            className="btn btn-primary btn-lg w-100 py-3"
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
              
              <div className="col-md-4">
                <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
                  <div className="card-header">
                    <h6 className="mb-0 fw-semibold">
                      <Clock size={18} className="me-2" />
                      Clinic Hours
                    </h6>
                  </div>
                  <div className="card-body">
                    <ul className="list-group list-group-flush">
                      <li className="list-group-item d-flex justify-content-between align-items-center">
                        <span className="fw-semibold">Monday - Friday</span>
                        <span>8:00 AM - 5:00 PM</span>
                      </li>
                      <li className="list-group-item d-flex justify-content-between align-items-center">
                        <span className="fw-semibold">Saturday</span>
                        <span>9:00 AM - 1:00 PM</span>
                      </li>
                      <li className="list-group-item d-flex justify-content-between align-items-center">
                        <span className="fw-semibold">Sunday</span>
                        <span className="text-danger">Closed</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="card shadow-sm border-0 mt-4" style={{ borderRadius: '1rem' }}>
                  <div className="card-header">
                    <h6 className="mb-0 fw-semibold">
                      <Activity size={18} className="me-2" />
                      Appointment Tips
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="alert alert-info mb-3">
                      <strong>Arrive early:</strong> Please arrive 15 minutes before your scheduled time.
                    </div>
                    <div className="alert alert-info mb-3">
                      <strong>Bring documents:</strong> Don't forget your staff ID and medical card.
                    </div>
                    <div className="alert alert-info">
                      <strong>Cancellation:</strong> Cancel at least 24 hours in advance if you can't make it.
                    </div>
                  </div>
                </div>

                <div className="card shadow-sm border-0 mt-4" style={{ borderRadius: '1rem' }}>
                  <div className="card-header">
                    <h6 className="mb-0 fw-semibold">
                      <Phone size={18} className="me-2" />
                      Emergency Contacts
                    </h6>
                  </div>
                  <div className="card-body">
                    <ul className="list-unstyled">
                      <li className="mb-2">
                        <div className="fw-semibold">Campus Emergency</div>
                        <div className="text-muted">+254 700 123 456</div>
                      </li>
                      <li className="mb-2">
                        <div className="fw-semibold">Ambulance</div>
                        <div className="text-muted">+254 700 789 012</div>
                      </li>
                      <li>
                        <div className="fw-semibold">Clinic Reception</div>
                        <div className="text-muted">+254 700 345 678</div>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Appointments Tab */}
          {activeTab === 'appointments' && (
            <div className="card shadow-sm">
              <div className="card-header" style={{ backgroundColor: universityTheme.primary }}>
                <div className="d-flex justify-content-between align-items-center">
                  <h3 className="mb-0 fw-bold text-white">
                    <FileText size={24} className="me-2" />
                    My Appointments
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
              <div className="card-body p-4">
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
                  <div className="table-responsive">
                    <table className="table table-hover align-middle">
                      <thead>
                        <tr>
                          <th scope="col">Date & Time</th>
                          <th scope="col">Doctor</th>
                          <th scope="col">Specialization</th>
                          <th scope="col">Reason</th>
                          <th scope="col">Status</th>
                          <th scope="col">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.map((appointment) => (
                          <tr key={appointment.id}>
                            <td>
                              <div className="d-flex flex-column">
                                <span className="fw-semibold">{new Date(appointment.date).toLocaleDateString()}</span>
                                <small className="text-muted">{appointment.time}</small>
                              </div>
                            </td>
                            <td className="fw-semibold">Dr. {appointment.doctor}</td>
                            <td>
                              <div className="d-flex align-items-center">
                                {getSpecialtyIcon(appointment.specialization)}
                                <span className="ms-2">{appointment.specialization}</span>
                              </div>
                            </td>
                            <td>
                              <div className="text-truncate" style={{ maxWidth: '200px' }} title={appointment.reason}>
                                {appointment.reason}
                              </div>
                            </td>
                            <td>
                              <span className={getStatusBadge(appointment.status)}
                                    style={appointment.status === 'scheduled' ? { backgroundColor: universityTheme.primary } : {}}>
                                {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                              </span>
                            </td>
                            <td>
                              <div className="d-flex">
                                {appointment.status === 'scheduled' && (
                                  <>
                                    <button 
                                      className="btn btn-sm me-2"
                                      onClick={() => openRescheduleModal(appointment)}
                                      style={{ 
                                        borderRadius: '0.5rem',
                                        border: `1px solid ${universityTheme.primary}`,
                                        color: universityTheme.primary
                                      }}
                                    >
                                      <Edit size={16} />
                                    </button>
                                    <button 
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={() => handleCancelAppointment(appointment.id)}
                                      style={{ borderRadius: '0.5rem' }}
                                    >
                                      <X size={16} />
                                    </button>
                                  </>
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

          {/* Medical History Tab */}
          {activeTab === 'medical-history' && (
            <div className="card shadow-sm">
              <div className="card-header" style={{ backgroundColor: universityTheme.primary }}>
                <h3 className="mb-0 fw-bold text-white">
                  <History size={24} className="me-2" />
                  Medical History
                </h3>
              </div>
              <div className="card-body p-4">
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
                  <div className="accordion" id="medicalHistoryAccordion">
                    {medicalHistory.map((record, index) => (
                      <div key={record.id} className="accordion-item border-0 mb-3 shadow-sm" style={{ borderRadius: '0.75rem' }}>
                        <h2 className="accordion-header" id={`heading${index}`}>
                          <button 
                            className="accordion-button collapsed" 
                            type="button" 
                            data-bs-toggle="collapse" 
                            data-bs-target={`#collapse${index}`}
                            aria-expanded="false" 
                            aria-controls={`collapse${index}`}
                            style={{ borderRadius: '0.75rem 0.75rem 0 0' }}
                          >
                            <div className="d-flex flex-column">
                              <span className="fw-semibold">{new Date(record.date).toLocaleDateString()}</span>
                              <small className="text-muted">Dr. {record.doctor} • {record.diagnosis}</small>
                            </div>
                          </button>
                        </h2>
                        <div 
                          id={`collapse${index}`} 
                          className="accordion-collapse collapse" 
                          aria-labelledby={`heading${index}`}
                          data-bs-parent="#medicalHistoryAccordion"
                        >
                          <div className="accordion-body">
                            <div className="row">
                              <div className="col-md-6">
                                <h6 className="fw-semibold mb-3">Diagnosis Details</h6>
                                <p>{record.diagnosis_details}</p>
                              </div>
                              <div className="col-md-6">
                                <h6 className="fw-semibold mb-3">Treatment</h6>
                                <p>{record.treatment}</p>
                              </div>
                              {record.prescription && (
                                <div className="col-12 mt-3">
                                  <h6 className="fw-semibold mb-3">Prescription</h6>
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
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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
      </div>
    </div>
  );
};

export default AcademicStaffDashboard;