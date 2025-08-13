import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, FileText, History, Edit, X, CheckCircle, Stethoscope, Heart, Brain, Thermometer, BarChart3, Activity, Users, TrendingUp, Upload, Camera, AlertTriangle, Save } from 'lucide-react';

const StudentAppointmentSystem = ({ user = { department: 'Computer Science', name: 'Student', email: 'student@example.com' }, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [appointments, setAppointments] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [profileComplete, setProfileComplete] = useState(false);
  
  // Profile state
  const [userProfile, setUserProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    department: user?.department || '',
    profileImage: null,
    allergies: '',
    addictions: '',
    phoneNumber: '',
    dateOfBirth: '',
    emergencyContact: '',
    medicalHistory: ''
  });
  
  // Form state for new appointment
  const [appointmentForm, setAppointmentForm] = useState({
    specialization: '',
    date: '',
    time: '',
    reason: '',
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
    const required = ['name', 'email', 'department', 'phoneNumber', 'dateOfBirth', 'emergencyContact'];
    const isComplete = required.every(field => userProfile[field] && userProfile[field].trim() !== '');
    setProfileComplete(isComplete);
    return isComplete;
  };

  // University theme colors based on logo
  const universityTheme = {
    primary: '#E53E3E', // Red from logo
    secondary: '#C53030',
    light: '#FED7D7'
  };

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

  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  // Available time slots
  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
  ];

  // Available specializations
  const availableSpecializations = [
    { id: 1, name: 'General Medicine', icon: 'Stethoscope' },
    { id: 2, name: 'Cardiology', icon: 'Heart' },
    { id: 3, name: 'Dermatology', icon: 'Thermometer' },
    { id: 4, name: 'Psychiatry', icon: 'Brain' },
    { id: 5, name: 'Orthopedics', icon: 'Activity' },
    { id: 6, name: 'Neurology', icon: 'Brain' }
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
        setUserProfile({...userProfile, profileImage: e.target.result});
      };
      reader.readAsDataURL(file);
    }
  };

  // Save profile
  const saveProfile = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setMessage({ type: 'success', text: 'Profile saved successfully!' });
      checkProfileComplete();
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }, 1000);
  };

  // API functions (keeping original structure)
  const fetchSpecializations = async () => {
    setLoading(true);
    try {
      // Simulate API call
      setTimeout(() => {
        setSpecializations(availableSpecializations);
        setLoading(false);
      }, 1000);
      
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
      // Simulate API call with sample data
      setTimeout(() => {
        const sampleAppointments = [
          {
            id: 1,
            doctor: 'Dr. Smith',
            specialty: 'General Medicine',
            date: '2025-08-20',
            time: '10:00',
            reason: 'Regular checkup',
            status: 'scheduled',
            notes: 'Bring previous medical records'
          },
          {
            id: 2,
            doctor: 'Dr. Johnson',
            specialty: 'Cardiology',
            date: '2025-08-15',
            time: '14:30',
            reason: 'Heart consultation',
            status: 'completed',
            notes: 'Follow-up in 3 months'
          }
        ];
        setAppointments(sampleAppointments);
        setLoading(false);
      }, 1000);
      
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

    if (!appointmentForm.specialization || !appointmentForm.date || !appointmentForm.time || !appointmentForm.reason) {
      setMessage({ type: 'error', text: 'Please fill in all required fields.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return;
    }

    setLoading(true);
    
    try {
      // Simulate API call
      setTimeout(() => {
        setMessage({ 
          type: 'success', 
          text: 'Appointment request submitted successfully! You will receive a confirmation email with doctor assignment shortly.' 
        });
        
        setAppointmentForm({
          specialization: '',
          date: '',
          time: '',
          reason: '',
          department: user?.department || ''
        });
        
        fetchAppointments();
        setLoading(false);
      }, 2000);
      
    } catch (error) {
      console.error('Error scheduling appointment:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to schedule appointment. Please try again.' 
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
      // Simulate API call
      setTimeout(() => {
        setMessage({ 
          type: 'success', 
          text: 'Appointment rescheduled successfully!' 
        });
        
        setShowRescheduleModal(false);
        setRescheduleForm({ id: '', date: '', time: '' });
        fetchAppointments();
        setLoading(false);
      }, 1500);
      
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to reschedule appointment. Please try again.' 
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

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
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
    <div className="container-fluid py-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <div className="row justify-content-center">
        <div className="col-12 col-xl-10">
          {/* Header with University Logo */}
          <div className="text-center mb-5">
            <img
              src="/logo6.png"
              alt="Final International University Logo"
              style={{ width: '100px', height: '100px', objectFit: 'contain', borderRadius: '20px' }}
              className="mb-3"
            />

            <h1 className="display-5 fw-bold mb-2" style={{ color: universityTheme.primary }}>
              Final International University
            </h1>
            <h2 className="h3 text-dark mb-2">Medical Appointments</h2>
            <p className="lead text-muted">Manage your healthcare appointments and medical history</p>
          </div>

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

          {/* Tab Navigation */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-white border-0 p-0">
              <ul className="nav nav-pills nav-fill p-3" id="pills-tab" role="tablist">
                <li className="nav-item" role="presentation">
                  <button 
                    className={`nav-link ${activeTab === 'overview' ? 'active' : ''} fw-semibold`}
                    onClick={() => setActiveTab('overview')}
                    type="button"
                    style={{ 
                      borderRadius: '0.5rem',
                      backgroundColor: activeTab === 'overview' ? universityTheme.primary : 'transparent',
                      color: activeTab === 'overview' ? 'white' : universityTheme.primary
                    }}
                  >
                    <BarChart3 size={18} className="me-2" />
                    Overview
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button 
                    className={`nav-link ${activeTab === 'profile' ? 'active' : ''} fw-semibold`}
                    onClick={() => setActiveTab('profile')}
                    type="button"
                    style={{ 
                      borderRadius: '0.5rem',
                      backgroundColor: activeTab === 'profile' ? universityTheme.primary : 'transparent',
                      color: activeTab === 'profile' ? 'white' : universityTheme.primary
                    }}
                  >
                    <User size={18} className="me-2" />
                    Profile {!profileComplete && <span className="badge bg-warning text-dark ms-1">!</span>}
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button 
                    className={`nav-link ${activeTab === 'request' ? 'active' : ''} fw-semibold`}
                    onClick={() => setActiveTab('request')}
                    type="button"
                    style={{ 
                      borderRadius: '0.5rem',
                      backgroundColor: activeTab === 'request' ? universityTheme.primary : 'transparent',
                      color: activeTab === 'request' ? 'white' : universityTheme.primary
                    }}
                  >
                    <FileText size={18} className="me-2" />
                    Request Appointment
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button 
                    className={`nav-link ${activeTab === 'history' ? 'active' : ''} fw-semibold`}
                    onClick={() => setActiveTab('history')}
                    type="button"
                    style={{ 
                      borderRadius: '0.5rem',
                      backgroundColor: activeTab === 'history' ? universityTheme.primary : 'transparent',
                      color: activeTab === 'history' ? 'white' : universityTheme.primary
                    }}
                  >
                    <History size={18} className="me-2" />
                    Appointment History
                  </button>
                </li>
              </ul>
            </div>
          </div>

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
              {userProfile.profileImage ? (
                <img 
                  src={userProfile.profileImage} 
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
                          disabled={!profileComplete}
                        >
                          <FileText size={24} className="mb-2" />
                          <div className="fw-semibold">Schedule Appointment</div>
                          <small className="opacity-75">Book a new medical appointment</small>
                          {!profileComplete && <div className="small text-warning mt-1">Complete profile first</div>}
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

              {/* Logout Button */}
              {onLogout && (
                <div className="col-12 text-center">
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
                      {userProfile.profileImage ? (
                        <img 
                          src={userProfile.profileImage} 
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
                    <input  type="tel"
                  className="form-control form-control-lg"
                  value={userProfile.phoneNumber}
                  onChange={(e) => setUserProfile({...userProfile, phoneNumber: e.target.value})}
                  placeholder="Enter your phone number"
                  required
                />
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">Date of Birth <span className="text-danger">*</span></label>
                <input
                  type="date"
                  className="form-control form-control-lg"
                  value={userProfile.dateOfBirth}
                  onChange={(e) => setUserProfile({...userProfile, dateOfBirth: e.target.value})}
                  max={getMinDate()}
                  required
                />
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">Emergency Contact <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control form-control-lg"
                  value={userProfile.emergencyContact}
                  onChange={(e) => setUserProfile({...userProfile, emergencyContact: e.target.value})}
                  placeholder="Name and phone number"
                  required
                />
              </div>

              {/* Medical Information */}
              <div className="col-12 mt-4">
                <h5 className="fw-bold mb-3" style={{ color: universityTheme.primary }}>
                  <Stethoscope size={20} className="me-2" />
                  Medical Information
                </h5>
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">Allergies</label>
                <input
                  type="text"
                  className="form-control form-control-lg"
                  value={userProfile.allergies}
                  onChange={(e) => setUserProfile({...userProfile, allergies: e.target.value})}
                  placeholder="List any allergies"
                />
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">Addictions</label>
                <input
                  type="text"
                  className="form-control form-control-lg"
                  value={userProfile.addictions}
                  onChange={(e) => setUserProfile({...userProfile, addictions: e.target.value})}
                  placeholder="List any addictions"
                />
              </div>

              <div className="col-12">
                <label className="form-label fw-semibold">Medical History</label>
                <textarea
                  className="form-control form-control-lg"
                  rows="4"
                  value={userProfile.medicalHistory}
                  onChange={(e) => setUserProfile({...userProfile, medicalHistory: e.target.value})}
                  placeholder="Describe any relevant medical history"
                />
              </div>

              {/* Save Button */}
              <div className="col-12 text-center mt-4">
                <button
                  className="btn btn-lg px-4"
                  onClick={saveProfile}
                  disabled={loading}
                  style={{
                    backgroundColor: universityTheme.primary,
                    color: 'white',
                    borderRadius: '0.75rem',
                    minWidth: '200px'
                  }}
                >
                  {loading ? 'Saving...' : (
                    <>
                      <Save size={20} className="me-2" />
                      Save Profile
                    </>
                  )}
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
            <div className="row g-4">
              {!profileComplete && (
                <div className="col-12">
                  <div className="alert alert-warning" role="alert">
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
                </div>
              )}

              <div className="col-md-6">
                <label className="form-label fw-semibold">Specialization <span className="text-danger">*</span></label>
                <select
                  className="form-select form-select-lg"
                  value={appointmentForm.specialization}
                  onChange={(e) => setAppointmentForm({...appointmentForm, specialization: e.target.value})}
                  required
                >
                  <option value="">Select a specialization</option>
                  {availableSpecializations.map((spec) => (
                    <option key={spec.id} value={spec.name}>
                      {spec.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">Department <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control form-control-lg"
                  value={appointmentForm.department}
                  onChange={(e) => setAppointmentForm({...appointmentForm, department: e.target.value})}
                  required
                  readOnly
                />
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">Date <span className="text-danger">*</span></label>
                <input
                  type="date"
                  className="form-control form-control-lg"
                  value={appointmentForm.date}
                  onChange={(e) => setAppointmentForm({...appointmentForm, date: e.target.value})}
                  min={getMinDate()}
                  required
                />
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">Time <span className="text-danger">*</span></label>
                <select
                  className="form-select form-select-lg"
                  value={appointmentForm.time}
                  onChange={(e) => setAppointmentForm({...appointmentForm, time: e.target.value})}
                  required
                >
                  <option value="">Select a time slot</option>
                  {timeSlots.map((time) => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>

              <div className="col-12">
                <label className="form-label fw-semibold">Reason for Appointment <span className="text-danger">*</span></label>
                <textarea
                  className="form-control form-control-lg"
                  rows="3"
                  value={appointmentForm.reason}
                  onChange={(e) => setAppointmentForm({...appointmentForm, reason: e.target.value})}
                  placeholder="Describe the reason for your appointment"
                  required
                />
              </div>

              <div className="col-12 text-center mt-4">
                <button
                  className="btn btn-lg px-4"
                  onClick={submitAppointment}
                  disabled={loading || !profileComplete}
                  style={{
                    backgroundColor: universityTheme.primary,
                    color: 'white',
                    borderRadius: '0.75rem',
                    minWidth: '200px'
                  }}
                >
                  {loading ? 'Submitting...' : (
                    <>
                      <FileText size={20} className="me-2" />
                      Request Appointment
                    </>
                  )}
                </button>
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
                <History size={48} className="text-muted mb-3" />
                <h5 className="fw-bold">No Appointments Found</h5>
                <p className="text-muted">You haven't booked any appointments yet.</p>
                <button
                  className="btn"
                  onClick={() => setActiveTab('request')}
                  style={{
                    backgroundColor: universityTheme.primary,
                    color: 'white',
                    borderRadius: '0.75rem'
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
                        <td className="fw-semibold">{appointment.doctor}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            {getSpecialtyIcon(appointment.specialty)}
                            <span className="ms-2">{appointment.specialty}</span>
                          </div>
                        </td>
                        <td>{new Date(appointment.date).toLocaleDateString()}</td>
                        <td>{appointment.time}</td>
                        <td>
                          <span className={`${getStatusBadge(appointment.status)} small`}
                                style={appointment.status === 'scheduled' ? { backgroundColor: universityTheme.primary } : {}}>
                            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex">
                            {appointment.status === 'scheduled' && (
                              <button
                                className="btn btn-sm me-2"
                                onClick={() => openRescheduleModal(appointment)}
                                style={{
                                  backgroundColor: universityTheme.light,
                                  color: universityTheme.primary,
                                  borderRadius: '0.5rem'
                                }}
                              >
                                <Edit size={16} />
                              </button>
                            )}
                            <button
                              className="btn btn-sm"
                              style={{
                                backgroundColor: '#f8d7da',
                                color: '#dc3545',
                                borderRadius: '0.5rem'
                              }}
                            >
                              <X size={16} />
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
      )}
    </div>
  </div>

  {/* Reschedule Modal */}
  {showRescheduleModal && (
    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header" style={{ backgroundColor: universityTheme.primary, color: 'white' }}>
            <h5 className="modal-title">Reschedule Appointment</h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={() => setShowRescheduleModal(false)}
            ></button>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label">New Date</label>
              <input
                type="date"
                className="form-control"
                value={rescheduleForm.date}
                onChange={(e) => setRescheduleForm({...rescheduleForm, date: e.target.value})}
                min={getMinDate()}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">New Time</label>
              <select
                className="form-select"
                value={rescheduleForm.time}
                onChange={(e) => setRescheduleForm({...rescheduleForm, time: e.target.value})}
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
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn"
              onClick={submitReschedule}
              disabled={loading}
              style={{
                backgroundColor: universityTheme.primary,
                color: 'white'
              }}
            >
              {loading ? 'Processing...' : 'Confirm Reschedule'}
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