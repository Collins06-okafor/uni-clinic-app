<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasOne;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'student_id',
        'department',
        'medical_license_number',
        'specialization',
        'staff_no',
        'faculty',
        'phone',
        'status',
        'permissions',
        'email_verified_at',
        'doctor_id',
        'bio',
        'avatar_url',
        'last_login',
        'date_of_birth',
        'emergency_contact_name',
        'emergency_contact_phone',
        'medical_history',
        'allergies',
        'has_known_allergies',
        'allergies_uncertain',
        'addictions',
        'preferred_language', // ✅ ADD THIS LINE
        'medical_card_id',
        'years_of_experience',
        'certifications',
        'languages_spoken',
        'available_days',
        'working_hours_start',
        'working_hours_end',
        'is_available',
    ];

    /**
     * The attributes that should be hidden for serialization.
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Default attribute values
     */
    protected $attributes = [
        'permissions' => '[]',
        'status' => self::STATUS_ACTIVE,
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'last_login' => 'datetime',
        'permissions' => 'array',
        'available_days' => 'array', // ✅ Add this
        'has_known_allergies' => 'boolean',
        'allergies_uncertain' => 'boolean',
        'is_available' => 'boolean', // ✅ Add this
    ];

    /**
     * Role constants
     */
    const ROLE_STUDENT = 'student';
    const ROLE_DOCTOR = 'doctor';
    const ROLE_CLINICAL_STAFF = 'clinical_staff';
    const ROLE_ACADEMIC_STAFF = 'academic_staff';
    const ROLE_ADMIN = 'admin';

    /**
     * Status constants
     */
    const STATUS_ACTIVE = 'active';
    const STATUS_INACTIVE = 'inactive';
    const STATUS_PENDING_VERIFICATION = 'pending_verification';

    /**
     * Boot method to set default values
     */
    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($user) {
            if (is_null($user->permissions)) {
                $user->permissions = [];
            }
            
            if (is_null($user->status)) {
                $user->status = self::STATUS_ACTIVE;
            }
        });
    }

    /* ================== RELATIONSHIPS ================== */

    public function medicalCard()
    {
        return $this->hasOne(MedicalCard::class, 'user_id');
    }

    public function medicalDocuments()
    {
        return $this->hasMany(MedicalDocument::class, 'patient_id');
    }

    public function doctorProfile()
    {
        return $this->hasOne(Doctor::class, 'user_id');
    }

    public function patients()
    {
        return $this->hasMany(User::class, 'doctor_id')
                   ->whereIn('role', [self::ROLE_STUDENT, self::ROLE_ACADEMIC_STAFF]);
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id')
                   ->where('role', self::ROLE_DOCTOR);
    }

    public function medicalRecords()
    {
        return $this->hasMany(MedicalRecord::class, 'patient_id');
    }

    public function createdMedicalRecords()
    {
        return $this->hasMany(MedicalRecord::class, 'doctor_id');
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class, 'patient_id');
    }

    public function doctorAppointments()
    {
        return $this->hasMany(Appointment::class, 'doctor_id');
    }

    /* ================== METHODS ================== */

    public function hasRole($role)
    {
        return $this->role === $role;
    }

    public function hasAnyRole(array $roles)
    {
        return in_array($this->role, $roles);
    }

    public function hasPermission($permission)
    {
        if ($this->role === self::ROLE_ADMIN) {
            return true;
        }

        $permissions = $this->getAllPermissions();
        return in_array($permission, $permissions);
    }

    public function getAllPermissions()
    {
        $rolePermissions = $this->getRolePermissions();
        $customPermissions = $this->permissions ?? [];
        return array_unique(array_merge($rolePermissions, $customPermissions));
    }

    public function isActive()
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public function isVerified()
    {
        return !is_null($this->email_verified_at);
    }

    public function assignPatient($patientId)
    {
        $patient = User::findOrFail($patientId);
        if (!in_array($patient->role, [self::ROLE_STUDENT, self::ROLE_ACADEMIC_STAFF])) {
            throw new \InvalidArgumentException('Only students and academic staff can be assigned as patients');
        }
        
        $patient->doctor_id = $this->id;
        $patient->save();
        
        return $patient;
    }

    public function removePatient($patientId)
    {
        $patient = User::where('doctor_id', $this->id)
                      ->findOrFail($patientId);
        
        $patient->doctor_id = null;
        $patient->save();
        
        return $patient;
    }

    public function deleteUserRecord()
    {
        if ($this->role === self::ROLE_DOCTOR) {
            $this->patients()->update(['doctor_id' => null]);
        }
        
        return $this->forceDelete();
    }

    

    /* ================== ATTRIBUTES ================== */

    public function getDisplayIdentifierAttribute()
    {
        switch ($this->role) {
            case self::ROLE_STUDENT:
                return $this->student_id;
            case self::ROLE_DOCTOR:
                return $this->medical_license_number;
            case self::ROLE_CLINICAL_STAFF:
            case self::ROLE_ACADEMIC_STAFF:
            case self::ROLE_ADMIN:
                return $this->staff_no;
            default:
                return $this->email;
        }
    }

    public function getFullTitleAttribute()
    {
        $title = $this->name;
        
        switch ($this->role) {
            case self::ROLE_DOCTOR:
                $title = "Dr. " . $title;
                if ($this->specialization) {
                    $title .= " (" . $this->specialization . ")";
                }
                break;
            case self::ROLE_STUDENT:
                if ($this->department) {
                    $title .= " - " . $this->department;
                }
                break;
            case self::ROLE_ACADEMIC_STAFF:
                if ($this->faculty) {
                    $title .= " - " . $this->faculty;
                }
                break;
        }
        
        return $title;
    }

    public function getRoleSpecificFields()
    {
        $fields = [];
        
        switch ($this->role) {
            case self::ROLE_STUDENT:
                $fields = ['student_id', 'department'];
                break;
            case self::ROLE_DOCTOR:
                $fields = ['medical_license_number', 'specialization', 'staff_no'];
                break;
            case self::ROLE_CLINICAL_STAFF:
                $fields = ['staff_no', 'department'];
                break;
            case self::ROLE_ACADEMIC_STAFF:
                $fields = ['staff_no', 'faculty', 'department'];
                break;
            case self::ROLE_ADMIN:
                $fields = ['staff_no'];
                break;
        }
        
        return $fields;
    }

    /* ================== DATA FORMATTING ================== */

    public function getFormattedUserData()
    {
        $baseFields = [
            'id', 'name', 'email', 'role', 'phone', 'status',
            'email_verified_at', 'created_at', 'updated_at'
        ];

        $roleFields = [
            self::ROLE_STUDENT => ['student_id', 'department'],
            self::ROLE_DOCTOR => ['medical_license_number', 'specialization', 'staff_no'],
            self::ROLE_CLINICAL_STAFF => ['staff_no', 'department'],
            self::ROLE_ACADEMIC_STAFF => ['staff_no', 'faculty', 'department'],
            self::ROLE_ADMIN => ['staff_no']
        ];

        $fields = array_merge($baseFields, $roleFields[$this->role] ?? []);
        
        return $this->makeHidden(['password', 'remember_token', 'permissions'])
                   ->only(array_filter($fields, function($field) {
                       return !is_null($this->$field);
                   }));
    }

    public function getBasicUserData()
    {
        return $this->only([
            'id', 'name', 'email', 'role', 'phone', 'status',
            'student_id', 'department', 'medical_license_number',
            'specialization', 'staff_no', 'faculty'
        ]);
    }

    /* ================== SCOPES ================== */

    public function scopeByRole($query, $role)
    {
        return $query->where('role', $role);
    }

    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    public function scopeVerified($query)
    {
        return $query->whereNotNull('email_verified_at');
    }

    public function scopeByDepartment($query, $department)
    {
        return $query->where('department', $department);
    }

    public function scopeByFaculty($query, $faculty)
    {
        return $query->where('faculty', $faculty);
    }

    public function scopeMedicalStaff($query)
    {
        return $query->whereIn('role', [self::ROLE_DOCTOR, self::ROLE_CLINICAL_STAFF]);
    }

    public function scopeAcademicStaff($query)
    {
        return $query->whereIn('role', [self::ROLE_ACADEMIC_STAFF, self::ROLE_STUDENT]);
    }

    public function scopeStudents($query)
    {
        return $query->where('role', self::ROLE_STUDENT);
    }

    public function scopePatients($query)
    {
        return $query->whereIn('role', [self::ROLE_STUDENT, self::ROLE_ACADEMIC_STAFF]);
    }

    public function scopeByDoctor($query, $doctorId)
    {
        return $query->where('doctor_id', $doctorId);
    }

    public function scopeSearch($query, $search)
    {
        return $query->where(function($q) use ($search) {
            $q->where('name', 'like', "%{$search}%")
              ->orWhere('student_id', 'like', "%{$search}%")
              ->orWhere('email', 'like', "%{$search}%");
        });
    }

    /* ================== PERMISSIONS ================== */

    private function getRolePermissions()
    {
        $permissions = [
            self::ROLE_STUDENT => [
                'view_own_profile',
                'update_own_profile',
                'view_medical_history',
                'schedule_appointments',
                'get_doctor_availability',
            ],
            self::ROLE_DOCTOR => [
                'view_own_profile',
                'update_own_profile',
                'view_patients',
                'manage_patients',
                'view_medical_records',
                'create_medical_records',
                'prescribe_medication',
            ],
            self::ROLE_CLINICAL_STAFF => [
                'view_own_profile',
                'update_own_profile',
                'view_patients',
                'update_patient_info',
                'schedule_appointments',
                'view_medical_records',
            ],
            self::ROLE_ACADEMIC_STAFF => [
                'view_own_profile',
                'update_own_profile',
                'view_medical_history',
                'schedule_appointments',
                'get_doctor_availability',
            ],
            self::ROLE_ADMIN => [
                'full_access',
                'manage_users',
                'manage_roles',
                'view_system_logs',
                'manage_settings',
            ],
        ];

        return $permissions[$this->role] ?? [];
    }
}