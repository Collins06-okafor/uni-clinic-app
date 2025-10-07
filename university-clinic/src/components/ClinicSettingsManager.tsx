import React, { useState, useEffect } from 'react';
import { Clock, Activity, AlertTriangle, Save, Plus, Trash2 } from 'lucide-react';
import apiService from '../services/api';

interface ClinicHours {
  id?: string;
  day: string;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

interface AppointmentTip {
  id?: string;
  title: string;
  description: string;
  order: number;
}

interface EmergencyContact {
  id?: string;
  name: string;
  phone: string;
  order: number;
}

interface ClinicSettings {
  clinic_hours: ClinicHours[];
  appointment_tips: AppointmentTip[];
  emergency_contacts: EmergencyContact[];
}

const ClinicSettingsManager: React.FC = () => {
  const [settings, setSettings] = useState<ClinicSettings>({
    clinic_hours: [],
    appointment_tips: [],
    emergency_contacts: []
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeSection, setActiveSection] = useState<'hours' | 'tips' | 'contacts'>('hours');

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await apiService.getClinicSettings();
      setSettings(response.settings || initializeDefaultSettings());
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to load settings. Using defaults.' 
      });
      setSettings(initializeDefaultSettings());
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultSettings = (): ClinicSettings => ({
    clinic_hours: daysOfWeek.map(day => ({
      day,
      open_time: day === 'Saturday' ? '09:00' : day === 'Sunday' ? '' : '08:00',
      close_time: day === 'Saturday' ? '13:00' : day === 'Sunday' ? '' : '17:00',
      is_closed: day === 'Sunday'
    })),
    appointment_tips: [
      { title: 'Arrive early', description: 'Please arrive 15 minutes before your scheduled time.', order: 1 },
      { title: 'Bring documents', description: "Don't forget your student ID and medical card.", order: 2 },
      { title: 'Cancellation', description: "Cancel at least 24 hours in advance if you can't make it.", order: 3 }
    ],
    emergency_contacts: [
      { name: 'Campus Emergency', phone: '+90 392 630 1010', order: 1 },
      { name: 'Ambulance', phone: '112', order: 2 },
      { name: 'Clinic Reception', phone: '+90 392 630 1234', order: 3 }
    ]
  });

  const saveSettings = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      console.log('Saving settings:', settings);

      const response = await apiService.saveClinicSettings(settings);

      console.log('Save response:', response);

      setMessage({ 
        type: 'success', 
        text: response.message || 'Settings saved successfully!' 
      });

      // Auto-hide success message after 3 seconds
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);

    } catch (error: any) {
      console.error('Error saving settings:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to save settings. Please try again.' 
      });

      // Auto-hide error message after 5 seconds
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } finally {
      setSaving(false);
    }
  };

  // Clinic Hours Management
  const updateClinicHours = (index: number, field: keyof ClinicHours, value: any) => {
    const updated = [...settings.clinic_hours];
    updated[index] = { ...updated[index], [field]: value };
    
    // If marking as closed, clear the times
    if (field === 'is_closed' && value === true) {
      updated[index].open_time = '';
      updated[index].close_time = '';
    }
    
    setSettings({ ...settings, clinic_hours: updated });
  };

  // Appointment Tips Management
  const addTip = () => {
    const newTip: AppointmentTip = {
      title: '',
      description: '',
      order: settings.appointment_tips.length + 1
    };
    setSettings({ ...settings, appointment_tips: [...settings.appointment_tips, newTip] });
  };

  const updateTip = (index: number, field: keyof AppointmentTip, value: any) => {
    const updated = [...settings.appointment_tips];
    updated[index] = { ...updated[index], [field]: value };
    setSettings({ ...settings, appointment_tips: updated });
  };

  const removeTip = (index: number) => {
    const updated = settings.appointment_tips
      .filter((_, i) => i !== index)
      .map((tip, i) => ({ ...tip, order: i + 1 })); // Reorder
    setSettings({ ...settings, appointment_tips: updated });
  };

  // Emergency Contacts Management
  const addContact = () => {
    const newContact: EmergencyContact = {
      name: '',
      phone: '',
      order: settings.emergency_contacts.length + 1
    };
    setSettings({ ...settings, emergency_contacts: [...settings.emergency_contacts, newContact] });
  };

  const updateContact = (index: number, field: keyof EmergencyContact, value: any) => {
    const updated = [...settings.emergency_contacts];
    updated[index] = { ...updated[index], [field]: value };
    setSettings({ ...settings, emergency_contacts: updated });
  };

  const removeContact = (index: number) => {
    const updated = settings.emergency_contacts
      .filter((_, i) => i !== index)
      .map((contact, i) => ({ ...contact, order: i + 1 })); // Reorder
    setSettings({ ...settings, emergency_contacts: updated });
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      {/* Message Display */}
      {message.text && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'} alert-dismissible fade show mb-4`}>
          {message.text}
          <button type="button" className="btn-close" onClick={() => setMessage({ type: '', text: '' })}></button>
        </div>
      )}

      <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
        <div className="card-header" style={{ background: 'linear-gradient(135deg, #E53E3E 0%, #C53030 100%)' }}>
          <h3 className="mb-0 fw-bold text-white">
            Clinic Settings Management
          </h3>
        </div>

        <div className="card-body p-4">
          {/* Section Tabs */}
          <div className="btn-group mb-4" role="group">
            <button
              className={`btn ${activeSection === 'hours' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setActiveSection('hours')}
            >
              <Clock size={16} className="me-2" />
              Clinic Hours
            </button>
            <button
              className={`btn ${activeSection === 'tips' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setActiveSection('tips')}
            >
              <Activity size={16} className="me-2" />
              Appointment Tips
            </button>
            <button
              className={`btn ${activeSection === 'contacts' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setActiveSection('contacts')}
            >
              <AlertTriangle size={16} className="me-2" />
              Emergency Contacts
            </button>
          </div>

          {/* Clinic Hours Section */}
          {activeSection === 'hours' && (
            <div>
              <h5 className="mb-3">Clinic Operating Hours</h5>
              <div className="table-responsive">
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Open Time</th>
                      <th>Close Time</th>
                      <th className="text-center">Closed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settings.clinic_hours.map((hours, index) => (
                      <tr key={hours.day}>
                        <td className="align-middle fw-semibold">{hours.day}</td>
                        <td>
                          <input
                            type="time"
                            className="form-control"
                            value={hours.open_time}
                            onChange={(e) => updateClinicHours(index, 'open_time', e.target.value)}
                            disabled={hours.is_closed}
                          />
                        </td>
                        <td>
                          <input
                            type="time"
                            className="form-control"
                            value={hours.close_time}
                            onChange={(e) => updateClinicHours(index, 'close_time', e.target.value)}
                            disabled={hours.is_closed}
                          />
                        </td>
                        <td className="text-center align-middle">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={hours.is_closed}
                            onChange={(e) => updateClinicHours(index, 'is_closed', e.target.checked)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Appointment Tips Section */}
          {activeSection === 'tips' && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Appointment Tips</h5>
                <button className="btn btn-sm btn-primary" onClick={addTip}>
                  <Plus size={16} className="me-1" />
                  Add Tip
                </button>
              </div>
              
              {settings.appointment_tips.length === 0 && (
                <div className="alert alert-info">
                  No appointment tips yet. Click "Add Tip" to create one.
                </div>
              )}

              {settings.appointment_tips.map((tip, index) => (
                <div key={index} className="card mb-3">
                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-md-4">
                        <label className="form-label">Title</label>
                        <input
                          type="text"
                          className="form-control"
                          value={tip.title}
                          onChange={(e) => updateTip(index, 'title', e.target.value)}
                          placeholder="e.g., Arrive early"
                        />
                      </div>
                      <div className="col-md-7">
                        <label className="form-label">Description</label>
                        <input
                          type="text"
                          className="form-control"
                          value={tip.description}
                          onChange={(e) => updateTip(index, 'description', e.target.value)}
                          placeholder="Detailed tip description"
                        />
                      </div>
                      <div className="col-md-1 d-flex align-items-end">
                        <button
                          className="btn btn-outline-danger w-100"
                          onClick={() => removeTip(index)}
                          title="Remove tip"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Emergency Contacts Section */}
          {activeSection === 'contacts' && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Emergency Contacts</h5>
                <button className="btn btn-sm btn-primary" onClick={addContact}>
                  <Plus size={16} className="me-1" />
                  Add Contact
                </button>
              </div>
              
              {settings.emergency_contacts.length === 0 && (
                <div className="alert alert-info">
                  No emergency contacts yet. Click "Add Contact" to create one.
                </div>
              )}

              {settings.emergency_contacts.map((contact, index) => (
                <div key={index} className="card mb-3">
                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-md-5">
                        <label className="form-label">Contact Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={contact.name}
                          onChange={(e) => updateContact(index, 'name', e.target.value)}
                          placeholder="e.g., Campus Emergency"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Phone Number</label>
                        <input
                          type="tel"
                          className="form-control"
                          value={contact.phone}
                          onChange={(e) => updateContact(index, 'phone', e.target.value)}
                          placeholder="+90 392 630 1010"
                        />
                      </div>
                      <div className="col-md-1 d-flex align-items-end">
                        <button
                          className="btn btn-outline-danger w-100"
                          onClick={() => removeContact(index)}
                          title="Remove contact"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Save Button */}
          <div className="mt-4 text-end">
            <button
              className="btn btn-success btn-lg"
              onClick={saveSettings}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} className="me-2" />
                  Save All Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClinicSettingsManager;