import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, Users, Calendar, Clock, TrendingUp, AlertTriangle, 
  CheckCircle, Bell, RotateCcw, Wifi, WifiOff 
} from 'lucide-react';

interface DashboardStats {
  appointments: {
    total_today: number;
    pending: number;
    confirmed: number;
    completed: number;
    in_progress: number;
  };
  patients: {
    total_registered: number;
    new_today: number;
    active_sessions: number;
  };
  timestamp: string;
}

interface QueueItem {
  position: number;
  patient_name: string;
  student_id: string;
  doctor: string;
  estimated_time: string;
  priority: string;
  status: string;
}

interface RealTimeDashboardProps {
  userRole: string;
  websocketService?: any;
  onStatsUpdate?: (stats: DashboardStats) => void;
}

const RealTimeDashboard: React.FC<RealTimeDashboardProps> = ({ 
  userRole, 
  websocketService,
  onStatsUpdate 
}) => {
  // State management
  const [stats, setStats] = useState<DashboardStats>({
    appointments: {
      total_today: 0,
      pending: 0,
      confirmed: 0,
      completed: 0,
      in_progress: 0
    },
    patients: {
      total_registered: 0,
      new_today: 0,
      active_sessions: 0
    },
    timestamp: new Date().toISOString()
  });
  
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch initial data
  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await fetch('/api/realtime/dashboard-stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats || stats);
        setQueue(data.queue || []);
        setLastUpdated(new Date());
        
        if (onStatsUpdate) {
          onStatsUpdate(data.stats);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  }, [stats, onStatsUpdate]);

  // WebSocket connection and event handlers
  useEffect(() => {
    if (websocketService) {
      // Connection status
      const checkConnection = () => {
        setIsConnected(websocketService.isConnected());
      };

      // Dashboard stats updates
      const handleStatsUpdate = (newStats: DashboardStats) => {
        setStats(newStats);
        setLastUpdated(new Date());
        
        if (onStatsUpdate) {
          onStatsUpdate(newStats);
        }
      };

      // Queue updates (for clinical staff)
      const handleQueueUpdate = (queueData: any) => {
        setQueue(queueData.queue || []);
        setLastUpdated(new Date());
      };

      // Set up event listeners
      websocketService.onDashboardStatsUpdate(handleStatsUpdate);
      websocketService.onQueueUpdate(handleQueueUpdate);

      // Join appropriate channels based on user role
      const channel = userRole === 'clinical_staff' ? 'clinical-staff' 
                    : userRole === 'doctor' ? 'doctors'
                    : userRole === 'admin' ? 'admin'
                    : 'general';
      
      websocketService.joinChannel(channel);

      // Check connection status periodically
      const connectionCheck = setInterval(checkConnection, 5000);
      checkConnection(); // Initial check

      return () => {
        clearInterval(connectionCheck);
        websocketService.leaveChannel(channel);
        websocketService.off('dashboard.updated');
        websocketService.off('queue.updated');
      };
    }
  }, [websocketService, userRole, onStatsUpdate]);

  // Auto-refresh mechanism
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchDashboardData, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchDashboardData]);

  // Initial data fetch
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const getStatCard = (
    title: string, 
    value: number, 
    icon: React.ReactNode, 
    color: string,
    trend?: number
  ) => (
    <div className={`bg-white rounded-lg shadow p-6 border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="flex items-center">
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            {trend !== undefined && (
              <span className={`ml-2 text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp size={16} className={trend < 0 ? 'rotate-180' : ''} />
                {Math.abs(trend)}%
              </span>
            )}
          </div>
        </div>
        <div className={`p-3 rounded-full ${color.replace('border-l-', 'bg-').replace('-500', '-100')}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  const getPriorityBadge = (priority: string) => {
    const colors = {
      urgent: 'bg-red-100 text-red-800',
      high: 'bg-yellow-100 text-yellow-800',
      normal: 'bg-green-100 text-green-800'
    };
    return colors[priority as keyof typeof colors] || colors.normal;
  };

  return (
    <div className="space-y-6">
      {/* Connection Status and Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <Wifi size={20} className="text-green-500" />
              ) : (
                <WifiOff size={20} className="text-red-500" />
              )}
              <span className={`text-sm font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            <div className="text-sm text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1 rounded text-sm ${
                autoRefresh 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {autoRefresh ? 'Auto-refresh On' : 'Auto-refresh Off'}
            </button>
            
            <button
              onClick={fetchDashboardData}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {getStatCard(
          'Total Appointments',
          stats.appointments.total_today,
          <Calendar size={24} className="text-blue-600" />,
          'border-l-blue-500'
        )}
        
        {getStatCard(
          'Pending Appointments',
          stats.appointments.pending,
          <Clock size={24} className="text-yellow-600" />,
          'border-l-yellow-500'
        )}
        
        {getStatCard(
          'Completed Today',
          stats.appointments.completed,
          <CheckCircle size={24} className="text-green-600" />,
          'border-l-green-500'
        )}
        
        {getStatCard(
          'Active Patients',
          stats.patients.active_sessions,
          <Users size={24} className="text-purple-600" />,
          'border-l-purple-500'
        )}
      </div>

      {/* Real-time Patient Queue (for clinical staff) */}
      {(userRole === 'clinical_staff' || userRole === 'admin') && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Patient Queue
              </h3>
              <div className="flex items-center space-x-2">
                <Activity size={16} className="text-green-500" />
                <span className="text-sm text-gray-500">
                  Live Updates
                </span>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {queue.length === 0 ? (
              <div className="text-center py-8">
                <Users size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No patients in queue</p>
              </div>
            ) : (
              <div className="space-y-4">
                {queue.map((item, index) => (
                  <div
                    key={`${item.student_id}-${index}`}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                          {item.position}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900">{item.patient_name}</h4>
                        <p className="text-sm text-gray-500">ID: {item.student_id}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{item.doctor}</p>
                        <p className="text-sm text-gray-500">{item.estimated_time}</p>
                      </div>
                      
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadge(item.priority)}`}>
                        {item.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Activity Feed */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Recent Activity
          </h3>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <p className="text-sm text-gray-600">
                Appointment completed for John Doe - 2 minutes ago
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <p className="text-sm text-gray-600">
                New appointment scheduled for Jane Smith - 5 minutes ago
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <p className="text-sm text-gray-600">
                Appointment rescheduled for Mike Johnson - 10 minutes ago
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeDashboard;