import Notification from '../models/Notification.js';
import Vendor from '../models/Vendor.js';

// @desc    Create a follow-up update notification
// @route   Internal function (called from other controllers)
// @access  Private
export const createFollowUpNotification = async (vendorId, userId, userName, userRole, oldDate, newDate) => {
  try {
    const vendor = await Vendor.findById(vendorId);
    
    if (!vendor) {
      console.error('Vendor not found for notification');
      return null;
    }

    // Format dates for message
    const oldDateStr = oldDate ? new Date(oldDate).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }) : 'Not set';
    
    const newDateStr = newDate ? new Date(newDate).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }) : 'Removed';

    // Create notification
    const notification = await Notification.create({
      type: 'follow_up_update',
      vendorId,
      updatedBy: {
        userId,
        userName,
        userRole,
      },
      title: 'Follow-up Date Updated',
      message: `${userName} (${userRole}) updated follow-up date for "${vendor.restaurantName}" from ${oldDateStr} to ${newDateStr}`,
      followUpDate: {
        oldDate: oldDate || null,
        newDate: newDate || null,
      },
      vendorDetails: {
        restaurantName: vendor.restaurantName,
        restaurantStatus: vendor.restaurantStatus,
      },
    });

    return notification;
  } catch (error) {
    console.error('Error creating follow-up notification:', error);
    return null;
  }
};

// @desc    Create a status update notification (onboarded/rejected/follow-up scheduled)
// @route   Internal function (called from other controllers)
// @access  Private
export const createStatusUpdateNotification = async (vendorId, userId, userName, userRole, newStatus, nextFollowUpDate = null) => {
  try {
    const vendor = await Vendor.findById(vendorId);
    
    if (!vendor) {
      console.error('Vendor not found for notification');
      return null;
    }

    // Determine notification title and message based on status
    let title = 'Vendor Status Updated';
    let message = '';

    if (newStatus.includes('onboarded')) {
      title = '✅ Vendor Onboarded';
      message = `${userName} (${userRole}) successfully onboarded "${vendor.restaurantName}"`;
    } else if (newStatus.includes('rejected')) {
      title = '❌ Vendor Rejected';
      message = `${userName} (${userRole}) marked "${vendor.restaurantName}" as rejected`;
    } else if (newStatus.includes('2nd-scheduled')) {
      title = '🔄 2nd Follow-up Scheduled';
      const dateStr = nextFollowUpDate 
        ? new Date(nextFollowUpDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : 'No date set';
      message = `${userName} (${userRole}) scheduled 2nd follow-up for "${vendor.restaurantName}" on ${dateStr}`;
    } else {
      message = `${userName} (${userRole}) updated status for "${vendor.restaurantName}" to ${newStatus}`;
    }

    // Create notification
    const notification = await Notification.create({
      type: 'status_update',
      vendorId,
      updatedBy: {
        userId,
        userName,
        userRole,
      },
      title,
      message,
      followUpDate: {
        oldDate: null,
        newDate: nextFollowUpDate || null,
      },
      vendorDetails: {
        restaurantName: vendor.restaurantName,
        restaurantStatus: vendor.restaurantStatus,
      },
    });

    return notification;
  } catch (error) {
    console.error('Error creating status update notification:', error);
    return null;
  }
};

// @desc    Get all notifications for admin
// @route   GET /api/notifications
// @access  Private (Admin)
export const getNotifications = async (req, res) => {
  try {
    const { 
      limit = 50, 
      page = 1, 
      isRead 
    } = req.query;

    const filter = {};
    
    // Filter by read status if provided
    if (isRead !== undefined) {
      filter.isRead = isRead === 'true';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .populate('vendorId', 'restaurantName restaurantStatus')
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ isRead: false }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        notifications,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
        unreadCount,
      },
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message,
    });
  }
};

// @desc    Get unread notifications count
// @route   GET /api/notifications/unread-count
// @access  Private (Admin)
export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ isRead: false });

    res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count',
      error: error.message,
    });
  }
};

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private (Admin)
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndUpdate(
      id,
      { 
        isRead: true,
        readAt: new Date(),
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message,
    });
  }
};

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/mark-all-read
// @access  Private (Admin)
export const markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { isRead: false },
      { 
        isRead: true,
        readAt: new Date(),
      }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message,
    });
  }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private (Admin)
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndDelete(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message,
    });
  }
};

// @desc    Clear all read notifications
// @route   DELETE /api/notifications/clear-read
// @access  Private (Admin)
export const clearReadNotifications = async (req, res) => {
  try {
    const result = await Notification.deleteMany({ isRead: true });

    res.status(200).json({
      success: true,
      message: 'Read notifications cleared',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Clear read notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear read notifications',
      error: error.message,
    });
  }
};
