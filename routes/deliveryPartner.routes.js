import express from 'express';
import {
  applyDeliveryPartner,
  getAllDeliveryPartners,
  getDeliveryPartner,
  getDeliveryPartnerStats,
  approveDeliveryPartner,
  rejectDeliveryPartner,
  deleteDeliveryPartner,
  deliveryPartnerLogin,
} from '../controllers/deliveryPartner.controller.js';
import adminAuth from '../middleware/adminAuth.js';

const router = express.Router();

// Public
router.post('/apply', applyDeliveryPartner);
router.post('/login', deliveryPartnerLogin);

// Admin protected
router.get('/stats', adminAuth, getDeliveryPartnerStats);
router.get('/', adminAuth, getAllDeliveryPartners);
router.get('/:id', adminAuth, getDeliveryPartner);
router.post('/:id/approve', adminAuth, approveDeliveryPartner);
router.post('/:id/reject', adminAuth, rejectDeliveryPartner);
router.delete('/:id', adminAuth, deleteDeliveryPartner);

export default router;
