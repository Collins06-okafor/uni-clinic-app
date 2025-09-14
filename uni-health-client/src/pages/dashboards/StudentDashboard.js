import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, FileText, History, Edit, X, CheckCircle, Stethoscope, Heart, Brain, Thermometer, BarChart3, Activity, Users, TrendingUp, Upload, Camera, AlertTriangle, Save, LogOut } from 'lucide-react';
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { APPOINTMENT_STATUSES, getStatusText, getStatusBadgeClass } from '../../constants/appointmentStatuses';
import './StudentAppointmentSystem.css'; // Import the CSS file

const StudentAppointmentSystem = ({ user = { department: 'Computer Science', name: 'Student', email: 'student@example.com' }, onLogout }) => {
  // State Management
  const [activeTab, setActiveTab] = useState('overview');
  const [appointments, setAppointments] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [profileComplete, setProfileComplete] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  
  // Profile state
  const [userProfile, setUserProfile] = useState({
    student_id: user?.student_id || '',
    name: user?.name || '',
    email: user?.email || '',
    department: user?.department || '',
    profile_image: null,
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
  const [appointmentForm, setAppointmentForm] = useState({
    specialization: '',
    date: '',
    time: '',
    reason: '',
    urgency: 'normal',
    department: user?.department || ''
  });

  // Form state for rescheduling
  const [rescheduleForm, setRescheduleForm] = useState({
    id: '',
    date: '',
    time: ''
  });

  // Utility Functions
  const checkProfileComplete = () => {
    const required = ['name', 'email', 'department', 'phone_number', 'date_of_birth', 'emergency_contact_name', 'emergency_contact_phone'];
    const isComplete = required.every(field => userProfile[field] && userProfile[field].trim() !== '');
    setProfileComplete(isComplete);
    return isComplete;
  };

  const getDashboardStats = () => {
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

  const hasPendingAppointments = () => {
    const today = new Date().toISOString().split('T')[0];
    return appointments.some(apt => 
      ['pending', 'under_review', 'assigned'].includes(apt.status) &&
      apt.date >= today
    );
  };

  const getAuthToken = () => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    if (appointmentForm.urgency === 'urgent') {
      return tomorrow.toISOString().split('T')[0];
    } else {
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
  };

  const getSpecialtyIcon = (specialization) => {
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

  const getStatusBadge = (status) => {
    return `status-badge status-${status}`;
  };

  // Event Handlers
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUserProfile({...userProfile, profile_image: e.target.result});
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAllergiesChange = (type) => {
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

  const openRescheduleModal = (appointment) => {
    setRescheduleForm({
      id: appointment.id,
      date: appointment.date,
      time: appointment.time
    });
    setShowRescheduleModal(true);
  };

  // API Functions
  const fetchSpecializations = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch('http://127.0.0.1:8000/api/student/doctors/availability', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load specializations');
      }
      
      const data = await response.json();
      const uniqueSpecializations = [...new Set(data.doctors.map(doc => doc.specialization))]
        .filter(spec => spec)
        .map(spec => ({ id: spec, name: spec }));
      
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

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch('http://127.0.0.1:8000/api/student/appointments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load appointments');
      }
      
      const data = await response.json();
      setAppointments(data.appointments);
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

  const saveProfile = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch('http://127.0.0.1:8000/api/auth/profile', {
        method: 'POST',
        headers: {  
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userProfile)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save profile');
      }
      
      setMessage({ type: 'success', text: 'Profile saved successfully!' });
      checkProfileComplete();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage({ type: 'error', text: 'Failed to save profile. Please try again.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
    setLoading(false);
  };

  const submitAppointment = async () => {
    if (!checkProfileComplete()) {
      setMessage({ 
        type: 'error', 
        text: 'Please complete your profile before booking an appointment. Go to Profile tab to update your information.' 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return;
    }

    if (hasPendingAppointments()) {
      setMessage({ 
        type: 'error', 
        text: 'You already have a pending appointment request. Please wait for it to be approved before requesting another appointment.' 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return;
    }

    if (!appointmentForm.date || !appointmentForm.time || !appointmentForm.reason) {
      setMessage({ type: 'error', text: 'Please fill in all required fields (date, time, and reason).' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return;
    }

    setLoading(true);
    
    try {
      const token = getAuthToken();
      const response = await fetch('http://127.0.0.1:8000/api/student/appointments/schedule', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          specialization: appointmentForm.specialization,
          date: appointmentForm.date,
          time: appointmentForm.time,
          reason: appointmentForm.reason,
          urgency: appointmentForm.urgency
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to schedule appointment');
      }
      
      const data = await response.json();
      
      setMessage({ 
        type: 'success', 
        text: data.message || 'Appointment request submitted successfully!' 
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
    } catch (error) {
      console.error('Error scheduling appointment:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to schedule appointment. Please try again.' 
      });
    }
    
    setLoading(false);
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const submitReschedule = async () => {
    if (!rescheduleForm.date || !rescheduleForm.time) {
      setMessage({ type: 'error', text: 'Please select both date and time for rescheduling.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return;
    }

    setLoading(true);
    
    try {
      const token = getAuthToken();
      const response = await fetch(`http://127.0.0.1:8000/api/student/appointments/${rescheduleForm.id}/reschedule`, {
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
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reschedule appointment');
      }
      
      const data = await response.json();
      
      setMessage({ 
        type: 'success', 
        text: data.message || 'Appointment rescheduled successfully!' 
      });
      
      setShowRescheduleModal(false);
      setRescheduleForm({ id: '', date: '', time: '' });
      fetchAppointments();
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to reschedule appointment. Please try again.' 
      });
    }
    
    setLoading(false);
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // Constants
  const stats = getDashboardStats();
  
  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
  ];

  const urgencyLevels = [
    { value: 'normal', label: 'Normal', color: 'text-success' },
    { value: 'high', label: 'High', color: 'text-warning' },
    { value: 'urgent', label: 'Urgent', color: 'text-danger' }
  ];

  // Effects
  useEffect(() => {
    fetchSpecializations();
    fetchAppointments();
    checkProfileComplete();
  }, []);

  useEffect(() => {
    checkProfileComplete();
  }, [userProfile]);

  return (
    <>
      {/* Navigation Header - Outside main container */}
      <nav className="navbar navbar-expand-lg navbar-light navbar-custom">
        <div className="container-fluid">
          {/* Logo */}
          <div className="navbar-brand-custom">
            <img
              src="/logo6.png"
              alt="Final International University Logo"
              className="navbar-brand-logo"
            />
            <div>
              <h5 className="navbar-brand-title">
                Final International University
              </h5>
              <small className="navbar-brand-subtitle">Medical Appointments</small>
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
                  className={`nav-link nav-link-custom ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('overview')}
                >
                  <BarChart3 size={18} className="me-2" />
                  Overview
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link nav-link-custom ${activeTab === 'profile' ? 'active' : ''}`}
                  onClick={() => setActiveTab('profile')}
                >
                  <User size={18} className="me-2" />
                  Profile {!profileComplete && <span className="badge bg-warning text-dark ms-1">!</span>}
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link nav-link-custom ${activeTab === 'request' ? 'active' : ''}`}
                  onClick={() => setActiveTab('request')}
                >
                  <FileText size={18} className="me-2" />
                  Request Appointment
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link nav-link-custom ${activeTab === 'history' ? 'active' : ''}`}
                  onClick={() => setActiveTab('history')}
                >
                  <History size={18} className="me-2" />
                  Appointment History
                </button>
              </li>
            </ul>

            {/* Logout Button */}
            {onLogout && (
              <button 
                className="btn logout-btn"
                onClick={onLogout}
              >
                <LogOut size={18} className="me-2" />
                Logout
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="student-appointment-container">
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
                          <h3 className="mb-2">Welcome back, {userProfile.name}!</h3>
                          <p className="mb-1 opacity-90">{userProfile.email}</p>
                          <p className="mb-1 opacity-90">Student ID: {userProfile.student_id}</p>
                          <p className="mb-0 opacity-75">Department: {userProfile.department}</p>
                        </div>
                        <div className="col-md-4 text-end">
                          {userProfile.profile_image ? (
                            <img 
                              src={userProfile.profile_image}
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
                      <p className="text-muted mb-0">Total Appointments</p>
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
                            <div className="fw-semibold">Schedule Appointment</div>
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
                        {userProfile.profile_image ? (
                          <img 
                            src={userProfile.profile_image}
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
                            rows="2"
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
                        rows="3"
                        value={userProfile.medical_history}
                        onChange={(e) => setUserProfile({...userProfile, medical_history: e.target.value})}
                        placeholder="Any past medical conditions, surgeries, or chronic illnesses"
                      />
                    </div>

                    {/* Save Button */}
                    <div className="col-12 mt-4">
                      <button 
                        className="btn btn-primary-custom" 
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
                        rows="3"
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
                                  {getStatusText(appointment.status)}
                                </span>
                              </td>
                              <td>
                                <div className="d-flex gap-2">
                                  {appointment.status === APPOINTMENT_STATUSES.ASSIGNED && (
                                    <>
                                      <button 
                                        className="btn btn-sm btn-outline-primary-custom"
                                        onClick={() => openRescheduleModal(appointment)}
                                      >
                                        <Edit size={16} />
                                      </button>
                                      <button 
                                        className="btn btn-sm btn-outline-danger-custom"
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