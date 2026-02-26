import express from 'express';
import {
  subscribe,
  getAllSubscribers,
  getSubscriberStats,
  updateSubscriber,
  deleteSubscriber,
  exportSubscribers,
} from '../controllers/subscriber.controller.js';
import adminAuth from '../middleware/adminAuth.js';

const router = express.Router();

// Public — footer subscription
router.post('/subscribe', subscribe);

// Admin — protected
router.get('/stats', adminAuth, getSubscriberStats);
router.get('/export', adminAuth, exportSubscribers);
router.get('/', adminAuth, getAllSubscribers);
router.patch('/:id', adminAuth, updateSubscriber);
router.delete('/:id', adminAuth, deleteSubscriber);

export default router;
