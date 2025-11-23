import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { isMongoEnabled } from '../db.js';
import { UserModel } from '../models/user.js';
import { ResetTokenModel } from '../models/resetToken.js';
import { createToken, requireAuth } from '../auth.js';
import { isMailConfigured, sendResetEmail } from '../services/mail.js';
import { asyncHandler } from '../middlewares/error.js';

const router = Router();
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h

function validateCredentials(username, password) {
  const fieldErrors = {};
  const u = typeof username === 'string' ? username.trim() : '';
  const p = typeof password === 'string' ? password : '';
  if (!u) fieldErrors.username = 'Укажите логин';
  if (!p) fieldErrors.password = 'Укажите пароль';
  if (u && u.length < 3) fieldErrors.username = 'Логин должен содержать минимум 3 символа';
  if (p && p.length < 6) fieldErrors.password = 'Пароль должен содержать минимум 6 символов';
  const ok = Object.keys(fieldErrors).length === 0;
  return { ok, username: u, password: p, fieldErrors };
}

function validatePassword(password) {
  const p = typeof password === 'string' ? password : '';
  if (!p) return { ok: false, message: 'Пароль обязателен' };
  if (p.length < 6) return { ok: false, message: 'Пароль должен быть не короче 6 символов' };
  return { ok: true, password: p };
}

function generateResetToken() {
  return crypto.randomBytes(24).toString('hex');
}

// Регистрация: запрещаем создавать администратора, разрешаем только обычных пользователей
router.post('/auth/register', asyncHandler(async (req, res) => {
  const { username, password } = req.body || {};
  const v = validateCredentials(username, password);
  if (!v.ok) return res.status(400).json({ message: 'Некорректные данные', fieldErrors: v.fieldErrors });
  if (v.username === 'admin') return res.status(403).json({ message: 'Регистрация администратора отключена' });

  // Без MongoDB: выдаём токен обычного пользователя
  if (!isMongoEnabled()) {
    const token = createToken({ sub: v.username, username: v.username, role: 'user' });
    return res.status(201).json({ token, user: { username: v.username, role: 'user' } });
  }

  const exists = await UserModel.findOne({ username: v.username });
  if (exists) return res.status(409).json({ message: 'Пользователь уже существует' });
  const passwordHash = bcrypt.hashSync(v.password, 10);
  const user = await UserModel.create({ username: v.username, passwordHash, role: 'user' });
  const token = createToken({ sub: user._id.toString(), username: user.username, role: user.role });
  res.status(201).json({ token, user: { username: user.username, role: user.role } });
}));

// Вход: админ всегда админ; создаём при первом входе (по ADMIN_PASSWORD)
router.post('/auth/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body || {};
  const v = validateCredentials(username, password);
  if (!v.ok) return res.status(400).json({ message: 'Некорректные данные', fieldErrors: v.fieldErrors });

  const isAdminLogin = v.username === 'admin';

  // Без MongoDB
  if (!isMongoEnabled()) {
    if (isAdminLogin) {
      const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
      if (v.password !== adminPass) return res.status(401).json({ message: 'Неверный логин или пароль' });
      const token = createToken({ sub: v.username, username: v.username, role: 'admin' });
      return res.json({ token, user: { username: v.username, role: 'admin' } });
    }
    const token = createToken({ sub: v.username, username: v.username, role: 'user' });
    return res.json({ token, user: { username: v.username, role: 'user' } });
  }

  // С MongoDB
  let user = await UserModel.findOne({ username: v.username });

  if (!user) {
    if (!isAdminLogin) return res.status(401).json({ message: 'Неверный логин или пароль' });
    // вход администратора: создаём при совпадении ADMIN_PASSWORD
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
    if (v.password !== adminPass) return res.status(401).json({ message: 'Неверный логин или пароль' });
    const passwordHash = bcrypt.hashSync(v.password, 10);
    user = await UserModel.create({ username: 'admin', passwordHash, role: 'admin' });
  } else {
    const ok = bcrypt.compareSync(v.password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Неверный логин или пароль' });
  }

  // Гарантируем роль администратора
  if (user.username === 'admin' && user.role !== 'admin') {
    user.role = 'admin';
    await user.save();
  }

  const token = createToken({ sub: user._id ? user._id.toString() : user.username, username: user.username, role: user.role });
  res.json({ token, user: { username: user.username, role: user.role } });
}));

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: { username: req.user.username, role: req.user.role } });
});

// Request password reset: generate token and log/return it (email sending omitted for brevity)
router.post('/auth/forgot', asyncHandler(async (req, res) => {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  if (!username) return res.status(400).json({ message: 'Имя пользователя обязательно' });

  if (!isMongoEnabled()) {
    return res.status(503).json({ message: 'Восстановление пароля недоступно без MongoDB' });
  }

  if (!isMailConfigured()) {
    return res.status(503).json({ message: 'SMTP не настроен: задайте SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS' });
  }

  const token = generateResetToken();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  let user = await UserModel.findOne({ username });

  // Автосоздание admin при первом запросе, чтобы можно было сбросить пароль
  if (!user && username === 'admin') {
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
    const passwordHash = bcrypt.hashSync(adminPass, 10);
    user = await UserModel.create({ username: 'admin', passwordHash, role: 'admin' });
  }

  if (!user) {
    // Не раскрываем наличие пользователя
    return res.json({ message: 'Если такой логин существует, ссылка отправлена' });
  }
  await ResetTokenModel.deleteMany({ userId: user._id });
  const tokenHash = bcrypt.hashSync(token, 10);
  await ResetTokenModel.create({ userId: user._id, tokenHash, expiresAt });
  await sendResetEmail(user.username, token);

  return res.json({ message: 'Ссылка для сброса отправлена на почту' });
}));

// Complete password reset with token
router.post('/auth/reset', asyncHandler(async (req, res) => {
  const { token, password } = req.body || {};
  const t = typeof token === 'string' ? token.trim() : '';
  const pw = validatePassword(password);
  if (!t) return res.status(400).json({ message: 'Токен обязателен' });
  if (!pw.ok) return res.status(400).json({ message: pw.message });

  if (!isMongoEnabled()) {
    return res.status(503).json({ message: 'Сброс пароля недоступен без MongoDB' });
  }

  const activeTokens = await ResetTokenModel.find({ expiresAt: { $gt: new Date() } });
  let matched = null;
  for (const entry of activeTokens) {
    if (bcrypt.compareSync(t, entry.tokenHash)) {
      matched = entry;
      break;
    }
  }
  if (!matched) return res.status(400).json({ message: 'Неверный или истекший токен' });

  const user = await UserModel.findById(matched.userId);
  if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
  user.passwordHash = bcrypt.hashSync(pw.password, 10);
  await user.save();
  await ResetTokenModel.deleteMany({ userId: matched.userId });
  return res.json({ message: 'Пароль обновлен. Теперь можете войти.' });
}));

export default router;
