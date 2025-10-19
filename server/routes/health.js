import { Router } from 'express';
import { isMongoEnabled } from '../db.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ ok: true, mongo: isMongoEnabled() });
});

export default router;

