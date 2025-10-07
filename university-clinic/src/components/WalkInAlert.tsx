import React, { useState, useEffect } from 'react';
import { Bell, X, User, Clock, AlertCircle } from 'lucide-react';

interface WalkInAlertProps {
  alert: {
    appointment_id: string;
    patient: {
      id: string;
      name: string;
      student_id: string;
    };
    urgency: string;
    queue_number: number;
    scheduled_time: string;
    reason: string;
    timestamp: string;
  };
  onDismiss: () => void;
  onView: (appointmentId: string) => void;
}

const WalkInAlert: React.FC<WalkInAlertProps> = ({ alert, onDismiss, onView }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [soundPlayed, setSoundPlayed] = useState(false);
  const [bellPulse, setBellPulse] = useState(true);

  useEffect(() => {
    // Trigger slide-in animation
    setTimeout(() => setIsVisible(true), 10);

    // Bell pulse animation
    const pulseInterval = setInterval(() => {
      setBellPulse(prev => !prev);
    }, 1000);

    // Play notification sound once
    if (!soundPlayed) {
      try {
        const audio = new Audio('/notification-sound.mp3');
        audio.volume = 0.5;
        audio.play().catch(err => console.log('Audio play failed:', err));
        setSoundPlayed(true);
      } catch (err) {
        console.log('Audio not available');
      }
    }

    // Auto-dismiss after 30 seconds
    const dismissTimer = setTimeout(() => {
      handleDismiss();
    }, 30000);

    return () => {
      clearInterval(pulseInterval);
      clearTimeout(dismissTimer);
    };
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss(), 300);
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency':
        return { bg: '#dc2626', border: '#991b1b' };
      case 'urgent':
        return { bg: '#ea580c', border: '#c2410c' };
      default:
        return { bg: '#2563eb', border: '#1e40af' };
    }
  };

  const colors = getUrgencyColor(alert.urgency);

  return (
    <div 
      className="fixed z-50"
      style={{
        top: '80px',
        right: '24px',
        maxWidth: '400px',
        transform: isVisible ? 'translateX(0)' : 'translateX(450px)',
        opacity: isVisible ? 1 : 0,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 9999
      }}
    >
      <div 
        className="rounded-lg overflow-hidden"
        style={{
          backgroundColor: colors.bg,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
        }}
      >
        {/* Header */}
        <div 
          className="p-4 flex items-start justify-between"
          style={{
            borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              style={{
                opacity: bellPulse ? 1 : 0.5,
                transition: 'opacity 0.5s ease-in-out'
              }}
            >
              <Bell size={24} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Patient Walked In!</h3>
              <p className="text-sm text-white" style={{ opacity: 0.9 }}>
                {alert.urgency === 'emergency' ? '🚨 EMERGENCY' : 
                 alert.urgency === 'urgent' ? '⚠️ URGENT' : '✓ Ready for consultation'}
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white transition-opacity"
            style={{ opacity: 0.8 }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.8'; }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div 
          className="p-4"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Patient Info */}
            <div className="flex items-center gap-3">
              <div 
                className="rounded-full flex items-center justify-center"
                style={{ 
                  width: '48px',
                  height: '48px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)' 
                }}
              >
                <User size={24} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-lg text-white">{alert.patient.name}</p>
                <p className="text-sm text-white" style={{ opacity: 0.9 }}>
                  ID: {alert.patient.student_id}
                </p>
              </div>
            </div>

            {/* Time */}
            <div className="flex items-center gap-2 text-sm text-white">
              <Clock size={16} />
              <span>Scheduled: {alert.scheduled_time}</span>
            </div>

            {/* Queue Number */}
            <div className="flex items-center gap-2 text-sm text-white">
              <AlertCircle size={16} />
              <span>Queue #{alert.queue_number}</span>
            </div>

            {/* Reason */}
            {alert.reason && (
              <div 
                className="text-sm rounded p-2 text-white"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
              >
                <strong>Reason:</strong> {alert.reason}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 flex gap-2">
          <button
            onClick={() => onView(alert.appointment_id)}
            className="flex-1 font-semibold py-2 px-4 rounded transition-all"
            style={{
              backgroundColor: 'white',
              color: colors.bg,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            View Details
          </button>
          <button
            onClick={handleDismiss}
            className="font-semibold py-2 px-4 rounded transition-all"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default WalkInAlert;