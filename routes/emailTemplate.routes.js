import express from 'express';
import {
  getAllTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  seedDefaultTemplates,
} from '../controllers/emailTemplate.controller.js';
import adminAuth from '../middleware/adminAuth.js';

const router = express.Router();

router.use(adminAuth);

router.post('/seed', seedDefaultTemplates);
router.get('/', getAllTemplates);
router.post('/', createTemplate);
router.get('/:id', getTemplate);
router.patch('/:id', updateTemplate);
router.delete('/:id', deleteTemplate);

export default router;
