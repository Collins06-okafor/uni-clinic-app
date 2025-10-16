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
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content" style={{ borderRadius: '1rem' }}>
          <div className="modal-header border-0" style={{ background: 'linear-gradient(135deg, #ec5757ff 0%, #d03b3bff 100%)' }}>
            <div className="text-white">
              <h4 className="modal-title mb-1">
                <Activity size={24} className="me-2" />
                Vital Signs History - {patientName}
              </h4>
              <small className="opacity-75">Last {days} days</small>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
            />
          </div>

          <div className="modal-body p-4">
            {/* Time Range Selector */}
            <div className="mb-4">
              <div className="btn-group" role="group">
                <button
                  className={`btn ${days === 7 ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setDays(7)}
                >
                  7 Days
                </button>
                <button
                  className={`btn ${days === 14 ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setDays(14)}
                >
                  14 Days
                </button>
                <button
                  className={`btn ${days === 30 ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setDays(30)}
                >
                  30 Days
                </button>
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
                {/* Summary Statistics Cards */}
                {stats && (
                  <div className="row g-3 mb-4">
                    <div className="col-md-3">
                      <div className="card text-center border-0 shadow-sm">
                        <div className="card-body">
                          <Heart size={32} className="text-danger mb-2" />
                          <h6 className="text-muted mb-1">Avg Blood Pressure</h6>
                          <h4 className="mb-0">{stats.avgSystolic}/{stats.avgDiastolic}</h4>
                          <small className="text-muted">mmHg</small>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="card text-center border-0 shadow-sm">
                        <div className="card-body">
                          <Activity size={32} className="text-success mb-2" />
                          <h6 className="text-muted mb-1">Avg Heart Rate</h6>
                          <h4 className="mb-0">{stats.avgHeartRate}</h4>
                          <small className="text-muted">bpm</small>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="card text-center border-0 shadow-sm">
                        <div className="card-body">
                          <Thermometer size={32} className="text-warning mb-2" />
                          <h6 className="text-muted mb-1">Avg Temperature</h6>
                          <h4 className="mb-0">{stats.avgTemp}°C</h4>
                          <small className="text-muted">celsius</small>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="card text-center border-0 shadow-sm">
                        <div className="card-body">
                          <AlertTriangle size={32} className="text-danger mb-2" />
                          <h6 className="text-muted mb-1">Abnormal Readings</h6>
                          <h4 className="mb-0">{stats.abnormalCount}</h4>
                          <small className="text-muted">out of {vitals.length}</small>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Detailed Records Table */}
                <div className="card shadow-sm border-0">
                  <div className="card-header bg-light">
                    <h5 className="mb-0">
                      <Clock size={20} className="me-2" />
                      Detailed Vital Signs Records
                    </h5>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Date & Time</th>
                            <th>Blood Pressure</th>
                            <th>Heart Rate</th>
                            <th>Temperature</th>
                            <th>Resp. Rate</th>
                            <th>SpO2</th>
                            <th>Recorded By</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vitals.map((vital) => (
                            <tr key={vital.id}>
                              <td>
                                <Clock size={14} className="me-2 text-muted" />
                                <small>{new Date(vital.date).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}</small>
                              </td>
                              <td>
                                <Heart size={14} className="me-1 text-danger" />
                                <strong>{vital.blood_pressure}</strong>
                                <small className="text-muted d-block">mmHg</small>
                              </td>
                              <td>
                                <Activity size={14} className="me-1 text-success" />
                                <strong>{vital.heart_rate}</strong>
                                <small className="text-muted d-block">bpm</small>
                              </td>
                              <td>
                                <Thermometer size={14} className="me-1 text-warning" />
                                <strong>{vital.temperature}</strong>
                              </td>
                              <td>
                                <Wind size={14} className="me-1 text-info" />
                                {vital.respiratory_rate || '-'}
                              </td>
                              <td>
                                <Droplets size={14} className="me-1 text-primary" />
                                {vital.oxygen_saturation ? `${vital.oxygen_saturation}%` : '-'}
                              </td>
                              <td>
                                <small className="text-muted">{vital.recorded_by}</small>
                              </td>
                              <td>
                                {vital.alerts.length > 0 ? (
                                  <div className="d-flex flex-column gap-1">
                                    {vital.alerts.map((alert, idx) => (
                                      <span
                                        key={idx}
                                        className={`badge ${getAlertBadge(alert.severity)}`}
                                        title={alert.message}
                                        style={{ fontSize: '0.7rem' }}
                                      >
                                        <AlertTriangle size={10} className="me-1" />
                                        {alert.type}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="badge bg-success">Normal</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Alerts Summary */}
                {vitals.some(v => v.alerts.length > 0) && (
                  <div className="alert alert-warning mt-4">
                    <h6 className="alert-heading d-flex align-items-center">
                      <AlertTriangle size={20} className="me-2" />
                      Health Alerts Summary
                    </h6>
                    <ul className="mb-0">
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

          <div className="modal-footer border-0 bg-light">
            <div className="text-muted small me-auto">
              <TrendingUp size={14} className="me-1" />
              Total records: {vitals.length}
            </div>
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientVitalsViewer;