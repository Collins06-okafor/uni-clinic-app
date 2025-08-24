// src/pages/RegisterPage.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../services/auth';
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import './RegisterPage.css';
import doctor from '../female-doctor-hospital-with-stethoscope.png';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role: '',
    student_id: '',
    department: '',
    medical_license_number: '',
    specialization: '',
    staff_no: '',
    faculty: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
    if (generalError) {
      setGeneralError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setGeneralError('');

    if (form.password !== form.password_confirmation) {
      setErrors({ password_confirmation: 'Passwords do not match' });
      setLoading(false);
      return;
    }

    try {
      const baseData = {
        name: form.name,
        email: form.email,
        password: form.password,
        password_confirmation: form.password_confirmation,
        role: form.role,
        phone: form.phone || null,
      };

      const roleData = {};
        switch (form.role) {
          case 'student':
            roleData.student_id = form.student_id;
            roleData.department = form.department;
            break;
          case 'academic_staff':
            roleData.staff_no = form.staff_no;
            roleData.faculty = form.faculty;
            if (form.department) roleData.department = form.department;
            break;
          // Remove doctor, clinical_staff, and admin cases
        }

      const submitData = { ...baseData, ...roleData };
      console.log('Submitting form:', submitData);
      
      const res = await register(submitData);
      console.log('Registration response:', res);
      
      if (res.token) {
        localStorage.setItem('token', res.token);
        navigate('/dashboard');
      } else if (res.message && res.message.includes('successful')) {
        setGeneralError('');
        setErrors({});
        navigate('/');
      } else {
        setGeneralError('Registration completed but please login manually.');
        setTimeout(() => navigate('/'), 2000);
      }
    } catch (err) {
      console.error('Registration error:', err);
      
      try {
        const errorData = JSON.parse(err.message);
        if (typeof errorData === 'object' && errorData !== null) {
          setErrors(errorData);
        } else {
          setGeneralError(err.message || 'Registration failed');
        }
      } catch (parseError) {
        setGeneralError(err.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role) => {
    const icons = {
      student: 'fa-user-graduate',
      academic_staff: 'fa-chalkboard-teacher'
    };
    return icons[role] || 'fa-user';
  };

  const renderRoleSpecificFields = () => {
    switch (form.role) {
      case 'student':
        return (
          <>
            <div className="register-form-group">
              <label className="register-form-label">Student ID</label>
              <input
                name="student_id"
                type="text"
                className={`register-form-input ${errors.student_id ? 'is-invalid' : ''}`}
                value={form.student_id}
                onChange={handleChange}
                required
                placeholder="e.g., 20220001"
              />
              {errors.student_id && (
                <div className="register-invalid-feedback">
                  {Array.isArray(errors.student_id) ? errors.student_id[0] : errors.student_id}
                </div>
              )}
            </div>
            <div className="register-form-group">
              <label className="register-form-label">Department</label>
              <select
                name="department"
                className={`register-form-select ${errors.department ? 'is-invalid' : ''}`}
                value={form.department}
                onChange={handleChange}
                required
              >
                <option value="">Select Department</option>
                <option value="Computer Engineering">Computer Engineering</option>
                <option value="Medicine">Medicine</option>
                <option value="Nursing">Nursing</option>
                <option value="Pharmacy">Pharmacy</option>
                <option value="Dentistry">Dentistry</option>
                <option value="Psychology">Psychology</option>
                <option value="Biology">Biology</option>
                <option value="Chemistry">Chemistry</option>
              </select>
              {errors.department && (
                <div className="register-invalid-feedback">
                  {Array.isArray(errors.department) ? errors.department[0] : errors.department}
                </div>
              )}
            </div>
          </>
        );

      case 'doctor':
        return (
          <>
            <div className="register-form-group">
              <label className="register-form-label">Medical License Number</label>
              <input
                name="medical_license_number"
                type="text"
                className={`register-form-input ${errors.medical_license_number ? 'is-invalid' : ''}`}
                value={form.medical_license_number}
                onChange={handleChange}
                required
                placeholder="e.g., MD123456"
              />
              {errors.medical_license_number && (
                <div className="register-invalid-feedback">
                  {Array.isArray(errors.medical_license_number) ? errors.medical_license_number[0] : errors.medical_license_number}
                </div>
              )}
            </div>
            <div className="register-form-group">
              <label className="register-form-label">Specialization</label>
              <select
                name="specialization"
                className={`register-form-select ${errors.specialization ? 'is-invalid' : ''}`}
                value={form.specialization}
                onChange={handleChange}
                required
              >
                <option value="">Select Specialization</option>
                <option value="General Medicine">General Medicine</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Dermatology">Dermatology</option>
                <option value="Psychiatry">Psychiatry</option>
                <option value="Pediatrics">Pediatrics</option>
                <option value="Surgery">Surgery</option>
                <option value="Internal Medicine">Internal Medicine</option>
                <option value="Emergency Medicine">Emergency Medicine</option>
              </select>
              {errors.specialization && (
                <div className="register-invalid-feedback">
                  {Array.isArray(errors.specialization) ? errors.specialization[0] : errors.specialization}
                </div>
              )}
            </div>
            <div className="register-form-group">
              <label className="register-form-label">Staff Number (Optional)</label>
              <input
                name="staff_no"
                type="text"
                className={`register-form-input ${errors.staff_no ? 'is-invalid' : ''}`}
                value={form.staff_no}
                onChange={handleChange}
                placeholder="e.g., STAFF001"
              />
              {errors.staff_no && (
                <div className="register-invalid-feedback">
                  {Array.isArray(errors.staff_no) ? errors.staff_no[0] : errors.staff_no}
                </div>
              )}
            </div>
          </>
        );

      case 'clinical_staff':
        return (
          <>
            <div className="register-form-group">
              <label className="register-form-label">Staff Number</label>
              <input
                name="staff_no"
                type="text"
                className={`register-form-input ${errors.staff_no ? 'is-invalid' : ''}`}
                value={form.staff_no}
                onChange={handleChange}
                required
                placeholder="e.g., STAFF001"
              />
              {errors.staff_no && (
                <div className="register-invalid-feedback">
                  {Array.isArray(errors.staff_no) ? errors.staff_no[0] : errors.staff_no}
                </div>
              )}
            </div>
            <div className="register-form-group">
              <label className="register-form-label">Department</label>
              <select
                name="department"
                className={`register-form-select ${errors.department ? 'is-invalid' : ''}`}
                value={form.department}
                onChange={handleChange}
                required
              >
                <option value="">Select Department</option>
                <option value="Nursing">Nursing</option>
                <option value="Laboratory">Laboratory</option>
                <option value="Radiology">Radiology</option>
                <option value="Pharmacy">Pharmacy</option>
                <option value="Physical Therapy">Physical Therapy</option>
                <option value="Emergency">Emergency</option>
                <option value="Administration">Administration</option>
              </select>
              {errors.department && (
                <div className="register-invalid-feedback">
                  {Array.isArray(errors.department) ? errors.department[0] : errors.department}
                </div>
              )}
            </div>
          </>
        );

      case 'academic_staff':
        return (
          <>
            <div className="register-form-group">
              <label className="register-form-label">Staff Number</label>
              <input
                name="staff_no"
                type="text"
                className={`register-form-input ${errors.staff_no ? 'is-invalid' : ''}`}
                value={form.staff_no}
                onChange={handleChange}
                required
                placeholder="e.g., STAFF001"
              />
              {errors.staff_no && (
                <div className="register-invalid-feedback">
                  {Array.isArray(errors.staff_no) ? errors.staff_no[0] : errors.staff_no}
                </div>
              )}
            </div>
            <div className="register-form-group">
              <label className="register-form-label">Faculty</label>
              <select
                name="faculty"
                className={`register-form-select ${errors.faculty ? 'is-invalid' : ''}`}
                value={form.faculty}
                onChange={handleChange}
                required
              >
                <option value="">Select Faculty</option>
                <option value="Faculty of Medicine">Faculty of Medicine</option>
                <option value="Faculty of Engineering">Faculty of Engineering</option>
                <option value="Faculty of Sciences">Faculty of Sciences</option>
                <option value="Faculty of Health Sciences">Faculty of Health Sciences</option>
                <option value="Faculty of Pharmacy">Faculty of Pharmacy</option>
                <option value="Faculty of Dentistry">Faculty of Dentistry</option>
              </select>
              {errors.faculty && (
                <div className="register-invalid-feedback">
                  {Array.isArray(errors.faculty) ? errors.faculty[0] : errors.faculty}
                </div>
              )}
            </div>
            <div className="register-form-group">
              <label className="register-form-label">Department (Optional)</label>
              <input
                name="department"
                type="text"
                className={`register-form-input ${errors.department ? 'is-invalid' : ''}`}
                value={form.department}
                onChange={handleChange}
                placeholder="e.g., Computer Engineering"
              />
              {errors.department && (
                <div className="register-invalid-feedback">
                  {Array.isArray(errors.department) ? errors.department[0] : errors.department}
                </div>
              )}
            </div>
          </>
        );

      case 'admin':
        return (
          <div className="register-form-group">
            <label className="register-form-label">Staff Number</label>
            <input
              name="staff_no"
              type="text"
              className={`register-form-input ${errors.staff_no ? 'is-invalid' : ''}`}
              value={form.staff_no}
              onChange={handleChange}
              required
              placeholder="e.g., ADMIN001"
            />
            {errors.staff_no && (
              <div className="register-invalid-feedback">
                {Array.isArray(errors.staff_no) ? errors.staff_no[0] : errors.staff_no}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="wehealth-register-container">
      <div className="wehealth-register-card">
        {/* Left Panel - Register Form */}
        <div className="register-panel">
          <div className="register-logo-section">
            <img src="logo6.png" alt="Final International University" className="register-brand-logo" />
            <h2 className="register-brand-name">FIU Clinical Management</h2>
          </div>

          <div className="register-form-container">
            <h3 className="register-form-title">Create Account</h3>
            <p className="register-form-subtitle">Join our health management system</p>

            {/* Error Alert */}
            {generalError && (
              <div className="register-error-alert">
                <i className="fas fa-exclamation-circle"></i>
                {generalError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="register-form">
              {/* Name and Role Row */}
              <div className="register-form-row">
                <div className="register-form-col">
                  <div className="register-form-group">
                    <label className="register-form-label">Full Name</label>
                    <input
                      name="name"
                      type="text"
                      className={`register-form-input ${errors.name ? 'is-invalid' : ''}`}
                      value={form.name}
                      onChange={handleChange}
                      required
                      placeholder="Enter your full name"
                    />
                    {errors.name && (
                      <div className="register-invalid-feedback">
                        {Array.isArray(errors.name) ? errors.name[0] : errors.name}
                      </div>
                    )}
                  </div>
                </div>
                <div className="register-form-col">
                  <div className="register-form-group">
                    <label className="register-form-label">Role</label>
                    <select
                      name="role"
                      className={`register-form-select ${errors.role ? 'is-invalid' : ''}`}
                      value={form.role}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select Role</option>
                      <option value="student">Student</option>
                      <option value="academic_staff">Academic Staff</option>
                    </select>
                    {errors.role && (
                      <div className="register-invalid-feedback">
                        {Array.isArray(errors.role) ? errors.role[0] : errors.role}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="register-form-group">
                <label className="register-form-label">Email Address</label>
                <input
                  name="email"
                  type="email"
                  className={`register-form-input ${errors.email ? 'is-invalid' : ''}`}
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="Enter your email address"
                />
                {(form.role === 'student' || form.role === 'academic_staff') && (
                  <small className="register-form-text">
                    Must use university email domain (@uni.edu, @university.edu, @final.edu.tr, @student.edu)
                  </small>
                )}
                {errors.email && (
                  <div className="register-invalid-feedback">
                    {Array.isArray(errors.email) ? errors.email[0] : errors.email}
                  </div>
                )}
              </div>

              {/* Password Row */}
              <div className="register-form-row">
                <div className="register-form-col">
                  <div className="register-form-group">
                    <label className="register-form-label">Password</label>
                    <div className="register-password-wrapper">
                      <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        className={`register-form-input ${errors.password ? 'is-invalid' : ''}`}
                        value={form.password}
                        onChange={handleChange}
                        required
                        minLength="8"
                        placeholder="Create password"
                      />
                      <button
                        type="button"
                        className="register-password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                    {errors.password && (
                      <div className="register-invalid-feedback">
                        {Array.isArray(errors.password) ? errors.password[0] : errors.password}
                      </div>
                    )}
                  </div>
                </div>
                <div className="register-form-col">
                  <div className="register-form-group">
                    <label className="register-form-label">Confirm Password</label>
                    <div className="register-password-wrapper">
                      <input
                        name="password_confirmation"
                        type={showConfirmPassword ? "text" : "password"}
                        className={`register-form-input ${errors.password_confirmation ? 'is-invalid' : ''}`}
                        value={form.password_confirmation}
                        onChange={handleChange}
                        required
                        placeholder="Confirm password"
                      />
                      <button
                        type="button"
                        className="register-password-toggle"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                    {errors.password_confirmation && (
                      <div className="register-invalid-feedback">
                        {Array.isArray(errors.password_confirmation) 
                          ? errors.password_confirmation[0] 
                          : errors.password_confirmation}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Phone Number */}
              <div className="register-phone-container">
                <label className="register-form-label">Phone Number (Optional)</label>
                <PhoneInput
                  country={'tr'}
                  value={form.phone}
                  onChange={(phone) => setForm({ ...form, phone })}
                  placeholder="Enter your phone number"
                />
                {errors.phone && (
                  <div className="register-invalid-feedback">
                    {Array.isArray(errors.phone) ? errors.phone[0] : errors.phone}
                  </div>
                )}
              </div>

              {/* Role-specific fields */}
              {form.role && (
                <div className="register-role-section">
                  <h6 className="register-role-title">
                    <i className={`fas ${getRoleIcon(form.role)}`}></i>
                    {form.role.replace('_', ' ').toUpperCase()} INFORMATION
                  </h6>
                  {renderRoleSpecificFields()}
                </div>
              )}
            
              <button type="submit" disabled={loading} className="register-button">
                {loading && (
                  <span className="register-spinner"></span>
                )}
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '15px' }}>
                <p style={{ color: '#6b7280', fontSize: '14px', margin: '0' }}>
                  Already have an account? 
                  <Link to="/" className="register-signin-link" style={{ marginLeft: '5px' }}>
                    Sign In
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>

        {/* Right Panel - Doctor Image and Info */}
        <div className="register-doctor-panel">
          <div className="register-doctor-section">
            <div className="register-doctor-image-container">
              <img src={doctor} alt="Healthcare Professional" className="register-doctor-image" />
            </div>
            
            <div className="register-info-bubble">
              <div className="register-bubble-icon">
                <i className="fas fa-user-plus"></i>
              </div>
              <div className="register-bubble-content">
                <h4>Join Our Team</h4>
                <p>Become part of our healthcare community</p>
              </div>
            </div>
          </div>
          
          <div className="register-signin-section">
            <p>Already have an account?</p>
            <Link to="/" className="register-signin-section-link">Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;