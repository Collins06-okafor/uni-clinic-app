import React, { useState, useEffect } from 'react';
import { Activity, Heart, Thermometer, Wind, Droplets, TrendingUp, AlertTriangle, Clock } from 'lucide-react';

interface VitalSign {
  id: string | number;
  date: string;
  blood_pressure: string;
  heart_rate: number;
  temperature: string;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  recorded_by: string;
  alerts: Array<{
    type: string;
    message: string;
    severity: string;
  }>;
}

interface PatientVitalsViewerProps {
  patientId: string | number;
  patientName: string;
  onClose: () => void;
  authToken: string;
  apiBaseUrl: string;
}

const PatientVitalsViewer: React.FC<PatientVitalsViewerProps> = ({
  patientId,
  patientName,
  onClose,
  authToken,
  apiBaseUrl
}) => {
  const [vitals, setVitals] = useState<VitalSign[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [error, setError] = useState('');

  // MOBILE: Detect mobile device
  const isMobile = window.innerWidth < 768;

  useEffect(() => {
    loadVitalsHistory();
  }, [patientId, days]);

  const loadVitalsHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${apiBaseUrl}/api/clinical/patients/${patientId}/vitals-history?days=${days}`,
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
      setVitals(data.vital_signs_history || []);
    } catch (err) {
      setError((err as Error).message);
      console.error('Error loading vitals:', err);
    } finally {
      setLoading(false);
    }
  };

  const getAlertBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-danger';
      case 'warning': return 'bg-warning text-dark';
      default: return 'bg-info';
    }
  };

  // Calculate statistics
  const calculateStats = () => {
    if (vitals.length === 0) return null;

    const bpData = vitals.map(v => {
      const [sys, dia] = v.blood_pressure.split('/').map(Number);
      return { sys, dia };
    });

    const avgSystolic = Math.round(bpData.reduce((sum, bp) => sum + bp.sys, 0) / bpData.length);
    const avgDiastolic = Math.round(bpData.reduce((sum, bp) => sum + bp.dia, 0) / bpData.length);
    const avgHeartRate = Math.round(vitals.reduce((sum, v) => sum + v.heart_rate, 0) / vitals.length);
    const avgTemp = (vitals.reduce((sum, v) => sum + parseFloat(v.temperature), 0) / vitals.length).toFixed(1);
    const abnormalCount = vitals.filter(v => v.alerts.length > 0).length;

    return { avgSystolic, avgDiastolic, avgHeartRate, avgTemp, abnormalCount };
  };

  const stats = calculateStats();

  return (
    <div 
      className="modal fade show d-block vitals-viewer-modal" 
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
          <div 
            className="modal-header border-0" 
            style={{ 
              background: 'linear-gradient(135deg, #ec5757ff 0%, #d03b3bff 100%)',
              padding: isMobile ? '14px 16px' : '16px 24px',
              flexShrink: 0
            }}
          >
            <div className="text-white" style={{ flex: 1, minWidth: 0 }}>
              <h4 
                className="modal-title mb-1 d-flex align-items-center"
                style={{ fontSize: isMobile ? '1.1rem' : '1.5rem' }}
              >
                <Activity size={isMobile ? 20 : 24} className="me-2 flex-shrink-0" />
                <span style={{ 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap' 
                }}>
                  Vital Signs - {patientName}
                </span>
              </h4>
              <small className="opacity-75" style={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                Last {days} days
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

          <div 
            className="modal-body" 
            style={{ 
              padding: isMobile ? '12px 16px' : '24px',
              overflowY: 'auto',
              flex: 1,
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {/* Time Range Selector - MOBILE OPTIMIZED */}
            <div className="mb-3">
              <div 
                className="btn-group w-100" 
                role="group"
                style={{ 
                  display: 'flex',
                  gap: isMobile ? '4px' : '0'
                }}
              >
                {[7, 14, 30].map((d) => (
                  <button
                    key={d}
                    className={`btn ${days === d ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setDays(d)}
                    style={{
                      flex: 1,
                      fontSize: isMobile ? '0.85rem' : '1rem',
                      padding: isMobile ? '8px' : '10px 16px',
                      minHeight: isMobile ? '38px' : '44px'
                    }}
                  >
                    {d} Days
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : error ? (
              <div className="alert alert-danger">
                <AlertTriangle size={20} className="me-2" />
                {error}
              </div>
            ) : vitals.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <Activity size={48} className="mb-3" />
                <p>No vital signs recorded in the last {days} days</p>
              </div>
            ) : (
              <>
                {/* Summary Statistics Cards - MOBILE OPTIMIZED */}
                {stats && (
                  <div className="row g-2 mb-3">
                    {[
                      { 
                        icon: Heart, 
                        color: 'danger', 
                        label: 'Avg Blood Pressure', 
                        value: `${stats.avgSystolic}/${stats.avgDiastolic}`, 
                        unit: 'mmHg' 
                      },
                      { 
                        icon: Activity, 
                        color: 'success', 
                        label: 'Avg Heart Rate', 
                        value: stats.avgHeartRate, 
                        unit: 'bpm' 
                      },
                      { 
                        icon: Thermometer, 
                        color: 'warning', 
                        label: 'Avg Temperature', 
                        value: `${stats.avgTemp}°C`, 
                        unit: 'celsius' 
                      },
                      { 
                        icon: AlertTriangle, 
                        color: 'danger', 
                        label: 'Abnormal Readings', 
                        value: stats.abnormalCount, 
                        unit: `of ${vitals.length}` 
                      }
                    ].map((stat, idx) => (
                      <div key={idx} className="col-6 col-md-3">
                        <div className="card text-center border-0 shadow-sm h-100">
                          <div className="card-body" style={{ padding: isMobile ? '12px' : '16px' }}>
                            <stat.icon 
                              size={isMobile ? 24 : 32} 
                              className={`text-${stat.color} mb-2`} 
                            />
                            <h6 
                              className="text-muted mb-1" 
                              style={{ 
                                fontSize: isMobile ? '0.7rem' : '0.875rem',
                                lineHeight: 1.2
                              }}
                            >
                              {stat.label}
                            </h6>
                            <h4 
                              className="mb-0" 
                              style={{ fontSize: isMobile ? '1.1rem' : '1.5rem' }}
                            >
                              {stat.value}
                            </h4>
                            <small 
                              className="text-muted" 
                              style={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}
                            >
                              {stat.unit}
                            </small>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Detailed Records Table - MOBILE OPTIMIZED */}
                <div className="card shadow-sm border-0">
                  <div 
                    className="card-header bg-light"
                    style={{ padding: isMobile ? '10px 12px' : '12px 16px' }}
                  >
                    <h5 
                      className="mb-0 d-flex align-items-center"
                      style={{ fontSize: isMobile ? '0.95rem' : '1.125rem' }}
                    >
                      <Clock size={isMobile ? 16 : 20} className="me-2" />
                      Detailed Records
                    </h5>
                  </div>
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
                            <th style={{ padding: isMobile ? '8px 6px' : '12px' }}>RR</th>
                            <th style={{ padding: isMobile ? '8px 6px' : '12px' }}>SpO2</th>
                            <th style={{ padding: isMobile ? '8px 6px' : '12px' }}>By</th>
                            <th style={{ padding: isMobile ? '8px 6px' : '12px' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vitals.map((vital) => (
                            <tr key={vital.id}>
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
                                <Thermometer size={12} className="me-1 text-warning" />
                                <strong>{vital.temperature}</strong>
                              </td>
                              <td style={{ padding: isMobile ? '8px 6px' : '12px' }}>
                                <Wind size={12} className="me-1 text-info" />
                                {vital.respiratory_rate || '-'}
                              </td>
                              <td style={{ padding: isMobile ? '8px 6px' : '12px' }}>
                                <Droplets size={12} className="me-1 text-primary" />
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
                                  <div className="d-flex flex-column gap-1">
                                    {vital.alerts.map((alert, idx) => (
                                      <span
                                        key={idx}
                                        className={`badge ${getAlertBadge(alert.severity)}`}
                                        title={alert.message}
                                        style={{ fontSize: isMobile ? '0.65rem' : '0.7rem' }}
                                      >
                                        <AlertTriangle size={10} className="me-1" />
                                        {alert.type}
                                      </span>
                                    ))}
                                  </div>
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

                {/* Alerts Summary - MOBILE OPTIMIZED */}
                {vitals.some(v => v.alerts.length > 0) && (
                  <div 
                    className="alert alert-warning mt-3"
                    style={{ 
                      padding: isMobile ? '12px' : '16px',
                      fontSize: isMobile ? '0.85rem' : '1rem'
                    }}
                  >
                    <h6 
                      className="alert-heading d-flex align-items-center"
                      style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}
                    >
                      <AlertTriangle size={isMobile ? 16 : 20} className="me-2" />
                      Health Alerts Summary
                    </h6>
                    <ul className="mb-0" style={{ fontSize: isMobile ? '0.8rem' : '0.875rem' }}>
                      {vitals
                        .filter(v => v.alerts.length > 0)
                        .map((vital) => (
                          <li key={vital.id}>
                            <strong>{new Date(vital.date).toLocaleDateString()}:</strong>
                            {vital.alerts.map((alert, idx) => (
                              <span key={idx} className="ms-2">
                                {alert.message}
                                {idx < vital.alerts.length - 1 && ', '}
                              </span>
                            ))}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>

          <div 
            className="modal-footer border-0 bg-light"
            style={{ 
              padding: isMobile ? '10px 16px' : '12px 24px',
              flexShrink: 0
            }}
          >
            <div 
              className="text-muted small me-auto"
              style={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
            >
              <TrendingUp size={14} className="me-1" />
              Total records: {vitals.length}
            </div>
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

export default PatientVitalsViewer;