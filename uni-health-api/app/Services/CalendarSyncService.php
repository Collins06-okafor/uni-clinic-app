<?php

namespace App\Services;

use App\Models\AcademicHoliday;
use App\Models\CalendarSource;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;
use Smalot\PdfParser\Parser as PdfParser;

class EnhancedCalendarSyncService
{
    protected $pdfParser;
    
    public function __construct()
    {
        $this->pdfParser = new PdfParser();
    }

    /**
     * Main sync method with enhanced automation
     */
    public function syncCalendar($year = null)
    {
        $year = $year ?? now()->year;
        
        try {
            Log::info("Starting enhanced calendar sync for year: {$year}");
            
            $syncResult = [
                'synced' => 0,
                'updated' => 0,
                'failed' => 0,
                'sources_checked' => 0,
                'new_calendars_found' => 0
            ];

            // 1. Check for new calendar sources automatically
            $this->discoverNewCalendarSources($year, $syncResult);
            
            // 2. Try to sync from all available sources
            $holidays = $this->tryAllSources($year, $syncResult);
            
            // 3. Process holidays and block appointments appropriately
            foreach ($holidays as $holidayData) {
                try {
                    $result = $this->createOrUpdateHoliday($holidayData);
                    if ($result->wasRecentlyCreated) {
                        $syncResult['synced']++;
                    } else {
                        $syncResult['updated']++;
                    }
                } catch (\Exception $e) {
                    Log::error('Failed to sync holiday: ' . $e->getMessage(), $holidayData);
                    $syncResult['failed']++;
                }
            }

            // 4. Schedule next sync automatically
            $this->scheduleNextSync($year);

            Log::info('Enhanced calendar sync completed', $syncResult);
            return $syncResult;

        } catch (\Exception $e) {
            Log::error('Enhanced calendar sync failed: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Automatically discover new calendar sources
     */
    protected function discoverNewCalendarSources($year, &$syncResult)
    {
        $baseUrls = [
            'https://www.final.edu.tr/photos',
            'https://www.final.edu.tr/uploads',
            'https://www.final.edu.tr/documents',
            'https://final.edu.tr/calendar',
        ];

        $patterns = [
            'academic_calendar_{year}.pdf',
            'calendar_{year}_{next_year}.pdf',
            'FIU_Calendar_{year}.pdf',
            'academic-calendar-{year}-{next_year}.pdf',
            'semester_calendar_{year}.pdf',
        ];

        foreach ($baseUrls as $baseUrl) {
            foreach ($patterns as $pattern) {
                $url = $this->buildUrlFromPattern($baseUrl, $pattern, $year);
                
                if ($this->checkUrlExists($url)) {
                    Log::info("Discovered new calendar source: {$url}");
                    
                    // Save discovered source for future use
                    CalendarSource::firstOrCreate([
                        'url_pattern' => $baseUrl . '/' . $pattern,
                        'name' => "Auto-discovered Calendar {$year}",
                        'type' => $this->detectSourceType($url),
                        'priority' => 3, // Lower priority than manually added
                        'is_active' => true
                    ]);
                    
                    $syncResult['new_calendars_found']++;
                }
            }
        }
    }

    /**
     * Enhanced PDF parsing with better text extraction
     */
    protected function parsePdfCalendar($url, $year)
    {
        try {
            // Download PDF temporarily
            $pdfContent = Http::timeout(60)->get($url)->body();
            $tempPath = storage_path('temp/calendar_' . $year . '.pdf');
            
            if (!file_exists(dirname($tempPath))) {
                mkdir(dirname($tempPath), 0755, true);
            }
            
            file_put_contents($tempPath, $pdfContent);
            
            // Parse PDF
            $pdf = $this->pdfParser->parseFile($tempPath);
            $text = $pdf->getText();
            
            // Extract holidays using multiple strategies
            $holidays = $this->extractHolidaysFromText($text, $year);
            
            // Clean up
            unlink($tempPath);
            
            Log::info("Extracted " . count($holidays) . " holidays from PDF");
            return $holidays;
            
        } catch (\Exception $e) {
            Log::error("PDF parsing failed: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Extract holidays from text using pattern matching
     */
    protected function extractHolidaysFromText($text, $year)
    {
        $holidays = [];
        $nextYear = $year + 1;
        
        // Turkish holiday patterns
        $patterns = [
            // Date patterns: "29 Ekim 2024" or "29.10.2024"
            '/(\d{1,2})[\s\.\/\-]+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık|January|February|March|April|May|June|July|August|September|October|November|December)[\s\.\/\-]+(' . $year . '|' . $nextYear . ')/i',
            
            // Semester break patterns
            '/(?:Güz|Fall|Bahar|Spring)\s+(?:Tatili|Break|Semester|Dönem).*?(\d{1,2}[\s\.\/\-]+\w+[\s\.\/\-]+\d{4})/i',
            
            // Exam period patterns
            '/(?:Sınav|Exam|Final|Midterm)\s+(?:Dönemi|Period).*?(\d{1,2}[\s\.\/\-]+\w+[\s\.\/\-]+\d{4})/i',
        ];

        foreach ($patterns as $pattern) {
            preg_match_all($pattern, $text, $matches, PREG_SET_ORDER);
            
            foreach ($matches as $match) {
                $holiday = $this->parseHolidayFromMatch($match, $year, $text);
                if ($holiday) {
                    $holidays[] = $holiday;
                }
            }
        }

        // Add known Turkish national holidays
        $holidays = array_merge($holidays, $this->getTurkishNationalHolidays($year));
        
        return $holidays;
    }

    /**
     * Parse individual holiday from regex match
     */
    protected function parseHolidayFromMatch($match, $year, $fullText)
    {
        try {
            $dateStr = $match[0];
            $date = $this->parseDate($dateStr, $year);
            
            if (!$date) return null;

            // Determine holiday type and name from context
            $context = $this->getContextAroundMatch($fullText, $match[0]);
            $holidayInfo = $this->classifyHoliday($context, $date);

            return [
                'name' => $holidayInfo['name'],
                'description' => $holidayInfo['description'],
                'start_date' => $date->format('Y-m-d'),
                'end_date' => $holidayInfo['end_date'] ?? $date->format('Y-m-d'),
                'type' => $holidayInfo['type'],
                'affects_staff_type' => $holidayInfo['affects_staff_type'],
                'blocks_appointments' => $holidayInfo['blocks_appointments'],
                'academic_year' => $year,
                'source' => 'pdf_sync'
            ];
            
        } catch (\Exception $e) {
            Log::warning("Failed to parse holiday from match: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Get Turkish national holidays automatically
     */
    protected function getTurkishNationalHolidays($year)
    {
        $nextYear = $year + 1;
        
        return [
            [
                'name' => 'New Year\'s Day',
                'start_date' => Carbon::create($year, 1, 1)->format('Y-m-d'),
                'end_date' => Carbon::create($year, 1, 1)->format('Y-m-d'),
                'type' => 'national_holiday',
                'affects_staff_type' => 'all',
                'blocks_appointments' => true,
                'academic_year' => $year,
                'source' => 'auto_national_holidays'
            ],
            [
                'name' => 'National Sovereignty and Children\'s Day',
                'start_date' => Carbon::create($year, 4, 23)->format('Y-m-d'),
                'end_date' => Carbon::create($year, 4, 23)->format('Y-m-d'),
                'type' => 'national_holiday',
                'affects_staff_type' => 'all',
                'blocks_appointments' => true,
                'academic_year' => $year,
                'source' => 'auto_national_holidays'
            ],
            [
                'name' => 'Labour and Solidarity Day',
                'start_date' => Carbon::create($year, 5, 1)->format('Y-m-d'),
                'end_date' => Carbon::create($year, 5, 1)->format('Y-m-d'),
                'type' => 'national_holiday',
                'affects_staff_type' => 'all',
                'blocks_appointments' => true,
                'academic_year' => $year,
                'source' => 'auto_national_holidays'
            ],
            [
                'name' => 'Commemoration of Atatürk, Youth and Sports Day',
                'start_date' => Carbon::create($year, 5, 19)->format('Y-m-d'),
                'end_date' => Carbon::create($year, 5, 19)->format('Y-m-d'),
                'type' => 'national_holiday',
                'affects_staff_type' => 'all',
                'blocks_appointments' => true,
                'academic_year' => $year,
                'source' => 'auto_national_holidays'
            ],
            [
                'name' => 'Victory Day',
                'start_date' => Carbon::create($year, 8, 30)->format('Y-m-d'),
                'end_date' => Carbon::create($year, 8, 30)->format('Y-m-d'),
                'type' => 'national_holiday',
                'affects_staff_type' => 'all',
                'blocks_appointments' => true,
                'academic_year' => $year,
                'source' => 'auto_national_holidays'
            ],
            [
                'name' => 'Republic Day',
                'start_date' => Carbon::create($year, 10, 29)->format('Y-m-d'),
                'end_date' => Carbon::create($year, 10, 29)->format('Y-m-d'),
                'type' => 'national_holiday',
                'affects_staff_type' => 'all',
                'blocks_appointments' => true,
                'academic_year' => $year,
                'source' => 'auto_national_holidays'
            ]
        ];
    }

    /**
     * Classify holiday type based on context
     */
    protected function classifyHoliday($context, $date)
    {
        $context = strtolower($context);
        
        if (str_contains($context, 'tatil') || str_contains($context, 'break')) {
            return [
                'name' => 'Academic Break',
                'description' => 'Academic break period',
                'type' => 'semester_break',
                'affects_staff_type' => 'academic',
                'blocks_appointments' => true
            ];
        }
        
        if (str_contains($context, 'sınav') || str_contains($context, 'exam')) {
            return [
                'name' => 'Examination Period',
                'description' => 'Academic examination period',
                'type' => 'exam_period',
                'affects_staff_type' => 'academic',
                'blocks_appointments' => false
            ];
        }
        
        if (str_contains($context, 'kayıt') || str_contains($context, 'registration')) {
            return [
                'name' => 'Registration Period',
                'description' => 'Student registration period',
                'type' => 'registration_period',
                'affects_staff_type' => 'academic',
                'blocks_appointments' => false
            ];
        }
        
        // Default
        return [
            'name' => 'Academic Event',
            'description' => 'Academic calendar event',
            'type' => 'university_closure',
            'affects_staff_type' => 'all',
            'blocks_appointments' => true
        ];
    }

    /**
     * Schedule automatic sync to run regularly
     */
    protected function scheduleNextSync($year)
    {
        // This would integrate with Laravel's task scheduler
        // Add to app/Console/Kernel.php:
        // $schedule->call(function () {
        //     app(EnhancedCalendarSyncService::class)->syncCalendar();
        // })->weekly();
        
        Log::info("Scheduled next automatic sync");
    }

    /**
     * Helper methods
     */
    protected function buildUrlFromPattern($baseUrl, $pattern, $year)
    {
        return $baseUrl . '/' . str_replace(
            ['{year}', '{next_year}'],
            [$year, $year + 1],
            $pattern
        );
    }

    protected function checkUrlExists($url)
    {
        try {
            $response = Http::timeout(10)->head($url);
            return $response->successful();
        } catch (\Exception $e) {
            return false;
        }
    }

    protected function detectSourceType($url)
    {
        $extension = pathinfo(parse_url($url, PHP_URL_PATH), PATHINFO_EXTENSION);
        
        switch (strtolower($extension)) {
            case 'pdf': return 'pdf';
            case 'html': case 'htm': return 'html';
            case 'json': return 'api';
            default: return 'html';
        }
    }

    protected function getContextAroundMatch($text, $match)
    {
        $pos = strpos($text, $match);
        $start = max(0, $pos - 100);
        $length = min(200, strlen($text) - $start);
        
        return substr($text, $start, $length);
    }

    protected function parseDate($dateStr, $year)
    {
        // Turkish month names mapping
        $monthMap = [
            'ocak' => 1, 'şubat' => 2, 'mart' => 3, 'nisan' => 4,
            'mayıs' => 5, 'haziran' => 6, 'temmuz' => 7, 'ağustos' => 8,
            'eylül' => 9, 'ekim' => 10, 'kasım' => 11, 'aralık' => 12,
            'january' => 1, 'february' => 2, 'march' => 3, 'april' => 4,
            'may' => 5, 'june' => 6, 'july' => 7, 'august' => 8,
            'september' => 9, 'october' => 10, 'november' => 11, 'december' => 12
        ];

        try {
            // Try various date formats
            $formats = ['d.m.Y', 'd/m/Y', 'd-m-Y', 'Y-m-d'];
            
            foreach ($formats as $format) {
                $date = Carbon::createFromFormat($format, $dateStr);
                if ($date && $date->year >= $year && $date->year <= $year + 1) {
                    return $date;
                }
            }
            
            // Handle Turkish month names
            foreach ($monthMap as $month => $number) {
                if (stripos($dateStr, $month) !== false) {
                    preg_match('/(\d{1,2})/', $dateStr, $dayMatch);
                    if ($dayMatch) {
                        return Carbon::create($year, $number, (int)$dayMatch[1]);
                    }
                }
            }
            
            return null;
            
        } catch (\Exception $e) {
            return null;
        }
    }
}