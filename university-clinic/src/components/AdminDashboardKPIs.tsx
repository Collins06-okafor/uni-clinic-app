// src/components/AdminDashboardKPIs.tsx
import React from 'react';
import {
  Users, UserCheck, UserPlus, AlertCircle, TrendingUp, 
  TrendingDown, Activity, Clock, CheckCircle, UserX
} from 'lucide-react';

interface DashboardData {
  system_overview?: {
    total_users: number;
    active_users: number;
    pending_verifications: number;
    inactive_users: number;
    new_registrations_today: number;
    new_registrations_this_week: number;
    new_registrations_this_month: number;
  };
  user_breakdown?: {
    students: {
      total: number;
      active: number;
      pending: number;
      inactive: number;
    };
    doctors: {
      total: number;
      active: number;
      pending: number;
      inactive: number;
    };
  };
}

interface KPIProps {
  dashboardData: DashboardData | null;
}

const AdminDashboardKPIs: React.FC<KPIProps> = ({ dashboardData }) => {
  // Calculate derived metrics
  const calculateMetrics = () => {
    if (!dashboardData?.system_overview) {
      return null;
    }

    const { system_overview, user_breakdown } = dashboardData;
    
    // User activation rate
    const activationRate = system_overview.total_users > 0
      ? ((system_overview.active_users / system_overview.total_users) * 100).toFixed(1)
      : '0';

    // Pending verification rate
    const pendingRate = system_overview.total_users > 0
      ? ((system_overview.pending_verifications / system_overview.total_users) * 100).toFixed(1)
      : '0';

    // Growth rates (comparing week vs today)
    const dailyAverage = system_overview.new_registrations_this_week / 7;
    const growthTrend = system_overview.new_registrations_today > dailyAverage ? 'up' : 'down';
    const growthPercentage = dailyAverage > 0
      ? Math.abs(((system_overview.new_registrations_today - dailyAverage) / dailyAverage) * 100).toFixed(1)
      : '0';

    // Student metrics
    const studentTotal = user_breakdown?.students?.total ?? 0;
    const studentActive = user_breakdown?.students?.active ?? 0;
    const studentActivationRate = studentTotal > 0
      ? ((studentActive / studentTotal) * 100).toFixed(1)
      : '0';

    // Doctor metrics
    const doctorTotal = user_breakdown?.doctors?.total ?? 0;
    const doctorActive = user_breakdown?.doctors?.active ?? 0;
    const doctorActivationRate = doctorTotal > 0
      ? ((doctorActive / doctorTotal) * 100).toFixed(1)
      : '0';

    return {
      activationRate,
      pendingRate,
      growthTrend,
      growthPercentage,
      studentActivationRate,
      doctorActivationRate,
      dailyAverage: dailyAverage.toFixed(1)
    };
  };

  const metrics = calculateMetrics();

  if (!dashboardData?.system_overview || !metrics) {
    return (
      <div className="alert alert-info">
        Loading dashboard metrics...
      </div>
    );
  }

  const { system_overview, user_breakdown } = dashboardData;

  const kpiCards = [
    // Primary KPIs - Row 1
    {
      title: 'Total Users',
      value: system_overview.total_users.toLocaleString(),
      icon: Users,
      color: 'primary',
      trend: null,
      description: 'All registered users'
    },
    {
      title: 'Active Users',
      value: system_overview.active_users.toLocaleString(),
      icon: UserCheck,
      color: 'success',
      trend: {
        value: `${metrics.activationRate}%`,
        label: 'activation rate'
      },
      description: 'Currently active accounts'
    },
    {
      title: 'Pending Verifications',
      value: system_overview.pending_verifications.toLocaleString(),
      icon: Clock,
      color: 'warning',
      trend: {
        value: `${metrics.pendingRate}%`,
        label: 'of total users'
      },
      description: 'Awaiting verification'
    },
    {
      title: 'Inactive Users',
      value: system_overview.inactive_users.toLocaleString(),
      icon: UserX,
      color: 'secondary',
      trend: null,
      description: 'Deactivated accounts'
    },

    // Growth Metrics - Row 2
    {
      title: 'New Users Today',
      value: system_overview.new_registrations_today.toLocaleString(),
      icon: UserPlus,
      color: 'info',
      trend: {
        value: `${metrics.growthPercentage}%`,
        direction: metrics.growthTrend,
        label: 'vs daily avg'
      },
      description: 'Registered today'
    },
    {
      title: 'New Users This Week',
      value: system_overview.new_registrations_this_week.toLocaleString(),
      icon: TrendingUp,
      color: 'info',
      trend: {
        value: metrics.dailyAverage,
        label: 'per day avg'
      },
      description: 'Last 7 days'
    },
    {
      title: 'New Users This Month',
      value: system_overview.new_registrations_this_month.toLocaleString(),
      icon: Activity,
      color: 'info',
      trend: null,
      description: 'Current month'
    },

    // Role-based metrics - Row 3
    {
      title: 'Total Students',
      value: user_breakdown?.students?.total.toLocaleString() || '0',
      icon: Users,
      color: 'primary',
      trend: {
        value: `${user_breakdown?.students?.active || 0} active`,
        label: `${metrics.studentActivationRate}% rate`
      },
      description: `${user_breakdown?.students?.pending || 0} pending`
    },
    {
      title: 'Total Doctors',
      value: user_breakdown?.doctors?.total.toLocaleString() || '0',
      icon: Activity,
      color: 'primary',
      trend: {
        value: `${user_breakdown?.doctors?.active || 0} active`,
        label: `${metrics.doctorActivationRate}% rate`
      },
      description: `${user_breakdown?.doctors?.pending || 0} pending`
    },
  ];

  return (
    <div className="container-fluid px-0">
      {/* Main KPI Grid */}
      <div className="row g-4 mb-4">
        {kpiCards.map((kpi, index) => (
          <div key={index} className="col-12 col-sm-6 col-lg-4 col-xl-3">
            <div className="card border-0 shadow-sm h-100 rounded-4 hover-lift">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div className={`p-3 rounded-3 bg-${kpi.color} bg-opacity-10`}>
                    <kpi.icon className={`text-${kpi.color}`} size={24} />
                  </div>
                  {kpi.trend?.direction && (
                    <div className={`badge bg-${kpi.trend.direction === 'up' ? 'success' : 'danger'} bg-opacity-10 text-${kpi.trend.direction === 'up' ? 'success' : 'danger'}`}>
                      {kpi.trend.direction === 'up' ? (
                        <TrendingUp size={14} className="me-1" />
                      ) : (
                        <TrendingDown size={14} className="me-1" />
                      )}
                      {kpi.trend.value}
                    </div>
                  )}
                </div>
                
                <div>
                  <h6 className="text-muted fw-normal mb-2" style={{ fontSize: '0.875rem' }}>
                    {kpi.title}
                  </h6>
                  <h2 className="mb-2 fw-bold" style={{ fontSize: '2rem' }}>
                    {kpi.value}
                  </h2>
                  
                  {kpi.trend && !kpi.trend.direction && (
                    <div className="small text-muted mb-1">
                      <strong className={`text-${kpi.color}`}>{kpi.trend.value}</strong> {kpi.trend.label}
                    </div>
                  )}
                  
                  {kpi.trend?.direction && (
                    <div className="small text-muted mb-1">
                      {kpi.trend.label}
                    </div>
                  )}
                  
                  <div className="small text-muted">
                    {kpi.description}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats Bar */}
      <div className="row g-4 mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <h5 className="card-title mb-4 fw-bold">User Distribution Overview</h5>
              
              <div className="row g-4">
                {/* Students Breakdown */}
                <div className="col-md-6">
                  <h6 className="text-muted mb-3">Students</h6>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span>Active</span>
                    <strong className="text-success">{user_breakdown?.students?.active || 0}</strong>
                  </div>
                  <div className="progress mb-3" style={{ height: '8px' }}>
                    <div 
                      className="progress-bar bg-success" 
                      style={{ 
                        width: `${user_breakdown?.students?.total ? (user_breakdown.students.active / user_breakdown.students.total * 100) : 0}%` 
                      }}
                    ></div>
                  </div>
                  
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span>Pending</span>
                    <strong className="text-warning">{user_breakdown?.students?.pending || 0}</strong>
                  </div>
                  <div className="progress mb-3" style={{ height: '8px' }}>
                    <div 
                      className="progress-bar bg-warning" 
                      style={{ 
                        width: `${user_breakdown?.students?.total ? (user_breakdown.students.pending / user_breakdown.students.total * 100) : 0}%` 
                      }}
                    ></div>
                  </div>
                  
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span>Inactive</span>
                    <strong className="text-secondary">{user_breakdown?.students?.inactive || 0}</strong>
                  </div>
                  <div className="progress" style={{ height: '8px' }}>
                    <div 
                      className="progress-bar bg-secondary" 
                      style={{ 
                        width: `${user_breakdown?.students?.total ? (user_breakdown.students.inactive / user_breakdown.students.total * 100) : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>

                {/* Doctors Breakdown */}
                <div className="col-md-6">
                  <h6 className="text-muted mb-3">Doctors</h6>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span>Active</span>
                    <strong className="text-success">{user_breakdown?.doctors?.active || 0}</strong>
                  </div>
                  <div className="progress mb-3" style={{ height: '8px' }}>
                    <div 
                      className="progress-bar bg-success" 
                      style={{ 
                        width: `${user_breakdown?.doctors?.total ? (user_breakdown.doctors.active / user_breakdown.doctors.total * 100) : 0}%` 
                      }}
                    ></div>
                  </div>
                  
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span>Pending</span>
                    <strong className="text-warning">{user_breakdown?.doctors?.pending || 0}</strong>
                  </div>
                  <div className="progress mb-3" style={{ height: '8px' }}>
                    <div 
                      className="progress-bar bg-warning" 
                      style={{ 
                        width: `${user_breakdown?.doctors?.total ? (user_breakdown.doctors.pending / user_breakdown.doctors.total * 100) : 0}%` 
                      }}
                    ></div>
                  </div>
                  
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span>Inactive</span>
                    <strong className="text-secondary">{user_breakdown?.doctors?.inactive || 0}</strong>
                  </div>
                  <div className="progress" style={{ height: '8px' }}>
                    <div 
                      className="progress-bar bg-secondary" 
                      style={{ 
                        width: `${user_breakdown?.doctors?.total ? (user_breakdown.doctors.inactive / user_breakdown.doctors.total * 100) : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Alerts */}
      {system_overview.pending_verifications > 10 && (
        <div className="alert alert-warning d-flex align-items-center rounded-4 shadow-sm" role="alert">
          <AlertCircle className="me-3" size={24} />
          <div>
            <strong>Action Required:</strong> You have {system_overview.pending_verifications} pending verifications that need attention.
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardKPIs;

// CSS to add to your styles (optional hover effect)
const styles = `
.hover-lift {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.hover-lift:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1) !important;
}
`;