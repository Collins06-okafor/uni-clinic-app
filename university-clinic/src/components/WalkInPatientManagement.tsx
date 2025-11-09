import React, { useState, useEffect } from 'react';
import { 
  UserPlus, Clock, Users, Search, CheckCircle, X, Eye, 
  Stethoscope, Heart, Plus, Calendar
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Select from 'react-select';

interface WalkInPatient {
  id: string;
  patient_name: string;
  student_id: string;
  complaints: string;
  urgency: 'normal' | 'urgent' | 'emergency';
  walk_in_time: string;
  scheduled_time?: string;
  scheduled_date?: string;
  type?: 'walk_in' | 'approved_request';
  doctor_name?: string;
  doctor_id?: string;
  queue_number: number;
  estimated_wait_time: number;
  status: 'waiting' | 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'called';
  has_walked_in?: boolean;
  appointment_id?: string;
  approved_time?: string;
  created_at?: string;
}

interface WalkInPatientManagementProps {
  userRole: 'clinical_staff' | 'doctor' | 'admin';
  websocketService?: any;
}

const WalkInPatientManagement: React.FC<WalkInPatientManagementProps> = ({ 
  userRole, 
  websocketService 
}) => {
  const canRegisterPatients = userRole === 'clinical_staff' || userRole === 'admin';

  const { t } = useTranslation();
  const [patients, setPatients] = useState<WalkInPatient[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<WalkInPatient | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [message, setMessage] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    student_id: '',
    patient_name: '',
    complaints: '',
    urgency: 'normal',
    notes: ''
  });

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
  const AUTH_TOKEN = localStorage.getItem('auth_token') || '16|iTGQGrMabQfgjprXw6xM01KTAmJc7AQ78qglIs4xd5fa9378';

  // Options for react-select
  const urgencyOptions = [
    { value: 'normal', label: t('walkin.normal', 'Normal') },
    { value: 'urgent', label: t('walkin.urgent', 'Urgent') },
    { value: 'emergency', label: t('walkin.emergency', 'Emergency') }
  ];

  const statusFilterOptions = [
    { value: 'all', label: t('walkin.all_status', 'All Status') },
    { value: 'scheduled', label: t('walkin.awaiting_walkin', 'Awaiting Walk-in') },
    { value: 'confirmed', label: t('walkin.walked_in', 'Walked In') },
    { value: 'waiting', label: t('walkin.waiting', 'Waiting') },
    { value: 'called', label: t('walkin.called', 'Called') },
    { value: 'in_progress', label: t('walkin.in_progress', 'In Progress') },
    { value: 'completed', label: t('walkin.completed', 'Completed') }
  ];

  // Custom styles for react-select
  const customSelectStyles = {
    control: (base: any) => ({
      ...base,
      minHeight: '38px',
      borderColor: '#dee2e6',
      '&:hover': {
        borderColor: '#adb5bd'
      }
    }),
    menu: (base: any) => ({
      ...base,
      zIndex: 9999
    })
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return t('walkin.not_set', 'Not set');
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return t('common.invalid_date', 'Invalid date');
    }
  };

  const formatTime = (timeString?: string): string => {
    if (!timeString) return t('walkin.not_set', 'Not set');
    try {
      if (timeString.includes('T')) {
        const date = new Date(timeString);
        if (isNaN(date.getTime())) return t('common.invalid_time', 'Invalid time');
        return date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      }
      
      if (timeString.includes(':')) {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours, 10);
        if (hour < 0 || hour > 23 || isNaN(hour)) return t('common.invalid_time', 'Invalid time');
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
      }
      
      return t('common.invalid_time', 'Invalid time');
    } catch (error) {
      return t('common.invalid_time', 'Invalid time');
    }
  };

  const getApprovedTime = (patient: WalkInPatient): string => {
    if (patient.type === 'approved_request') {
      return patient.approved_time || patient.created_at || patient.walk_in_time;
    }
    return patient.walk_in_time;
  };

  const formatDateTime = (dateTimeString: string): string => {
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting datetime:', error);
      return t('common.invalid_date', 'Invalid date/time');
    }
  };

  const fetchWalkInPatients = async () => {
    try {
      setLoading(true);
      console.log('Fetching walk-in patients...');
      
      const response = await fetch(`${API_BASE_URL}/api/clinical/walk-in-patients`, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Accept': 'application/json',
        }
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Walk-in data received:', data);
        console.log('Full response structure:', JSON.stringify(data, null, 2));
        console.log('Patients count:', data.patients?.length);
        console.log('Walk-in patients:', data.walk_in_patients?.length);
        
        const patientsArray = data.patients || data.walk_in_patients || [];
        console.log('Using patients array with length:', patientsArray.length);
        setPatients(patientsArray);
      } else {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        setMessage({ type: 'error', text: t('walkin.failed_to_load', 'Failed to load walk-in patients') });
      }
    } catch (error) {
      console.error('Error fetching walk-in patients:', error);
      setMessage({ type: 'error', text: t('error.network', 'Network error loading patients') });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  const registerWalkInPatient = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/api/clinical/walk-in-patients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          student_id: formData.student_id,
          patient_name: formData.patient_name,
          complaints: formData.complaints,
          urgency: formData.urgency,
          notes: formData.notes,
          walk_in_time: new Date().toISOString()
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({ type: 'success', text: data.message || t('walkin.register_success', 'Walk-in patient registered successfully!') });
        fetchWalkInPatients();
        setShowForm(false);
        setFormData({
          student_id: '',
          patient_name: '',
          complaints: '',
          urgency: 'normal',
          notes: ''
        });
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.message || t('walkin.register_failed', 'Registration failed') });
      }
    } catch (error) {
      console.error('Error registering walk-in patient:', error);
      setMessage({ type: 'error', text: t('error.network', 'Network error during registration') });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  const updatePatientStatus = async (patientId: string, status: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/clinical/walk-in-patients/${patientId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (status === 'confirmed') {
          setMessage({ 
            type: 'success', 
            text: t('walkin.confirm_arrival_desc', 'Patient arrival confirmed! Doctor has been notified.')
          });
        } else {
          setMessage({ type: 'success', text: t('walkin.status_updated', 'Patient status updated successfully') });
        }
        
        fetchWalkInPatients();
        
        if (status === 'confirmed' && data.alert_sent) {
          console.log('Walk-in alert sent to doctor:', data.appointment?.doctor_id);
        }
      } else {
        setMessage({ type: 'error', text: t('walkin.status_update_failed', 'Failed to update patient status') });
      }
    } catch (error) {
      console.error('Error updating patient status:', error);
      setMessage({ type: 'error', text: t('error.network', 'Network error updating status') });
    } finally {
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  useEffect(() => {
    fetchWalkInPatients();
    
    const handleRefresh = () => {
      console.log('Walk-in refresh triggered by approval');
      fetchWalkInPatients();
    };
    
    window.addEventListener('refreshWalkIn', handleRefresh);
    
    return () => {
      window.removeEventListener('refreshWalkIn', handleRefresh);
    };
  }, []);

  useEffect(() => {
    if (websocketService) {
      const handleQueueUpdate = (queueData: any) => {
        if (queueData.walk_in_patients) {
          setPatients(queueData.walk_in_patients);
        }
      };

      websocketService.onQueueUpdate?.(handleQueueUpdate);
      websocketService.joinChannel?.('clinical-staff');

      return () => {
        websocketService.off?.('queue.updated', handleQueueUpdate);
        websocketService.leaveChannel?.('clinical-staff');
      };
    }
  }, [websocketService]);

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.student_id?.includes(searchTerm);
    const matchesStatus = filterStatus === 'all' || patient.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string, type?: string) => {
    if (status === 'scheduled' && type === 'approved_request') {
      return 'badge bg-warning text-dark';
    }
    
    const badges = {
      waiting: 'badge bg-primary',
      scheduled: 'badge bg-warning text-dark',
      called: 'badge bg-info',
      confirmed: 'badge bg-success',
      in_progress: 'badge bg-warning text-dark',
      completed: 'badge bg-success'
    };
    return badges[status as keyof typeof badges] || 'badge bg-secondary';
  };

  const getUrgencyBadge = (urgency: string) => {
    const badges = {
      emergency: 'badge bg-danger',
      urgent: 'badge bg-warning text-dark',
      normal: 'badge bg-success'
    };
    return badges[urgency as keyof typeof badges] || 'badge bg-secondary';
  };

  return (
    <div className="container-fluid py-4">
      {message.text && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'} alert-dismissible fade show`} role="alert">
          <div className="d-flex align-items-center">
            {message.type === 'success' ? <CheckCircle size={20} className="me-2" /> : <X size={20} className="me-2" />}
            {message.text}
          </div>
        </div>
      )}

      <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
        <div className="card-header" style={{ background: 'linear-gradient(135deg, #e85555ff 0%, #d43434ff 100%)' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h3 className="card-title text-white mb-0 d-flex align-items-center">
              <UserPlus size={24} className="me-2" />
              {t('walkin.title')}
            </h3>
            {canRegisterPatients && (
              <button 
                onClick={() => setShowForm(true)}
                className="btn btn-sm btn-light"
                style={{ borderRadius: '0.5rem' }}
              >
                <Plus size={16} className="me-1" />
                {t('walkin.register_walkin')}
              </button>
            )}
          </div>
        </div>

        <div className="card-body p-4">
          <div className="row mb-4">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  placeholder={t('walkin.search_placeholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-control"
                />
              </div>
            </div>
            <div className="col-md-3">
              <Select
                options={statusFilterOptions}
                value={statusFilterOptions.find(opt => opt.value === filterStatus)}
                onChange={(option) => setFilterStatus(option?.value || 'all')}
                styles={customSelectStyles}
                isSearchable={false}
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">{t('common.loading')}</span>
              </div>
              <p className="text-muted mt-2">{t('walkin.loading')}</p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-5">
              <Users size={48} className="text-muted mb-3" />
              <p className="text-muted">{t('walkin.no_patients')}</p>
              <small className="text-muted">
                {filterStatus === 'scheduled' 
                  ? t('walkin.no_patients_awaiting')
                  : t('walkin.patients_appear')}
              </small>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>{t('walkin.queue_number')}</th>
                    <th>{t('walkin.patient')}</th>
                    <th>{t('walkin.doctor')}</th>
                    <th>{t('walkin.schedule_info')}</th>
                    <th>{t('walkin.urgency')}</th>
                    <th>{t('walkin.status')}</th>
                    <th>{t('walkin.wait_time')}</th>
                    <th>{t('walkin.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((patient) => (
                    <tr 
                      key={patient.id}
                      style={{
                        backgroundColor: patient.type === 'approved_request' 
                          ? 'rgba(13, 202, 240, 0.05)'
                          : 'transparent'
                      }}
                    >
                      <td>
                        <span className="badge bg-dark fs-6 px-3 py-2">
                          {patient.queue_number}
                        </span>
                      </td>
                      <td>
                        <div>
                          <strong>{patient.patient_name}</strong>
                          <div className="text-muted small">{patient.student_id}</div>
                        </div>
                      </td>
                      <td>
                        {patient.doctor_name ? (
                          <div>
                            <Stethoscope size={14} className="text-primary me-1" />
                            <small>{patient.doctor_name}</small>
                          </div>
                        ) : (
                          <small className="text-muted">{t('walkin.unassigned')}</small>
                        )}
                      </td>
                      <td>
                        {patient.type === 'approved_request' ? (
                          <div>
                            <span className="badge bg-info mb-1" style={{ fontSize: '0.7rem' }}>
                              {t('walkin.pre_scheduled')}
                            </span>
                            <div className="d-flex align-items-center">
                              <Calendar size={14} className="text-primary me-1" />
                              <div>
                                <div className="fw-bold">
                                  {formatDate(patient.scheduled_date)}
                                </div>
                                <div className="text-muted small">
                                  {formatTime(patient.scheduled_time)}
                                </div>
                              </div>
                            </div>
                            <small className="text-muted">
                              {t('walkin.approved')}: {formatTime(getApprovedTime(patient))}
                            </small>
                          </div>
                        ) : (
                          <div>
                            <span className="badge bg-secondary mb-1" style={{ fontSize: '0.7rem' }}>
                              {t('walkin.walkin')}
                            </span>
                            <div className="d-flex align-items-center">
                              <Clock size={14} className="text-muted me-1" />
                              <div>
                                <div className="fw-bold">
                                  {formatDate(patient.walk_in_time)}
                                </div>
                                <div className="text-muted small">
                                  {formatTime(patient.walk_in_time)}
                                </div>
                              </div>
                            </div>
                            <small className="text-muted">
                              {t('walkin.checked_in')}: {formatTime(patient.walk_in_time)}
                            </small>
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={getUrgencyBadge(patient.urgency)}>
                          {t(`walkin.${patient.urgency}`)}
                        </span>
                      </td>
                      <td>
                        <span className={getStatusBadge(patient.status, patient.type)}>
                          {patient.type === 'approved_request' && patient.status === 'scheduled' 
                            ? t('walkin.awaiting_walkin')
                            : patient.status === 'confirmed'
                            ? t('walkin.walked_in')
                            : t(`walkin.${patient.status}`)}
                        </span>
                      </td>
                      <td>{patient.estimated_wait_time} {t('walkin.minutes')}</td>
                      <td>
                        <div className="btn-group" role="group">
                          <button 
                            onClick={() => setSelectedPatient(patient)}
                            className="btn btn-sm btn-outline-primary"
                            title={t('walkin.view_details')}
                          >
                            <Eye size={16} />
                          </button>
                          
                          {patient.type === 'approved_request' && patient.status === 'scheduled' && (
                            <button
                              onClick={() => updatePatientStatus(patient.id, 'confirmed')}
                              className="btn btn-sm btn-success"
                              title={t('walkin.confirm_arrival')}
                            >
                              <CheckCircle size={16} /> {t('walkin.confirm_arrival')}
                            </button>
                          )}
                          
                          {patient.status === 'waiting' && patient.type === 'walk_in' && (
                            <button
                              onClick={() => updatePatientStatus(patient.id, 'called')}
                              className="btn btn-sm btn-outline-info"
                              title={t('walkin.call_patient')}
                            >
                              <CheckCircle size={16} />
                            </button>
                          )}
                          
                          {patient.status === 'called' && (
                            <button
                              onClick={() => updatePatientStatus(patient.id, 'in_progress')}
                              className="btn btn-sm btn-outline-warning"
                              title={t('walkin.start_treatment')}
                            >
                              <Stethoscope size={16} />
                            </button>
                          )}
                          
                          {patient.status === 'confirmed' && (
                            <button
                              onClick={() => updatePatientStatus(patient.id, 'in_progress')}
                              className="btn btn-sm btn-warning"
                              title={t('walkin.start_treatment')}
                            >
                              <Stethoscope size={16} /> {t('walkin.start')}
                            </button>
                          )}
                          
                          {patient.status === 'in_progress' && (
                            <span className="badge bg-info">
                              {t('walkin.with_doctor')}
                            </span>
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

      {showForm && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content" style={{ borderRadius: '1rem' }}>
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">{t('walkin.register_patient')}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowForm(false)}
                />
              </div>
              <div className="modal-body pt-0">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">{t('walkin.student_id')} *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.student_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, student_id: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">{t('walkin.patient_name')}</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.patient_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, patient_name: e.target.value }))}
                      placeholder={t('walkin.leave_empty')}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">{t('walkin.urgency_level')} *</label>
                    <Select
                      options={urgencyOptions}
                      value={urgencyOptions.find(opt => opt.value === formData.urgency)}
                      onChange={(option) => setFormData(prev => ({ ...prev, urgency: option?.value || 'normal' }))}
                      styles={customSelectStyles}
                      isSearchable={false}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">{t('walkin.chief_complaints')} *</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={formData.complaints}
                      onChange={(e) => setFormData(prev => ({ ...prev, complaints: e.target.value }))}
                      placeholder={t('walkin.describe_symptoms')}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">{t('walkin.additional_notes')}</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder={t('walkin.observations')}
                    />
                  </div>
                </div>
                <div className="d-flex justify-content-end gap-2 mt-4">
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary" 
                    onClick={() => setShowForm(false)}
                  >
                    {t('walkin.cancel')}
                  </button>
                  <button 
                    type="button"
                    className="btn btn-primary"
                    onClick={registerWalkInPatient}
                    disabled={loading || !formData.student_id || !formData.complaints}
                  >
                    {loading && <div className="spinner-border spinner-border-sm me-2" role="status"></div>}
                    {loading ? t('walkin.registering') : t('walkin.register_patient')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedPatient && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content" style={{ borderRadius: '1rem' }}>
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">{t('walkin.patient_details')}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedPatient(null)}
                />
              </div>
              <div className="modal-body pt-0">
                <div className="row g-4">
                  <div className="col-md-6">
                    <label className="form-label text-muted">{t('walkin.queue_number_label')}</label>
                    <p className="fs-3 fw-bold text-primary">#{selectedPatient.queue_number}</p>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label text-muted">{t('walkin.patient_name_label')}</label>
                    <p className="fs-5 fw-bold">{selectedPatient.patient_name}</p>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label text-muted">{t('walkin.student_id_label')}</label>
                    <p className="fs-6">{selectedPatient.student_id}</p>
                  </div>
                  {selectedPatient.type === 'approved_request' && selectedPatient.scheduled_time ? (
                    <>
                      <div className="col-md-6">
                        <label className="form-label text-muted">{t('walkin.scheduled_time')}</label>
                        <p className="fs-6">
                          <span className="badge bg-info me-2">{t('walkin.scheduled_appointment')}</span>
                          <Calendar size={16} className="me-1" />
                          {formatDate(selectedPatient.scheduled_date)} at {formatTime(selectedPatient.scheduled_time)}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="col-md-6">
                      <label className="form-label text-muted">{t('walkin.checkin_time')}</label>
                      <p className="fs-6">{formatDateTime(selectedPatient.walk_in_time)}</p>
                    </div>
                  )}
                  
                  <div className="col-12">
                    <label className="form-label text-muted">{t('walkin.chief_complaints_label')}</label>
                    <div className="bg-light p-3 rounded">
                      {selectedPatient.complaints}
                    </div>
                  </div>
                </div>
                
                <div className="d-flex gap-2 mt-4">
                  {selectedPatient.type === 'approved_request' && selectedPatient.status === 'scheduled' && (
                    <button
                      onClick={() => {
                        updatePatientStatus(selectedPatient.id, 'confirmed');
                        setSelectedPatient(null);
                      }}
                      className="btn btn-success flex-fill"
                    >
                      <CheckCircle size={16} className="me-2" />
                      {t('walkin.confirm_patient_arrival')}
                    </button>
                  )}
                  
                  {selectedPatient.status === 'waiting' && (
                    <button
                      onClick={() => {
                        updatePatientStatus(selectedPatient.id, 'called');
                        setSelectedPatient(null);
                      }}
                      className="btn btn-primary flex-fill"
                    >
                      {t('walkin.call_patient')}
                    </button>
                  )}
                  
                  {selectedPatient.status === 'called' && (
                    <button
                      onClick={() => {
                        updatePatientStatus(selectedPatient.id, 'in_progress');
                        setSelectedPatient(null);
                      }}
                      className="btn btn-warning flex-fill"
                    >
                      {t('walkin.start_treatment')}
                    </button>
                  )}
                  
                  {selectedPatient.status === 'confirmed' && (
                    <button
                      onClick={() => {
                        updatePatientStatus(selectedPatient.id, 'in_progress');
                        setSelectedPatient(null);
                      }}
                      className="btn btn-warning flex-fill"
                    >
                      {t('walkin.start_treatment')}
                    </button>
                  )}
                  
                  {selectedPatient.status === 'in_progress' && (
                    <button
                      onClick={() => {
                        updatePatientStatus(selectedPatient.id, 'completed');
                        setSelectedPatient(null);
                      }}
                      className="btn btn-success flex-fill"
                    >
                      {t('walkin.complete_treatment')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalkInPatientManagement;