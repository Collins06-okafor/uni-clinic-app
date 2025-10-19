import React, { useState, useEffect } from 'react';
import { User, Heart, Activity, FileText, Clock, AlertCircle, TrendingUp, Calendar } from 'lucide-react';

interface MedicalCardViewerProps {
  patientId: string | number;
  onClose: () => void;
  authToken: string;
  apiBaseUrl: string;
}

const EnhancedMedicalCardViewer: React.FC<MedicalCardViewerProps> = ({
  patientId,
  onClose,
  authToken,
  apiBaseUrl
}) => {
  const [medicalCard, setMedicalCard] = useState<any>(null);
  const [vitalsHistory, setVitalsHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'info' | 'vitals' | 'history'>('info');

  useEffect(() => {
    loadMedicalCard();
    loadVitalsHistory();
  }, [patientId]);

  const loadMedicalCard = async () => {
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/clinical/patients/${patientId}/medical-card`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }
        }
      );

      if (!response.ok) throw new Error('Failed to load medical card');

      const data = await response.json();
      setMedicalCard(data);
    } catch (error) {
      console.error('Error loading medical card:', error);
    }
  };

  const loadVitalsHistory = async () => {
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/clinical/patients/${patientId}/vitals-history?days=30`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }
        }
      );

      if (!response.ok) throw new Error('Failed to load vitals history');

      const data = await response.json();
      setVitalsHistory(data.vital_signs_history || []);
    } catch (error) {
      console.error('Error loading vitals history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog modal-xl modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-body text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3">Loading medical card...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const latestVitals = vitalsHistory[0];

  // Get patient data (works for both students and academic staff)
  const patient = medicalCard?.student || medicalCard?.staff;
  const isStaff = !!medicalCard?.staff;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content" style={{ borderRadius: '1rem' }}>
          <div className="modal-header border-0" style={{ background: 'linear-gradient(135deg, #db5858ff 0%, #e94848ff 100%)' }}>
            <div className="text-white">
              <h4 className="modal-title mb-1">
                <User size={24} className="me-2" />
                Medical Card - {patient?.name}
              </h4>
              <small className="opacity-75">
                {isStaff 
                  ? `Staff No: ${patient?.staff_no} | Department: ${patient?.department}`
                  : `Student ID: ${patient?.student_id} | Department: ${patient?.department}`
                }
              </small>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
            />
          </div>

          {/* Navigation Tabs */}
          <ul className="nav nav-tabs px-3 pt-3 border-0">
            <li className="nav-item">
              <button
                className={`nav-link ${activeSection === 'info' ? 'active' : ''}`}
                onClick={() => setActiveSection('info')}
              >
                <User size={16} className="me-1" />
                Basic Info
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeSection === 'vitals' ? 'active' : ''}`}
                onClick={() => setActiveSection('vitals')}
              >
                <Heart size={16} className="me-1" />
                Latest Vitals
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeSection === 'history' ? 'active' : ''}`}
                onClick={() => setActiveSection('history')}
              >
                <Clock size={16} className="me-1" />
                Vitals History
              </button>
            </li>
          </ul>

          <div className="modal-body p-4">
            {/* Basic Information Section */}
            {activeSection === 'info' && (
              <div>
                {/* Patient Demographics */}
                <div className="card mb-3">
                  <div className="card-header bg-light">
                    <h5 className="mb-0">
                      <User size={20} className="me-2" />
                      Patient Information
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6">
                        <dl className="row mb-0">
                          <dt className="col-sm-5">Full Name:</dt>
                          <dd className="col-sm-7">{patient?.name}</dd>

                          <dt className="col-sm-5">Date of Birth:</dt>
                          <dd className="col-sm-7">
                            {patient?.date_of_birth || 'Not recorded'}
                          </dd>

                          <dt className="col-sm-5">Blood Type:</dt>
                          <dd className="col-sm-7">
                            <span className="badge bg-danger">
                              {medicalCard?.medical_card?.blood_type || patient?.blood_type || 'Unknown'}
                            </span>
                          </dd>

                          <dt className="col-sm-5">Gender:</dt>
                          <dd className="col-sm-7">
                            {patient?.gender || 'Not specified'}
                          </dd>
                        </dl>
                      </div>
                      <div className="col-md-6">
                        <dl className="row mb-0">
                          <dt className="col-sm-5">{isStaff ? 'Staff No:' : 'Student ID:'}</dt>
                          <dd className="col-sm-7">
                            {isStaff ? patient?.staff_no : patient?.student_id}
                          </dd>

                          <dt className="col-sm-5">Department:</dt>
                          <dd className="col-sm-7">{patient?.department}</dd>

                          <dt className="col-sm-5">Email:</dt>
                          <dd className="col-sm-7">{patient?.email}</dd>

                          <dt className="col-sm-5">Phone:</dt>
                          <dd className="col-sm-7">{patient?.phone || 'Not recorded'}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="card mb-3">
                  <div className="card-header bg-light">
                    <h5 className="mb-0">
                      <AlertCircle size={20} className="me-2 text-danger" />
                      Emergency Contact
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6">
                        <dl className="row mb-0">
                          <dt className="col-sm-5">Name:</dt>
                          <dd className="col-sm-7">
                            {medicalCard?.medical_card?.emergency_contact?.name || 
                             patient?.emergency_contact_name || 'Not recorded'}
                          </dd>

                          <dt className="col-sm-5">Relationship:</dt>
                          <dd className="col-sm-7">
                            {medicalCard?.medical_card?.emergency_contact?.relationship ||
                             patient?.emergency_contact_relationship || 'Not recorded'}
                          </dd>
                        </dl>
                      </div>
                      <div className="col-md-6">
                        <dl className="row mb-0">
                          <dt className="col-sm-5">Phone:</dt>
                          <dd className="col-sm-7">
                            {medicalCard?.medical_card?.emergency_contact?.phone ||
                             patient?.emergency_contact_phone || 'Not recorded'}
                          </dd>

                          <dt className="col-sm-5">Email:</dt>
                          <dd className="col-sm-7">
                            {medicalCard?.medical_card?.emergency_contact?.email ||
                             patient?.emergency_contact_email || 'Not recorded'}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Medical History */}
                <div className="card mb-3">
                  <div className="card-header bg-light">
                    <h5 className="mb-0">
                      <FileText size={20} className="me-2" />
                      Medical History
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6">
                        <h6 className="text-primary">Allergies</h6>
                        <p className="text-muted">
                          {medicalCard?.medical_card?.allergies?.length > 0
                            ? medicalCard.medical_card.allergies.join(', ')
                            : patient?.allergies || 'No known allergies'}
                        </p>

                        <h6 className="text-primary mt-3">Current Medications</h6>
                        <p className="text-muted">
                          {medicalCard?.medical_card?.current_medications?.length > 0
                            ? medicalCard.medical_card.current_medications.join(', ')
                            : 'None'}
                        </p>
                      </div>
                      <div className="col-md-6">
                        <h6 className="text-primary">Previous Conditions</h6>
                        <p className="text-muted">
                          {medicalCard?.medical_card?.previous_conditions?.length > 0
                            ? medicalCard.medical_card.previous_conditions.join(', ')
                            : patient?.medical_history || 'No previous conditions recorded'}
                        </p>

                        <h6 className="text-primary mt-3">Family History</h6>
                        <p className="text-muted">
                          {medicalCard?.medical_card?.family_history?.length > 0
                            ? medicalCard.medical_card.family_history.join(', ')
                            : 'No family history recorded'}
                        </p>
                      </div>
                    </div>
                    
                    {patient?.addictions && (
                      <div className="mt-3">
                        <h6 className="text-primary">Addictions</h6>
                        <p className="text-muted">{patient.addictions}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Insurance Information */}
                {medicalCard?.medical_card?.insurance_info && (
                  <div className="card">
                    <div className="card-header bg-light">
                      <h5 className="mb-0">
                        <FileText size={20} className="me-2" />
                        Insurance Information
                      </h5>
                    </div>
                    <div className="card-body">
                      <dl className="row mb-0">
                        <dt className="col-sm-3">Provider:</dt>
                        <dd className="col-sm-3">{medicalCard.medical_card.insurance_info.provider || 'N/A'}</dd>

                        <dt className="col-sm-3">Policy Number:</dt>
                        <dd className="col-sm-3">{medicalCard.medical_card.insurance_info.policy_number || 'N/A'}</dd>

                        <dt className="col-sm-3">Expiry Date:</dt>
                        <dd className="col-sm-3">{medicalCard.medical_card.insurance_info.expiry || 'N/A'}</dd>
                      </dl>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Latest Vitals Section */}
            {activeSection === 'vitals' && (
              <div>
                {latestVitals ? (
                  <div>
                    <div className="alert alert-info d-flex align-items-center mb-4">
                      <Activity size={20} className="me-2" />
                      <div>
                        <strong>Most Recent Reading</strong>
                        <small className="d-block">
                          Recorded on {new Date(latestVitals.date).toLocaleString()} by {latestVitals.recorded_by}
                        </small>
                      </div>
                    </div>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <div className="card h-100">
                          <div className="card-body text-center">
                            <Heart size={32} className="text-danger mb-2" />
                            <h3 className="mb-1">{latestVitals.blood_pressure}</h3>
                            <p className="text-muted mb-0">Blood Pressure (mmHg)</p>
                            {latestVitals.alerts.some((a: any) => a.type.includes('BLOOD_PRESSURE')) && (
                              <span className="badge bg-warning text-dark mt-2">Abnormal</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="card h-100">
                          <div className="card-body text-center">
                            <Activity size={32} className="text-success mb-2" />
                            <h3 className="mb-1">{latestVitals.heart_rate} bpm</h3>
                            <p className="text-muted mb-0">Heart Rate</p>
                            {latestVitals.alerts.some((a: any) => a.type.includes('HEART_RATE')) && (
                              <span className="badge bg-warning text-dark mt-2">Abnormal</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="col-md-4">
                        <div className="card h-100">
                          <div className="card-body text-center">
                            <TrendingUp size={28} className="text-warning mb-2" />
                            <h4 className="mb-1">{latestVitals.temperature}</h4>
                            <p className="text-muted mb-0">Temperature</p>
                            {latestVitals.alerts.some((a: any) => a.type === 'FEVER' || a.type === 'HYPOTHERMIA') && (
                              <span className="badge bg-danger mt-2">Alert</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {latestVitals.respiratory_rate && (
                        <div className="col-md-4">
                          <div className="card h-100">
                            <div className="card-body text-center">
                              <Activity size={28} className="text-info mb-2" />
                              <h4 className="mb-1">{latestVitals.respiratory_rate}</h4>
                              <p className="text-muted mb-0">Resp. Rate (breaths/min)</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {latestVitals.oxygen_saturation && (
                        <div className="col-md-4">
                          <div className="card h-100">
                            <div className="card-body text-center">
                              <Activity size={28} className="text-primary mb-2" />
                              <h4 className="mb-1">{latestVitals.oxygen_saturation}%</h4>
                              <p className="text-muted mb-0">Oxygen Saturation</p>
                              {latestVitals.alerts.some((a: any) => a.type === 'LOW_OXYGEN') && (
                                <span className="badge bg-danger mt-2">Critical</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {latestVitals.alerts.length > 0 && (
                      <div className="alert alert-warning mt-4">
                        <h6 className="alert-heading">
                          <AlertCircle size={20} className="me-2" />
                          Health Alerts
                        </h6>
                        <ul className="mb-0">
                          {latestVitals.alerts.map((alert: any, idx: number) => (
                            <li key={idx}>
                              <strong>{alert.type}:</strong> {alert.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-5 text-muted">
                    <Heart size={48} className="mb-3" />
                    <p>No vital signs recorded yet</p>
                  </div>
                )}
              </div>
            )}

            {/* Vitals History Section */}
            {activeSection === 'history' && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5>
                    <Clock size={20} className="me-2" />
                    Vital Signs History (Last 30 Days)
                  </h5>
                  <span className="badge bg-primary">{vitalsHistory.length} Records</span>
                </div>

                {vitalsHistory.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <Calendar size={48} className="mb-3" />
                    <p>No vitals history available</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle">
                      <thead className="table-light">
                        <tr>
                          <th>Date & Time</th>
                          <th>BP</th>
                          <th>HR</th>
                          <th>Temp</th>
                          <th>Resp</th>
                          <th>SpO2</th>
                          <th>Recorded By</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vitalsHistory.map((vital, idx) => (
                          <tr key={idx}>
                            <td>
                              <small>{new Date(vital.date).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}</small>
                            </td>
                            <td>
                              <Heart size={14} className="me-1 text-danger" />
                              {vital.blood_pressure}
                            </td>
                            <td>
                              <Activity size={14} className="me-1 text-success" />
                              {vital.heart_rate}
                            </td>
                            <td>
                              <TrendingUp size={14} className="me-1 text-warning" />
                              {vital.temperature}
                            </td>
                            <td>{vital.respiratory_rate || '-'}</td>
                            <td>{vital.oxygen_saturation ? `${vital.oxygen_saturation}%` : '-'}</td>
                            <td>
                              <small className="text-muted">{vital.recorded_by}</small>
                            </td>
                            <td>
                              {vital.alerts.length > 0 ? (
                                <span className="badge bg-warning text-dark">
                                  <AlertCircle size={12} className="me-1" />
                                  {vital.alerts.length} Alert{vital.alerts.length > 1 ? 's' : ''}
                                </span>
                              ) : (
                                <span className="badge bg-success">Normal</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="modal-footer border-0">
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedMedicalCardViewer;