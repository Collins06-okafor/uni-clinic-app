<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Prescription extends Model
{
    protected $fillable = [
        'patient_id',
        'doctor_id',
        'medication', // Keeping for backward compatibility
        'dosage',     // Keeping for backward compatibility
        'instructions', // Keeping for backward compatibility
        'notes',
        'status'
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    public function medications()
    {
        return $this->hasMany(Medication::class);
    }

    public function patient()
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    /**
     * For backward compatibility - gets the first medication
     */
    public function getLegacyMedicationAttribute()
    {
        if ($this->medication) {
            return [
                'name' => $this->medication,
                'dosage' => $this->dosage,
                'instructions' => $this->instructions
            ];
        }
        
        return $this->medications->first();
    }
}