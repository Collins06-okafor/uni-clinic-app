<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Appointment extends Model
{
    // Default status values
    const STATUS_SCHEDULED = 'scheduled';
    const STATUS_CONFIRMED = 'confirmed';
    const STATUS_COMPLETED = 'completed';
    const STATUS_CANCELLED = 'cancelled';
    const STATUS_NO_SHOW = 'no_show';
    

    // Priority levels
    const PRIORITY_NORMAL = 'normal';
    const PRIORITY_EMERGENCY = 'emergency';
    const PRIORITY_URGENT = 'urgent';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'patient_id',
        'doctor_id',
        'date',
        'time', // Consider adding if you need specific time
        'type',
        'reason',
        'status',
        'priority',
        'notes' // Optional field for doctor's notes
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'date' => 'date',
        'time' => 'datetime:H:i',  // Cast time properly
        'doctor_id' => 'integer'
    ];

    /**
     * Get the patient associated with the appointment.
     */
    public function patient()
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    /**
     * Get the doctor associated with the appointment.
     */
    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    /**
     * Scope for appointments belonging to a specific doctor.
     */
    public function scopeForDoctor($query, $doctorId)
    {
        return $query->where('doctor_id', $doctorId);
    }
    

    /**
     * Scope for today's appointments.
     */
    public function scopeToday($query)
    {
        return $query->whereDate('date', today());
    }

    /**
     * Scope for appointments on a specific date.
     */
    public function scopeOnDate($query, $date)
    {
        return $query->whereDate('date', $date);
    }

    /**
     * Scope for appointments within a week starting from a specific date.
     */
    public function scopeWeekStarting($query, $weekStart)
    {
        $startDate = Carbon::parse($weekStart);
        $endDate = $startDate->copy()->addWeek();
        
        return $query->whereBetween('date', [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')]);
    }

    /**
     * Scope for appointments with a specific status.
     */
    public function scopeWithStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope for completed appointments.
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', self::STATUS_COMPLETED);
    }

    /**
     * Scope for confirmed appointments.
     */
    public function scopeConfirmed($query)
    {
        return $query->where('status', self::STATUS_CONFIRMED);
    }

    /**
     * Scope for scheduled appointments.
     */
    public function scopeScheduled($query)
    {
        return $query->where('status', self::STATUS_SCHEDULED);
    }

    /**
     * Scope for cancelled appointments.
     */
    public function scopeCancelled($query)
    {
        return $query->where('status', self::STATUS_CANCELLED);
    }

    /**
     * Scope for no-show appointments.
     */
    public function scopeNoShow($query)
    {
        return $query->where('status', self::STATUS_NO_SHOW);
    }

    /**
     * Scope for emergency priority appointments.
     */
    public function scopeEmergency($query)
    {
        return $query->where('priority', self::PRIORITY_EMERGENCY);
    }

    /**
     * Scope for urgent priority appointments.
     */
    public function scopeUrgent($query)
    {
        return $query->where('priority', self::PRIORITY_URGENT);
    }

    /**
     * Scope for normal priority appointments.
     */
    public function scopeNormal($query)
    {
        return $query->where('priority', self::PRIORITY_NORMAL);
    }

    /**
     * Scope for appointments with a specific priority.
     */
    public function scopeWithPriority($query, $priority)
    {
        return $query->where('priority', $priority);
    }

    /**
     * Scope for upcoming appointments.
     */
    public function scopeUpcoming($query)
    {
        return $query->where('date', '>=', today())
                    ->whereIn('status', [self::STATUS_SCHEDULED, self::STATUS_CONFIRMED]);
    }

    /**
     * Scope for past appointments.
     */
    public function scopePast($query)
    {
        return $query->where('date', '<', today());
    }

    /**
     * Scope for appointments within a date range.
     */
    public function scopeBetweenDates($query, $startDate, $endDate)
    {
        return $query->whereBetween('date', [$startDate, $endDate]);
    }

    /**
     * Scope for appointments this month.
     */
    public function scopeThisMonth($query)
    {
        return $query->whereMonth('date', now()->month)
                    ->whereYear('date', now()->year);
    }

    /**
     * Scope for appointments this week.
     */
    public function scopeThisWeek($query)
    {
        return $query->whereBetween('date', [
            now()->startOfWeek()->format('Y-m-d'),
            now()->endOfWeek()->format('Y-m-d')
        ]);
    }

    /**
     * Check if the appointment is today.
     */
    public function isToday()
    {
        return $this->date->isToday();
    }

    /**
     * Check if the appointment is in the past.
     */
    public function isPast()
    {
        return $this->date->isPast();
    }

    /**
     * Check if the appointment is upcoming.
     */
    public function isUpcoming()
    {
        return $this->date->isFuture() && in_array($this->status, [self::STATUS_SCHEDULED, self::STATUS_CONFIRMED]);
    }

    /**
     * Check if the appointment is emergency priority.
     */
    public function isEmergency()
    {
        return $this->priority === self::PRIORITY_EMERGENCY;
    }

    /**
     * Check if the appointment is completed.
     */
    public function isCompleted()
    {
        return $this->status === self::STATUS_COMPLETED;
    }

    /**
     * Check if the appointment is confirmed.
     */
    public function isConfirmed()
    {
        return $this->status === self::STATUS_CONFIRMED;
    }

    /**
     * Mark appointment as completed.
     */
    public function markAsCompleted()
    {
        $this->update(['status' => self::STATUS_COMPLETED]);
        return $this;
    }

    /**
     * Mark appointment as confirmed.
     */
    public function markAsConfirmed()
    {
        $this->update(['status' => self::STATUS_CONFIRMED]);
        return $this;
    }

    /**
     * Cancel the appointment.
     */
    public function cancel()
    {
        $this->update(['status' => self::STATUS_CANCELLED]);
        return $this;
    }

    /**
     * Mark appointment as no-show.
     */
    public function markAsNoShow()
    {
        $this->update(['status' => self::STATUS_NO_SHOW]);
        return $this;
    }
}