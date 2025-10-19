import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { isMongoEnabled } from '../db.js';
import { UserModel } from '../models/user.js';
import { createToken, requireAuth } from '../auth.js';
import { asyncHandler } from '../middlewares/error.js';

const router = Router();

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

export default router;
