import express from 'express';
import {
  createCareerApplication,
  getAllCareerApplications,
  getCareerApplication,
  updateCareerApplication,
  deleteCareerApplication,
  getCareerApplicationStats,
} from '../controllers/career.controller.js';
import adminAuth from '../middleware/adminAuth.js';

const router = express.Router();

// Public — frontend form submits here
router.post('/apply', createCareerApplication);

// Admin — protected
router.get('/stats', adminAuth, getCareerApplicationStats);
router.get('/', adminAuth, getAllCareerApplications);
router.get('/:id', adminAuth, getCareerApplication);
router.patch('/:id', adminAuth, updateCareerApplication);
router.delete('/:id', adminAuth, deleteCareerApplication);

export default router;
