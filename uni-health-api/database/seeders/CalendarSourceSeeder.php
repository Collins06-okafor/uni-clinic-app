<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\CalendarSource;

class CalendarSourceSeeder extends Seeder
{
    public function run()
    {
        $sources = [
            [
                'name' => 'FIU Official Academic Calendar PDF',
                'url_pattern' => 'https://www.final.edu.tr/photos/{year}_{next_year}/FIU_AcademicCalendar_{year}_{next_year}.pdf',
                'type' => 'pdf',
                'file_pattern' => 'FIU_AcademicCalendar_{year}_{next_year}.pdf',
                'priority' => 1,
                'is_active' => true
            ],
            [
                'name' => 'FIU Alternative Calendar PDF',
                'url_pattern' => 'https://www.final.edu.tr/uploads/{year}/academic_calendar.pdf',
                'type' => 'pdf',
                'file_pattern' => 'academic_calendar_{year}.pdf',
                'priority' => 2,
                'is_active' => true
            ],
            [
                'name' => 'FIU Academic Calendar HTML',
                'url_pattern' => 'https://final.edu.tr/calendar/{year}/academic-events.html',
                'type' => 'html',
                'priority' => 3,
                'is_active' => true
            ],
            [
                'name' => 'FIU Student Portal API',
                'url_pattern' => 'https://portal.final.edu.tr/api/calendar/{year}',
                'type' => 'api',
                'priority' => 4,
                'is_active' => false // Disabled until API is available
            ]
        ];

        foreach ($sources as $source) {
            CalendarSource::create($source);
        }
    }
}
