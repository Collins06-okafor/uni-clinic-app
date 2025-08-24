import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, FileText, History, Edit, X, CheckCircle, Stethoscope, Heart, Brain, Thermometer, BarChart3, Activity, Users, TrendingUp, Upload, Camera, AlertTriangle, Save, LogOut } from 'lucide-react';
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

const StudentAppointmentSystem = ({ user = { department: 'Computer Science', name: 'Student', email: 'student@example.com' }, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [appointments, setAppointments] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [profileComplete, setProfileComplete] = useState(false);
  
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
  phone_number: user?.phone || '', // Changed from phoneNumber
  date_of_birth: user?.date_of_birth || '', // Changed from dateOfBirth
  emergency_contact_name: user?.emergency_contact_name || '', // Changed from emergencyContactName
  emergency_contact_phone: user?.emergency_contact_phone || '', // Changed from emergencyContactNumber
  medical_history: user?.medical_history || '' // Changed from medicalHistory
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

  // Check if profile is complete
  const checkProfileComplete = () => {
  const required = ['name', 'email', 'department', 'phone_number', 'date_of_birth', 'emergency_contact_name', 'emergency_contact_phone']; // Changed
  const isComplete = required.every(field => userProfile[field] && userProfile[field].trim() !== '');
  setProfileComplete(isComplete);
  return isComplete;
};

  // University theme colors
  const universityTheme = {
    primary: '#E53E3E',
    secondary: '#C53030',
    light: '#FED7D7'
  };

  // Get dashboard statistics
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

  const stats = getDashboardStats();
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  // Get the authentication token
const getAuthToken = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

  // Available time slots
  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
  ];

  // Urgency levels
  const urgencyLevels = [
    { value: 'normal', label: 'Normal', color: 'text-success' },
    { value: 'high', label: 'High', color: 'text-warning' },
    { value: 'urgent', label: 'Urgent', color: 'text-danger' }
  ];

  // Specialty icons mapping
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

  // Handle profile image upload
const handleImageUpload = (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      setUserProfile({...userProfile, profile_image: e.target.result}); // Changed from profileImage to profile_image
    };
    reader.readAsDataURL(file);
  }
};

  // Handle allergies checkbox
  const handleAllergiesChange = (type) => {
  if (type === 'known') {
    setUserProfile({
      ...userProfile, 
      has_known_allergies: !userProfile.has_known_allergies, // Changed
      allergies_uncertain: false, // Changed
      allergies: !userProfile.has_known_allergies ? userProfile.allergies : ''
    });
  } else if (type === 'uncertain') {
    setUserProfile({
      ...userProfile, 
      allergies_uncertain: !userProfile.allergies_uncertain, // Changed
      has_known_allergies: false, // Changed
      allergies: ''
    });
  }
};

  // API functions - Replace with actual backend calls
  const fetchSpecializations = async () => {
  setLoading(true);
  try {
    // Since we don't have a specific endpoint for specializations,
    // we'll fetch doctors and extract their specializations
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
    
    // Extract unique specializations from doctors
    const uniqueSpecializations = [...new Set(data.doctors.map(doc => doc.specialization))]
      .filter(spec => spec) // Remove empty/null values
      .map(spec => ({ id: spec, name: spec }));
    
    setSpecializations(uniqueSpecializations);
    setLoading(false);
  } catch (error) {
    console.error('Error fetching specializations:', error);
    setMessage({ 
      type: 'error', 
      text: 'Failed to load specializations. Please refresh the page and try again.' 
    });
    setSpecializations([]);
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    setLoading(false);
  }
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
    setLoading(false);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    setMessage({ 
      type: 'error', 
      text: 'Failed to load appointments. Please refresh the page and try again.' 
    });
    setAppointments([]);
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    setLoading(false);
  }
};

  // Save profile
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
    
    const data = await response.json();
    
    setMessage({ type: 'success', text: 'Profile saved successfully!' });
    checkProfileComplete();
    setLoading(false);
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  } catch (error) {
    console.error('Error saving profile:', error);
    setMessage({ type: 'error', text: 'Failed to save profile. Please try again.' });
    setLoading(false);
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }
};

// Add this function to check for pending appointments
const hasPendingAppointments = () => {
  const today = new Date().toISOString().split('T')[0];
  return appointments.some(apt => 
    (apt.status === 'scheduled' || apt.status === 'pending') && 
    apt.date >= today
  );
};

  const submitAppointment = async () => {
  // Check if profile is complete before booking
  if (!checkProfileComplete()) {
    setMessage({ 
      type: 'error', 
      text: 'Please complete your profile before booking an appointment. Go to Profile tab to update your information.' 
    });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    return;
  }

  // NEW: Check for pending appointments
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
    
    // Reset the form
    setAppointmentForm({
      specialization: '',
      date: '',
      time: '',
      reason: '',
      urgency: 'normal',
      department: user?.department || ''
    });
    
    // Refresh appointments list
    fetchAppointments();
    setLoading(false);
  } catch (error) {
    console.error('Error scheduling appointment:', error);
    setMessage({ 
      type: 'error', 
      text: error.message || 'Failed to schedule appointment. Please try again.' 
    });
    setLoading(false);
  }
  
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
    setLoading(false);
  } catch (error) {
    console.error('Error rescheduling appointment:', error);
    setMessage({ 
      type: 'error', 
      text: error.message || 'Failed to reschedule appointment. Please try again.' 
    });
    setLoading(false);
  }
  
  setTimeout(() => setMessage({ type: '', text: '' }), 5000);
};

  const openRescheduleModal = (appointment) => {
    setRescheduleForm({
      id: appointment.id,
      date: appointment.date,
      time: appointment.time
    });
    setShowRescheduleModal(true);
  };

  // Get minimum date (24 hours from now for normal appointments)
  const getMinDate = () => {
    const tomorrow = new Date();
    if (appointmentForm.urgency === 'urgent') {
      return tomorrow.toISOString().split('T')[0];
    } else {
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
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

  useEffect(() => {
    fetchSpecializations();
    fetchAppointments();
    checkProfileComplete();
  }, []);

  useEffect(() => {
    checkProfileComplete();
  }, [userProfile]);

  return (
    <div className="container-fluid" style={{ minHeight: '100vh' }}>
      {/* Navigation Header - Now full width */}
      <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm mb-4 w-100 px-3">
        {/* Logo */}
        <div className="navbar-brand d-flex align-items-center me-4">
          <img
            src="/logo6.png"
            alt="Final International University Logo"
            style={{ width: '50px', height: '50px', objectFit: 'contain', borderRadius: '10px' }}
            className="me-3"
          />
          <div>
            <h5 className="mb-0 fw-bold" style={{ color: universityTheme.primary }}>
              Final International University
            </h5>
            <small className="text-muted">Medical Appointments</small>
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

        {/* Navigation Menu - Now using collapse for mobile */}
        <div className="collapse navbar-collapse" id="navbarContent">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'overview' ? 'active' : ''} fw-semibold`}
                onClick={() => setActiveTab('overview')}
                style={{ 
                  borderRadius: '0.5rem',
                  backgroundColor: activeTab === 'overview' ? universityTheme.primary : 'transparent',
                  color: activeTab === 'overview' ? 'white' : universityTheme.primary,
                  border: 'none',
                  margin: '0 0.25rem'
                }}
              >
                <BarChart3 size={18} className="me-2" />
                Overview
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'profile' ? 'active' : ''} fw-semibold`}
                onClick={() => setActiveTab('profile')}
                style={{ 
                  borderRadius: '0.5rem',
                  backgroundColor: activeTab === 'profile' ? universityTheme.primary : 'transparent',
                  color: activeTab === 'profile' ? 'white' : universityTheme.primary,
                  border: 'none',
                  margin: '0 0.25rem'
                }}
              >
                <User size={18} className="me-2" />
                Profile {!profileComplete && <span className="badge bg-warning text-dark ms-1">!</span>}
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'request' ? 'active' : ''} fw-semibold`}
                onClick={() => setActiveTab('request')}
                style={{ 
                  borderRadius: '0.5rem',
                  backgroundColor: activeTab === 'request' ? universityTheme.primary : 'transparent',
                  color: activeTab === 'request' ? 'white' : universityTheme.primary,
                  border: 'none',
                  margin: '0 0.25rem'
                }}
              >
                <FileText size={18} className="me-2" />
                Request Appointment
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'history' ? 'active' : ''} fw-semibold`}
                onClick={() => setActiveTab('history')}
                style={{ 
                  borderRadius: '0.5rem',
                  backgroundColor: activeTab === 'history' ? universityTheme.primary : 'transparent',
                  color: activeTab === 'history' ? 'white' : universityTheme.primary,
                  border: 'none',
                  margin: '0 0.25rem'
                }}
              >
                <History size={18} className="me-2" />
                Appointment History
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
          {/* Profile Complete Warning */}
          {!profileComplete && (
            <div className="alert alert-warning alert-dismissible fade show mb-4" role="alert">
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
              <h3 className="mb-2">Welcome back, {userProfile.name}!</h3>
              <p className="mb-1 opacity-90">{userProfile.email}</p>
              <p className="mb-1 opacity-90">Student ID: {userProfile.student_id}</p>
              <p className="mb-0 opacity-75">Department: {userProfile.department}</p>
            </div>
            <div className="col-md-4 text-end">
  {userProfile.profile_image ? ( // Changed from profileImage
    <img 
      src={userProfile.profile_image}  // Changed from profileImage
      alt="Profile" 
      style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }}
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
                          onClick={() => setActiveTab('request')}
                          disabled={!profileComplete || hasPendingAppointments()} // NEW: Add disabled condition
                        >
                          <FileText size={24} className="mb-2" />
                          <div className="fw-semibold">Schedule Appointment</div>
                          <small className="opacity-75">Book a new medical appointment</small>
                          {!profileComplete && <div className="small text-warning mt-1">Complete profile first</div>}
                          {/* NEW: Show message when disabled due to pending appointments */}
                          {hasPendingAppointments() && <div className="small text-warning mt-1">Pending appointment exists</div>}
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
                          onClick={() => setActiveTab('history')}
                        >
                          <History size={24} className="mb-2" />
                          <div className="fw-semibold">View History</div>
                          <small className="text-muted">Check your appointment history</small>
                        </button>
                      </div>
                      
                      <div className="col-md-4">
                        <button 
                          className="btn w-100 py-3" 
                          style={{ 
                            borderRadius: '0.75rem',
                            border: `2px solid ${profileComplete ? '#28a745' : universityTheme.primary}`,
                            color: profileComplete ? '#28a745' : universityTheme.primary,
                            backgroundColor: 'transparent'
                          }}
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
                  <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
                    <div className="card-header bg-white border-0 pb-0">
                      <div className="d-flex justify-content-between align-items-center">
                        <h5 className="fw-bold mb-0">Recent Appointments</h5>
                        <button 
                          className="btn btn-sm"
                          onClick={() => setActiveTab('history')}
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

          {/* Profile Tab */}
{activeTab === 'profile' && (
  <div className="card shadow-sm">
    <div className="card-header" style={{ backgroundColor: universityTheme.primary }}>
      <h3 className="card-title text-white mb-0 d-flex align-items-center">
        <User size={24} className="me-2" />
        Student Profile
      </h3>
    </div>
    <div className="card-body p-4">
      <div className="row g-4">
        {/* Profile Image */}
        <div className="col-12 text-center">
  <div className="position-relative d-inline-block">
    {userProfile.profile_image ? ( // Changed from profileImage
      <img 
        src={userProfile.profile_image}  // Changed from profileImage
        alt="Profile" 
        style={{ width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover', border: `4px solid ${universityTheme.primary}` }}
      />
    ) : (
      <div 
        className="d-flex align-items-center justify-content-center"
        style={{ 
          width: '150px', 
          height: '150px', 
          borderRadius: '50%', 
          backgroundColor: universityTheme.light,
          border: `4px solid ${universityTheme.primary}`
        }}
      >
        <User size={60} style={{ color: universityTheme.primary }} />
      </div>
    )}
            <label 
              htmlFor="profileImageInput" 
              className="btn btn-sm position-absolute bottom-0 end-0"
              style={{ 
                backgroundColor: universityTheme.primary,
                color: 'white',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                border: '2px solid white',
                cursor: 'pointer'
              }}
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
            className="form-control form-control-lg"
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
            className="form-control form-control-lg"
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
            className="form-control form-control-lg"
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
            className="form-control form-control-lg"
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
  className="form-control form-control-lg"
  value={userProfile.date_of_birth} // Changed
  onChange={(e) => setUserProfile({...userProfile, date_of_birth: e.target.value})} // Changed
  max={new Date().toISOString().split('T')[0]}
  required
/>
        </div>

        <div className="col-md-6">
          <label className="form-label fw-semibold">Emergency Contact Name <span className="text-danger">*</span></label>
          <input
  type="text"
  className="form-control form-control-lg"
  value={userProfile.emergency_contact_name} // Changed
  onChange={(e) => setUserProfile({...userProfile, emergency_contact_name: e.target.value})} // Changed
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
          <h5 className="fw-bold mb-3" style={{ color: universityTheme.primary }}>
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
    checked={userProfile.has_known_allergies} // Changed from hasKnownAllergies
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
    checked={userProfile.allergies_uncertain} // Changed from allergiesUncertain
    onChange={() => handleAllergiesChange('uncertain')}
  />
  <label className="form-check-label" htmlFor="allergiesUncertain">
    I'm not sure if I have allergies
  </label>
</div>
          </div>
          {userProfile.has_known_allergies && ( // Changed from hasKnownAllergies
  <div className="mb-3">
    <label className="form-label">List of Allergies</label>
    <textarea
      className="form-control"
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
            className="form-control"
            value={userProfile.addictions}
            onChange={(e) => setUserProfile({...userProfile, addictions: e.target.value})}
            placeholder="e.g., smoking, alcohol, etc."
          />
        </div>

        <div className="col-12">
          <label className="form-label fw-semibold">Medical History</label>
          <textarea
  className="form-control"
  rows="3"
  value={userProfile.medical_history} // Changed
  onChange={(e) => setUserProfile({...userProfile, medical_history: e.target.value})} // Changed
  placeholder="Any past medical conditions, surgeries, or chronic illnesses"
/>
        </div>

        {/* Save Button */}
        <div className="col-12 mt-4">
          <button 
            className="btn btn-primary px-4 py-2" 
            onClick={saveProfile}
            disabled={loading}
            style={{ 
              backgroundColor: universityTheme.primary,
              borderRadius: '0.5rem'
            }}
          >
            {loading ? (
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
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
            <div className="card shadow-sm">
              <div className="card-header" style={{ backgroundColor: universityTheme.primary }}>
                <h3 className="card-title text-white mb-0 d-flex align-items-center">
                  <FileText size={24} className="me-2" />
                  Request New Appointment
                </h3>
              </div>
              <div className="card-body p-4">

                {/* NEW: Pending Appointment Warning */}
                {hasPendingAppointments() && (
                  <div className="alert alert-warning mb-4">
                    <div className="d-flex align-items-center">
                      <AlertTriangle size={20} className="me-2" />
                      <div>
                        <strong>Pending Appointment:</strong> You already have a pending appointment request. 
                        Please wait for it to be approved before requesting another appointment.
                      </div>
                    </div>
                  </div>
                )}

                {/* Existing: Incomplete Profile Warning */}
                {!profileComplete && (
                  <div className="alert alert-warning mb-4">
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
                      className="form-select form-select-lg"
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
                            className={`btn w-100 ${appointmentForm.urgency === level.value ? 'active' : ''}`}
                            htmlFor={`urgency-${level.value}`}
                            style={{
                              border: `1px solid ${appointmentForm.urgency === level.value ? universityTheme.primary : '#dee2e6'}`,
                              color: appointmentForm.urgency === level.value ? 'white' : universityTheme.primary,
                              backgroundColor: appointmentForm.urgency === level.value ? universityTheme.primary : 'white',
                              borderRadius: '0.5rem'
                            }}
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
                      className="form-control form-control-lg"
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
                      className="form-select form-select-lg"
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
                      className="form-control"
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
                      className="btn btn-primary px-4 py-2"
                      onClick={submitAppointment}
                      disabled={loading || !profileComplete || hasPendingAppointments()}
                      style={{ 
                        backgroundColor: universityTheme.primary,
                        borderRadius: '0.5rem'
                      }}
                    >
                      {loading ? (
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      ) : (
                        <FileText size={18} className="me-2" />
                      )}
                      Request Appointment
                    </button>

                    {/* NEW: Explanation when disabled due to pending */}
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
            <div className="card shadow-sm">
              <div className="card-header" style={{ backgroundColor: universityTheme.primary }}>
                <h3 className="card-title text-white mb-0 d-flex align-items-center">
                  <History size={24} className="me-2" />
                  Appointment History
                </h3>
              </div>
              <div className="card-body p-4">
                {appointments.length === 0 ? (
                  <div className="text-center py-5">
                    <div className="mb-3">
                      <FileText size={48} className="text-muted" />
                    </div>
                    <h5 className="fw-bold">No Appointments Found</h5>
                    <p className="text-muted">You haven't booked any appointments yet.</p>
                    <button 
                      className="btn btn-primary"
                      onClick={() => setActiveTab('request')}
                      style={{ 
                        backgroundColor: universityTheme.primary,
                        borderRadius: '0.5rem'
                      }}
                    >
                      <FileText size={18} className="me-2" />
                      Book an Appointment
                    </button>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover">
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
                                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', marginRight: '10px' }}
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
                              <span className={`${getStatusBadge(appointment.status)}`}
                                    style={appointment.status === 'scheduled' ? { backgroundColor: universityTheme.primary } : {}}>
                                {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                              </span>
                            </td>
                            <td>
                              <div className="d-flex gap-2">
                                {appointment.status === 'scheduled' && (
                                  <>
                                    <button 
                                      className="btn btn-sm btn-outline-primary"
                                      onClick={() => openRescheduleModal(appointment)}
                                      style={{ borderRadius: '0.5rem' }}
                                    >
                                      <Edit size={16} />
                                    </button>
                                    <button 
                                      className="btn btn-sm btn-outline-danger"
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
        </div>
      </div>

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header" style={{ backgroundColor: universityTheme.primary }}>
                <h5 className="modal-title text-white">Reschedule Appointment</h5>
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
                    className="form-control"
                    value={rescheduleForm.date}
                    onChange={(e) => setRescheduleForm({...rescheduleForm, date: e.target.value})}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Time</label>
                  <select
                    className="form-select"
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
                  className="btn btn-secondary" 
                  onClick={() => setShowRescheduleModal(false)}
                  style={{ borderRadius: '0.5rem' }}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={submitReschedule}
                  disabled={loading || !rescheduleForm.date || !rescheduleForm.time}
                  style={{ 
                    backgroundColor: universityTheme.primary,
                    borderRadius: '0.5rem'
                  }}
                >
                  {loading ? (
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
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
  );
};

export default StudentAppointmentSystem;