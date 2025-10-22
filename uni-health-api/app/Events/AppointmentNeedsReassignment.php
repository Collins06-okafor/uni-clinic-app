<?php

namespace App\Events;

use App\Models\Appointment;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AppointmentNeedsReassignment implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $appointment;

    public function __construct(Appointment $appointment)
    {
        $this->appointment = $appointment->load('patient');
    }

    public function broadcastOn()
    {
        return new Channel('clinical-staff');
    }

    public function broadcastAs()
    {
        return 'appointment.needs.reassignment';
    }

    public function broadcastWith()
    {
        return [
            'appointment_id' => $this->appointment->id,
            'patient_name' => $this->appointment->patient->name,
            'priority' => $this->appointment->priority,
            'date' => $this->appointment->date,
            'time' => $this->appointment->time,
            'cancellation_reason' => $this->appointment->cancellation_reason
        ];
    }
}