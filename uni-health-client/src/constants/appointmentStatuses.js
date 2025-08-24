// Enhanced appointmentStatuses.js
export const APPOINTMENT_STATUSES = {
  PENDING: 'pending',           // Student/Staff requested, awaiting clinical staff review
  UNDER_REVIEW: 'under_review', // Clinical staff is reviewing
  ASSIGNED: 'assigned',         // Clinical staff assigned to doctor
  REJECTED: 'rejected',         // Clinical staff rejected with reason
  CONFIRMED: 'confirmed',       // Doctor confirmed the schedule
  RESCHEDULED: 'rescheduled',   // Doctor requested reschedule
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Status workflow progression
export const STATUS_WORKFLOW = {
  [APPOINTMENT_STATUSES.PENDING]: [APPOINTMENT_STATUSES.UNDER_REVIEW],
  [APPOINTMENT_STATUSES.UNDER_REVIEW]: [APPOINTMENT_STATUSES.ASSIGNED, APPOINTMENT_STATUSES.REJECTED],
  [APPOINTMENT_STATUSES.ASSIGNED]: [APPOINTMENT_STATUSES.CONFIRMED, APPOINTMENT_STATUSES.RESCHEDULED, APPOINTMENT_STATUSES.REJECTED],
  [APPOINTMENT_STATUSES.CONFIRMED]: [APPOINTMENT_STATUSES.COMPLETED, APPOINTMENT_STATUSES.CANCELLED],
  [APPOINTMENT_STATUSES.RESCHEDULED]: [APPOINTMENT_STATUSES.CONFIRMED, APPOINTMENT_STATUSES.CANCELLED],
  [APPOINTMENT_STATUSES.REJECTED]: [], // Terminal state
  [APPOINTMENT_STATUSES.COMPLETED]: [], // Terminal state
  [APPOINTMENT_STATUSES.CANCELLED]: []  // Terminal state
};

// Get status text for display
export const getStatusText = (status) => {
  const statusMap = {
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

// Get status badge class for UI styling
export const getStatusBadgeClass = (status) => {
  const badgeMap = {
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

// Check if status transition is allowed
export const canTransitionTo = (currentStatus, newStatus) => {
  const allowedTransitions = STATUS_WORKFLOW[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
};

// Get available actions for a status (for Clinical Staff)
export const getAvailableActions = (status, userRole) => {
  const actions = [];
  
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

// Notification messages for status changes
export const getNotificationMessage = (status, data = {}) => {
  const messages = {
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

// Check if user can view appointment details
export const canViewAppointment = (appointment, user) => {
  // Patient can always view their own appointments
  if (appointment.patient_id === user.id) return true;
  
  // Doctor can view assigned appointments
  if (user.role === 'doctor' && appointment.doctor_id === user.id) return true;
  
  // Clinical staff can view all appointments
  if (user.role === 'clinical_staff') return true;
  
  // Admin can view all appointments
  if (user.role === 'admin') return true;
  
  return false;
};

// Get priority level styling
export const getPriorityBadge = (priority) => {
  const badges = {
    urgent: { class: 'badge bg-danger', text: 'Urgent' },
    high: { class: 'badge bg-warning text-dark', text: 'High' },
    normal: { class: 'badge bg-success', text: 'Normal' },
    low: { class: 'badge bg-secondary', text: 'Low' }
  };
  return badges[priority] || badges.normal;
};

// Calculate appointment timeline
export const getAppointmentTimeline = (appointment) => {
  const timeline = [];
  
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
  
  return timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
};

// Doctor availability helper
export const getDoctorAvailabilityStatus = (doctor, date, time) => {
  // Check if doctor has set available days
  if (!doctor.available_days || doctor.available_days.length === 0) {
    return { available: false, reason: 'No availability set' };
  }
  
  const dayOfWeek = new Date(date).toLocaleDateString('en', { weekday: 'long' });
  
  if (!doctor.available_days.includes(dayOfWeek)) {
    return { available: false, reason: `Not available on ${dayOfWeek}` };
  }
  
  // Check working hours
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

// Generate appointment reference number
export const generateAppointmentRef = () => {
  const prefix = 'APT';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
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