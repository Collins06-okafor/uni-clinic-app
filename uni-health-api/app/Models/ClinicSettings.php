<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClinicSettings extends Model
{
    use HasFactory;

    protected $table = 'clinic_settings';
    protected $fillable = ['settings_data'];

    protected $casts = [
        'settings_data' => 'array',
    ];
}
