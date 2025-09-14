<?php

// Notification Model
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Notification extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'type',
        'title',
        'message',
        'data',
        'read',
        'read_at'
    ];

    protected $casts = [
        'data' => 'array',
        'read' => 'boolean',
        'read_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    /**
     * Get the user that owns the notification
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Mark notification as read
     */
    public function markAsRead()
    {
        if (!$this->read) {
            $this->update([
                'read' => true,
                'read_at' => now()
            ]);
        }
    }

    /**
     * Get formatted time for display
     */
    public function getFormattedTimeAttribute()
    {
        return $this->created_at->diffForHumans();
    }

    /**
     * Scope for unread notifications
     */
    public function scopeUnread($query)
    {
        return $query->where('read', false);
    }

    /**
     * Scope for specific type
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('type', $type);
    }
}

// NotificationController
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Notification;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    /**
     * Get user notifications
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'type' => 'nullable|string',
                'read' => 'nullable|boolean',
                'limit' => 'nullable|integer|min:1|max:100'
            ]);

            $query = Notification::where('user_id', Auth::id())
                ->orderBy('created_at', 'desc');

            if (isset($validated['type'])) {
                $query->where('type', $validated['type']);
            }

            if (isset($validated['read'])) {
                $query->where('read', $validated['read']);
            }

            $limit = $validated['limit'] ?? 20;
            $notifications = $query->limit($limit)->get();

            return response()->json([
                'notifications' => $notifications->map(function($notification) {
                    return [
                        'id' => $notification->id,
                        'type' => $notification->type,
                        'title' => $notification->title,
                        'message' => $notification->message,
                        'data' => $notification->data,
                        'read' => $notification->read,
                        'read_at' => $notification->read_at,
                        'created_at' => $notification->created_at,
                        'formatted_time' => $notification->formatted_time,
                        'icon' => $this->getNotificationIcon($notification->type),
                        'color' => $this->getNotificationColor($notification->type)
                    ];
                }),
                'unread_count' => Notification::where('user_id', Auth::id())->unread()->count()
            ]);

        } catch (\Exception $e) {
            \Log::error('Error fetching notifications: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to fetch notifications',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mark notification as read
     */
    public function markAsRead(Request $request, $id): JsonResponse
    {
        try {
            $notification = Notification::where('user_id', Auth::id())
                ->where('id', $id)
                ->first();

            if (!$notification) {
                return response()->json([
                    'message' => 'Notification not found'
                ], 404);
            }

            $notification->markAsRead();

            return response()->json([
                'message' => 'Notification marked as read',
                'notification' => $notification
            ]);

        } catch (\Exception $e) {
            \Log::error('Error marking notification as read: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to mark notification as read',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mark all notifications as read
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        try {
            $updated = Notification::where('user_id', Auth::id())
                ->where('read', false)
                ->update([
                    'read' => true,
                    'read_at' => now()
                ]);

            return response()->json([
                'message' => 'All notifications marked as read',
                'updated_count' => $updated
            ]);

        } catch (\Exception $e) {
            \Log::error('Error marking all notifications as read: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to mark all notifications as read',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete notification
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        try {
            $notification = Notification::where('user_id', Auth::id())
                ->where('id', $id)
                ->first();

            if (!$notification) {
                return response()->json([
                    'message' => 'Notification not found'
                ], 404);
            }

            $notification->delete();

            return response()->json([
                'message' => 'Notification deleted successfully'
            ]);

        } catch (\Exception $e) {
            \Log::error('Error deleting notification: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to delete notification',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get unread notification count
     */
    public function getUnreadCount(Request $request): JsonResponse
    {
        try {
            $count = Notification::where('user_id', Auth::id())
                ->unread()
                ->count();

            return response()->json([
                'unread_count' => $count
            ]);

        } catch (\Exception $e) {
            \Log::error('Error getting unread count: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to get unread count',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get notification icon based on type
     */
    private function getNotificationIcon($type): string
    {
        $icons = [
            'appointment_assigned' => 'calendar-check',
            'appointment_confirmed' => 'check-circle',
            'appointment_rejected' => 'x-circle',
            'appointment_rescheduled' => 'calendar',
            'appointment_completed' => 'check-square',
            'prescription_ready' => 'pill',
            'follow_up_required' => 'clock',
            'system' => 'info'
        ];

        return $icons[$type] ?? 'bell';
    }

    /**
     * Get notification color based on type
     */
    private function getNotificationColor($type): string
    {
        $colors = [
            'appointment_assigned' => 'primary',
            'appointment_confirmed' => 'success',
            'appointment_rejected' => 'danger',
            'appointment_rescheduled' => 'warning',
            'appointment_completed' => 'success',
            'prescription_ready' => 'info',
            'follow_up_required' => 'warning',
            'system' => 'secondary'
        ];

        return $colors[$type] ?? 'secondary';
    }
}

