import express from 'express';
import {
  userLogin,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getMyProfile,
  updateMyProfile,
  getMyVendors,
  getMyVendorById,
  requestVendorEdit,
  updateMyVendor,
} from '../controllers/user.controller.js';
import adminAuth from '../middleware/adminAuth.js';
import userAuth from '../middleware/userAuth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// Public routes - Agent/Employee login
router.post('/agent/login', userLogin);
router.post('/employee/login', userLogin);

// Agent self-service routes (protected with userAuth)
router.get('/agent/profile', userAuth, getMyProfile);
router.put('/agent/profile', userAuth, upload.single('profileImage'), updateMyProfile);
router.get('/agent/vendors', userAuth, getMyVendors);
router.get('/agent/vendors/:id', userAuth, getMyVendorById);
router.post('/agent/vendors/:id/request-edit', userAuth, requestVendorEdit);
router.put('/agent/vendors/:id', userAuth, upload.single('restaurantImage'), updateMyVendor);

// Employee self-service routes (protected with userAuth) - same as agent
router.get('/employee/profile', userAuth, getMyProfile);
router.put('/employee/profile', userAuth, upload.single('profileImage'), updateMyProfile);
router.get('/employee/vendors', userAuth, getMyVendors);
router.get('/employee/vendors/:id', userAuth, getMyVendorById);
router.post('/employee/vendors/:id/request-edit', userAuth, requestVendorEdit);
router.put('/employee/vendors/:id', userAuth, upload.single('restaurantImage'), updateMyVendor);

// Admin-only routes - User management (both agents and employees)
router.get('/', adminAuth, getAllUsers); // Query: ?role=agent or ?role=employee
router.get('/:id', adminAuth, getUserById);
router.post('/', adminAuth, createUser);
router.put('/:id', adminAuth, updateUser);
router.delete('/:id', adminAuth, deleteUser);

export default router;
