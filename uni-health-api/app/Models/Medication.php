<?php
// app/Models/Medication.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Medication extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'generic_name',
        'dosage',
        'frequency',
        'start_date',
        'end_date',
        'instructions',
        'status',
        'patient_id',
        'prescription_id',
        'administered_at',
        'administered_by',
        'created_by'
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'administered_at' => 'datetime',
    ];

    /**
     * Get the patient this medication belongs to
     */
    public function patient()
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    /**
     * Get the user who created this medication record
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the user who administered this medication
     */
    public function administrator()
    {
        return $this->belongsTo(User::class, 'administered_by');
    }

    /**
     * Get the prescription this medication is part of
     */
    public function prescription()
    {
        return $this->belongsTo(Prescription::class);
    }

    /**
     * Scope for active medications
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope for medications due on a specific date
     */
    public function scopeDueOn($query, $date)
    {
        return $query->whereDate('start_date', '<=', $date)
                    ->where(function($q) use ($date) {
                        $q->whereNull('end_date')
                          ->orWhereDate('end_date', '>=', $date);
                    });
    }
}