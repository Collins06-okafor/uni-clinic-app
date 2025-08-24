<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Profile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'phone_number',
        'date_of_birth',
        'emergency_contact_name',
        'emergency_contact_phone',
        'allergies',
        'has_known_allergies',
        'allergies_uncertain',
        'addictions',
        'medical_history',
        'profile_image'
    ];

    protected $casts = [
        'has_known_allergies' => 'boolean',
        'allergies_uncertain' => 'boolean',
        'date_of_birth' => 'date',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}