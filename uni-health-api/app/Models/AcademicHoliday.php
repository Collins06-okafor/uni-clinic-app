<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AcademicHoliday extends Model
{
    protected $fillable = [
        'name',
        'description',
        'start_date',
        'end_date',
        'type',
        'affects_staff_type',
        'affected_departments',
        'blocks_appointments',
        'is_recurring',
        'recurrence_pattern',
        'academic_year',
        'source',
        'external_id',
        'is_active'
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'affected_departments' => 'array',
        'blocks_appointments' => 'boolean',
        'is_recurring' => 'boolean',
        'is_active' => 'boolean',
        'academic_year' => 'integer'
    ];

    // Relationships
    public function blockedAppointments(): HasMany
    {
        return $this->hasMany(Appointment::class, 'blocked_by_holiday_id');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeBlocksAppointments($query)
    {
        return $query->where('blocks_appointments', true);
    }

    public function scopeForDate($query, $date)
    {
        return $query->where('start_date', '<=', $date)
                    ->where('end_date', '>=', $date);
    }

    public function scopeForDateRange($query, $startDate, $endDate)
    {
        return $query->where(function($q) use ($startDate, $endDate) {
            $q->whereBetween('start_date', [$startDate, $endDate])
              ->orWhereBetween('end_date', [$startDate, $endDate])
              ->orWhere(function($q2) use ($startDate, $endDate) {
                  $q2->where('start_date', '<=', $startDate)
                     ->where('end_date', '>=', $endDate);
              });
        });
    }

    public function scopeAffectsStaffType($query, $staffType)
    {
        return $query->where(function($q) use ($staffType) {
            $q->where('affects_staff_type', 'all')
              ->orWhere('affects_staff_type', $staffType);
        });
    }

    public function scopeCurrentAcademicYear($query)
    {
        $currentYear = now()->year;
        return $query->where('academic_year', $currentYear);
    }

    // Helper methods
    public function isActiveOnDate($date)
    {
        $checkDate = Carbon::parse($date);
        return $this->is_active && 
               $checkDate->between($this->start_date, $this->end_date);
    }

    public function affectsDepartment($departmentId)
    {
        if (empty($this->affected_departments)) {
            return true; // Affects all departments
        }
        
        return in_array($departmentId, $this->affected_departments);
    }

    public function affectsStaff($staffType)
    {
        return $this->affects_staff_type === 'all' || 
               $this->affects_staff_type === $staffType;
    }

    public function getDurationInDays()
    {
        return $this->start_date->diffInDays($this->end_date) + 1;
    }

    public function isCurrentlyActive()
    {
        return $this->isActiveOnDate(now());
    }
    public function markAsInactive()
    {
        $this->is_active = false;
        $this->save();
    }
    public function markAsActive()
    {
        $this->is_active = true;
        $this->save();
    }
    public function blocksAppointments()
    {
        return $this->blocks_appointments;
    }
    public function isRecurring()
    {
        return $this->is_recurring;
    }
    public function getRecurrencePattern()
    {
        return $this->recurrence_pattern;
    }
    public function getAcademicYear()
    {
        return $this->academic_year;
    }
    public function getSource()
    {
        return $this->source;
    }
    public function getExternalId()
    {
        return $this->external_id;
    }
    public function getName()
    {
        return $this->name;
    }
    public function getDescription()
    {
        return $this->description;
    }
    public function getStartDate()
    {
        return $this->start_date;
    }
    public function getEndDate()
    {
        return $this->end_date;
    }
    public function getAffectedDepartments()
    {
        return $this->affected_departments;
    }
    public function getAffectsStaffType()
    {
        return $this->affects_staff_type;
    }
}