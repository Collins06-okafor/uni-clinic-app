@extends('emails.layouts.email')

@section('content')
<h2>{{ $welcome_message }}</h2>

<p>{{ $greeting }}</p>

<p>{{ $registration_success }}</p>

<div class="appointment-details">
    <h3>{{ __('Student Information', [], $locale) }}</h3>
    <div class="detail-row">
        <span class="detail-label">{{ __('Name', [], $locale) }}:</span>
        <span class="detail-value">{{ $patient_name }}</span>
    </div>
    @if($student_id)
    <div class="detail-row">
        <span class="detail-label">{{ __('Student ID', [], $locale) }}:</span>
        <span class="detail-value">{{ $student_id }}</span>
    </div>
    @endif
    @if($department)
    <div class="detail-row">
        <span class="detail-label">{{ __('Department', [], $locale) }}:</span>
        <span class="detail-value">{{ $department }}</span>
    </div>
    @endif
</div>

<h3>{{ $next_steps_title }}</h3>
<ul>
    @foreach($next_steps as $step)
        <li>{{ $step }}</li>
    @endforeach
</ul>

<p>{{ $login_instructions }}</p>

@if($portal_url)
<p style="text-align: center;">
    <a href="{{ $portal_url }}" class="button">
        {{ __('Login to Portal', [], $locale) }}
    </a>
</p>
@endif

<p>{{ $support_info }}</p>

<p>{{ $regards }},<br>
{{ $footer }}</p>
@endsection