<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\EnhancedCalendarSyncService;

class SyncCalendar extends Command
{
    protected $signature = 'calendar:sync {year?}';
    protected $description = 'Sync academic calendar from external sources';

    public function handle(EnhancedCalendarSyncService $syncService)
    {
        $year = $this->argument('year') ?? now()->year;
        
        $this->info("Starting calendar sync for year: {$year}");
        
        try {
            $result = $syncService->syncCalendar($year);
            
            $this->info("Calendar sync completed:");
            $this->line("- New holidays synced: {$result['synced']}");
            $this->line("- Holidays updated: {$result['updated']}"); 
            $this->line("- Failed syncs: {$result['failed']}");
            $this->line("- Sources checked: {$result['sources_checked']}");
            $this->line("- New calendars found: {$result['new_calendars_found']}");
            
        } catch (\Exception $e) {
            $this->error("Calendar sync failed: " . $e->getMessage());
            return 1;
        }
        
        return 0;
    }
}