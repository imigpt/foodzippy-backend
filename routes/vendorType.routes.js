import express from 'express';
import {
  getAllVendorTypes,
  getVendorType,
  createVendorType,
  updateVendorType,
  deleteVendorType,
  reorderVendorTypes,
} from '../controllers/vendorType.controller.js';
import adminAuth from '../middleware/adminAuth.js';

const router = express.Router();

// ==========================================
// VENDOR TYPE ROUTES
// ==========================================

// Public routes (for agents/employees to see vendor types)
router.get('/', getAllVendorTypes);
router.get('/:id', getVendorType);

// Admin-only routes
router.post('/', adminAuth, createVendorType);
router.put('/:id', adminAuth, updateVendorType);
router.delete('/:id', adminAuth, deleteVendorType);
router.post('/reorder', adminAuth, reorderVendorTypes);

export default router;
