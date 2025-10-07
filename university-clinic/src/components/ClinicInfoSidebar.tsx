import React, { useState, useEffect } from 'react';
import { Clock, Activity, AlertTriangle, Phone } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

interface ClinicHours {
  day: string;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

interface AppointmentTip {
  title: string;
  description: string;
  order: number;
}

interface EmergencyContact {
  name: string;
  phone: string;
  order: number;
}

interface ClinicSettings {
  clinic_hours: ClinicHours[];
  appointment_tips: AppointmentTip[];
  emergency_contacts: EmergencyContact[];
}

// Custom Hook for fetching clinic settings
export const useClinicSettings = () => {
  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/public/clinic-settings`);
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      } else {
        // Fallback to default settings
        setSettings(getDefaultSettings());
      }
    } catch (error) {
      console.error('Error fetching clinic settings:', error);
      setSettings(getDefaultSettings());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultSettings = (): ClinicSettings => ({
    clinic_hours: [
      { day: 'Monday', open_time: '08:00', close_time: '17:00', is_closed: false },
      { day: 'Tuesday', open_time: '08:00', close_time: '17:00', is_closed: false },
      { day: 'Wednesday', open_time: '08:00', close_time: '17:00', is_closed: false },
      { day: 'Thursday', open_time: '08:00', close_time: '17:00', is_closed: false },
      { day: 'Friday', open_time: '08:00', close_time: '17:00', is_closed: false },
      { day: 'Saturday', open_time: '09:00', close_time: '13:00', is_closed: false },
      { day: 'Sunday', open_time: '', close_time: '', is_closed: true }
    ],
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

  return { settings, loading };
};

// Clinic Hours Card Component
export const ClinicHoursCard: React.FC = () => {
  const { settings, loading } = useClinicSettings();

  if (loading) {
    return (
      <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
        <div className="card-body text-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
      <div className="card-header">
        <h6 className="mb-0 fw-semibold">
          <Clock size={18} className="me-2" />
          Clinic Hours
        </h6>
      </div>
      <div className="card-body">
        <ul className="list-group list-group-flush">
          {settings?.clinic_hours.map((hours) => (
            <li key={hours.day} className="list-group-item d-flex justify-content-between align-items-center">
              <span className="fw-semibold">{hours.day}</span>
              <span className={hours.is_closed ? 'text-danger' : ''}>
                {hours.is_closed ? 'Closed' : `${formatTime(hours.open_time)} - ${formatTime(hours.close_time)}`}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// Appointment Tips Card Component
export const AppointmentTipsCard: React.FC = () => {
  const { settings, loading } = useClinicSettings();

  if (loading) {
    return (
      <div className="card shadow-sm border-0 mt-4" style={{ borderRadius: '1rem' }}>
        <div className="card-body text-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card shadow-sm border-0 mt-4" style={{ borderRadius: '1rem' }}>
      <div className="card-header">
        <h6 className="mb-0 fw-semibold">
          <Activity size={18} className="me-2" />
          Appointment Tips
        </h6>
      </div>
      <div className="card-body">
        {settings?.appointment_tips
          .sort((a, b) => a.order - b.order)
          .map((tip, index) => (
            <div key={index} className="alert alert-info mb-3">
              <strong>{tip.title}:</strong> {tip.description}
            </div>
          ))}
      </div>
    </div>
  );
};

// Emergency Contacts Card Component
export const EmergencyContactsCard: React.FC = () => {
  const { settings, loading } = useClinicSettings();

  if (loading) {
    return (
      <div className="card shadow-sm border-0 mt-4" style={{ borderRadius: '1rem' }}>
        <div className="card-body text-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card shadow-sm border-0 mt-4" style={{ borderRadius: '1rem' }}>
      <div className="card-header">
        <h6 className="mb-0 fw-semibold">
          <Phone size={18} className="me-2" />
          Emergency Contacts
        </h6>
      </div>
      <div className="card-body">
        <ul className="list-unstyled">
          {settings?.emergency_contacts
            .sort((a, b) => a.order - b.order)
            .map((contact, index) => (
              <li key={index} className="mb-2">
                <div className="fw-semibold">{contact.name}</div>
                <div className="text-muted">
                  <Phone size={14} className="me-1" />
                  {contact.phone}
                </div>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
};

// Example usage component showing all three cards together
const ClinicInfoSidebar: React.FC = () => {
  return (
    <div className="col-md-4">
      <ClinicHoursCard />
      <AppointmentTipsCard />
      <EmergencyContactsCard />
    </div>
  );
};

export default ClinicInfoSidebar;