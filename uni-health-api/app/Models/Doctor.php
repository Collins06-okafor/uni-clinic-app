<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Doctor extends Model
{
    use HasFactory;

    protected $fillable = [
        'id', // Same as user_id (primary key)
        'medical_license_number',
        'specialization',
        'available_days',
        'working_hours_start',
        'working_hours_end',
        'is_active'
    ];

    protected $casts = [
        'available_days' => 'array',
        'working_hours_start' => 'datetime:H:i',
        'working_hours_end' => 'datetime:H:i',
        'is_active' => 'boolean'
    ];

    // Doctor ID is the same as User ID
    public $incrementing = false;
    protected $keyType = 'int';

    /**
     * Get the user associated with this doctor
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'id', 'id');
    }

    /**
     * Accessor for doctor name
     */
    public function getNameAttribute()
    {
        return $this->user->name ?? 'Unknown Doctor';
    }

    /**
     * Scope for active doctors
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}