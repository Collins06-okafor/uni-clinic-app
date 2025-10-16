import React, { useState, useEffect } from 'react';
import { Pill, Clock, User, AlertCircle, CheckCircle, Plus, FileText, Search, X } from 'lucide-react';

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

  useEffect(() => {
    loadPrescribedMedications();
  }, []);

  const loadPrescribedMedications = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBaseUrl}/api/clinical/medications/prescribed`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });

      if (!response.ok) throw new Error('Failed to load medications');

      const data = await response.json();
      setPrescribedMeds(data.medications || []);
    } catch (error) {
      console.error('Error loading medications:', error);
      setMessage({ type: 'error', text: 'Failed to load medications' });
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
      <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
        <div className="modal-dialog modal-xl modal-dialog-scrollable">
          <div className="modal-content" style={{ borderRadius: '1rem' }}>
            <div className="modal-header border-0" style={{ background: 'linear-gradient(135deg, #d45858ff 0%, rgba(206, 66, 66, 1)ff 100%)' }}>
              <div className="text-white">
                <h4 className="modal-title mb-1">
                  <Pill size={24} className="me-2" />
                  Medication Management
                </h4>
                <small className="opacity-75">View prescribed medications and record treatments</small>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
              />
            </div>

            {/* Message Alert */}
            {message.text && (
              <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} m-3 mb-0`}>
                {message.text}
              </div>
            )}

            <div className="modal-body p-0">
              {/* Tabs */}
              <ul className="nav nav-tabs px-3 pt-3 border-0" role="tablist">
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'prescribed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('prescribed')}
                  >
                    <FileText size={16} className="me-2" />
                    Prescribed by Doctors
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'administer' ? 'active' : ''}`}
                    onClick={() => setActiveTab('administer')}
                  >
                    <Plus size={16} className="me-2" />
                    Record Minor Treatment
                  </button>
                </li>
              </ul>

              {/* Tab Content */}
              <div className="tab-content p-4">
                {/* Prescribed Medications Tab */}
                {activeTab === 'prescribed' && (
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="mb-0">Medications Prescribed by Doctors</h5>
                      <div className="d-flex align-items-center gap-3">
                        <span className="badge bg-primary">
                          {prescribedMeds.filter(m => m.status === 'pending').length} Pending
                        </span>
                        <div className="input-group" style={{ width: '300px' }}>
                          <span className="input-group-text">
                            <Search size={16} />
                          </span>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Search patient or medication..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>
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
                        <Pill size={48} className="mb-3" />
                        <p>{searchTerm ? 'No medications found matching your search' : 'No prescribed medications found'}</p>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover align-middle">
                          <thead className="table-light">
                            <tr>
                              <th>Patient</th>
                              <th>Medication</th>
                              <th>Dosage</th>
                              <th>Route</th>
                              <th>Frequency</th>
                              <th>Prescribed By</th>
                              <th>Date</th>
                              <th>Status</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredMeds.map((med) => (
                              <tr key={med.id}>
                                <td>
                                  <div>
                                    <strong>{med.patient_name}</strong>
                                  </div>
                                </td>
                                <td>
                                  <Pill size={14} className="me-1 text-primary" />
                                  {med.medication_name}
                                </td>
                                <td>{med.dosage}</td>
                                <td>
                                  <span className="badge bg-info text-dark">
                                    {med.route}
                                  </span>
                                </td>
                                <td>{med.frequency || 'As prescribed'}</td>
                                <td>
                                  <User size={14} className="me-1" />
                                  {med.prescribing_doctor}
                                </td>
                                <td>
                                  <small>{new Date(med.prescribed_date).toLocaleDateString()}</small>
                                </td>
                                <td>
                                  <span className={`badge ${getStatusBadge(med.status)}`}>
                                    {med.status}
                                  </span>
                                </td>
                                <td>
                                  {med.status === 'pending' && (
                                    <button
                                      className="btn btn-sm btn-success"
                                      onClick={() => {
                                        setSelectedMed(med);
                                        setShowAdministerModal(true);
                                      }}
                                    >
                                      <CheckCircle size={14} className="me-1" />
                                      Administer
                                    </button>
                                  )}
                                  {med.status === 'administered' && (
                                    <span className="text-success small">
                                      <CheckCircle size={14} className="me-1" />
                                      Done
                                    </span>
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

                {/* Record Minor Treatment Tab */}
                {activeTab === 'administer' && (
                  <div>
                    <div className="alert alert-info d-flex align-items-start">
                      <AlertCircle size={20} className="me-2 mt-1 flex-shrink-0" />
                      <div>
                        <strong>Minor Treatment Recording</strong>
                        <p className="mb-0 mt-2 small">
                          Use this to record over-the-counter medications or minor treatments 
                          (e.g., headache relief, wound care) that don't require doctor prescription.
                        </p>
                      </div>
                    </div>

                    <div className="card">
                      <div className="card-body">
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label className="form-label">Patient <span className="text-danger">*</span></label>
                            <select
                              className="form-select"
                              value={minorTreatmentForm.patient_id}
                              onChange={(e) => setMinorTreatmentForm({
                                ...minorTreatmentForm,
                                patient_id: e.target.value
                              })}
                              required
                            >
                              <option value="">Select Patient</option>
                              {patients.map(patient => (
                                <option key={patient.id} value={patient.id}>
                                  {patient.name} ({patient.student_id || patient.staff_no || patient.id})
                                </option>
                              ))}
                            </select>
                            {patients.length === 0 && (
                              <small className="text-muted d-block mt-1">
                                No patients available. Please load patients first.
                              </small>
                            )}
                          </div>

                          <div className="col-md-6">
                            <label className="form-label">Treatment/Medication <span className="text-danger">*</span></label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="e.g., Paracetamol, Bandage application"
                              value={minorTreatmentForm.medication_name}
                              onChange={(e) => setMinorTreatmentForm({
                                ...minorTreatmentForm,
                                medication_name: e.target.value
                              })}
                              required
                            />
                          </div>

                          <div className="col-md-4">
                            <label className="form-label">Dosage/Amount <span className="text-danger">*</span></label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="e.g., 500mg, 1 tablet"
                              value={minorTreatmentForm.dosage}
                              onChange={(e) => setMinorTreatmentForm({
                                ...minorTreatmentForm,
                                dosage: e.target.value
                              })}
                              required
                            />
                          </div>

                          <div className="col-md-4">
                            <label className="form-label">Route <span className="text-danger">*</span></label>
                            <select
                              className="form-select"
                              value={minorTreatmentForm.route}
                              onChange={(e) => setMinorTreatmentForm({
                                ...minorTreatmentForm,
                                route: e.target.value
                              })}
                              required
                            >
                              <option value="oral">Oral</option>
                              <option value="topical">Topical</option>
                              <option value="injection">Injection</option>
                              <option value="other">Other</option>
                            </select>
                          </div>

                          <div className="col-md-4">
                            <label className="form-label">Reason/Complaint <span className="text-danger">*</span></label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="e.g., Headache, Minor cut"
                              value={minorTreatmentForm.reason}
                              onChange={(e) => setMinorTreatmentForm({
                                ...minorTreatmentForm,
                                reason: e.target.value
                              })}
                              required
                            />
                          </div>

                          <div className="col-12">
                            <label className="form-label">Additional Notes</label>
                            <textarea
                              className="form-control"
                              rows={3}
                              placeholder="Any additional observations or instructions..."
                              value={minorTreatmentForm.notes}
                              onChange={(e) => setMinorTreatmentForm({
                                ...minorTreatmentForm,
                                notes: e.target.value
                              })}
                            />
                          </div>
                        </div>

                        <div className="d-flex justify-content-end gap-2 mt-4">
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
                          >
                            Clear
                          </button>
                          <button 
                            type="button"
                            className="btn btn-primary" 
                            onClick={recordMinorTreatment}
                            disabled={loading}
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
            </div>

            <div className="modal-footer border-0">
              <button className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Administer Confirmation Modal */}
      {showAdministerModal && selectedMed && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Medication Administration</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowAdministerModal(false);
                    setSelectedMed(null);
                  }}
                />
              </div>
              <div className="modal-body">
                <div className="alert alert-warning">
                  <AlertCircle size={20} className="me-2" />
                  Please confirm you are administering this medication
                </div>
                <dl className="row">
                  <dt className="col-sm-4">Patient:</dt>
                  <dd className="col-sm-8">{selectedMed.patient_name}</dd>

                  <dt className="col-sm-4">Medication:</dt>
                  <dd className="col-sm-8">{selectedMed.medication_name}</dd>

                  <dt className="col-sm-4">Dosage:</dt>
                  <dd className="col-sm-8">{selectedMed.dosage}</dd>

                  <dt className="col-sm-4">Route:</dt>
                  <dd className="col-sm-8">{selectedMed.route}</dd>

                  <dt className="col-sm-4">Prescribed by:</dt>
                  <dd className="col-sm-8">{selectedMed.prescribing_doctor}</dd>
                </dl>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowAdministerModal(false);
                    setSelectedMed(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-success"
                  onClick={() => administerMedication(selectedMed.id)}
                  disabled={loading}
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