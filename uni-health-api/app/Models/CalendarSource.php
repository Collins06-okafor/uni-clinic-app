<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class CalendarSource extends Model
{
    protected $fillable = [
        'name',
        'url_pattern', 
        'type',
        'file_pattern',
        'priority',
        'is_active',
        'last_checked',
        'last_successful_sync',
        'sync_metadata',
        'consecutive_failures',
        'last_error'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'last_checked' => 'datetime',
        'last_successful_sync' => 'datetime',
        'sync_metadata' => 'array',
        'consecutive_failures' => 'integer',
        'priority' => 'integer'
    ];

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByPriority($query)
    {
        return $query->orderBy('priority', 'asc');
    }

    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }

    // Methods
    public function buildUrl($year)
    {
        $nextYear = $year + 1;
        
        return str_replace(
            ['{year}', '{next_year}'],
            [$year, $nextYear],
            $this->url_pattern
        );
    }

    public function markAsChecked()
    {
        $this->update(['last_checked' => now()]);
    }

    public function markAsSuccessful($metadata = [])
    {
        $this->update([
            'last_successful_sync' => now(),
            'consecutive_failures' => 0,
            'last_error' => null,
            'sync_metadata' => $metadata
        ]);
    }

    public function markAsFailed($error)
    {
        $this->increment('consecutive_failures');
        $this->update([
            'last_error' => $error,
            'last_checked' => now()
        ]);

        // Auto-disable after 5 consecutive failures
        if ($this->consecutive_failures >= 5) {
            $this->update(['is_active' => false]);
        }
    }

    public function isReliable()
    {
        return $this->consecutive_failures < 3;
    }

    public function needsCheck()
    {
        if (!$this->last_checked) {
            return true;
        }

        // Check more frequently if it's been failing
        $hoursToWait = $this->consecutive_failures > 0 ? 24 : 168; // 1 day vs 1 week
        
        return $this->last_checked->diffInHours(now()) >= $hoursToWait;
    }
}