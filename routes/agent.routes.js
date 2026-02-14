import express from 'express';
import {
  agentLogin,
  getAllAgents,
  getAgentById,
  createAgent,
  updateAgent,
  deleteAgent,
  getMyProfile,
  updateMyProfile,
  getMyVendors,
  requestVendorEdit,
  updateMyVendor,
} from '../controllers/agent.controller.js';
import adminAuth from '../middleware/adminAuth.js';
import agentAuth from '../middleware/agentAuth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// Public route - Agent login
router.post('/login', agentLogin);

// Agent self-service routes (protected with agentAuth)
router.get('/profile', agentAuth, getMyProfile);
router.put('/profile', agentAuth, upload.single('profileImage'), updateMyProfile);
router.get('/vendors', agentAuth, getMyVendors);
router.post('/vendors/:id/request-edit', agentAuth, requestVendorEdit);
router.put('/vendors/:id', agentAuth, upload.single('restaurantImage'), updateMyVendor);

// Admin-only routes - Agent management
router.get('/', adminAuth, getAllAgents);
router.get('/:id', adminAuth, getAgentById);
router.post('/', adminAuth, createAgent);
router.put('/:id', adminAuth, updateAgent);
router.delete('/:id', adminAuth, deleteAgent);

export default router;
