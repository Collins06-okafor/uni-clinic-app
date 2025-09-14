import React, { useState, useEffect } from 'react';
import { 
  UserPlus, Clock, Users, Search, CheckCircle, X, Eye, 
  Stethoscope, Heart, Plus
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface WalkInPatient {
  id: string;
  patient_name: string;
  student_id: string;
  complaints: string;
  urgency: 'normal' | 'urgent' | 'emergency';
  walk_in_time: string;
  queue_number: number;
  estimated_wait_time: number;
  status: 'waiting' | 'in_progress' | 'completed' | 'called';
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

  // API Configuration - Match your clinical dashboard
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
  const AUTH_TOKEN = localStorage.getItem('auth_token') || '16|iTGQGrMabQfgjprXw6xM01KTAmJc7AQ78qglIs4xd5fa9378';

  // Fetch walk-in patients
  const fetchWalkInPatients = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/clinical/walk-in-patients`, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Accept': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPatients(data.patients || []);
      } else {
        setMessage({ type: 'error', text: 'Failed to load walk-in patients' });
      }
    } catch (error) {
      console.error('Error fetching walk-in patients:', error);
      setMessage({ type: 'error', text: 'Network error loading patients' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  // Register new walk-in patient
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
        setMessage({ type: 'success', text: data.message || 'Walk-in patient registered successfully!' });
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
        setMessage({ type: 'error', text: errorData.message || 'Registration failed' });
      }
    } catch (error) {
      console.error('Error registering walk-in patient:', error);
      setMessage({ type: 'error', text: 'Network error during registration' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  // Update patient status
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
        setMessage({ type: 'success', text: 'Patient status updated successfully' });
        fetchWalkInPatients();
      } else {
        setMessage({ type: 'error', text: 'Failed to update patient status' });
      }
    } catch (error) {
      console.error('Error updating patient status:', error);
      setMessage({ type: 'error', text: 'Network error updating status' });
    } finally {
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchWalkInPatients();
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

  // Filter patients
  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.student_id?.includes(searchTerm);
    const matchesStatus = filterStatus === 'all' || patient.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const badges = {
      waiting: 'badge bg-primary',
      called: 'badge bg-warning text-dark',
      in_progress: 'badge bg-info',
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
      {/* Message Display */}
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
              {t('walkin.title', 'Walk-in Patient Management')}
            </h3>
            {canRegisterPatients && (
  <button 
    onClick={() => setShowForm(true)}
    className="btn btn-sm btn-light"
    style={{ borderRadius: '0.5rem' }}
  >
    <Plus size={16} className="me-1" />
    Register Patient
  </button>
)}
          </div>
        </div>

        <div className="card-body p-4">
          {/* Search and Filters */}
          <div className="row mb-4">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  placeholder="Search by name or student ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-control"
                />
              </div>
            </div>
            <div className="col-md-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="form-select"
              >
                <option value="all">All Status</option>
                <option value="waiting">Waiting</option>
                <option value="called">Called</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Patient List */}
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-muted mt-2">Loading patients...</p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-5">
              <Users size={48} className="text-muted mb-3" />
              <p className="text-muted">No walk-in patients found</p>
              <small className="text-muted">Patients will appear here when they check in</small>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Queue #</th>
                    <th>Patient</th>
                    <th>Time</th>
                    <th>Urgency</th>
                    <th>Status</th>
                    <th>Wait Time</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((patient) => (
                    <tr key={patient.id}>
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
                        <div className="d-flex align-items-center">
                          <Clock size={16} className="text-muted me-1" />
                          {new Date(patient.walk_in_time).toLocaleTimeString()}
                        </div>
                      </td>
                      <td>
                        <span className={getUrgencyBadge(patient.urgency)}>
                          {patient.urgency.charAt(0).toUpperCase() + patient.urgency.slice(1)}
                        </span>
                      </td>
                      <td>
                        <span className={getStatusBadge(patient.status)}>
                          {patient.status.replace('_', ' ').charAt(0).toUpperCase() + patient.status.replace('_', ' ').slice(1)}
                        </span>
                      </td>
                      <td>{patient.estimated_wait_time} min</td>
                      <td>
                        <div className="btn-group" role="group">
                          <button 
                            onClick={() => setSelectedPatient(patient)}
                            className="btn btn-sm btn-outline-primary"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          
                          {patient.status === 'waiting' && (
                            <button
                              onClick={() => updatePatientStatus(patient.id, 'called')}
                              className="btn btn-sm btn-outline-info"
                              title="Call Patient"
                            >
                              <CheckCircle size={16} />
                            </button>
                          )}
                          
                          {patient.status === 'called' && (
                            <button
                              onClick={() => updatePatientStatus(patient.id, 'in_progress')}
                              className="btn btn-sm btn-outline-warning"
                              title="Start Treatment"
                            >
                              <Stethoscope size={16} />
                            </button>
                          )}
                          
                          {patient.status === 'in_progress' && (
                            <button
                              onClick={() => updatePatientStatus(patient.id, 'completed')}
                              className="btn btn-sm btn-outline-success"
                              title="Complete Treatment"
                            >
                              <CheckCircle size={16} />
                            </button>
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

      {/* Registration Form Modal */}
      {showForm && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content" style={{ borderRadius: '1rem' }}>
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">Register Walk-in Patient</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowForm(false)}
                />
              </div>
              <div className="modal-body pt-0">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Student ID *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.student_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, student_id: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Patient Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.patient_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, patient_name: e.target.value }))}
                      placeholder="Leave empty to auto-populate"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Urgency Level *</label>
                    <select
                      className="form-select"
                      value={formData.urgency}
                      onChange={(e) => setFormData(prev => ({ ...prev, urgency: e.target.value }))}
                    >
                      <option value="normal">Normal</option>
                      <option value="urgent">Urgent</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Chief Complaints *</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={formData.complaints}
                      onChange={(e) => setFormData(prev => ({ ...prev, complaints: e.target.value }))}
                      placeholder="Describe the patient's main symptoms or concerns..."
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Additional Notes</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Any additional observations..."
                    />
                  </div>
                </div>
                <div className="d-flex justify-content-end gap-2 mt-4">
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary" 
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button"
                    className="btn btn-primary"
                    onClick={registerWalkInPatient}
                    disabled={loading || !formData.student_id || !formData.complaints}
                  >
                    {loading && <div className="spinner-border spinner-border-sm me-2" role="status"></div>}
                    Register Patient
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Patient Details Modal */}
      {selectedPatient && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content" style={{ borderRadius: '1rem' }}>
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">Patient Details</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedPatient(null)}
                />
              </div>
              <div className="modal-body pt-0">
                <div className="row g-4">
                  <div className="col-md-6">
                    <label className="form-label text-muted">Queue Number</label>
                    <p className="fs-3 fw-bold text-primary">#{selectedPatient.queue_number}</p>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label text-muted">Patient Name</label>
                    <p className="fs-5 fw-bold">{selectedPatient.patient_name}</p>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label text-muted">Student ID</label>
                    <p className="fs-6">{selectedPatient.student_id}</p>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label text-muted">Check-in Time</label>
                    <p className="fs-6">{new Date(selectedPatient.walk_in_time).toLocaleString()}</p>
                  </div>
                  <div className="col-12">
                    <label className="form-label text-muted">Chief Complaints</label>
                    <div className="bg-light p-3 rounded">
                      {selectedPatient.complaints}
                    </div>
                  </div>
                </div>
                
                <div className="d-flex gap-2 mt-4">
                  {selectedPatient.status === 'waiting' && (
                    <button
                      onClick={() => {
                        updatePatientStatus(selectedPatient.id, 'called');
                        setSelectedPatient(null);
                      }}
                      className="btn btn-primary flex-fill"
                    >
                      Call Patient
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
                      Start Treatment
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
                      Complete Treatment
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