<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Appointment extends Model
{
    // Enable mass assignment for these fields
    protected $fillable = [
        'patient_id',
        'doctor_id',
        'date',
        'reason',
    ];

    // Optional: Define relationships

    public function patient()
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }
}
