<?php
// app/Mail/AppointmentRequestNotification.php

namespace App\Mail;

use App\Models\Appointment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class AppointmentRequestNotification extends LocalizedMail
{
    public $appointment;
    public $actionUrl;

    public function __construct(Appointment $appointment, $locale = 'en')
    {
        parent::__construct($locale);
        $this->appointment = $appointment;
        $this->actionUrl = env('FRONTEND_URL') . '/appointments/' . $appointment->id;
    }

    public function envelope(): Envelope
    {
        $priority = $this->appointment->priority === 'emergency' ? '[URGENT] ' : 
                   ($this->appointment->priority === 'urgent' ? '[Priority] ' : '');

        return new Envelope(
            subject: $priority . $this->getLocalizedSubject('mail.new_appointment_request', [
                'patient' => $this->appointment->patient->name,
                'date' => $this->appointment->date->format('d/m/Y')
            ])
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.appointment-request',
            with: array_merge($this->getCommonEmailData(), [
                'appointment' => $this->appointment,
                'patient' => $this->appointment->patient,
                'doctor' => $this->appointment->doctor,
                'appointment_date' => $this->appointment->date->format('l, F d, Y'),
                'appointment_time' => $this->appointment->time,
                'priority' => $this->appointment->priority,
                'action_url' => $this->actionUrl,
                
                // Localized labels
                'greeting' => $this->trans('mail.greeting_clinical_staff'),
                'new_request_title' => $this->trans('mail.new_appointment_request_title'),
                'patient_details_title' => $this->trans('mail.patient_details'),
                'appointment_details_title' => $this->trans('mail.appointment_details'),
                'patient_label' => $this->trans('mail.patient'),
                'doctor_label' => $this->trans('mail.assigned_doctor'),
                'date_label' => $this->trans('mail.date'),
                'time_label' => $this->trans('mail.time'),
                'reason_label' => $this->trans('mail.reason'),
                'priority_label' => $this->trans('mail.priority'),
                'action_needed' => $this->trans('mail.action_needed'),
                'view_details_button' => $this->trans('mail.view_and_confirm'),
                'footer_note' => $this->trans('mail.appointment_notification_footer'),
            ])
        );
    }
}