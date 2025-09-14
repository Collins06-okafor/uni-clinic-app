// src/constants/appointmentStatuses.ts
export type UserRole = 'student' | 'doctor' | 'clinical_staff' | 'admin' | 'academic_staff' | 'superadmin';

export interface User {
  id: number;
  name: string;
  email?: string;
  role: UserRole;
}

export interface Appointment {
  id?: number;
  patient_id: number;
  doctor_id?: number;
  doctor?: User;
  created_at?: string;
  reviewed_at?: string;
  assigned_at?: string;
  confirmed_at?: string;
  completed_at?: string;
  priority?: 'urgent' | 'high' | 'normal' | 'low';
}

export interface Action {
  action: string;
  label: string;
  class: string;
  nextStatus: string;
}

export const APPOINTMENT_STATUSES = {
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  ASSIGNED: 'assigned',
  REJECTED: 'rejected',
  CONFIRMED: 'confirmed',
  RESCHEDULED: 'rescheduled',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[keyof typeof APPOINTMENT_STATUSES];

// Change these to accept string instead of AppointmentStatus
export const getStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    [APPOINTMENT_STATUSES.PENDING]: 'Pending Review',
    [APPOINTMENT_STATUSES.UNDER_REVIEW]: 'Under Review',
    [APPOINTMENT_STATUSES.ASSIGNED]: 'Assigned to Doctor',
    [APPOINTMENT_STATUSES.REJECTED]: 'Rejected',
    [APPOINTMENT_STATUSES.CONFIRMED]: 'Confirmed',
    [APPOINTMENT_STATUSES.RESCHEDULED]: 'Rescheduled',
    [APPOINTMENT_STATUSES.COMPLETED]: 'Completed',
    [APPOINTMENT_STATUSES.CANCELLED]: 'Cancelled'
  };
  return statusMap[status] || status;
};

export const getStatusBadgeClass = (status: string): string => {
  const badgeMap: Record<string, string> = {
    [APPOINTMENT_STATUSES.PENDING]: 'badge bg-warning text-dark',
    [APPOINTMENT_STATUSES.UNDER_REVIEW]: 'badge bg-info',
    [APPOINTMENT_STATUSES.ASSIGNED]: 'badge bg-primary',
    [APPOINTMENT_STATUSES.REJECTED]: 'badge bg-danger',
    [APPOINTMENT_STATUSES.CONFIRMED]: 'badge bg-success',
    [APPOINTMENT_STATUSES.RESCHEDULED]: 'badge bg-secondary',
    [APPOINTMENT_STATUSES.COMPLETED]: 'badge bg-dark',
    [APPOINTMENT_STATUSES.CANCELLED]: 'badge bg-secondary'
  };
  return badgeMap[status] || 'badge bg-secondary';
};

export const STATUS_WORKFLOW: Record<AppointmentStatus, AppointmentStatus[]> = {
  [APPOINTMENT_STATUSES.PENDING]: [APPOINTMENT_STATUSES.UNDER_REVIEW],
  [APPOINTMENT_STATUSES.UNDER_REVIEW]: [APPOINTMENT_STATUSES.ASSIGNED, APPOINTMENT_STATUSES.REJECTED],
  [APPOINTMENT_STATUSES.ASSIGNED]: [APPOINTMENT_STATUSES.CONFIRMED, APPOINTMENT_STATUSES.RESCHEDULED, APPOINTMENT_STATUSES.REJECTED],
  [APPOINTMENT_STATUSES.CONFIRMED]: [APPOINTMENT_STATUSES.COMPLETED, APPOINTMENT_STATUSES.CANCELLED],
  [APPOINTMENT_STATUSES.RESCHEDULED]: [APPOINTMENT_STATUSES.CONFIRMED, APPOINTMENT_STATUSES.CANCELLED],
  [APPOINTMENT_STATUSES.REJECTED]: [],
  [APPOINTMENT_STATUSES.COMPLETED]: [],
  [APPOINTMENT_STATUSES.CANCELLED]: []
};

// Rest of your functions remain the same...

export const canTransitionTo = (currentStatus: AppointmentStatus, newStatus: AppointmentStatus): boolean => {
  const allowedTransitions = STATUS_WORKFLOW[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
};

export const getAvailableActions = (status: AppointmentStatus, userRole: UserRole): Action[] => {
  const actions: Action[] = [];

  if (userRole === 'clinical_staff') {
    switch (status) {
      case APPOINTMENT_STATUSES.PENDING:
        actions.push({
          action: 'review',
          label: 'Start Review',
          class: 'btn-info',
          nextStatus: APPOINTMENT_STATUSES.UNDER_REVIEW
        });
        break;
      case APPOINTMENT_STATUSES.UNDER_REVIEW:
        actions.push(
          {
            action: 'assign',
            label: 'Assign to Doctor',
            class: 'btn-primary',
            nextStatus: APPOINTMENT_STATUSES.ASSIGNED
          },
          {
            action: 'reject',
            label: 'Reject',
            class: 'btn-danger',
            nextStatus: APPOINTMENT_STATUSES.REJECTED
          }
        );
        break;
      case APPOINTMENT_STATUSES.ASSIGNED:
        actions.push({
          action: 'reassign',
          label: 'Reassign',
          class: 'btn-warning',
          nextStatus: APPOINTMENT_STATUSES.ASSIGNED
        });
        break;
    }
  }

  if (userRole === 'doctor') {
    switch (status) {
      case APPOINTMENT_STATUSES.ASSIGNED:
        actions.push(
          {
            action: 'confirm',
            label: 'Confirm',
            class: 'btn-success',
            nextStatus: APPOINTMENT_STATUSES.CONFIRMED
          },
          {
            action: 'reschedule',
            label: 'Reschedule',
            class: 'btn-warning',
            nextStatus: APPOINTMENT_STATUSES.RESCHEDULED
          }
        );
        break;
      case APPOINTMENT_STATUSES.CONFIRMED:
        actions.push(
          {
            action: 'complete',
            label: 'Mark Complete',
            class: 'btn-success',
            nextStatus: APPOINTMENT_STATUSES.COMPLETED
          },
          {
            action: 'cancel',
            label: 'Cancel',
            class: 'btn-danger',
            nextStatus: APPOINTMENT_STATUSES.CANCELLED
          }
        );
        break;
    }
  }

  return actions;
};

interface NotificationData {
  doctorName?: string;
  date?: string;
  time?: string;
  newDate?: string;
  newTime?: string;
  rejectionReason?: string;
  cancelReason?: string;
}

export const getNotificationMessage = (status: AppointmentStatus, data: NotificationData = {}) => {
  const messages: Record<AppointmentStatus, { title: string; message: string; type: string }> = {
    [APPOINTMENT_STATUSES.PENDING]: {
      title: 'Appointment Request Submitted',
      message: 'Your appointment request has been submitted and is pending review by clinical staff.',
      type: 'info'
    },
    [APPOINTMENT_STATUSES.UNDER_REVIEW]: {
      title: 'Appointment Under Review',
      message: 'Clinical staff is reviewing your appointment request.',
      type: 'info'
    },
    [APPOINTMENT_STATUSES.ASSIGNED]: {
      title: 'Appointment Assigned',
      message: `Your appointment has been assigned to Dr. ${data.doctorName}. Awaiting doctor confirmation.`,
      type: 'info'
    },
    [APPOINTMENT_STATUSES.REJECTED]: {
      title: 'Appointment Rejected',
      message: `Your appointment request has been rejected. Reason: ${data.rejectionReason}`,
      type: 'error'
    },
    [APPOINTMENT_STATUSES.CONFIRMED]: {
      title: 'Appointment Confirmed',
      message: `Your appointment with Dr. ${data.doctorName} is confirmed for ${data.date} at ${data.time}.`,
      type: 'success'
    },
    [APPOINTMENT_STATUSES.RESCHEDULED]: {
      title: 'Appointment Rescheduled',
      message: `Dr. ${data.doctorName} has requested to reschedule your appointment. New time: ${data.newDate} at ${data.newTime}.`,
      type: 'warning'
    },
    [APPOINTMENT_STATUSES.COMPLETED]: {
      title: 'Appointment Completed',
      message: 'Your appointment has been completed successfully.',
      type: 'success'
    },
    [APPOINTMENT_STATUSES.CANCELLED]: {
      title: 'Appointment Cancelled',
      message: `Your appointment has been cancelled. ${data.cancelReason ? 'Reason: ' + data.cancelReason : ''}`,
      type: 'error'
    }
  };

  return messages[status] || {
    title: 'Appointment Updated',
    message: 'Your appointment status has been updated.',
    type: 'info'
  };
};

export const canViewAppointment = (appointment: Appointment, user: User): boolean => {
  if (appointment.patient_id === user.id) return true;
  if (user.role === 'doctor' && appointment.doctor_id === user.id) return true;
  if (user.role === 'clinical_staff') return true;
  if (user.role === 'admin') return true;
  return false;
};

export const getPriorityBadge = (priority: 'urgent' | 'high' | 'normal' | 'low'): { class: string; text: string } => {
  const badges = {
    urgent: { class: 'badge bg-danger', text: 'Urgent' },
    high: { class: 'badge bg-warning text-dark', text: 'High' },
    normal: { class: 'badge bg-success', text: 'Normal' },
    low: { class: 'badge bg-secondary', text: 'Low' }
  };
  return badges[priority] || badges.normal;
};

export const getAppointmentTimeline = (appointment: Appointment) => {
  const timeline: { status: AppointmentStatus; timestamp: string; title: string; description: string }[] = [];

  if (appointment.created_at) {
    timeline.push({
      status: APPOINTMENT_STATUSES.PENDING,
      timestamp: appointment.created_at,
      title: 'Request Submitted',
      description: 'Appointment request submitted by patient'
    });
  }

  if (appointment.reviewed_at) {
    timeline.push({
      status: APPOINTMENT_STATUSES.UNDER_REVIEW,
      timestamp: appointment.reviewed_at,
      title: 'Under Review',
      description: 'Clinical staff started reviewing the request'
    });
  }

  if (appointment.assigned_at) {
    timeline.push({
      status: APPOINTMENT_STATUSES.ASSIGNED,
      timestamp: appointment.assigned_at,
      title: 'Assigned to Doctor',
      description: `Assigned to Dr. ${appointment.doctor?.name}`
    });
  }

  if (appointment.confirmed_at) {
    timeline.push({
      status: APPOINTMENT_STATUSES.CONFIRMED,
      timestamp: appointment.confirmed_at,
      title: 'Confirmed',
      description: 'Doctor confirmed the appointment'
    });
  }

  if (appointment.completed_at) {
    timeline.push({
      status: APPOINTMENT_STATUSES.COMPLETED,
      timestamp: appointment.completed_at,
      title: 'Completed',
      description: 'Appointment completed successfully'
    });
  }

  return timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

export const getDoctorAvailabilityStatus = (doctor: User & { available_days?: string[]; working_hours_start?: string; working_hours_end?: string }, date: string, time: string) => {
  if (!doctor.available_days || doctor.available_days.length === 0) {
    return { available: false, reason: 'No availability set' };
  }

  const dayOfWeek = new Date(date).toLocaleDateString('en', { weekday: 'long' });
  if (!doctor.available_days.includes(dayOfWeek)) {
    return { available: false, reason: `Not available on ${dayOfWeek}` };
  }

  if (doctor.working_hours_start && doctor.working_hours_end) {
    const appointmentTime = new Date(`${date} ${time}`);
    const startTime = new Date(`${date} ${doctor.working_hours_start}`);
    const endTime = new Date(`${date} ${doctor.working_hours_end}`);

    if (appointmentTime < startTime || appointmentTime > endTime) {
      return {
        available: false,
        reason: `Outside working hours (${doctor.working_hours_start} - ${doctor.working_hours_end})`
      };
    }
  }

  return { available: true };
};

export const generateAppointmentRef = (): string => {
  const prefix = 'APT';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

export default {
  APPOINTMENT_STATUSES,
  STATUS_WORKFLOW,
  getStatusText,
  getStatusBadgeClass,
  canTransitionTo,
  getAvailableActions,
  getNotificationMessage,
  canViewAppointment,
  getPriorityBadge,
  getAppointmentTimeline,
  getDoctorAvailabilityStatus,
  generateAppointmentRef
};
