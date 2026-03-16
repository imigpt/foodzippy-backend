import express from 'express';
import {
  createDraft,
  getAllDrafts,
  getDraft,
  updateDraft,
  deleteDraft,
  sendDraftToSubscribers,
} from '../controllers/emailDraft.controller.js';
import adminAuth from '../middleware/adminAuth.js';

const router = express.Router();

// All routes require admin auth
router.use(adminAuth);

router.post('/', createDraft);
router.get('/', getAllDrafts);
router.get('/:id', getDraft);
router.patch('/:id', updateDraft);
router.delete('/:id', deleteDraft);
router.post('/:id/send', sendDraftToSubscribers);

export default router;
