<?php

// Create this file: app/Events/AppointmentStatusUpdated.php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use App\Models\Appointment;

class AppointmentStatusUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $appointment;

    /**
     * Create a new event instance.
     */
    public function __construct(Appointment $appointment)
    {
        $this->appointment = $appointment->load(['patient', 'doctor']);
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('appointments'),
            new PrivateChannel('students'),
            new PrivateChannel('clinical-staff'),
            new PrivateChannel('user.' . $this->appointment->patient_id), // Personal channel for the student
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'appointment.updated';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'appointment' => [
                'id' => $this->appointment->id,
                'patient_id' => $this->appointment->patient_id,
                'doctor_id' => $this->appointment->doctor_id,
                'date' => $this->appointment->date,
                'time' => $this->appointment->time,
                'status' => $this->appointment->status,
                'urgency' => $this->appointment->urgency,
                'priority' => $this->appointment->priority,
                'specialization' => $this->appointment->specialization,
                'reason' => $this->appointment->reason,
                'type' => $this->appointment->type,
                'patient' => $this->appointment->patient ? [
                    'name' => $this->appointment->patient->name,
                    'student_id' => $this->appointment->patient->student_id
                ] : null,
                'doctor' => $this->appointment->doctor ? [
                    'name' => $this->appointment->doctor->name,
                    'specialization' => $this->appointment->doctor->specialization
                ] : null,
            ],
            'message' => $this->getStatusMessage(),
            'timestamp' => now()->toISOString()
        ];
    }

    /**
     * Get status-specific message
     */
    private function getStatusMessage(): string
    {
        switch ($this->appointment->status) {
            case 'scheduled':
                return 'Your appointment has been approved and scheduled';
            case 'assigned':
                return 'Your appointment has been assigned to a doctor';
            case 'rejected':
                return 'Your appointment request has been rejected';
            case 'confirmed':
                return 'Your appointment has been confirmed';
            case 'completed':
                return 'Your appointment has been completed';
            case 'cancelled':
                return 'Your appointment has been cancelled';
            default:
                return 'Your appointment status has been updated';
        }
    }
}