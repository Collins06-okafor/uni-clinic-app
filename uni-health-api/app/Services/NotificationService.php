<?php

namespace App\Services;

use App\Models\User;
use App\Models\Appointment;
use App\Models\Notification;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use App\Mail\PatientRegistrationConfirmation;
use App\Mail\AppointmentConfirmation;
use App\Mail\ClinicalStaffNewPatientNotification;
use App\Jobs\SendNotificationJob;

class NotificationService
{
    /**
     * Send patient registration confirmation
     */
    public function sendRegistrationConfirmation(User $patient, string $locale = 'en')
    {
        // Create notification record
        $notification = Notification::create([
            'user_id' => $patient->id,
            'type' => 'email',
            'category' => 'registration',
            'title' => __('mail.registration_confirmed', ['app_name' => config('app.name')], $locale),
            'message' => __('mail.welcome_to_health_center', [], $locale),
            'data' => [
                'patient_id' => $patient->id,
                'registration_date' => now()->toISOString()
            ],
            'delivery_method' => 'email',
            'locale' => $locale,
            'status' => 'pending'
        ]);

        // Queue email for sending
        Queue::push(new SendNotificationJob($notification->id, 'email'));

        // Also create in-app notification
        $this->createInAppNotification($patient, [
            'title' => __('messages.welcome_patient', [], $locale),
            'message' => __('mail.registration_successful', [], $locale),
            'category' => 'registration',
            'locale' => $locale
        ]);

        return $notification;
    }

    /**
     * Send appointment confirmation
     */
    public function sendAppointmentConfirmation(Appointment $appointment, string $locale = 'en')
    {
        // Send to patient
        $patientNotification = Notification::create([
            'user_id' => $appointment->patient_id,
            'type' => 'email',
            'category' => 'appointment',
            'title' => __('mail.appointment_confirmed_patient', ['date' => $appointment->date->format('d/m/Y')], $locale),
            'message' => __('messages.appointment_created', [], $locale),
            'data' => [
                'appointment_id' => $appointment->id,
                'appointment_date' => $appointment->date->format('Y-m-d'),
                'appointment_time' => $appointment->time,
                'doctor_name' => $appointment->doctor->name
            ],
            'delivery_method' => 'email',
            'locale' => $locale,
            'status' => 'pending'
        ]);

        // Send to doctor
        $doctorNotification = Notification::create([
            'user_id' => $appointment->doctor_id,
            'type' => 'email',
            'category' => 'appointment',
            'title' => __('mail.appointment_confirmed_doctor', ['date' => $appointment->date->format('d/m/Y')], $locale),
            'message' => __('mail.new_patient_registered', [], $locale),
            'data' => [
                'appointment_id' => $appointment->id,
                'patient_name' => $appointment->patient->name,
                'appointment_date' => $appointment->date->format('Y-m-d'),
                'appointment_time' => $appointment->time
            ],
            'delivery_method' => 'email',
            'locale' => $locale,
            'status' => 'pending'
        ]);

        // Queue emails
        Queue::push(new SendNotificationJob($patientNotification->id, 'email'));
        Queue::push(new SendNotificationJob($doctorNotification->id, 'email'));

        return [$patientNotification, $doctorNotification];
    }

    /**
     * Notify clinical staff of new patient registration
     */
    public function notifyClinicalStaffNewPatient(User $newPatient, string $locale = 'en')
    {
        $clinicalStaff = User::where('role', 'clinical_staff')
            ->where('status', 'active')
            ->get();

        $notifications = [];

        foreach ($clinicalStaff as $staff) {
            $notification = Notification::create([
                'user_id' => $staff->id,
                'type' => 'email',
                'category' => 'registration',
                'title' => __('mail.new_patient_registered', [], $locale),
                'message' => __('mail.doctor_notification_message', [], $locale),
                'data' => [
                    'new_patient_id' => $newPatient->id,
                    'patient_name' => $newPatient->name,
                    'patient_role' => $newPatient->role,
                    'registration_date' => now()->toISOString()
                ],
                'delivery_method' => 'email',
                'locale' => $locale,
                'status' => 'pending'
            ]);

            Queue::push(new SendNotificationJob($notification->id, 'email'));
            $notifications[] = $notification;

            // Also create in-app notification
            $this->createInAppNotification($staff, [
                'title' => __('mail.new_patient_registered', [], $locale),
                'message' => "{$newPatient->name} has registered and may need attention.",
                'category' => 'registration',
                'locale' => $locale,
                'data' => ['patient_id' => $newPatient->id]
            ]);
        }

        return $notifications;
    }

    /**
     * Send appointment reminder (24 hours before)
     */
    public function scheduleAppointmentReminder(Appointment $appointment, string $locale = 'en')
    {
        $reminderTime = $appointment->date->copy()->subDay()->setTime(18, 0); // 6 PM day before

        $notification = Notification::create([
            'user_id' => $appointment->patient_id,
            'type' => 'email',
            'category' => 'appointment',
            'title' => __('mail.appointment_reminder', [], $locale),
            'message' => __('mail.reminder_message', [], $locale),
            'data' => [
                'appointment_id' => $appointment->id,
                'appointment_date' => $appointment->date->format('Y-m-d'),
                'appointment_time' => $appointment->time,
                'doctor_name' => $appointment->doctor->name
            ],
            'delivery_method' => 'email',
            'locale' => $locale,
            'status' => 'scheduled'
        ]);

        // Schedule for later sending
        Queue::later($reminderTime, new SendNotificationJob($notification->id, 'email'));

        return $notification;
    }

    /**
     * Send bulk notification (for admin use)
     */
    public function sendBulkNotification(array $userIds, string $title, string $message, array $options = [])
    {
        $locale = $options['locale'] ?? 'en';
        $category = $options['category'] ?? 'system';
        $deliveryMethod = $options['delivery_method'] ?? 'email';

        $notifications = [];

        foreach ($userIds as $userId) {
            $notification = Notification::create([
                'user_id' => $userId,
                'type' => $deliveryMethod,
                'category' => $category,
                'title' => $title,
                'message' => $message,
                'data' => $options['data'] ?? [],
                'delivery_method' => $deliveryMethod,
                'locale' => $locale,
                'status' => 'pending'
            ]);

            if ($deliveryMethod === 'email') {
                Queue::push(new SendNotificationJob($notification->id, 'email'));
            }

            $notifications[] = $notification;
        }

        return $notifications;
    }

    /**
     * Create in-app notification
     */
    public function createInAppNotification(User $user, array $data)
    {
        return Notification::create([
            'user_id' => $user->id,
            'type' => 'in_app',
            'category' => $data['category'] ?? 'general',
            'title' => $data['title'],
            'message' => $data['message'],
            'data' => $data['data'] ?? [],
            'delivery_method' => 'in_app',
            'locale' => $data['locale'] ?? 'en',
            'status' => 'sent'
        ]);
    }

    /**
     * Mark notification as read
     */
    public function markAsRead(int $notificationId, int $userId)
    {
        return Notification::where('id', $notificationId)
            ->where('user_id', $userId)
            ->update([
                'status' => 'read',
                'read_at' => now()
            ]);
    }

    /**
     * Get user notifications
     */
    public function getUserNotifications(int $userId, array $filters = [])
    {
        $query = Notification::where('user_id', $userId);

        if (isset($filters['type'])) {
            $query->where('type', $filters['type']);
        }

        if (isset($filters['category'])) {
            $query->where('category', $filters['category']);
        }

        if (isset($filters['unread_only']) && $filters['unread_only']) {
            $query->whereNull('read_at');
        }

        return $query->orderBy('created_at', 'desc')
                     ->paginate($filters['per_page'] ?? 20);
    }

    /**
     * Get notification statistics
     */
    public function getNotificationStats(int $userId)
    {
        return [
            'total' => Notification::where('user_id', $userId)->count(),
            'unread' => Notification::where('user_id', $userId)->whereNull('read_at')->count(),
            'failed' => Notification::where('user_id', $userId)->where('status', 'failed')->count(),
            'by_category' => Notification::where('user_id', $userId)
                ->groupBy('category')
                ->selectRaw('category, count(*) as count')
                ->pluck('count', 'category')
                ->toArray()
        ];
    }
}