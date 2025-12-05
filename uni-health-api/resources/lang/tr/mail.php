<?php
// resources/lang/tr/mail.php
// COMPLETE VERSION with appointment request notification keys

return [
    // Common
    'greeting' => 'Sayın :name',
    'regards' => 'Saygılarımızla',
    'footer' => 'Üniversite Sağlık Merkezi',
    'contact_info' => 'Sorularınız için health@university.edu adresinden veya +90 XXX XXX XX XX numarasından bizimle iletişime geçebilirsiniz',
    
    // NEW: Greetings for different roles
    'greeting_clinical_staff' => 'Sayın Klinik Personeli',
    'greeting_patient' => 'Sayın :name',
    'greeting_doctor' => 'Sayın Dr. :name',
    
    // Registration
    'registration_confirmed' => 'Kayıt Onaylandı - :app_name',
    'welcome_to_health_center' => 'Üniversite Sağlık Merkezine Hoş Geldiniz!',
    'registration_successful' => 'Kaydınız başarıyla tamamlanmıştır.',
    'next_steps' => 'Sonraki Adımlar:',
    'next_step_1' => 'Artık hasta portalına giriş yapabilirsiniz',
    'next_step_2' => 'Müsait olduğunda online randevu alabilirsiniz',
    'next_step_3' => 'Çalışma saatlerinde merkezimizi ziyaret edebilirsiniz: 08:00 - 17:00',
    'login_instructions' => 'Giriş yapmak için öğrenci e-postanızı ve seçtiğiniz şifreyi kullanın.',
    'support_info' => 'Yardıma ihtiyacınız varsa, lütfen destek ekibimizle iletişime geçin.',
    
    // Appointments - Existing
    'appointment_confirmed_patient' => 'Randevu Onaylandı - :date',
    'appointment_confirmed_doctor' => 'Yeni Hasta Randevusu - :date',
    'appointment_details' => 'Randevu Detayları',
    'date' => 'Tarih',
    'time' => 'Saat',
    'doctor' => 'Doktor',
    'patient' => 'Hasta',
    'reason' => 'Sebep',
    'what_to_bring' => 'Lütfen öğrenci kimliğinizi ve ilgili tıbbi kayıtlarınızı getiriniz.',
    'cancellation_policy' => 'İptal veya yeniden planlamak için en az 24 saat önceden bizimle iletişime geçiniz.',
    
    // NEW: Appointment Request Notifications (for clinical staff)
    'new_appointment_request' => ':patient - Yeni Randevu Talebi',
    'new_appointment_request_title' => 'Yeni Randevu Talebi',
    'action_needed' => 'İşlem Gerekli',
    'patient_details' => 'Hasta Bilgileri',
    'assigned_doctor' => 'Atanan Doktor',
    'priority' => 'Öncelik',
    'view_and_confirm' => 'Detayları Görüntüle ve Onayla',
    'appointment_notification_footer' => 'Bu bildirim, sistemde yeni bir randevu talebi oluşturulduğu için gönderilmiştir.',
    
    // Reminders
    'appointment_reminder' => 'Randevu Hatırlatması - Yarın',
    'reminder_message' => 'Bu, yarın randevunuz olduğuna dair bir hatırlatmadır.',
    
    // Doctor notifications
    'new_patient_registered' => 'Yeni Hasta Kaydı',
    'doctor_notification_message' => 'Yeni bir hasta kaydoldu ve tıbbi yardıma ihtiyacı olabilir.',
];