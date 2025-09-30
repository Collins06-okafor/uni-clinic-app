<?php
// app/Models/Department.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Department extends Model
{
    protected $fillable = [
        'name',
        'code', 
        'description',
        'type',
        'is_active',
        'metadata'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'metadata' => 'array'
    ];

    // Relationships
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function staffSchedules(): HasMany
    {
        return $this->hasMany(StaffSchedule::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }

    public function scopeMedical($query)
    {
        return $query->where('type', 'medical');
    }

    public function scopeAcademic($query)
    {
        return $query->where('type', 'academic');
    }

    // Helper methods
    public function getDoctorCount()
    {
        return $this->users()->where('role', 'doctor')->count();
    }

    public function getStaffCount()
    {
        return $this->users()->whereIn('role', ['doctor', 'clinical_staff', 'academic_staff'])->count();
    }

    public function isMedical()
    {
        return $this->type === 'medical';
    }   
    public function isAcademic()
    {
        return $this->type === 'academic';
    }
    public function isAdministrative()
    {
        return $this->type === 'administrative';
    }

}