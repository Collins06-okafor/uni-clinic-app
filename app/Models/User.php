<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\SoftDeletes;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

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
        'doctor_id', // Add this for patient assignment
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
        'permissions' => '[]', // Default empty JSON array
        'status' => self::STATUS_ACTIVE,
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'permissions' => 'array',
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
            // Ensure permissions is never null
            if (is_null($user->permissions)) {
                $user->permissions = [];
            }
            
            // Set default status if not provided
            if (is_null($user->status)) {
                $user->status = self::STATUS_ACTIVE;
            }
        });
    }

    /**
     * Check if user has a specific role
     */
    public function hasRole($role)
    {
        return $this->role === $role;
    }

    /**
     * Check if user has any of the specified roles
     */
    public function hasAnyRole(array $roles)
    {
        return in_array($this->role, $roles);
    }

    /**
     * Check if user has a specific permission
     */
    public function hasPermission($permission)
    {
        if ($this->role === self::ROLE_ADMIN) {
            return true; // Admin has all permissions
        }

        $permissions = $this->getAllPermissions();
        return in_array($permission, $permissions);
    }

    /**
     * Get all permissions for the user
     */
    public function getAllPermissions()
    {
        $rolePermissions = $this->getRolePermissions();
        $customPermissions = $this->permissions ?? [];
        
        return array_unique(array_merge($rolePermissions, $customPermissions));
    }

 public function doctorProfile()
{
    return $this->hasOne(Doctor::class, 'user_id');
}

public function deleteUserRecord()
{
    // Handle any cleanup before deletion (e.g., reassign patients, clean up relationships)
    
    // If this is a doctor, reassign their patients
    if ($this->role === self::ROLE_DOCTOR) {
        $this->patients()->update(['doctor_id' => null]);
    }
    
    // Delete related records if needed
    // $this->medicalRecords()->delete();
    // $this->appointments()->delete();
    
    // Perform the actual deletion
    return $this->forceDelete();
}

    /**
     * Get default permissions based on role
     */
    private function getRolePermissions()
    {
        $permissions = [
            self::ROLE_STUDENT => [
                'view_own_profile',
                'update_own_profile',
                'view_medical_history',
                'schedule_appointments',
                'get doctor availability',
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
                'get doctor availability',
                
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

    /**
     * Check if user is active
     */
    public function isActive()
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    /**
     * Check if user is verified
     */
    public function isVerified()
    {
        return !is_null($this->email_verified_at);
    }

    /**
     * Get user's display identifier based on role
     */
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

    /**
     * Get user's full title based on role
     */
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

    /**
     * Get role-specific fields for this user
     */
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

    /**
     * ✅ UPDATED: Get formatted user data without irrelevant fields
     * This matches the AuthController's expected format
     */
    public function getFormattedUserData()
    {
        $userData = $this->makeHidden(['password'])->toArray();
        
        // Remove null fields that aren't relevant for each role
        switch ($this->role) {
            case self::ROLE_DOCTOR:
                unset($userData['student_id']);
                unset($userData['department']);
                unset($userData['faculty']);
                break;
                
            case self::ROLE_STUDENT:
                unset($userData['medical_license_number']);
                unset($userData['specialization']);
                unset($userData['staff_no']);
                unset($userData['faculty']);
                break;
                
            case self::ROLE_CLINICAL_STAFF:
                unset($userData['student_id']);
                unset($userData['faculty']);
                unset($userData['medical_license_number']);
                unset($userData['specialization']);
                break;
                
            case self::ROLE_ACADEMIC_STAFF:
                unset($userData['student_id']);
                unset($userData['medical_license_number']);
                unset($userData['specialization']);
                break;
                
            case self::ROLE_ADMIN:
                unset($userData['student_id']);
                unset($userData['department']);
                unset($userData['faculty']);
                unset($userData['medical_license_number']);
                unset($userData['specialization']);
                break;
        }
        
        // Remove null values and permissions (permissions returned separately)
        unset($userData['permissions']);
        return array_filter($userData, function($value) {
            return $value !== null;
        });
    }

    /**
     * Scope to filter by role
     */
    public function scopeByRole($query, $role)
    {
        return $query->where('role', $role);
    }

    /**
     * Scope to filter active users
     */
    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    /**
     * Scope to filter verified users
     */
    public function scopeVerified($query)
    {
        return $query->whereNotNull('email_verified_at');
    }

    /**
     * Get users by department
     */
    public function scopeByDepartment($query, $department)
    {
        return $query->where('department', $department);
    }

    /**
     * Get users by faculty
     */
    public function scopeByFaculty($query, $faculty)
    {
        return $query->where('faculty', $faculty);
    }

    /**
     * Scope to get users with medical roles
     */
    public function scopeMedicalStaff($query)
    {
        return $query->whereIn('role', [self::ROLE_DOCTOR, self::ROLE_CLINICAL_STAFF]);
    }

    /**
     * Scope to get users with academic roles
     */
    public function scopeAcademicStaff($query)
    {
        return $query->whereIn('role', [self::ROLE_ACADEMIC_STAFF, self::ROLE_STUDENT]);
    }

    /**
     * Scope to filter students only
     */
    public function scopeStudents($query)
    {
        return $query->where('role', self::ROLE_STUDENT);
    }

    /**
     * Scope to filter patients (students and academic staff)
     */
    public function scopePatients($query)
    {
        return $query->whereIn('role', [self::ROLE_STUDENT, self::ROLE_ACADEMIC_STAFF]);
    }

    /**
     * Scope to filter by assigned doctor
     */
    public function scopeByDoctor($query, $doctorId)
    {
        return $query->where('doctor_id', $doctorId);
    }

    /**
     * Scope for search functionality
     */
    public function scopeSearch($query, $search)
    {
        return $query->where(function($q) use ($search) {
            $q->where('name', 'like', "%{$search}%")
              ->orWhere('student_id', 'like', "%{$search}%")
              ->orWhere('email', 'like', "%{$search}%");
        });
    }

    /**
     * Get login field options for this user
     */
    public function getLoginFields()
    {
        $fields = ['email']; // Email is always available
        
        switch ($this->role) {
            case self::ROLE_STUDENT:
                if ($this->student_id) {
                    $fields[] = 'student_id';
                }
                break;
            case self::ROLE_DOCTOR:
                if ($this->medical_license_number) {
                    $fields[] = 'medical_license_number';
                }
                if ($this->staff_no) {
                    $fields[] = 'staff_no';
                }
                break;
            case self::ROLE_CLINICAL_STAFF:
            case self::ROLE_ACADEMIC_STAFF:
            case self::ROLE_ADMIN:
                if ($this->staff_no) {
                    $fields[] = 'staff_no';
                }
                break;
        }
        
        return $fields;
    }

    /**
     * Relationships
     */

    /**
     * Relationship: Get all patients assigned to this doctor
     * (both students and academic staff)
     */
    public function patients()
    {
        return $this->hasMany(User::class, 'doctor_id')
                   ->whereIn('role', [self::ROLE_STUDENT, self::ROLE_ACADEMIC_STAFF]);
    }

    /**
     * Relationship: Get the assigned doctor for this patient
     */
    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id')
                   ->where('role', self::ROLE_DOCTOR);
    }


    /**
     * Relationship: Medical records where this user is the patient
     */
    public function medicalRecords()
    {
        return $this->hasMany(MedicalRecord::class, 'patient_id');
    }

    /**
     * Relationship: Medical records created by this doctor
     */
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

    /**
     * Patient Management Methods
     */

    /**
     * Assign a patient to this doctor
     */
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

    /**
     * Remove a patient from this doctor
     */
    public function removePatient($patientId)
    {
        $patient = User::where('doctor_id', $this->id)
                      ->findOrFail($patientId);
        
        $patient->doctor_id = null;
        $patient->save();
        
        return $patient;
    }
}