<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Services\NotificationService;
use App\Models\Notification;

class NotificationController extends Controller
{
    protected $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Get user notifications
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'type' => 'sometimes|in:email,sms,in_app,push',
            'category' => 'sometimes|in:appointment,registration,medical,system',
            'unread_only' => 'sometimes|boolean',
            'per_page' => 'sometimes|integer|min:1|max:100'
        ]);

        $notifications = $this->notificationService->getUserNotifications(
            $request->user()->id,
            $filters
        );

        return response()->json([
            'notifications' => $notifications->items(),
            'pagination' => [
                'current_page' => $notifications->currentPage(),
                'total' => $notifications->total(),
                'per_page' => $notifications->perPage(),
                'last_page' => $notifications->lastPage()
            ]
        ]);
    }

    /**
     * Mark notification as read
     */
    public function markAsRead(Request $request, $id): JsonResponse
    {
        $success = $this->notificationService->markAsRead($id, $request->user()->id);

        if (!$success) {
            return response()->json([
                'message' => 'Notification not found'
            ], 404);
        }

        return response()->json([
            'message' => 'Notification marked as read'
        ]);
    }

    /**
     * Mark all notifications as read
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $count = Notification::where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update([
                'status' => 'read',
                'read_at' => now()
            ]);

        return response()->json([
            'message' => 'All notifications marked as read',
            'count' => $count
        ]);
    }

    /**
     * Get notification statistics
     */
    public function getStats(Request $request): JsonResponse
    {
        $stats = $this->notificationService->getNotificationStats($request->user()->id);

        return response()->json($stats);
    }

    /**
     * Send test notification (admin only)
     */
    public function sendTestNotification(Request $request): JsonResponse
    {
        $this->authorize('admin-access'); // Make sure user is admin

        $validated = $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'exists:users,id',
            'title' => 'required|string|max:255',
            'message' => 'required|string|max:1000',
            'category' => 'required|in:appointment,registration,medical,system',
            'delivery_method' => 'required|in:email,sms,in_app',
            'locale' => 'sometimes|in:en,tr'
        ]);

        $notifications = $this->notificationService->sendBulkNotification(
            $validated['user_ids'],
            $validated['title'],
            $validated['message'],
            [
                'category' => $validated['category'],
                'delivery_method' => $validated['delivery_method'],
                'locale' => $validated['locale'] ?? 'en'
            ]
        );

        return response()->json([
            'message' => 'Test notifications sent successfully',
            'count' => count($notifications)
        ]);
    }

    /**
     * Delete notification
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        $deleted = Notification::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->delete();

        if (!$deleted) {
            return response()->json([
                'message' => 'Notification not found'
            ], 404);
        }

        return response()->json([
            'message' => 'Notification deleted successfully'
        ]);
    }
}