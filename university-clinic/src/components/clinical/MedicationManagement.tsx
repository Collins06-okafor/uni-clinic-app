import React, { useState, useEffect } from 'react';
import { Pill, Clock, User, AlertCircle, CheckCircle, Plus, FileText, Search, X } from 'lucide-react';
import Select from 'react-select';

interface Medication {
  id: string | number;
  patient_id: string | number;
  patient_name: string;
  medication_name: string;
  dosage: string;
  route: string;
  frequency?: string;
  prescribing_doctor: string;
  prescribed_date: string;
  status: 'pending' | 'administered' | 'completed';
  notes?: string;
}

interface Patient {
  id: string | number;
  name: string;
  student_id?: string;
  staff_no?: string;
}

interface MedicationManagementProps {
  onClose: () => void;
  authToken: string;
  apiBaseUrl: string;
  currentUser: any;
  patients: Patient[];
}

const MedicationManagement: React.FC<MedicationManagementProps> = ({
  onClose,
  authToken,
  apiBaseUrl,
  currentUser,
  patients
}) => {
  // MOBILE: Detect mobile device
  const isMobile = window.innerWidth < 768;

  const [prescribedMeds, setPrescribedMeds] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'prescribed' | 'administer'>('prescribed');
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
  const [showAdministerModal, setShowAdministerModal] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string }>({ type: '', text: '' });
  const [searchTerm, setSearchTerm] = useState('');

  // Form state for minor treatments
  const [minorTreatmentForm, setMinorTreatmentForm] = useState({
    patient_id: '',
    medication_name: '',
    dosage: '',
    route: 'oral',
    reason: '',
    notes: ''
  });

  // Prepare options for react-select
  const patientOptions = patients.map(patient => ({
    value: patient.id.toString(),
    label: `${patient.name} (${patient.student_id || patient.staff_no || patient.id})`
  }));

  const routeOptions = [
    { value: 'oral', label: 'Oral' },
    { value: 'topical', label: 'Topical' },
    { value: 'injection', label: 'Injection' },
    { value: 'other', label: 'Other' }
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
    }),
    menuPortal: (base: any) => ({ 
      ...base, 
      zIndex: 9999 
    })
  };

  useEffect(() => {
    loadPrescribedMedications();
  }, []);

  const loadPrescribedMedications = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching medications from:', `${apiBaseUrl}/api/clinical/medications/prescribed`);
      console.log('🔑 Auth token:', authToken ? 'Present' : 'Missing');
      
      const response = await fetch(`${apiBaseUrl}/api/clinical/medications/prescribed`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });

      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        throw new Error(`Failed to load medications: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Medications loaded:', data);
      
      setPrescribedMeds(data.medications || []);
      
      if (data.medications && data.medications.length > 0) {
        setMessage({ type: 'success', text: `Loaded ${data.medications.length} medications` });
        setTimeout(() => setMessage({ type: '', text: '' }), 2000);
      }
    } catch (error) {
      console.error('❌ Error loading medications:', error);
      setMessage({ 
        type: 'error', 
        text: `Failed to load medications: ${(error as Error).message}` 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } finally {
      setLoading(false);
    }
  };

  const administerMedication = async (medicationId: string | number) => {
    try {
      setLoading(true);
      const response = await fetch(
        `${apiBaseUrl}/api/clinical/medications/${medicationId}/administer`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            administered_by: currentUser.name,
            administered_at: new Date().toISOString()
          })
        }
      );

      if (!response.ok) throw new Error('Failed to administer medication');

      setMessage({ type: 'success', text: 'Medication administered successfully!' });
      loadPrescribedMedications();
      setShowAdministerModal(false);
      setSelectedMed(null);
      
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: (error as Error).message });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } finally {
      setLoading(false);
    }
  };

  const recordMinorTreatment = async () => {
    if (!minorTreatmentForm.patient_id || !minorTreatmentForm.medication_name || 
        !minorTreatmentForm.dosage || !minorTreatmentForm.reason) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(
        `${apiBaseUrl}/api/clinical/patients/${minorTreatmentForm.patient_id}/minor-treatment`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(minorTreatmentForm)
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to record treatment');
      }

      setMessage({ type: 'success', text: 'Minor treatment recorded successfully!' });
      loadPrescribedMedications();
      setMinorTreatmentForm({
        patient_id: '',
        medication_name: '',
        dosage: '',
        route: 'oral',
        reason: '',
        notes: ''
      });
      
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: (error as Error).message });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'administered':
        return 'bg-success';
      case 'pending':
        return 'bg-warning text-dark';
      case 'completed':
        return 'bg-secondary';
      default:
        return 'bg-info';
    }
  };

  const filteredMeds = prescribedMeds.filter(med =>
    med.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    med.medication_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div 
        className="modal fade show d-block medication-management-modal" 
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
                background: 'linear-gradient(135deg, #d45858ff 0%, #ce4242ff 100%)',
                padding: isMobile ? '14px 16px' : '16px 24px',
                flexShrink: 0
              }}
            >
              <div className="text-white" style={{ flex: 1, minWidth: 0 }}>
                <h4 
                  className="modal-title mb-1 d-flex align-items-center"
                  style={{ fontSize: isMobile ? '1.1rem' : '1.5rem' }}
                >
                  <Pill size={isMobile ? 20 : 24} className="me-2 flex-shrink-0" />
                  <span style={{ 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap' 
                  }}>
                    Medication Management
                  </span>
                </h4>
                {!isMobile && (
                  <small className="opacity-75" style={{ fontSize: '0.875rem' }}>
                    View prescribed medications and record treatments
                  </small>
                )}
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

            {/* Message Alert */}
            {message.text && (
              <div 
                className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} mx-3 mb-0 mt-3`}
                style={{
                  padding: isMobile ? '10px 12px' : '12px 16px',
                  fontSize: isMobile ? '0.85rem' : '1rem',
                  flexShrink: 0
                }}
              >
                {message.text}
              </div>
            )}

            {/* Tabs */}
            <ul 
              className="nav nav-tabs px-3 pt-3 border-0" 
              role="tablist"
              style={{ 
                fontSize: isMobile ? '0.875rem' : '1rem',
                flexShrink: 0,
                overflowX: 'auto',
                whiteSpace: 'nowrap'
              }}
            >
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'prescribed' ? 'active' : ''}`}
                  onClick={() => setActiveTab('prescribed')}
                  style={{ padding: isMobile ? '8px 12px' : '10px 16px' }}
                >
                  <FileText size={isMobile ? 12 : 14} className="me-1" />
                  {isMobile ? 'Prescribed' : 'Prescribed by Doctors'}
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'administer' ? 'active' : ''}`}
                  onClick={() => setActiveTab('administer')}
                  style={{ padding: isMobile ? '8px 12px' : '10px 16px' }}
                >
                  <Plus size={isMobile ? 12 : 14} className="me-1" />
                  {isMobile ? 'Record' : 'Record Minor Treatment'}
                </button>
              </li>
            </ul>

            {/* Body - SCROLLABLE */}
            <div 
              className="modal-body"
              style={{ 
                padding: isMobile ? '12px 16px' : '16px 24px',
                overflowY: 'auto',
                flex: 1,
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {/* Prescribed Medications Tab */}
              {activeTab === 'prescribed' && (
                <div>
                  <div className="mb-3">
                    <div 
                      className="d-flex justify-content-between align-items-center mb-3"
                      style={{ 
                        flexDirection: isMobile ? 'column' : 'row',
                        gap: isMobile ? '10px' : '0',
                        alignItems: isMobile ? 'flex-start' : 'center'
                      }}
                    >
                      <h5 
                        className="mb-0"
                        style={{ fontSize: isMobile ? '1rem' : '1.25rem' }}
                      >
                        {isMobile ? 'Prescribed Medications' : 'Medications Prescribed by Doctors'}
                      </h5>
                      <span className="badge bg-primary">
                        {prescribedMeds.filter(m => m.status === 'pending').length} Pending
                      </span>
                    </div>
                    
                    {/* Search */}
                    <div className="input-group">
                      <span className="input-group-text">
                        <Search size={16} />
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search patient or medication..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                          fontSize: isMobile ? '16px' : '14px',
                          padding: isMobile ? '10px 12px' : '8px 12px'
                        }}
                      />
                      {searchTerm && (
                        <button 
                          className="btn btn-outline-secondary"
                          onClick={() => setSearchTerm('')}
                          type="button"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {loading ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : filteredMeds.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      <Pill size={isMobile ? 40 : 48} className="mb-3" />
                      <p style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
                        {searchTerm ? 'No medications found matching your search' : 'No prescribed medications found'}
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
                              minWidth: isMobile ? '900px' : 'auto'
                            }}
                          >
                            <thead className="table-light">
                              <tr>
                                <th style={{ padding: isMobile ? '8px 6px' : '12px' }}>Patient</th>
                                <th style={{ padding: isMobile ? '8px 6px' : '12px' }}>Medication</th>
                                <th style={{ padding: isMobile ? '8px 6px' : '12px' }}>Dosage</th>
                                <th style={{ padding: isMobile ? '8px 6px' : '12px' }}>Route</th>
                                <th style={{ padding: isMobile ? '8px 6px' : '12px' }}>Frequency</th>
                                <th style={{ padding: isMobile ? '8px 6px' : '12px' }}>Prescribed By</th>
                                <th style={{ padding: isMobile ? '8px 6px' : '12px' }}>Date</th>
                                <th style={{ padding: isMobile ? '8px 6px' : '12px' }}>Status</th>
                                <th style={{ padding: isMobile ? '8px 6px' : '12px' }}>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredMeds.map((med) => (
                                <tr key={med.id}>
                                  <td style={{ padding: isMobile ? '8px 6px' : '12px' }}>
                                    <strong>{med.patient_name}</strong>
                                  </td>
                                  <td style={{ padding: isMobile ? '8px 6px' : '12px' }}>
                                    <Pill size={12} className="me-1 text-primary" />
                                    {med.medication_name}
                                  </td>
                                  <td style={{ padding: isMobile ? '8px 6px' : '12px' }}>
                                    {med.dosage}
                                  </td>
                                  <td style={{ padding: isMobile ? '8px 6px' : '12px' }}>
                                    <span className="badge bg-info text-dark" style={{ fontSize: isMobile ? '0.65rem' : '0.7rem' }}>
                                      {med.route}
                                    </span>
                                  </td>
                                  <td style={{ padding: isMobile ? '8px 6px' : '12px' }}>
                                    {med.frequency || 'As prescribed'}
                                  </td>
                                  <td style={{ padding: isMobile ? '8px 6px' : '12px' }}>
                                    <User size={12} className="me-1" />
                                    <small style={{ fontSize: isMobile ? '0.7rem' : '0.8rem' }}>
                                      {med.prescribing_doctor}
                                    </small>
                                  </td>
                                  <td style={{ padding: isMobile ? '8px 6px' : '12px' }}>
                                    <small style={{ fontSize: isMobile ? '0.7rem' : '0.8rem' }}>
                                      {new Date(med.prescribed_date).toLocaleDateString()}
                                    </small>
                                  </td>
                                  <td style={{ padding: isMobile ? '8px 6px' : '12px' }}>
                                    <span className={`badge ${getStatusBadge(med.status)}`} style={{ fontSize: isMobile ? '0.65rem' : '0.7rem' }}>
                                      {med.status}
                                    </span>
                                  </td>
                                  <td style={{ padding: isMobile ? '8px 6px' : '12px' }}>
                                    {med.status === 'pending' ? (
                                      <button
                                        className="btn btn-sm btn-success"
                                        onClick={() => {
                                          setSelectedMed(med);
                                          setShowAdministerModal(true);
                                        }}
                                        style={{
                                          fontSize: isMobile ? '0.7rem' : '0.75rem',
                                          padding: isMobile ? '4px 8px' : '6px 10px'
                                        }}
                                      >
                                        <CheckCircle size={isMobile ? 10 : 12} className="me-1" />
                                        {isMobile ? 'Give' : 'Administer'}
                                      </button>
                                    ) : med.status === 'administered' ? (
                                      <span className="text-success small" style={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}>
                                        <CheckCircle size={isMobile ? 10 : 12} className="me-1" />
                                        Done
                                      </span>
                                    ) : null}
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

              {/* Record Minor Treatment Tab */}
              {activeTab === 'administer' && (
                <div>
                  <div 
                    className="alert alert-info d-flex align-items-start"
                    style={{
                      padding: isMobile ? '12px' : '16px',
                      fontSize: isMobile ? '0.85rem' : '1rem'
                    }}
                  >
                    <AlertCircle size={isMobile ? 16 : 20} className="me-2 mt-1 flex-shrink-0" />
                    <div>
                      <strong>Minor Treatment Recording</strong>
                      <p className="mb-0 mt-2 small">
                        Use this to record over-the-counter medications or minor treatments 
                        (e.g., headache relief, wound care) that don't require doctor prescription.
                      </p>
                    </div>
                  </div>

                  <div className="card">
                    <div 
                      className="card-body"
                      style={{ padding: isMobile ? '12px' : '16px' }}
                    >
                      <div className="row g-3">
                        <div className="col-12 col-md-6">
                          <label className="form-label" style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
                            Patient <span className="text-danger">*</span>
                          </label>
                          <Select
                            options={patientOptions}
                            value={patientOptions.find(opt => opt.value === minorTreatmentForm.patient_id)}
                            onChange={(option) => setMinorTreatmentForm({
                              ...minorTreatmentForm,
                              patient_id: option?.value || ''
                            })}
                            placeholder="Select Patient"
                            styles={{
                              ...customSelectStyles,
                              control: (base) => ({
                                ...base,
                                minHeight: isMobile ? '44px' : '38px',
                                fontSize: isMobile ? '16px' : '14px'
                              })
                            }}
                            menuPortalTarget={document.body}
                            menuPosition="fixed"
                            isClearable
                            isSearchable
                          />
                          {patients.length === 0 && (
                            <small className="text-muted d-block mt-1">
                              No patients available. Please load patients first.
                            </small>
                          )}
                        </div>

                        <div className="col-12 col-md-6">
                          <label className="form-label" style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
                            Treatment/Medication <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g., Paracetamol, Bandage application"
                            value={minorTreatmentForm.medication_name}
                            onChange={(e) => setMinorTreatmentForm({
                              ...minorTreatmentForm,
                              medication_name: e.target.value
                            })}
                            style={{
                              fontSize: isMobile ? '16px' : '14px',
                              padding: isMobile ? '10px 12px' : '8px 12px'
                            }}
                            required
                          />
                        </div>

                        <div className="col-12 col-sm-6 col-md-4">
                          <label className="form-label" style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
                            Dosage/Amount <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g., 500mg, 1 tablet"
                            value={minorTreatmentForm.dosage}
                            onChange={(e) => setMinorTreatmentForm({
                              ...minorTreatmentForm,
                              dosage: e.target.value
                            })}
                            style={{
                              fontSize: isMobile ? '16px' : '14px',
                              padding: isMobile ? '10px 12px' : '8px 12px'
                            }}
                            required
                          />
                        </div>

                        <div className="col-12 col-sm-6 col-md-4">
                          <label className="form-label" style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
                            Route <span className="text-danger">*</span>
                          </label>
                          <Select
                            options={routeOptions}
                            value={routeOptions.find(opt => opt.value === minorTreatmentForm.route)}
                            onChange={(option) => setMinorTreatmentForm({
                              ...minorTreatmentForm,
                              route: option?.value || 'oral'
                            })}
                            styles={{
                              ...customSelectStyles,
                              control: (base) => ({
                                ...base,
                                minHeight: isMobile ? '44px' : '38px',
                                fontSize: isMobile ? '16px' : '14px'
                              })
                            }}
                            menuPortalTarget={document.body}
                            menuPosition="fixed"
                            isSearchable={false}
                          />
                        </div>

                        <div className="col-12 col-md-4">
                          <label className="form-label" style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
                            Reason/Complaint <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g., Headache, Minor cut"
                            value={minorTreatmentForm.reason}
                            onChange={(e) => setMinorTreatmentForm({
                              ...minorTreatmentForm,
                              reason: e.target.value
                            })}
                            style={{
                              fontSize: isMobile ? '16px' : '14px',
                              padding: isMobile ? '10px 12px' : '8px 12px'
                            }}
                            required
                          />
                        </div>

                        <div className="col-12">
                          <label className="form-label" style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
                            Additional Notes
                          </label>
                          <textarea
                            className="form-control"
                            rows={3}
                            placeholder="Any additional observations or instructions..."
                            value={minorTreatmentForm.notes}
                            onChange={(e) => setMinorTreatmentForm({
                              ...minorTreatmentForm,
                              notes: e.target.value
                            })}
                            style={{
                              fontSize: isMobile ? '16px' : '14px',
                              padding: isMobile ? '10px 12px' : '8px 12px'
                            }}
                          />
                        </div>
                      </div>

                      <div 
                        className="d-flex gap-2 mt-4"
                        style={{
                          flexDirection: isMobile ? 'column' : 'row',
                          justifyContent: 'flex-end'
                        }}
                      >
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setMinorTreatmentForm({
                            patient_id: '',
                            medication_name: '',
                            dosage: '',
                            route: 'oral',
                            reason: '',
                            notes: ''
                          })}
                          style={{
                            fontSize: isMobile ? '0.9rem' : '1rem',
                            padding: isMobile ? '10px 16px' : '8px 16px',
                            width: isMobile ? '100%' : 'auto'
                          }}
                        >
                          Clear
                        </button>
                        <button 
                          type="button"
                          className="btn btn-primary" 
                          onClick={recordMinorTreatment}
                          disabled={loading}
                          style={{
                            fontSize: isMobile ? '0.9rem' : '1rem',
                            padding: isMobile ? '10px 16px' : '8px 16px',
                            width: isMobile ? '100%' : 'auto'
                          }}
                        >
                          {loading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" />
                              Recording...
                            </>
                          ) : (
                            <>
                              <Plus size={16} className="me-1" />
                              Record Treatment
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div 
              className="modal-footer border-0"
              style={{ 
                padding: isMobile ? '10px 16px' : '12px 24px',
                flexShrink: 0
              }}
            >
              <button 
                className="btn btn-secondary" 
                onClick={onClose}
                style={{
                  fontSize: isMobile ? '0.9rem' : '1rem',
                  padding: isMobile ? '10px 20px' : '8px 20px',
                  width: isMobile ? '100%' : 'auto'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Administer Confirmation Modal */}
      {showAdministerModal && selectedMed && (
        <div 
          className="modal fade show d-block" 
          style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1060 }}
        >
          <div 
            className="modal-dialog modal-dialog-centered"
            style={{ 
              margin: isMobile ? '10px' : '1.75rem auto',
              maxWidth: isMobile ? 'calc(100% - 20px)' : '500px'
            }}
          >
            <div className="modal-content" style={{ borderRadius: isMobile ? '12px' : '1rem' }}>
              <div 
                className="modal-header"
                style={{ padding: isMobile ? '12px 16px' : '16px' }}
              >
                <h5 
                  className="modal-title"
                  style={{ fontSize: isMobile ? '1rem' : '1.25rem' }}
                >
                  Confirm Administration
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowAdministerModal(false);
                    setSelectedMed(null);
                  }}
                />
              </div>
              <div 
                className="modal-body"
                style={{ padding: isMobile ? '12px 16px' : '16px' }}
              >
                <div 
                  className="alert alert-warning d-flex align-items-start"
                  style={{ padding: isMobile ? '10px 12px' : '12px' }}
                >
                  <AlertCircle size={18} className="me-2 flex-shrink-0 mt-1" />
                  <small>Please confirm you are administering this medication</small>
                </div>
                <dl className="row mb-0" style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
                  <dt className="col-5 col-sm-4">Patient:</dt>
                  <dd className="col-7 col-sm-8">{selectedMed.patient_name}</dd>

                  <dt className="col-5 col-sm-4">Medication:</dt>
                  <dd className="col-7 col-sm-8">{selectedMed.medication_name}</dd>

                  <dt className="col-5 col-sm-4">Dosage:</dt>
                  <dd className="col-7 col-sm-8">{selectedMed.dosage}</dd>

                  <dt className="col-5 col-sm-4">Route:</dt>
                  <dd className="col-7 col-sm-8">{selectedMed.route}</dd>

                  <dt className="col-5 col-sm-4">Prescribed by:</dt>
                  <dd className="col-7 col-sm-8">{selectedMed.prescribing_doctor}</dd>
                </dl>
              </div>
              <div 
                className="modal-footer"
                style={{ 
                  padding: isMobile ? '10px 16px' : '12px 16px',
                  flexDirection: isMobile ? 'column' : 'row',
                  gap: isMobile ? '8px' : '0'
                }}
              >
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowAdministerModal(false);
                    setSelectedMed(null);
                  }}
                  style={{
                    width: isMobile ? '100%' : 'auto',
                    order: isMobile ? 2 : 1
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-success"
                  onClick={() => administerMedication(selectedMed.id)}
                  disabled={loading}
                  style={{
                    width: isMobile ? '100%' : 'auto',
                    order: isMobile ? 1 : 2
                  }}
                >
                  {loading ? 'Administering...' : 'Confirm Administration'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MedicationManagement;