<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MedicalRecord extends Model
{
    protected $fillable = [
        'patient_id',
        'doctor_id',
        'type',
        'content',
        'diagnosis',
        'treatment',
        'notes',
        'visit_date',
        'created_by'
    ];

    // 🔥 CRITICAL: Add this casting to auto-handle JSON
    protected $casts = [
        'content' => 'array', // This makes Laravel auto-encode/decode JSON
        'visit_date' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relationship to patient
    public function patient()
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    // Relationship to doctor
    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    // Add this scope method
    public function scopeForDoctor($query, $doctorId)
    {
        return $query->where('doctor_id', $doctorId);
    }

    public function creator()
{
    return $this->belongsTo(User::class, 'created_by');
}
}