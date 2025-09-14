<?php
// uni-health-api\app\Mail\AppointmentConfirmation.php

namespace App\Mail;

use App\Models\Appointment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class AppointmentConfirmation extends LocalizedMail
{
    public $appointment;
    public $recipientType; // 'patient' or 'doctor'

    public function __construct(Appointment $appointment, $recipientType = 'patient', $locale = 'en')
    {
        parent::__construct($locale);
        $this->appointment = $appointment;
        $this->recipientType = $recipientType;
    }

    public function envelope(): Envelope
    {
        $subjectKey = $this->recipientType === 'patient' 
            ? 'mail.appointment_confirmed_patient'
            : 'mail.appointment_confirmed_doctor';

        return new Envelope(
            subject: $this->getLocalizedSubject($subjectKey, [
                'date' => $this->appointment->date->format('d/m/Y')
            ])
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.appointment-confirmation',
            with: array_merge($this->getCommonEmailData(), [
                'appointment' => $this->appointment,
                'recipient_type' => $this->recipientType,
                'patient_name' => $this->appointment->patient->name,
                'doctor_name' => $this->appointment->doctor->name,
                'appointment_date' => $this->appointment->date->format('d/m/Y'),
                'appointment_time' => $this->appointment->time,
                'appointment_reason' => $this->appointment->reason,
                
                // Localized labels
                'date_label' => $this->trans('mail.date'),
                'time_label' => $this->trans('mail.time'),
                'doctor_label' => $this->trans('mail.doctor'),
                'patient_label' => $this->trans('mail.patient'),
                'reason_label' => $this->trans('mail.reason'),
                'appointment_details_title' => $this->trans('mail.appointment_details'),
                'what_to_bring' => $this->trans('mail.what_to_bring'),
                'cancellation_policy' => $this->trans('mail.cancellation_policy'),
            ])
        );
    }
}