<?php
// uni-health-api\app\Mail\PatientRegistrationConfirmation.php

namespace App\Mail;

use App\Models\User;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class PatientRegistrationConfirmation extends LocalizedMail
{
    public $patient;

    public function __construct(User $patient, $locale = 'en')
    {
        parent::__construct($locale);
        $this->patient = $patient;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->getLocalizedSubject('mail.registration_confirmed', [
                'app_name' => config('app.name')
            ])
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.patient-registration-confirmation',
            with: array_merge($this->getCommonEmailData(), [
                'patient' => $this->patient,
                'patient_name' => $this->patient->name,
                'student_id' => $this->patient->student_id,
                'department' => $this->patient->department,
                
                // Localized content
                'welcome_message' => $this->trans('mail.welcome_to_health_center'),
                'registration_success' => $this->trans('mail.registration_successful'),
                'next_steps_title' => $this->trans('mail.next_steps'),
                'next_steps' => [
                    $this->trans('mail.next_step_1'),
                    $this->trans('mail.next_step_2'),
                    $this->trans('mail.next_step_3'),
                ],
                'login_instructions' => $this->trans('mail.login_instructions'),
                'portal_url' => config('app.frontend_url', 'http://localhost:3000'),
                'support_info' => $this->trans('mail.support_info'),
            ])
        );
    }
}