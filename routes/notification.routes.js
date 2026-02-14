import express from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
} from '../controllers/notification.controller.js';
import adminAuth from '../middleware/adminAuth.js';

const router = express.Router();

// All routes are protected by admin authentication
router.use(adminAuth);

// Get all notifications
router.get('/', getNotifications);

// Get unread count
router.get('/unread-count', getUnreadCount);

// Mark all as read
router.patch('/mark-all-read', markAllAsRead);

// Clear all read notifications
router.delete('/clear-read', clearReadNotifications);

// Mark single notification as read
router.patch('/:id/read', markAsRead);

// Delete single notification
router.delete('/:id', deleteNotification);

export default router;
