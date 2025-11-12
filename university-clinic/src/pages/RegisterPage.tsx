import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { register } from '../services/auth';
import api from '../services/api';
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import Select from 'react-select';
import LanguageSwitcher from '../components/LanguageSwitcher';
import './RegisterPage.css';
import type { RegisterData } from '../types/user';

interface FormData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role: string;
  student_id: string;
  department: string;
  medical_license_number: string;
  specialization: string;
  staff_no: string;
  faculty: string;
  phone: string;
}

interface FormErrors {
  [key: string]: string;
}

interface RegisterPageProps {
  onRegistrationSuccess?: () => Promise<void>;
}

interface Department {
  id: string | number;
  name: string;
  code: string;
  type: string;
  description?: string;
  is_active: boolean;
}

interface SelectOption {
  value: string;
  label: string;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onRegistrationSuccess }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState<FormData>({
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
  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // New state for departments
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [departmentsError, setDepartmentsError] = useState('');

  // Fetch departments from API
  useEffect(() => {
    const fetchDepartments = async () => {
      setDepartmentsLoading(true);
      setDepartmentsError('');
      
      try {
        console.log('Fetching departments...');
        const response = await api.get<Department[]>('/departments');
        console.log('Departments response:', response);
        
        // Filter only active departments
        const activeDepartments = response.filter((dept: Department) => dept.is_active);
        setDepartments(activeDepartments);
        
        console.log(`Loaded ${activeDepartments.length} active departments`);
      } catch (error: any) {
        console.error('Failed to fetch departments:', error);
        setDepartmentsError(t('error.failed_to_load_departments'));
        
        // Fallback to hardcoded departments if API fails
        const fallbackDepartments = [
          { id: 'comp-eng', name: 'Computer Engineering', code: 'CE', type: 'academic', is_active: true },
          { id: 'medicine', name: 'Medicine', code: 'MED', type: 'medical', is_active: true },
          { id: 'nursing', name: 'Nursing', code: 'NURS', type: 'medical', is_active: true },
          { id: 'pharmacy', name: 'Pharmacy', code: 'PHARM', type: 'medical', is_active: true },
          { id: 'dentistry', name: 'Dentistry', code: 'DENT', type: 'medical', is_active: true },
          { id: 'psychology', name: 'Psychology', code: 'PSY', type: 'academic', is_active: true },
        ];
        setDepartments(fallbackDepartments);
      } finally {
        setDepartmentsLoading(false);
      }
    };

    fetchDepartments();
  }, [t]);

  // Validation functions
  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return t('validation.password_min');
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return t('validation.password_lowercase');
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return t('validation.password_uppercase');
    }
    if (!/(?=.*\d)/.test(password)) {
      return t('validation.password_number');
    }
    return null;
  };

  const validateStudentId = (studentId: string): string | null => {
    if (!/^\d+$/.test(studentId)) {
      return t('validation.student_id_numbers');
    }
    return null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    
    // Clear existing errors
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
    if (generalError) {
      setGeneralError('');
    }
    
    // Real-time validation
    if (name === 'password' && value) {
      const passwordError = validatePassword(value);
      if (passwordError) {
        setErrors({ ...errors, password: passwordError });
      } else {
        const newErrors = { ...errors };
        delete newErrors.password;
        setErrors(newErrors);
      }
    }
    
    if (name === 'student_id' && value && form.role === 'student') {
      const studentIdError = validateStudentId(value);
      if (studentIdError) {
        setErrors({ ...errors, student_id: studentIdError });
      } else {
        const newErrors = { ...errors };
        delete newErrors.student_id;
        setErrors(newErrors);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setGeneralError('');

    // Client-side validation
    const newErrors: FormErrors = {};
    
    if (form.password !== form.password_confirmation) {
      newErrors.password_confirmation = t('validation.passwords_match');
    }
    
    const passwordError = validatePassword(form.password);
    if (passwordError) {
      newErrors.password = passwordError;
    }
    
    if (form.role === 'student') {
      const studentIdError = validateStudentId(form.student_id);
      if (studentIdError) {
        newErrors.student_id = studentIdError;
      }
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      const baseData: Partial<RegisterData> = {
        name: form.name,
        email: form.email,
        password: form.password,
        password_confirmation: form.password_confirmation,
        role: form.role,
        phone: form.phone || undefined,
      };

      const roleData: Partial<RegisterData> = {};
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
      }

      const submitData = { ...baseData, ...roleData } as RegisterData;
      console.log('Submitting form:', submitData);
      
      const res = await register(submitData);
      console.log('Registration response:', res);
      
      // Check if registration returned a token (auto-login)
      if (res.token) {
        localStorage.setItem('token', res.token);
        
        if (onRegistrationSuccess) {
          console.log('Registration successful with auto-login, calling success handler');
          try {
            await onRegistrationSuccess();
            // Navigation will be handled by App.tsx after user data is loaded
          } catch (error) {
            console.error('Registration success handler failed:', error);
            // Navigate based on role as fallback
            if (res.user?.role === 'academic_staff') {
              navigate('/academic-staff/dashboard', { replace: true });
            } else if (res.user?.role === 'student') {
              navigate('/student/dashboard', { replace: true });
            } else {
              navigate('/', { replace: true });
            }
          }
        } else {
          // Fallback navigation based on role
          if (res.user?.role === 'academic_staff') {
            navigate('/academic-staff/dashboard', { replace: true });
          } else if (res.user?.role === 'student') {
            navigate('/student/dashboard', { replace: true });
          } else {
            navigate('/', { replace: true });
          }
        }
      } else {
        // Fallback for registrations without auto-login
        setGeneralError(t('error.registration_success'));
        setTimeout(() => navigate('/'), 2000);
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      
      try {
        const errorData = JSON.parse(err.message);
        if (typeof errorData === 'object' && errorData !== null) {
          setErrors(errorData);
        } else {
          setGeneralError(err.message || t('error.registration_failed'));
        }
      } catch (parseError) {
        setGeneralError(err.message || t('error.registration_failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string): string => {
    const icons: Record<string, string> = {
      student: 'fa-user-graduate',
      academic_staff: 'fa-chalkboard-teacher'
    };
    return icons[role] || 'fa-user';
  };

  // Custom styles for react-select to match existing input styling
const customSelectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    width: '100%',
    minHeight: '50px', // Match the height of text inputs (14px padding * 2 + font height)
    padding: '0',
    border: state.selectProps.error 
      ? '2px solid #dc2626' 
      : state.isFocused 
      ? '2px solid #dfa7a7' 
      : '2px solid #e5e7eb',
    borderRadius: '12px',
    fontSize: '15px',
    background: '#ffffff',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    '&:hover': {
      borderColor: state.isFocused ? '#dfa7a7' : '#e5e7eb'
    }
  }),
  valueContainer: (base: any) => ({
    ...base,
    padding: '0 18px', // Match the padding of text inputs
    minHeight: '46px',
    display: 'flex',
    alignItems: 'center'
  }),
  input: (base: any) => ({
    ...base,
    margin: '0',
    padding: '0',
    fontSize: '15px',
    color: '#1f2937'
  }),
  placeholder: (base: any) => ({
    ...base,
    color: '#9ca3af',
    fontSize: '15px',
    margin: '0'
  }),
  singleValue: (base: any) => ({
    ...base,
    color: '#1f2937',
    fontSize: '15px',
    margin: '0'
  }),
  indicatorSeparator: () => ({
    display: 'none' // Remove the separator line
  }),
  dropdownIndicator: (base: any, state: any) => ({
    ...base,
    color: '#6b7280',
    padding: '0 18px',
    transition: 'all 0.3s ease',
    transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
    '&:hover': {
      color: '#de4545'
    }
  }),
  clearIndicator: (base: any) => ({
    ...base,
    color: '#6b7280',
    padding: '0 8px',
    cursor: 'pointer',
    '&:hover': {
      color: '#dc2626'
    }
  }),
  menu: (base: any) => ({
    ...base,
    marginTop: '4px',
    borderRadius: '12px',
    border: '2px solid #e5e7eb',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
    zIndex: 9999
  }),
  menuList: (base: any) => ({
    ...base,
    padding: '8px',
    maxHeight: '200px'
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isSelected 
      ? '#dc2626' 
      : state.isFocused 
      ? '#fef2f2' 
      : 'white',
    color: state.isSelected ? 'white' : '#1f2937',
    padding: '12px 16px',
    fontSize: '15px',
    borderRadius: '8px',
    marginBottom: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    '&:last-child': {
      marginBottom: '0'
    },
    '&:hover': {
      backgroundColor: state.isSelected ? '#dc2626' : '#fef2f2'
    },
    '&:active': {
      backgroundColor: state.isSelected ? '#b91c1c' : '#fee2e2'
    }
  }),
  noOptionsMessage: (base: any) => ({
    ...base,
    fontSize: '15px',
    color: '#6b7280',
    padding: '12px 16px'
  }),
  loadingMessage: (base: any) => ({
    ...base,
    fontSize: '15px',
    color: '#6b7280',
    padding: '12px 16px'
  })
};

  // Updated function to use dynamic departments
  const getDepartmentOptions = (): SelectOption[] => {
    if (departmentsLoading) {
      return [{ value: "", label: t('common.loading') }];
    }
    
    if (departmentsError) {
      return [{ value: "", label: t('error.departments_unavailable') }];
    }
    
    return departments.map(dept => ({
      value: dept.name,
      label: dept.name
    }));
  };

  const getRoleOptions = (): SelectOption[] => [
    { value: "student", label: t('register.student') },
    { value: "academic_staff", label: t('register.academic_staff') }
  ];

  const getFacultyOptions = (): SelectOption[] => [
    { value: "Faculty of Medicine", label: t('faculty.medicine') },
    { value: "Faculty of Engineering", label: t('faculty.engineering') },
    { value: "Faculty of Sciences", label: t('faculty.sciences') },
    { value: "Faculty of Health Sciences", label: t('faculty.health_sciences') },
    { value: "Faculty of Pharmacy", label: t('faculty.pharmacy') },
    { value: "Faculty of Dentistry", label: t('faculty.dentistry') }
  ];

  const renderRoleSpecificFields = () => {
    switch (form.role) {
      case 'student':
        return (
          <>
            <div className="register-form-group">
              <label className="register-form-label">{t('register.student_id')}</label>
              <input
                name="student_id"
                type="text"
                className={`register-form-input ${errors.student_id ? 'is-invalid' : ''}`}
                value={form.student_id}
                onChange={handleChange}
                required
                placeholder={t('register.enter_student_id')}
                pattern="\d+"
                title={t('validation.student_id_numbers')}
              />
              {errors.student_id && (
                <div className="register-invalid-feedback">
                  {Array.isArray(errors.student_id) ? errors.student_id[0] : errors.student_id}
                </div>
              )}
              <small className="register-form-text">
                {t('register.student_id_notice')}
              </small>
            </div>
            <div className="register-form-group">
              <label className="register-form-label">{t('register.department')}</label>
              <Select
                options={getDepartmentOptions()}
                value={getDepartmentOptions().find(opt => opt.value === form.department) || null}
                onChange={(option) => {
                  setForm({ ...form, department: option?.value || '' });
                  if (errors.department) {
                    const newErrors = { ...errors };
                    delete newErrors.department;
                    setErrors(newErrors);
                  }
                }}
                placeholder={departmentsLoading 
                  ? t('common.loading') 
                  : departmentsError 
                  ? t('error.departments_unavailable')
                  : t('register.select_department')
                }
                isDisabled={departmentsLoading}
                isSearchable
                isClearable
                styles={customSelectStyles}
              />
              {departmentsError && (
                <small className="register-form-text" style={{ color: '#dc2626' }}>
                  {departmentsError}
                </small>
              )}
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
              <label className="register-form-label">{t('register.staff_number')}</label>
              <input
                name="staff_no"
                type="text"
                className={`register-form-input ${errors.staff_no ? 'is-invalid' : ''}`}
                value={form.staff_no}
                onChange={handleChange}
                required
                placeholder={t('register.enter_staff_no')}
              />
              {errors.staff_no && (
                <div className="register-invalid-feedback">
                  {Array.isArray(errors.staff_no) ? errors.staff_no[0] : errors.staff_no}
                </div>
              )}
            </div>
            <div className="register-form-group">
              <label className="register-form-label">{t('register.faculty')}</label>
              <Select
                options={getFacultyOptions()}
                value={getFacultyOptions().find(opt => opt.value === form.faculty) || null}
                onChange={(option) => {
                  setForm({ ...form, faculty: option?.value || '' });
                  if (errors.faculty) {
                    const newErrors = { ...errors };
                    delete newErrors.faculty;
                    setErrors(newErrors);
                  }
                }}
                placeholder={t('register.select_faculty')}
                isSearchable
                isClearable
                styles={customSelectStyles}
              />
              {errors.faculty && (
                <div className="register-invalid-feedback">
                  {Array.isArray(errors.faculty) ? errors.faculty[0] : errors.faculty}
                </div>
              )}
            </div>
            <div className="register-form-group">
              <label className="register-form-label">{t('register.department_optional')}</label>
              <Select
                options={getDepartmentOptions()}
                value={getDepartmentOptions().find(opt => opt.value === form.department) || null}
                onChange={(option) => {
                  setForm({ ...form, department: option?.value || '' });
                  if (errors.department) {
                    const newErrors = { ...errors };
                    delete newErrors.department;
                    setErrors(newErrors);
                  }
                }}
                placeholder={departmentsLoading 
                  ? t('common.loading') 
                  : departmentsError 
                  ? t('error.departments_unavailable')
                  : t('register.select_department_optional')
                }
                isDisabled={departmentsLoading}
                isSearchable
                isClearable
                styles={customSelectStyles}
              />
              {departmentsError && (
                <small className="register-form-text" style={{ color: '#dc2626' }}>
                  {departmentsError}
                </small>
              )}
              {errors.department && (
                <div className="register-invalid-feedback">
                  {Array.isArray(errors.department) ? errors.department[0] : errors.department}
                </div>
              )}
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="wehealth-register-container">
      {/* Language Switcher - positioned absolutely in top right */}
      <LanguageSwitcher className="language-switcher" />

      <div className="wehealth-register-card">
        {/* Left Panel - Register Form */}
        <div className="register-panel">
          <div className="register-logo-section">
            <img src="/logo6.png" alt="Final International University" className="register-brand-logo" />
            <h2 className="register-brand-name">{t('login.brand_name')}</h2>
          </div>

          <div className="register-form-container">
            <h3 className="register-form-title">{t('register.title')}</h3>
            <p className="register-form-subtitle">{t('register.subtitle')}</p>

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
                    <label className="register-form-label">{t('register.full_name')}</label>
                    <input
                      name="name"
                      type="text"
                      className={`register-form-input ${errors.name ? 'is-invalid' : ''}`}
                      value={form.name}
                      onChange={handleChange}
                      required
                      placeholder={t('register.enter_full_name')}
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
                    <label className="register-form-label">{t('register.role')}</label>
                    <Select
                      options={getRoleOptions()}
                      value={getRoleOptions().find(opt => opt.value === form.role) || null}
                      onChange={(option) => {
                        setForm({ ...form, role: option?.value || '' });
                        if (errors.role) {
                          const newErrors = { ...errors };
                          delete newErrors.role;
                          setErrors(newErrors);
                        }
                      }}
                      placeholder={t('register.select_role')}
                      isSearchable
                      isClearable
                      styles={customSelectStyles}
                    />
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
                <label className="register-form-label">{t('register.email')}</label>
                <input
                  name="email"
                  type="email"
                  className={`register-form-input ${errors.email ? 'is-invalid' : ''}`}
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder={t('register.enter_email')}
                />
                {(form.role === 'student' || form.role === 'academic_staff') && (
                  <small className="register-form-text">
                    {t('register.university_email_notice')}
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
                    <label className="register-form-label">{t('register.password')}</label>
                    <div className="register-password-wrapper">
                      <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        className={`register-form-input ${errors.password ? 'is-invalid' : ''}`}
                        value={form.password}
                        onChange={handleChange}
                        required
                        minLength={8}
                        placeholder={t('register.create_password')}
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
                    <small className="register-form-text">
                      {t('register.password_requirements')}
                    </small>
                  </div>
                </div>
                <div className="register-form-col">
                  <div className="register-form-group">
                    <label className="register-form-label">{t('register.confirm_password')}</label>
                    <div className="register-password-wrapper">
                      <input
                        name="password_confirmation"
                        type={showConfirmPassword ? "text" : "password"}
                        className={`register-form-input ${errors.password_confirmation ? 'is-invalid' : ''}`}
                        value={form.password_confirmation}
                        onChange={handleChange}
                        required
                        placeholder={t('register.confirm_password_placeholder')}
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
                <label className="register-form-label">{t('register.phone')}</label>
                <PhoneInput
                  country={'tr'}
                  value={form.phone}
                  onChange={(phone) => setForm({ ...form, phone })}
                  placeholder={t('register.phone')}
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
                    {form.role === 'student' ? t('register.student_info') : t('register.academic_staff_info')}
                  </h6>
                  {renderRoleSpecificFields()}
                </div>
              )}
            
              <button type="submit" disabled={loading || departmentsLoading} className="register-button">
                {loading && (
                  <span className="register-spinner"></span>
                )}
                {loading ? t('register.creating_account') : t('register.create_account')}
              </button>

              <div style={{ textAlign: 'center', marginTop: '15px' }}>
                <p style={{ color: '#6b7280', fontSize: '14px', margin: '0' }}>
                  {t('register.already_have_account')}
                  <Link to="/" className="register-signin-link" style={{ marginLeft: '5px' }}>
                    {t('register.sign_in')}
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
              <img src="/female-doctor-hospital-with-stethoscope.png" alt="Healthcare Professional" className="register-doctor-image" />
            </div>
            
            <div className="register-info-bubble">
              <div className="register-bubble-icon">
                <i className="fas fa-user-plus"></i>
              </div>
              <div className="register-bubble-content">
                <h4>{t('register.join_team')}</h4>
                <p>{t('register.healthcare_community')}</p>
              </div>
            </div>
          </div>
          
          <div className="register-signin-section">
            <p>{t('register.already_have_account')}</p>
            <Link to="/" className="register-signin-section-link">{t('register.sign_in')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;