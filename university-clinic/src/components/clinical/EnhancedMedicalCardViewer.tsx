import React, { useState, useEffect } from 'react';
import { User, Heart, Activity, FileText, Clock, AlertCircle, TrendingUp, Calendar } from 'lucide-react';

interface MedicalCardViewerProps {
  patientId: string | number;
  onClose: () => void;
  authToken: string;
  apiBaseUrl: string;
  userRole?: 'doctor' | 'clinical_staff' | 'nurse'; // ✅ ADD THIS
}

const EnhancedMedicalCardViewer: React.FC<MedicalCardViewerProps> = ({
  patientId,
  onClose,
  authToken,
  apiBaseUrl,
  userRole = 'clinical_staff' // ✅ DEFAULT TO CLINICAL_STAFF
}) => {
  const [medicalCard, setMedicalCard] = useState<any>(null);
  const [vitalsHistory, setVitalsHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // ✅ ADD ERROR STATE
  const [activeSection, setActiveSection] = useState<'info' | 'vitals' | 'history'>('info');

  // MOBILE: Detect mobile device
  const isMobile = window.innerWidth < 768;

  // ✅ DETERMINE CORRECT ENDPOINT PREFIX BASED ON USER ROLE
  const getEndpointPrefix = () => {
    switch (userRole) {
      case 'doctor':
        return `${apiBaseUrl}/api/doctor`;
      case 'nurse':
      case 'clinical_staff':
      default:
        return `${apiBaseUrl}/api/clinical`;
    }
  };

  const endpointPrefix = getEndpointPrefix();

  useEffect(() => {
    loadMedicalCard();
    loadVitalsHistory();
  }, [patientId, endpointPrefix]); // ✅ ADD endpointPrefix TO DEPENDENCIES

  const loadMedicalCard = async () => {
    try {
      setError(null); // ✅ RESET ERROR
      const response = await fetch(
        `${endpointPrefix}/patients/${patientId}/medical-card`, // ✅ USE DYNAMIC ENDPOINT
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to load medical card');
      }

      const data = await response.json();
      setMedicalCard(data);
    } catch (error) {
      console.error('Error loading medical card:', error);
      setError(error instanceof Error ? error.message : 'Failed to load medical card');
    }
  };

  const loadVitalsHistory = async () => {
    try {
      const response = await fetch(
        `${endpointPrefix}/patients/${patientId}/vitals-history?days=30`, // ✅ USE DYNAMIC ENDPOINT
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load vitals history');
      }

      const data = await response.json();
      setVitalsHistory(data.vital_signs_history || []);
    } catch (error) {
      console.error('Error loading vitals history:', error);
      // Don't set error state here - vitals history is optional
    } finally {
      setLoading(false);
    }
  };

  // ✅ ADD ERROR STATE DISPLAY
  if (error) {
    return (
      <div 
        className="modal fade show d-block medical-card-modal" 
        style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div 
          className="modal-dialog"
          style={{
            margin: isMobile ? '0' : '1.75rem auto',
            maxWidth: isMobile ? '100%' : '600px',
          }}
        >
          <div 
            className="modal-content" 
            style={{ borderRadius: isMobile ? '0' : '1rem' }}
          >
            <div className="modal-header bg-danger text-white">
              <h5 className="modal-title">
                <AlertCircle size={20} className="me-2" />
                Error Loading Medical Card
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
              />
            </div>
            <div className="modal-body p-4">
              <div className="alert alert-danger mb-0">
                <strong>Error:</strong> {error}
              </div>
              <p className="text-muted mt-3 mb-0">
                Please try again later or contact support if the problem persists.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  loadMedicalCard();
                  loadVitalsHistory();
                }}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div 
        className="modal fade show d-block medical-card-modal" 
        style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div 
          className="modal-dialog modal-dialog-scrollable"
          style={{
            margin: isMobile ? '0' : '1.75rem auto',
            maxWidth: isMobile ? '100%' : '1140px',
            height: isMobile ? '100vh' : 'auto',
            maxHeight: isMobile ? '100vh' : 'calc(100vh - 3.5rem)'
          }}
        >
          <div 
            className="modal-content" 
            style={{ 
              borderRadius: isMobile ? '0' : '1rem',
              height: isMobile ? '100vh' : 'auto'
            }}
          >
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
    <div 
      className="modal fade show d-block medical-card-modal" 
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="modal-dialog modal-dialog-scrollable"
        style={{
          margin: isMobile ? '0' : '1.75rem auto',
          maxWidth: isMobile ? '100%' : '1140px',
          height: isMobile ? '100vh' : 'auto',
          maxHeight: isMobile ? '100vh' : 'calc(100vh - 3.5rem)'
        }}
      >
        <div 
          className="modal-content" 
          style={{ 
            borderRadius: isMobile ? '0' : '1rem',
            height: isMobile ? '100vh' : 'auto'
          }}
        >
          {/* Header */}
          <div 
            className="modal-header border-0" 
            style={{ 
              background: 'linear-gradient(135deg, #db5858ff 0%, #e94848ff 100%)',
              padding: isMobile ? '14px 16px' : '16px 24px',
              flexShrink: 0
            }}
          >
            <div className="text-white" style={{ flex: 1, minWidth: 0 }}>
              <h4 
                className="modal-title mb-1 d-flex align-items-center"
                style={{ fontSize: isMobile ? '1.1rem' : '1.5rem' }}
              >
                <User size={isMobile ? 20 : 24} className="me-2 flex-shrink-0" />
                <span style={{ 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap' 
                }}>
                  Medical Card - {patient?.name}
                </span>
              </h4>
              <small className="opacity-75" style={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
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
              style={{
                width: isMobile ? '36px' : '44px',
                height: isMobile ? '36px' : '44px',
                flexShrink: 0
              }}
            />
          </div>

          {/* Navigation Tabs */}
          <ul 
            className="nav nav-tabs px-3 pt-3 border-0"
            style={{ 
              flexShrink: 0,
              overflowX: 'auto',
              whiteSpace: 'nowrap'
            }}
          >
            <li className="nav-item">
              <button
                className={`nav-link ${activeSection === 'info' ? 'active' : ''}`}
                onClick={() => setActiveSection('info')}
                style={{ fontSize: isMobile ? '0.85rem' : '1rem' }}
              >
                <User size={isMobile ? 14 : 16} className="me-1" />
                Basic Info
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeSection === 'vitals' ? 'active' : ''}`}
                onClick={() => setActiveSection('vitals')}
                style={{ fontSize: isMobile ? '0.85rem' : '1rem' }}
              >
                <Heart size={isMobile ? 14 : 16} className="me-1" />
                Latest Vitals
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeSection === 'history' ? 'active' : ''}`}
                onClick={() => setActiveSection('history')}
                style={{ fontSize: isMobile ? '0.85rem' : '1rem' }}
              >
                <Clock size={isMobile ? 14 : 16} className="me-1" />
                Vitals History
              </button>
            </li>
          </ul>

          {/* Body - SCROLLABLE */}
          <div 
            className="modal-body" 
            style={{ 
              padding: isMobile ? '12px 16px' : '24px',
              overflowY: 'auto',
              flex: 1,
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {/* Basic Information Section */}
            {activeSection === 'info' && (
              <div>
                {/* Patient Demographics */}
                <div className="card mb-3 shadow-sm border-0">
                  <div 
                    className="card-header bg-light"
                    style={{ padding: isMobile ? '10px 12px' : '12px 16px' }}
                  >
                    <h5 
                      className="mb-0 d-flex align-items-center"
                      style={{ fontSize: isMobile ? '0.95rem' : '1.125rem' }}
                    >
                      <User size={isMobile ? 16 : 20} className="me-2" />
                      Patient Information
                    </h5>
                  </div>
                  <div 
                    className="card-body"
                    style={{ padding: isMobile ? '12px' : '16px' }}
                  >
                    <div className="row">
                      <div className="col-md-6">
                        <dl className="row mb-0" style={{ fontSize: isMobile ? '0.85rem' : '1rem' }}>
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
                        <dl className="row mb-0" style={{ fontSize: isMobile ? '0.85rem' : '1rem' }}>
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
                <div className="card mb-3 shadow-sm border-0">
                  <div 
                    className="card-header bg-light"
                    style={{ padding: isMobile ? '10px 12px' : '12px 16px' }}
                  >
                    <h5 
                      className="mb-0 d-flex align-items-center"
                      style={{ fontSize: isMobile ? '0.95rem' : '1.125rem' }}
                    >
                      <AlertCircle size={isMobile ? 16 : 20} className="me-2 text-danger" />
                      Emergency Contact
                    </h5>
                  </div>
                  <div 
                    className="card-body"
                    style={{ padding: isMobile ? '12px' : '16px' }}
                  >
                    <div className="row">
                      <div className="col-md-6">
                        <dl className="row mb-0" style={{ fontSize: isMobile ? '0.85rem' : '1rem' }}>
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
                        <dl className="row mb-0" style={{ fontSize: isMobile ? '0.85rem' : '1rem' }}>
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
                <div className="card mb-3 shadow-sm border-0">
                  <div 
                    className="card-header bg-light"
                    style={{ padding: isMobile ? '10px 12px' : '12px 16px' }}
                  >
                    <h5 
                      className="mb-0 d-flex align-items-center"
                      style={{ fontSize: isMobile ? '0.95rem' : '1.125rem' }}
                    >
                      <FileText size={isMobile ? 16 : 20} className="me-2" />
                      Medical History
                    </h5>
                  </div>
                  <div 
                    className="card-body"
                    style={{ padding: isMobile ? '12px' : '16px' }}
                  >
                    <div className="row">
                      <div className="col-md-6">
                        <h6 
                          className="text-primary"
                          style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}
                        >
                          Allergies
                        </h6>
                        <p 
                          className="text-muted"
                          style={{ fontSize: isMobile ? '0.85rem' : '1rem' }}
                        >
                          {medicalCard?.medical_card?.allergies?.length > 0
                            ? medicalCard.medical_card.allergies.join(', ')
                            : patient?.allergies || 'No known allergies'}
                        </p>

                        <h6 
                          className="text-primary mt-3"
                          style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}
                        >
                          Current Medications
                        </h6>
                        <p 
                          className="text-muted"
                          style={{ fontSize: isMobile ? '0.85rem' : '1rem' }}
                        >
                          {medicalCard?.medical_card?.current_medications?.length > 0
                            ? medicalCard.medical_card.current_medications.join(', ')
                            : 'None'}
                        </p>
                      </div>
                      <div className="col-md-6">
                        <h6 
                          className="text-primary"
                          style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}
                        >
                          Previous Conditions
                        </h6>
                        <p 
                          className="text-muted"
                          style={{ fontSize: isMobile ? '0.85rem' : '1rem' }}
                        >
                          {medicalCard?.medical_card?.previous_conditions?.length > 0
                            ? medicalCard.medical_card.previous_conditions.join(', ')
                            : patient?.medical_history || 'No previous conditions recorded'}
                        </p>

                        <h6 
                          className="text-primary mt-3"
                          style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}
                        >
                          Family History
                        </h6>
                        <p 
                          className="text-muted"
                          style={{ fontSize: isMobile ? '0.85rem' : '1rem' }}
                        >
                          {medicalCard?.medical_card?.family_history?.length > 0
                            ? medicalCard.medical_card.family_history.join(', ')
                            : 'No family history recorded'}
                        </p>
                      </div>
                    </div>
                    
                    {patient?.addictions && (
                      <div className="mt-3">
                        <h6 
                          className="text-primary"
                          style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}
                        >
                          Addictions
                        </h6>
                        <p 
                          className="text-muted"
                          style={{ fontSize: isMobile ? '0.85rem' : '1rem' }}
                        >
                          {patient.addictions}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Insurance Information */}
                {medicalCard?.medical_card?.insurance_info && (
                  <div className="card shadow-sm border-0">
                    <div 
                      className="card-header bg-light"
                      style={{ padding: isMobile ? '10px 12px' : '12px 16px' }}
                    >
                      <h5 
                        className="mb-0 d-flex align-items-center"
                        style={{ fontSize: isMobile ? '0.95rem' : '1.125rem' }}
                      >
                        <FileText size={isMobile ? 16 : 20} className="me-2" />
                        Insurance Information
                      </h5>
                    </div>
                    <div 
                      className="card-body"
                      style={{ padding: isMobile ? '12px' : '16px' }}
                    >
                      <dl className="row mb-0" style={{ fontSize: isMobile ? '0.85rem' : '1rem' }}>
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
                    <div 
                      className="alert alert-info d-flex align-items-center mb-4"
                      style={{ 
                        padding: isMobile ? '12px' : '16px',
                        fontSize: isMobile ? '0.85rem' : '1rem'
                      }}
                    >
                      <Activity size={isMobile ? 16 : 20} className="me-2" />
                      <div>
                        <strong>Most Recent Reading</strong>
                        <small className="d-block">
                          Recorded on {new Date(latestVitals.date).toLocaleString()} by {latestVitals.recorded_by}
                        </small>
                      </div>
                    </div>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <div className="card h-100 shadow-sm border-0">
                          <div 
                            className="card-body text-center"
                            style={{ padding: isMobile ? '14px' : '20px' }}
                          >
                            <Heart size={isMobile ? 28 : 32} className="text-danger mb-2" />
                            <h3 
                              className="mb-1"
                              style={{ fontSize: isMobile ? '1.5rem' : '2rem' }}
                            >
                              {latestVitals.blood_pressure}
                            </h3>
                            <p 
                              className="text-muted mb-0"
                              style={{ fontSize: isMobile ? '0.85rem' : '1rem' }}
                            >
                              Blood Pressure (mmHg)
                            </p>
                            {latestVitals.alerts.some((a: any) => a.type.includes('BLOOD_PRESSURE')) && (
                              <span className="badge bg-warning text-dark mt-2">Abnormal</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="card h-100 shadow-sm border-0">
                          <div 
                            className="card-body text-center"
                            style={{ padding: isMobile ? '14px' : '20px' }}
                          >
                            <Activity size={isMobile ? 28 : 32} className="text-success mb-2" />
                            <h3 
                              className="mb-1"
                              style={{ fontSize: isMobile ? '1.5rem' : '2rem' }}
                            >
                              {latestVitals.heart_rate} bpm
                            </h3>
                            <p 
                              className="text-muted mb-0"
                              style={{ fontSize: isMobile ? '0.85rem' : '1rem' }}
                            >
                              Heart Rate
                            </p>
                            {latestVitals.alerts.some((a: any) => a.type.includes('HEART_RATE')) && (
                              <span className="badge bg-warning text-dark mt-2">Abnormal</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="col-md-4">
                        <div className="card h-100 shadow-sm border-0">
                          <div 
                            className="card-body text-center"
                            style={{ padding: isMobile ? '14px' : '20px' }}
                          >
                            <TrendingUp size={isMobile ? 24 : 28} className="text-warning mb-2" />
                            <h4 
                              className="mb-1"
                              style={{ fontSize: isMobile ? '1.25rem' : '1.5rem' }}
                            >
                              {latestVitals.temperature}
                            </h4>
                            <p 
                              className="text-muted mb-0"
                              style={{ fontSize: isMobile ? '0.85rem' : '1rem' }}
                            >
                              Temperature
                            </p>
                            {latestVitals.alerts.some((a: any) => a.type === 'FEVER' || a.type === 'HYPOTHERMIA') && (
                              <span className="badge bg-danger mt-2">Alert</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {latestVitals.respiratory_rate && (
                        <div className="col-md-4">
                          <div className="card h-100 shadow-sm border-0">
                            <div 
                              className="card-body text-center"
                              style={{ padding: isMobile ? '14px' : '20px' }}
                            >
                              <Activity size={isMobile ? 24 : 28} className="text-info mb-2" />
                              <h4 
                                className="mb-1"
                                style={{ fontSize: isMobile ? '1.25rem' : '1.5rem' }}
                              >
                                {latestVitals.respiratory_rate}
                              </h4>
                              <p 
                                className="text-muted mb-0"
                                style={{ fontSize: isMobile ? '0.85rem' : '1rem' }}
                              >
                                Resp. Rate (breaths/min)
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {latestVitals.oxygen_saturation && (
                        <div className="col-md-4">
                          <div className="card h-100 shadow-sm border-0">
                            <div 
                              className="card-body text-center"
                              style={{ padding: isMobile ? '14px' : '20px' }}
                            >
                              <Activity size={isMobile ? 24 : 28} className="text-primary mb-2" />
                              <h4 
                                className="mb-1"
                                style={{ fontSize: isMobile ? '1.25rem' : '1.5rem' }}
                              >
                                {latestVitals.oxygen_saturation}%
                              </h4>
                              <p 
                                className="text-muted mb-0"
                                style={{ fontSize: isMobile ? '0.85rem' : '1rem' }}
                              >
                                Oxygen Saturation
                              </p>
                              {latestVitals.alerts.some((a: any) => a.type === 'LOW_OXYGEN') && (
                                <span className="badge bg-danger mt-2">Critical</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {latestVitals.alerts.length > 0 && (
                      <div 
                        className="alert alert-warning mt-4"
                        style={{ 
                          padding: isMobile ? '12px' : '16px',
                          fontSize: isMobile ? '0.85rem' : '1rem'
                        }}
                      >
                        <h6 
                          className="alert-heading"
                          style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}
                        >
                          <AlertCircle size={isMobile ? 16 : 20} className="me-2" />
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
                    <Heart size={isMobile ? 40 : 48} className="mb-3" />
                    <p style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
                      No vital signs recorded yet
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Vitals History Section */}
            {activeSection === 'history' && (
              <div>
                <div 
                  className="d-flex justify-content-between align-items-center mb-3"
                  style={{ 
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: isMobile ? '10px' : '0',
                    alignItems: isMobile ? 'flex-start' : 'center'
                  }}
                >
                  <h5 
                    className="d-flex align-items-center"
                    style={{ 
                      fontSize: isMobile ? '1rem' : '1.25rem',
                      marginBottom: 0
                    }}
                  >
                    <Clock size={isMobile ? 16 : 20} className="me-2" />
                    Vital Signs History (Last 30 Days)
                  </h5>
                  <span className="badge bg-primary">
                    {vitalsHistory.length} Records
                  </span>
                </div>

                {vitalsHistory.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <Calendar size={isMobile ? 40 : 48} className="mb-3" />
                    <p style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
                      No vitals history available
                    </p>
                  </div>
                ) : (
                  <div className="card shadow-sm border-0">
                    <div className="card-body p-0">
                      <div 
                        className="table-responsive"
                        style={{
                          marginLeft: isMobile ? '-16px' : '0',
                          marginRight: isMobile ? '-16px' : '0',
                          paddingLeft: isMobile ? '16px' : '0',
                          paddingRight: isMobile ? '16px' : '0',
                          maxHeight: isMobile ? '400px' : '500px',
                          overflowY: 'auto',
                          overflowX: 'auto'
                        }}
                      >
                        <table 
                          className="table table-hover align-middle mb-0"
                          style={{
                            fontSize: isMobile ? '0.75rem' : '0.875rem',
                            minWidth: isMobile ? '700px' : 'auto'
                          }}
                        >
                          <thead className="table-light">
                            <tr>
                              <th style={{ padding: isMobile ? '8px 6px' : '12px' }}>Date & Time</th>
                              <th style={{ padding: isMobile ? '8px 6px' : '12px' }}>BP</th>
                              <th style={{ padding: isMobile ? '8px 6px' : '12px' }}>HR</th>
                              <th style={{ padding: isMobile ? '8px 6px' : '12px' }}>Temp</th>
                              <th style={{ padding: isMobile ? '8px 6px' : '12px' }}>Resp</th>
                              <th style={{ padding: isMobile ? '8px 6px' : '12px' }}>SpO2</th>
                              <th style={{ padding: isMobile ? '8px 6px' : '12px' }}>By</th>
                              <th style={{ padding: isMobile ? '8px 6px' : '12px' }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {vitalsHistory.map((vital, idx) => (
                              <tr key={idx}>
                                <td style={{ padding: isMobile ? '8px 6px' : '12px' }}>
                                  <Clock size={12} className="me-1 text-muted" />
                                  <small style={{ fontSize: isMobile ? '0.7rem' : '0.8rem' }}>
                                    {new Date(vital.date).toLocaleString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </small>
                                </td>
                                <td style={{ padding: isMobile ? '8px 6px' : '12px' }}>
                                  <Heart size={12} className="me-1 text-danger" />
                                  <strong>{vital.blood_pressure}</strong>
                                </td>
                                <td style={{ padding: isMobile ? '8px 6px' : '12px' }}>
                                  <Activity size={12} className="me-1 text-success" />
                                  <strong>{vital.heart_rate}</strong>
                                </td>
                                <td style={{ padding: isMobile ? '8px 6px' : '12px' }}>
                                  <TrendingUp size={12} className="me-1 text-warning" />
                                  <strong>{vital.temperature}</strong>
                                </td>
                                <td style={{ padding: isMobile ? '8px 6px' : '12px' }}>
                                  {vital.respiratory_rate || '-'}
                                </td>
                                <td style={{ padding: isMobile ? '8px 6px' : '12px' }}>
                                  {vital.oxygen_saturation ? `${vital.oxygen_saturation}%` : '-'}
                                </td>
                                <td style={{ padding: isMobile ? '8px 6px' : '12px' }}>
                                  <small 
                                    className="text-muted"
                                    style={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}
                                  >
                                    {vital.recorded_by}
                                  </small>
                                </td>
                                <td style={{ padding: isMobile ? '8px 6px' : '12px' }}>
                                  {vital.alerts.length > 0 ? (
                                    <span 
                                      className="badge bg-warning text-dark"
                                      style={{ fontSize: isMobile ? '0.65rem' : '0.7rem' }}
                                    >
                                      <AlertCircle size={10} className="me-1" />
                                      {vital.alerts.length} Alert{vital.alerts.length > 1 ? 's' : ''}
                                    </span>
                                  ) : (
                                    <span 
                                      className="badge bg-success"
                                      style={{ fontSize: isMobile ? '0.65rem' : '0.7rem' }}
                                    >
                                      Normal
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div 
            className="modal-footer border-0 bg-light"
            style={{ 
              padding: isMobile ? '10px 16px' : '12px 24px',
              flexShrink: 0
            }}
          >
            <button 
              className="btn btn-secondary" 
              onClick={onClose}
              style={{
                fontSize: isMobile ? '0.85rem' : '1rem',
                padding: isMobile ? '8px 16px' : '10px 20px',
                minHeight: isMobile ? '38px' : '44px'
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedMedicalCardViewer;