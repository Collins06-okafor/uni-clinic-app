<?php
// resources/lang/en/mail.php
// COMPLETE VERSION with appointment request notification keys

return [
    // Common
    'greeting' => 'Dear :name',
    'regards' => 'Best regards',
    'footer' => 'University Health Center',
    'contact_info' => 'For questions, contact us at health@university.edu or +90 XXX XXX XX XX',
    
    // NEW: Greetings for different roles
    'greeting_clinical_staff' => 'Dear Clinical Staff',
    'greeting_patient' => 'Dear :name',
    'greeting_doctor' => 'Dear Dr. :name',
    
    // Registration
    'registration_confirmed' => 'Registration Confirmed - :app_name',
    'welcome_to_health_center' => 'Welcome to University Health Center!',
    'registration_successful' => 'Your registration has been successfully completed.',
    'next_steps' => 'Next Steps:',
    'next_step_1' => 'You can now log in to the patient portal',
    'next_step_2' => 'Schedule appointments online when available',
    'next_step_3' => 'Visit our center during operating hours: 8:00 AM - 5:00 PM',
    'login_instructions' => 'Use your student email and chosen password to log in.',
    'support_info' => 'If you need assistance, please contact our support team.',
    
    // Appointments - Existing
    'appointment_confirmed_patient' => 'Appointment Confirmed for :date',
    'appointment_confirmed_doctor' => 'New Patient Appointment - :date',
    'appointment_details' => 'Appointment Details',
    'date' => 'Date',
    'time' => 'Time',
    'doctor' => 'Doctor',
    'patient' => 'Patient',
    'reason' => 'Reason',
    'what_to_bring' => 'Please bring your student ID and any relevant medical records.',
    'cancellation_policy' => 'To cancel or reschedule, please contact us at least 24 hours in advance.',
    
    // NEW: Appointment Request Notifications (for clinical staff)
    'new_appointment_request' => 'New Appointment Request from :patient',
    'new_appointment_request_title' => 'New Appointment Request',
    'action_needed' => 'Action Required',
    'patient_details' => 'Patient Information',
    'assigned_doctor' => 'Assigned Doctor',
    'priority' => 'Priority',
    'view_and_confirm' => 'View Details & Confirm Appointment',
    'appointment_notification_footer' => 'This notification was sent because a new appointment request was created in the system.',
    
    // Reminders
    'appointment_reminder' => 'Appointment Reminder - Tomorrow',
    'reminder_message' => 'This is a reminder that you have an appointment tomorrow.',
    
    // Doctor notifications
    'new_patient_registered' => 'New Patient Registration',
    'doctor_notification_message' => 'A new patient has registered and may need medical attention.',
];