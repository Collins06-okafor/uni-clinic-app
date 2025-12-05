<!DOCTYPE html>
<html lang="{{ $locale }}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $new_request_title }}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .email-container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 3px solid #4CAF50;
            margin-bottom: 30px;
        }
        .logo-container {
            margin-bottom: 15px;
        }
        .logo {
            max-width: 150px;
            height: auto;
        }
        .priority-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 20px;
        }
        .priority-emergency {
            background-color: #f44336;
            color: white;
        }
        .priority-urgent {
            background-color: #ff9800;
            color: white;
        }
        .priority-normal {
            background-color: #2196F3;
            color: white;
        }
        .alert-box {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .info-section {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .info-section h3 {
            margin-top: 0;
            color: #2c3e50;
            font-size: 16px;
            border-bottom: 2px solid #e0e0e0;
            padding-bottom: 10px;
        }
        .info-row {
            display: flex;
            padding: 10px 0;
            border-bottom: 1px solid #e0e0e0;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .info-label {
            font-weight: 600;
            color: #555;
            min-width: 120px;
        }
        .info-value {
            color: #333;
            flex: 1;
        }
        .reason-box {
            background-color: #e3f2fd;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
            border-left: 4px solid #2196F3;
        }
        .reason-box strong {
            display: block;
            margin-bottom: 8px;
            color: #1976D2;
        }
        .cta-button {
            display: inline-block;
            padding: 14px 28px;
            background-color: #4CAF50;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
            text-align: center;
        }
        .cta-button:hover {
            background-color: #45a049;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            color: #777;
            font-size: 12px;
        }
        @media only screen and (max-width: 600px) {
            body {
                padding: 10px;
            }
            .email-container {
                padding: 20px;
            }
            .info-row {
                flex-direction: column;
            }
            .info-label {
                margin-bottom: 5px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo-container">
                <img src="{{ asset('logo6.png') }}" alt="FIU Medical Logo" class="logo">
            </div>
            <h2 style="color: #2c3e50; margin: 10px 0;">{{ $new_request_title }}</h2>
        </div>

        @if($priority === 'emergency')
            <div class="priority-badge priority-emergency">
                🚨 EMERGENCY PRIORITY
            </div>
        @elseif($priority === 'urgent')
            <div class="priority-badge priority-urgent">
                ⚠️ URGENT PRIORITY
            </div>
        @else
            <div class="priority-badge priority-normal">
                📋 NORMAL PRIORITY
            </div>
        @endif

        <p>{{ $greeting }},</p>

        <div class="alert-box">
            <strong>{{ $action_needed }}</strong>
            <p style="margin: 5px 0 0 0;">A new appointment request requires your review and confirmation.</p>
        </div>

        <!-- Patient Details Section -->
        <div class="info-section">
            <h3>{{ $patient_details_title }}</h3>
            <div class="info-row">
                <span class="info-label">{{ $patient_label }}:</span>
                <span class="info-value"><strong>{{ $patient->name }}</strong></span>
            </div>
            <div class="info-row">
                <span class="info-label">Student ID:</span>
                <span class="info-value">{{ $patient->student_id ?? 'N/A' }}</span>
            </div>
            @if($patient->email)
            <div class="info-row">
                <span class="info-label">Email:</span>
                <span class="info-value">
                    <a href="mailto:{{ $patient->email }}">{{ $patient->email }}</a>
                </span>
            </div>
            @endif
            @if($patient->phone)
            <div class="info-row">
                <span class="info-label">Phone:</span>
                <span class="info-value">
                    <a href="tel:{{ $patient->phone }}">{{ $patient->phone }}</a>
                </span>
            </div>
            @endif
        </div>

        <!-- Appointment Details Section -->
        <div class="info-section">
            <h3>{{ $appointment_details_title }}</h3>
            <div class="info-row">
                <span class="info-label">{{ $doctor_label }}:</span>
                <span class="info-value"><strong>{{ $doctor->name }}</strong></span>
            </div>
            <div class="info-row">
                <span class="info-label">{{ $date_label }}:</span>
                <span class="info-value"><strong>{{ $appointment_date }}</strong></span>
            </div>
            <div class="info-row">
                <span class="info-label">{{ $time_label }}:</span>
                <span class="info-value"><strong>{{ $appointment_time }}</strong></span>
            </div>
            <div class="info-row">
                <span class="info-label">Type:</span>
                <span class="info-value">{{ ucfirst($appointment->type) }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">{{ $priority_label }}:</span>
                <span class="info-value">
                    @if($priority === 'emergency')
                        <span style="color: #f44336; font-weight: bold;">🚨 Emergency</span>
                    @elseif($priority === 'urgent')
                        <span style="color: #ff9800; font-weight: bold;">⚠️ Urgent</span>
                    @else
                        <span style="color: #2196F3;">Normal</span>
                    @endif
                </span>
            </div>
        </div>

        <!-- Reason for Visit -->
        <div class="reason-box">
            <strong>{{ $reason_label }}:</strong>
            <p style="margin: 0;">{{ $appointment->reason }}</p>
        </div>

        <!-- Call to Action -->
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{ $action_url }}" class="cta-button">
                {{ $view_details_button }}
            </a>
        </div>

        <div style="background-color: #e8f5e9; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <strong style="color: #2e7d32;">📋 Next Steps:</strong>
            <ul style="margin: 10px 0; padding-left: 20px; color: #1b5e20;">
                <li>Review patient information and medical history</li>
                <li>Confirm appointment availability</li>
                <li>Prepare necessary medical equipment or documents</li>
                @if($priority === 'emergency')
                    <li style="color: #d32f2f; font-weight: bold;">⚠️ PRIORITIZE THIS EMERGENCY CASE</li>
                @endif
            </ul>
        </div>

        <div class="footer">
            <p>{{ $footer_note }}</p>
            <p style="margin: 10px 0;">
                <strong>{{ $app_name }}</strong><br>
                University Health Center<br>
                This is an automated notification. Please do not reply to this email.
            </p>
        </div>
    </div>
</body>
</html>