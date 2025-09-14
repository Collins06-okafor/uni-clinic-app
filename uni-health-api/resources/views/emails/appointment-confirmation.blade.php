@extends('emails.layouts.email')

@section('content')
@if($recipient_type === 'patient')
    <h2>{{ __('Your Appointment is Confirmed', [], $locale) }}</h2>
    <p>{{ $greeting }},</p>
    <p>{{ __('Your appointment has been successfully scheduled.', [], $locale) }}</p>
@else
    <h2>{{ __('New Patient Appointment Scheduled', [], $locale) }}</h2>
    <p>{{ $greeting }},</p>
    <p>{{ __('A new appointment has been scheduled for you.', [], $locale) }}</p>
@endif

<div class="appointment-details">
    <h3>{{ $appointment_details_title }}</h3>
    
    <div class="detail-row">
        <span class="detail-label">{{ $date_label }}:</span>
        <span class="detail-value">{{ $appointment_date }}</span>
    </div>
    
    <div class="detail-row">
        <span class="detail-label">{{ $time_label }}:</span>
        <span class="detail-value">{{ $appointment_time }}</span>
    </div>
    
    @if($recipient_type === 'patient')
    <div class="detail-row">
        <span class="detail-label">{{ $doctor_label }}:</span>
        <span class="detail-value">{{ $doctor_name }}</span>
    </div>
    @else
    <div class="detail-row">
        <span class="detail-label">{{ $patient_label }}:</span>
        <span class="detail-value">{{ $patient_name }}</span>
    </div>
    @endif
    
    <div class="detail-row">
        <span class="detail-label">{{ $reason_label }}:</span>
        <span class="detail-value">{{ $appointment_reason }}</span>
    </div>
</div>

@if($recipient_type === 'patient')
<h3>{{ __('Important Information', [], $locale) }}</h3>
<ul>
    <li>{{ $what_to_bring }}</li>
    <li>{{ __('Please arrive 10 minutes early for check-in.', [], $locale) }}</li>
    <li>{{ __('If you feel unwell, please inform the staff upon arrival.', [], $locale) }}</li>
</ul>

<div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
    <strong>{{ __('Cancellation Policy', [], $locale) }}:</strong><br>
    {{ $cancellation_policy }}
</div>
@endif

<p>{{ $regards }},<br>
{{ $footer }}</p>
@endsection