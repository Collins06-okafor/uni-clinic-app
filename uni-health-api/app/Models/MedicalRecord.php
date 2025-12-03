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
        'created_by',
        
        // ✅ ADD THESE VITAL SIGNS COLUMNS
        'blood_pressure',
        'heart_rate',
        'temperature',
        'respiratory_rate',
        'oxygen_saturation',
        'weight',
        'height',
        'bmi'
    ];

    // Add casting for numeric fields if needed
    protected $casts = [
        'content' => 'array',
        'visit_date' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'weight' => 'decimal:2',
        'height' => 'decimal:2',
        'bmi' => 'decimal:2',
        'temperature' => 'decimal:2', // Add this for temperature
        'heart_rate' => 'integer',    // Add this for heart rate
        'respiratory_rate' => 'integer', // Add this for respiratory rate
        'oxygen_saturation' => 'integer', // Add this for oxygen saturation
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