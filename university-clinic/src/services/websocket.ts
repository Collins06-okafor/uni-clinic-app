// src/services/websocket.ts
import { io, Socket } from "socket.io-client";

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

interface AppointmentUpdate {
  appointment: {
    id: string;
    patient_name: string;
    doctor_name: string;
    status: string;
    date: string;
    time: string;
  };
  timestamp: string;
}

interface QueueUpdate {
  queue: Array<{
    position: number;
    patient_name: string;
    student_id: string;
    doctor: string;
    estimated_time: string;
    priority: string;
    status: string;
  }>;
  total_waiting: number;
  last_updated: string;
}

interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error" | "appointment" | "medical";
  title: string;
  message: string;
  created_at: string;
  read_at?: string;
  data?: any;
}

interface WalkInPatientUpdate {
  patient: {
    id: string;
    patient_name: string;
    student_id: string;
    queue_number: number;
    status: string;
    urgency: string;
  };
  action: "registered" | "called" | "in_progress" | "completed";
  timestamp: string;
}

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 2; // Reduced from 5 to 2
  private reconnectDelay = 5000; // Increased from 1000 to 5000
  private connectionListeners: Array<(connected: boolean) => void> = [];
  private joinedChannels: Set<string> = new Set();
  private isWebSocketEnabled = false;
  private hasLoggedDisabled = false; // Prevent spam logging

  // Check if WebSocket should be enabled
  private shouldEnableWebSocket(): boolean {
    const wsUrl = import.meta.env.VITE_WS_URL;
    // Only enable if WS_URL is explicitly set and not pointing to Laravel server
    return !!(wsUrl && wsUrl !== 'http://127.0.0.1:8000' && wsUrl.trim() !== '');
  }

  connect(): Promise<Socket> {
    return new Promise((resolve, reject) => {
      try {
        // Check if WebSocket should be enabled
        if (!this.shouldEnableWebSocket()) {
          if (!this.hasLoggedDisabled) {
            console.log('WebSocket disabled - no valid WS_URL configured or pointing to Laravel server');
            this.hasLoggedDisabled = true;
          }
          this.notifyConnectionListeners(false);
          reject(new Error("WebSocket not configured"));
          return;
        }

        const token = localStorage.getItem("token");
        const WS_URL = import.meta.env.VITE_WS_URL;

        if (!token) {
          reject(new Error("No authentication token found"));
          return;
        }

        this.socket = io(WS_URL, {
          auth: { token },
          transports: ["websocket", "polling"],
          timeout: 10000, // Reduced timeout
          forceNew: true,
          reconnection: false, // Disable automatic reconnection to control it manually
        });

        this.socket.on("connect", () => {
          console.log("WebSocket connected");
          this.reconnectAttempts = 0;
          this.isWebSocketEnabled = true;
          this.notifyConnectionListeners(true);
          this.rejoinChannels();
          resolve(this.socket!);
        });

        this.socket.on("connect_error", (error: Error) => {
          console.warn("WebSocket unavailable (this is normal if no WebSocket server is running)");
          this.isWebSocketEnabled = false;
          this.notifyConnectionListeners(false);
          this.handleReconnect();
          reject(error);
        });

        this.socket.on("disconnect", (reason: Socket.DisconnectReason) => {
          console.log("WebSocket disconnected:", reason);
          this.isWebSocketEnabled = false;
          this.notifyConnectionListeners(false);

          if (reason === "io server disconnect") {
            this.handleReconnect();
          }
        });

        this.socket.on("error", (error: any) => {
          console.warn("WebSocket error (continuing without real-time features)");
        });

        this.socket.on("auth_error", (error: any) => {
          console.error("WebSocket authentication error:", error);
          localStorage.removeItem("token");
          window.location.href = "/login";
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`WebSocket reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);

      setTimeout(() => {
        this.connect().catch(() => {
          // Silently fail
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.log("WebSocket unavailable - operating without real-time features");
      this.notifyConnectionListeners(false);
    }
  }

  private notifyConnectionListeners(connected: boolean): void {
    this.connectionListeners.forEach((listener) => {
      try {
        listener(connected);
      } catch (error) {
        console.error("Error in connection listener:", error);
      }
    });
  }

  private rejoinChannels(): void {
    this.joinedChannels.forEach((channel) => {
      if (this.socket) {
        this.socket.emit("join", channel);
      }
    });
  }

  onConnectionChange(callback: (connected: boolean) => void): void {
    this.connectionListeners.push(callback);
  }

  offConnectionChange(callback: (connected: boolean) => void): void {
    const index = this.connectionListeners.indexOf(callback);
    if (index > -1) {
      this.connectionListeners.splice(index, 1);
    }
  }

  // All the following methods check connection status before attempting to use socket
  onDashboardStatsUpdate(callback: (stats: DashboardStats) => void): void {
    if (this.isConnected()) {
      this.socket?.on("dashboard.updated", callback);
    }
  }

  onNewAppointment(callback: (appointment: AppointmentUpdate) => void): void {
    if (this.isConnected()) {
      this.socket?.on("appointment.created", callback);
    }
  }

  onAppointmentUpdate(callback: (appointment: AppointmentUpdate) => void): void {
    if (this.isConnected()) {
      this.socket?.on("appointment.updated", callback);
    }
  }

  onQueueUpdate(callback: (queue: QueueUpdate) => void): void {
    if (this.isConnected()) {
      this.socket?.on("queue.updated", callback);
    }
  }

  onWalkInPatientUpdate(callback: (update: WalkInPatientUpdate) => void): void {
    if (this.isConnected()) {
      this.socket?.on("walkin.updated", callback);
    }
  }

  onNotification(callback: (notification: Notification) => void): void {
    if (this.isConnected()) {
      this.socket?.on("notification", callback);
    }
  }

  onMedicationAlert(callback: (alert: any) => void): void {
    if (this.isConnected()) {
      this.socket?.on("medication.alert", callback);
    }
  }

  onVitalSignsAlert(callback: (alert: any) => void): void {
    if (this.isConnected()) {
      this.socket?.on("vitals.alert", callback);
    }
  }

  joinChannel(channel: string): void {
    if (this.socket && this.isConnected()) {
      this.socket.emit("join", channel);
      this.joinedChannels.add(channel);
      console.log(`Joined channel: ${channel}`);
    } else {
      // Store channel for later if WebSocket becomes available
      this.joinedChannels.add(channel);
    }
  }

  leaveChannel(channel: string): void {
    if (this.socket && this.isConnected()) {
      this.socket.emit("leave", channel);
    }
    this.joinedChannels.delete(channel);
  }

  getJoinedChannels(): string[] {
    return Array.from(this.joinedChannels);
  }

  sendToChannel(channel: string, event: string, data: any): void {
    if (this.isConnected()) {
      this.socket?.emit("to_channel", { channel, event, data });
    }
  }

  markNotificationRead(notificationId: string): void {
    if (this.isConnected()) {
      this.socket?.emit("notification.read", { id: notificationId });
    }
  }

  requestDashboardStats(): void {
    if (this.isConnected()) {
      this.socket?.emit("dashboard.request_stats");
    }
  }

  requestQueueStatus(): void {
    if (this.isConnected()) {
      this.socket?.emit("queue.request_status");
    }
  }

  ping(): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected()) {
        reject(new Error("Socket not connected"));
        return;
      }

      const startTime = Date.now();

      this.socket.emit("ping", () => {
        const latency = Date.now() - startTime;
        resolve(latency);
      });

      setTimeout(() => {
        reject(new Error("Ping timeout"));
      }, 5000);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.joinedChannels.forEach((channel) => {
        this.socket?.emit("leave", channel);
      });

      this.socket.disconnect();
      this.socket = null;
      this.joinedChannels.clear();
      this.isWebSocketEnabled = false;
      this.notifyConnectionListeners(false);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  getLatency(): number | null {
    return (this.socket as any)?.ping || null;
  }

  off(event: string, callback?: (...args: any[]) => void): void {
    this.socket?.off(event, callback);
  }

  removeAllListeners(event?: string): void {
    this.socket?.removeAllListeners(event);
  }

  getConnectionInfo(): {
    connected: boolean;
    reconnectAttempts: number;
    joinedChannels: string[];
    latency: number | null;
    enabled: boolean;
  } {
    return {
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      joinedChannels: this.getJoinedChannels(),
      latency: this.getLatency(),
      enabled: this.isWebSocketEnabled,
    };
  }

  // Method to try connecting without throwing errors
  tryConnect(): void {
    if (this.shouldEnableWebSocket() && !this.isConnected() && this.reconnectAttempts === 0) {
      this.connect().catch(() => {
        // Silently fail - WebSocket is optional
      });
    }
  }
}

export default new WebSocketService();