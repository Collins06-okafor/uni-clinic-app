<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MedicalCard extends Model
{
    protected $fillable = [
        'user_id', // Make sure this is included
        'emergency_contact',
        'medical_history',
        'current_medications',
        'allergies',
        'previous_conditions',
        'family_history',
        'insurance_info'
    ];

    protected $casts = [
        'emergency_contact' => 'array',
        'medical_history' => 'array',
        'current_medications' => 'array',
        'allergies' => 'array',
        'previous_conditions' => 'array',
        'family_history' => 'array',
        'insurance_info' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}