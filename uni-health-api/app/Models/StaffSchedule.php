<?php

// app/Models/StaffSchedule.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StaffSchedule extends Model
{
    protected $fillable = [
        'user_id',
        'department_id',
        'staff_type',
        'working_days',
        'working_hours_start',
        'working_hours_end',
        'custom_availability',
        'follows_academic_calendar',
        'is_active'
    ];

    protected $casts = [
        'working_days' => 'array',
        'working_hours_start' => 'datetime:H:i',
        'working_hours_end' => 'datetime:H:i',
        'custom_availability' => 'array',
        'follows_academic_calendar' => 'boolean',
        'is_active' => 'boolean'
    ];

    // Relationships
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByStaffType($query, $staffType)
    {
        return $query->where('staff_type', $staffType);
    }

    public function scopeFollowsAcademicCalendar($query)
    {
        return $query->where('follows_academic_calendar', true);
    }

    // Helper methods
    public function isAvailableOnDate($date)
    {
        if (!$this->is_active) {
            return false;
        }

        $dayOfWeek = Carbon::parse($date)->dayOfWeek;
        
        // Check if the day is in working days (1=Monday, 7=Sunday)
        if (!in_array($dayOfWeek, $this->working_days)) {
            return false;
        }

        // Check for holiday conflicts if following academic calendar
        if ($this->follows_academic_calendar) {
            $holidays = AcademicHoliday::active()
                ->blocksAppointments()
                ->forDate($date)
                ->affectsStaffType($this->staff_type)
                ->get();

            foreach ($holidays as $holiday) {
                if ($holiday->affectsDepartment($this->department_id)) {
                    return false;
                }
            }
        }

        return true;
    }

    public function getWorkingDaysNames()
    {
        $days = [
            1 => 'Monday',
            2 => 'Tuesday', 
            3 => 'Wednesday',
            4 => 'Thursday',
            5 => 'Friday',
            6 => 'Saturday',
            7 => 'Sunday'
        ];

        return collect($this->working_days)->map(fn($day) => $days[$day])->toArray();
    }
}