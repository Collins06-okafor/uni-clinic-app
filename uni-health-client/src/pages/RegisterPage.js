// src/pages/RegisterPage.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../services/auth';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role: '',
    // Student fields
    student_id: '',
    department: '',
    // Doctor fields
    medical_license_number: '',
    specialization: '',
    // Staff fields
    staff_no: '',
    faculty: '',
    // Common field
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    // Clear specific error when user starts typing
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
    // Clear general error
    if (generalError) {
      setGeneralError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setGeneralError('');

    // Client-side validation
    if (form.password !== form.password_confirmation) {
      setErrors({ password_confirmation: 'Passwords do not match' });
      setLoading(false);
      return;
    }

    try {
      // Prepare data based on role
      const baseData = {
        name: form.name,
        email: form.email,
        password: form.password,
        password_confirmation: form.password_confirmation,
        role: form.role,
        phone: form.phone || null,
      };

      // Add role-specific fields
      const roleData = {};
      switch (form.role) {
        case 'student':
          roleData.student_id = form.student_id;
          roleData.department = form.department;
          break;
        case 'doctor':
          roleData.medical_license_number = form.medical_license_number;
          roleData.specialization = form.specialization;
          if (form.staff_no) roleData.staff_no = form.staff_no;
          break;
        case 'clinical_staff':
          roleData.staff_no = form.staff_no;
          roleData.department = form.department;
          break;
        case 'academic_staff':
          roleData.staff_no = form.staff_no;
          roleData.faculty = form.faculty;
          if (form.department) roleData.department = form.department;
          break;
        case 'admin':
          roleData.staff_no = form.staff_no;
          break;
      }

      const submitData = { ...baseData, ...roleData };
      console.log('Submitting form:', submitData); // Debug log
      
      const res = await register(submitData);
      console.log('Registration response:', res); // Debug log
      
      if (res.token) {
        // If token is returned, login automatically
        localStorage.setItem('token', res.token);
        navigate('/dashboard');
      } else if (res.message && res.message.includes('successful')) {
        // Registration successful, show success message and redirect to login
        setGeneralError('');
        setErrors({});
        
        // Show success alert
        alert('Registration successful! Please login with your credentials.');
        navigate('/');
      } else {
        setGeneralError('Registration completed but please login manually.');
        setTimeout(() => navigate('/'), 2000);
      }
    } catch (err) {
      console.error('Registration error:', err); // Debug log
      
      try {
        // Try to parse as JSON first
        const errorData = JSON.parse(err.message);
        if (typeof errorData === 'object' && errorData !== null) {
          setErrors(errorData);
        } else {
          setGeneralError(err.message || 'Registration failed');
        }
      } catch (parseError) {
        // If it's not JSON, treat as regular error message
        setGeneralError(err.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h2 className="card-title text-center mb-4">Register</h2>
              
              {/* General error display */}
              {generalError && (
                <div className="alert alert-danger">{generalError}</div>
              )}
              
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Name</label>
                  <input
                    name="name"
                    type="text"
                    className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                  {errors.name && (
                    <div className="invalid-feedback">
                      {Array.isArray(errors.name) ? errors.name[0] : errors.name}
                    </div>
                  )}
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    name="email"
                    type="email"
                    className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                  {(form.role === 'student' || form.role === 'academic_staff') && (
                    <small className="form-text text-muted">
                      Must use university email domain (@uni.edu, @university.edu, @final.edu.tr, @student.edu)
                    </small>
                  )}
                  {errors.email && (
                    <div className="invalid-feedback">
                      {Array.isArray(errors.email) ? errors.email[0] : errors.email}
                    </div>
                  )}
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <input
                    name="password"
                    type="password"
                    className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                    value={form.password}
                    onChange={handleChange}
                    required
                    minLength="8"
                  />
                  {errors.password && (
                    <div className="invalid-feedback">
                      {Array.isArray(errors.password) ? errors.password[0] : errors.password}
                    </div>
                  )}
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Confirm Password</label>
                  <input
                    name="password_confirmation"
                    type="password"
                    className={`form-control ${errors.password_confirmation ? 'is-invalid' : ''}`}
                    value={form.password_confirmation}
                    onChange={handleChange}
                    required
                  />
                  {errors.password_confirmation && (
                    <div className="invalid-feedback">
                      {Array.isArray(errors.password_confirmation) 
                        ? errors.password_confirmation[0] 
                        : errors.password_confirmation}
                    </div>
                  )}
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Role</label>
                  <select
                    name="role"
                    className={`form-control ${errors.role ? 'is-invalid' : ''}`}
                    value={form.role}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Role</option>
                    <option value="student">Student</option>
                    <option value="doctor">Doctor</option>
                    <option value="academic_staff">Academic Staff</option>
                    <option value="clinical_staff">Clinical Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                  {errors.role && (
                    <div className="invalid-feedback">
                      {Array.isArray(errors.role) ? errors.role[0] : errors.role}
                    </div>
                  )}
                </div>

                {/* Phone field - common for all roles */}
                <div className="mb-3">
                  <label className="form-label">Phone Number (Optional)</label>
                  <input
                    name="phone"
                    type="tel"
                    className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                    value={form.phone}
                    onChange={handleChange}
                  />
                  {errors.phone && (
                    <div className="invalid-feedback">
                      {Array.isArray(errors.phone) ? errors.phone[0] : errors.phone}
                    </div>
                  )}
                </div>

                {/* Student-specific fields */}
                {form.role === 'student' && (
                  <>
                    <div className="mb-3">
                      <label className="form-label">Student ID</label>
                      <input
                        name="student_id"
                        type="text"
                        className={`form-control ${errors.student_id ? 'is-invalid' : ''}`}
                        value={form.student_id}
                        onChange={handleChange}
                        required
                        placeholder="e.g., 20220001"
                      />
                      {errors.student_id && (
                        <div className="invalid-feedback">
                          {Array.isArray(errors.student_id) ? errors.student_id[0] : errors.student_id}
                        </div>
                      )}
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Department</label>
                      <select
                        name="department"
                        className={`form-control ${errors.department ? 'is-invalid' : ''}`}
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
                        <div className="invalid-feedback">
                          {Array.isArray(errors.department) ? errors.department[0] : errors.department}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Doctor-specific fields */}
                {form.role === 'doctor' && (
                  <>
                    <div className="mb-3">
                      <label className="form-label">Medical License Number</label>
                      <input
                        name="medical_license_number"
                        type="text"
                        className={`form-control ${errors.medical_license_number ? 'is-invalid' : ''}`}
                        value={form.medical_license_number}
                        onChange={handleChange}
                        required
                        placeholder="e.g., MD123456"
                      />
                      {errors.medical_license_number && (
                        <div className="invalid-feedback">
                          {Array.isArray(errors.medical_license_number) ? errors.medical_license_number[0] : errors.medical_license_number}
                        </div>
                      )}
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Specialization</label>
                      <select
                        name="specialization"
                        className={`form-control ${errors.specialization ? 'is-invalid' : ''}`}
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
                        <div className="invalid-feedback">
                          {Array.isArray(errors.specialization) ? errors.specialization[0] : errors.specialization}
                        </div>
                      )}
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Staff Number (Optional)</label>
                      <input
                        name="staff_no"
                        type="text"
                        className={`form-control ${errors.staff_no ? 'is-invalid' : ''}`}
                        value={form.staff_no}
                        onChange={handleChange}
                        placeholder="e.g., STAFF001"
                      />
                      {errors.staff_no && (
                        <div className="invalid-feedback">
                          {Array.isArray(errors.staff_no) ? errors.staff_no[0] : errors.staff_no}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Clinical Staff fields */}
                {form.role === 'clinical_staff' && (
                  <>
                    <div className="mb-3">
                      <label className="form-label">Staff Number</label>
                      <input
                        name="staff_no"
                        type="text"
                        className={`form-control ${errors.staff_no ? 'is-invalid' : ''}`}
                        value={form.staff_no}
                        onChange={handleChange}
                        required
                        placeholder="e.g., STAFF001"
                      />
                      {errors.staff_no && (
                        <div className="invalid-feedback">
                          {Array.isArray(errors.staff_no) ? errors.staff_no[0] : errors.staff_no}
                        </div>
                      )}
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Department</label>
                      <select
                        name="department"
                        className={`form-control ${errors.department ? 'is-invalid' : ''}`}
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
                        <div className="invalid-feedback">
                          {Array.isArray(errors.department) ? errors.department[0] : errors.department}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Academic Staff fields */}
                {form.role === 'academic_staff' && (
                  <>
                    <div className="mb-3">
                      <label className="form-label">Staff Number</label>
                      <input
                        name="staff_no"
                        type="text"
                        className={`form-control ${errors.staff_no ? 'is-invalid' : ''}`}
                        value={form.staff_no}
                        onChange={handleChange}
                        required
                        placeholder="e.g., STAFF001"
                      />
                      {errors.staff_no && (
                        <div className="invalid-feedback">
                          {Array.isArray(errors.staff_no) ? errors.staff_no[0] : errors.staff_no}
                        </div>
                      )}
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Faculty</label>
                      <select
                        name="faculty"
                        className={`form-control ${errors.faculty ? 'is-invalid' : ''}`}
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
                        <div className="invalid-feedback">
                          {Array.isArray(errors.faculty) ? errors.faculty[0] : errors.faculty}
                        </div>
                      )}
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Department (Optional)</label>
                      <input
                        name="department"
                        type="text"
                        className={`form-control ${errors.department ? 'is-invalid' : ''}`}
                        value={form.department}
                        onChange={handleChange}
                        placeholder="e.g., Computer Engineering"
                      />
                      {errors.department && (
                        <div className="invalid-feedback">
                          {Array.isArray(errors.department) ? errors.department[0] : errors.department}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Admin fields */}
                {form.role === 'admin' && (
                  <div className="mb-3">
                    <label className="form-label">Staff Number</label>
                    <input
                      name="staff_no"
                      type="text"
                      className={`form-control ${errors.staff_no ? 'is-invalid' : ''}`}
                      value={form.staff_no}
                      onChange={handleChange}
                      required
                      placeholder="e.g., ADMIN001"
                    />
                    {errors.staff_no && (
                      <div className="invalid-feedback">
                        {Array.isArray(errors.staff_no) ? errors.staff_no[0] : errors.staff_no}
                      </div>
                    )}
                  </div>
                )}
                
                <button 
                  type="submit" 
                  className="btn btn-primary w-100" 
                  disabled={loading}
                >
                  {loading ? 'Registering...' : 'Register'}
                </button>
              </form>
              
              <div className="text-center mt-3">
                <p>Already have an account? <Link to="/">Login here</Link></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;