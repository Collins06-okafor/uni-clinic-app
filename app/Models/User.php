<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

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
        'university_id',
        'department',
        'medical_license_number',
        'specialization',
        'employee_id',
        'faculty',
        'phone',
        'status',
        'permissions',
        'email_verified_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     */
    protected $hidden = [
        'password',
        'remember_token',
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

    /**
     * Get default permissions based on role
     */
    private function getRolePermissions()
    {
        $permissions = [
            self::ROLE_STUDENT => [
                'view_own_profile',
                'update_own_profile',
                'view_courses',
                'submit_assignments',
                'view_grades',
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
                'manage_courses',
                'view_students',
                'grade_assignments',
                'create_announcements',
            ],
            self::ROLE_ADMIN => [
                'full_access',
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
                return $this->university_id;
            case self::ROLE_DOCTOR:
                return $this->medical_license_number;
            case self::ROLE_CLINICAL_STAFF:
            case self::ROLE_ACADEMIC_STAFF:
            case self::ROLE_ADMIN:
                return $this->employee_id;
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
}