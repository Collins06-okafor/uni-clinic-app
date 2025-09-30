<?php

namespace App\Rules;

use Illuminate\Contracts\Validation\Rule;
use Carbon\Carbon;

class MinimumAge implements Rule
{
    private $minimumAge;

    public function __construct($minimumAge = 16)
    {
        $this->minimumAge = $minimumAge;
    }

    public function passes($attribute, $value)
    {
        $birthDate = Carbon::parse($value);
        $age = $birthDate->diffInYears(now());
        
        return $age >= $this->minimumAge;
    }

    public function message()
    {
        return "Students must be at least {$this->minimumAge} years old to register.";
    }
}