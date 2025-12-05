<?php
// uni-health-api\app\Mail\LocalizedMail.php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

abstract class LocalizedMail extends Mailable
{
    use SerializesModels;

    public $locale;
    
    public function __construct($locale = 'en')
    {
        $this->locale = in_array($locale, ['en', 'tr']) ? $locale : 'en';
    }
    
    /**
     * Translate message with current locale
     */
    protected function trans($key, $params = [])
    {
        return trans($key, $params, $this->locale);
    }
    
    /**
     * Get localized subject
     */
    protected function getLocalizedSubject($key, $params = [])
    {
        return $this->trans($key, $params);
    }
    
    /**
     * Get common email data
     */
    protected function getCommonEmailData()
    {
        return [
            'locale' => $this->locale,
            'app_name' => config('app.name'),
            'greeting' => $this->trans('mail.greeting'),
            'regards' => $this->trans('mail.regards'),
            'footer' => $this->trans('mail.footer'),
            'contact_info' => $this->trans('mail.contact_info'),
        ];
    }
}