<?php

namespace App\Jobs;

use App\Models\Notification;
use App\Mail\PatientRegistrationConfirmation;
use App\Mail\AppointmentConfirmation;
use App\Mail\ClinicalStaffNewPatientNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

class SendNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $notificationId;
    public $method;

    public function __construct(int $notificationId, string $method = 'email')
    {
        $this->notificationId = $notificationId;
        $this->method = $method;
    }

    public function handle(): void
    {
        $notification = Notification::with('user')->find($this->notificationId);
        
        if (!$notification) {
            return;
        }

        try {
            switch ($this->method) {
                case 'email':
                    $this->sendEmail($notification);
                    break;
                case 'sms':
                    $this->sendSMS($notification);
                    break;
                case 'push':
                    $this->sendPushNotification($notification);
                    break;
            }

            $notification->update([
                'status' => 'sent',
                'sent_at' => now()
            ]);

        } catch (\Exception $e) {
            $notification->update([
                'status' => 'failed',
                'data' => array_merge($notification->data ?? [], [
                    'error' => $e->getMessage(),
                    'failed_at' => now()->toISOString()
                ])
            ]);

            \Log::error('Notification sending failed', [
                'notification_id' => $this->notificationId,
                'method' => $this->method,
                'error' => $e->getMessage()
            ]);
        }
    }

    private function sendEmail(Notification $notification): void
    {
        $user = $notification->user;
        $locale = $notification->locale;

        switch ($notification->category) {
            case 'registration':
                if ($user->role === 'clinical_staff') {
                    $patientId = $notification->data['new_patient_id'] ?? null;
                    if ($patientId) {
                        $patient = \App\Models\User::find($patientId);
                        if ($patient) {
                            Mail::to($user->email)->send(new ClinicalStaffNewPatientNotification($patient, $locale));
                        }
                    }
                } else {
                    Mail::to($user->email)->send(new PatientRegistrationConfirmation($user, $locale));
                }
                break;

            case 'appointment':
                $appointmentId = $notification->data['appointment_id'] ?? null;
                if ($appointmentId) {
                    $appointment = \App\Models\Appointment::with(['patient', 'doctor'])->find($appointmentId);
                    if ($appointment) {
                        $recipientType = $user->id === $appointment->patient_id ? 'patient' : 'doctor';
                        Mail::to($user->email)->send(new AppointmentConfirmation($appointment, $recipientType, $locale));
                    }
                }
                break;

            default:
                // Generic email for other categories
                Mail::to($user->email)->send(new \App\Mail\GenericNotification($notification));
                break;
        }
    }

    private function sendSMS(Notification $notification): void
    {
        // Implement SMS sending logic here
        // You can use services like Twilio, Nexmo, etc.
        \Log::info('SMS notification would be sent', [
            'to' => $notification->user->phone,
            'message' => $notification->message
        ]);
    }

    private function sendPushNotification(Notification $notification): void
    {
        // Implement push notification logic here
        // You can use Firebase Cloud Messaging, OneSignal, etc.
        \Log::info('Push notification would be sent', [
            'user_id' => $notification->user_id,
            'title' => $notification->title,
            'message' => $notification->message
        ]);
    }
}