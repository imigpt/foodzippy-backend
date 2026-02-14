import express from 'express';
import {
  getFormConfig,
  getFieldConfig,
  createFieldConfig,
  updateFieldConfig,
  deleteFieldConfig,
  updateFieldOrder,
  getAllSections,
  createSection,
  updateSection,
  deleteSection,
} from '../controllers/formConfig.controller.js';
import adminAuth from '../middleware/adminAuth.js';

const router = express.Router();

// ==========================================
// FORM CONFIG ROUTES (Admin Only)
// ==========================================

// Get full form configuration (public for agents/employees)
router.get('/config', getFormConfig);

// Field management (Admin only)
router.get('/fields/:id', adminAuth, getFieldConfig);
router.post('/fields', adminAuth, createFieldConfig);
router.put('/fields/:id', adminAuth, updateFieldConfig);
router.delete('/fields/:id', adminAuth, deleteFieldConfig);
router.post('/fields/reorder', adminAuth, updateFieldOrder);

// Section management (Admin only)
router.get('/sections', adminAuth, getAllSections);
router.post('/sections', adminAuth, createSection);
router.put('/sections/:id', adminAuth, updateSection);
router.delete('/sections/:id', adminAuth, deleteSection);

export default router;
