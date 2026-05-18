import express from 'express';
import Joi from 'joi';
import { ensureSession, requireAuth, requireCsrf, updateUserProfile } from '../services/auth.js';

const router = express.Router();

const profileSchema = Joi.object({
  name: Joi.string().max(120).allow('').required(),
  defaultContact: Joi.string().max(180).allow('').required(),
});

router.get('/profile', ensureSession, requireAuth, (req, res) => {
  res.json({ user: req.auth.user });
});

router.patch('/profile', ensureSession, requireCsrf, requireAuth, async (req, res, next) => {
  try {
    const { error, value } = profileSchema.validate(req.body);
    if (error) return res.status(400).json({ error: 'Проверьте имя и контакт' });

    const user = await updateUserProfile(req.auth.user.id, value);
    req.auth.user = user;
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

export default router;
