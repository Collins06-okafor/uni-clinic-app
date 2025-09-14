<?php

namespace App\Events;

use App\Models\Appointment;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewAppointmentCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $appointment;

    public function __construct(Appointment $appointment)
    {
        $this->appointment = $appointment;
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('appointments'),
            new PrivateChannel('doctor.' . $this->appointment->doctor_id),
            new PrivateChannel('clinical-staff'),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'appointment.created';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'appointment' => [
                'id' => $this->appointment->id,
                'patient_name' => $this->appointment->patient->name,
                'doctor_name' => $this->appointment->doctor->name,
                'date' => $this->appointment->date,
                'time' => $this->appointment->time,
                'status' => $this->appointment->status,
                'reason' => $this->appointment->reason,
            ],
            'timestamp' => now()->toISOString(),
        ];
    }
}