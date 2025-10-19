import { Router } from 'express';
import { randomUUID } from 'crypto';
import { isMongoEnabled } from '../db.js';
import { MenuModel } from '../models/menu.js';
import { requireAuth } from '../auth.js';
import { asyncHandler } from '../middlewares/error.js';
import { ensureDataFiles, readJSON, writeJSON, menusFile } from '../storage/files.js';

const router = Router();

router.get('/menus', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user?.sub;
  const isAdmin = req.user?.role === 'admin';
  const { userId: qUserId, name, q } = req.query || {};
  const nameQuery = typeof name === 'string' && name.trim()
    ? name.trim()
    : (typeof q === 'string' && q.trim() ? q.trim() : '');

  if (isMongoEnabled()) {
    const where = {};
    if (!isAdmin) {
      where.userId = userId;
    } else if (typeof qUserId === 'string' && qUserId.trim()) {
      where.userId = qUserId.trim();
    }
    if (nameQuery) {
      where.name = new RegExp(nameQuery, 'i');
    }
    const list = await MenuModel.find(where).sort({ createdAt: -1 }).lean();
    return res.json(list.map((m) => ({ id: m._id, name: m.name, items: m.items })));
  }

  await ensureDataFiles();
  const list = await readJSON(menusFile);
  let filtered = Array.isArray(list) ? list : [];
  if (!isAdmin) {
    filtered = filtered.filter((m) => m.userId === userId);
  } else if (typeof qUserId === 'string' && qUserId.trim()) {
    filtered = filtered.filter((m) => m.userId === qUserId.trim());
  }
  if (nameQuery) {
    const rx = new RegExp(nameQuery, 'i');
    filtered = filtered.filter((m) => typeof m.name === 'string' && rx.test(m.name));
  }
  res.json(filtered.map((m) => ({ id: m.id, name: m.name, items: m.items })));
}));

router.get('/menus/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.sub;
  const isAdmin = req.user?.role === 'admin';
  if (isMongoEnabled()) {
    const where = isAdmin ? { _id: id } : { _id: id, userId };
    const found = await MenuModel.findOne(where).lean();
    if (!found) return res.status(404).json({ message: 'Меню не найдено' });
    return res.json({ id: found._id, name: found.name, items: found.items });
  }
  await ensureDataFiles();
  const list = await readJSON(menusFile);
  const found = Array.isArray(list)
    ? list.find((m) => m.id === id && (isAdmin || m.userId === userId))
    : null;
  if (!found) return res.status(404).json({ message: 'Меню не найдено' });
  res.json({ id: found.id, name: found.name, items: found.items });
}));

router.post('/menus', requireAuth, asyncHandler(async (req, res) => {
  const { name, items } = req.body || {};
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ message: 'Название меню обязательно' });
  }
  const id = `${Date.now()}-${randomUUID()}`;
  if (isMongoEnabled()) {
    await MenuModel.create({
      _id: id,
      userId: req.user?.sub,
      name,
      items: Array.isArray(items) ? items : [],
    });
    return res.status(201).json({ id, name });
  }
  await ensureDataFiles();
  const list = await readJSON(menusFile);
  list.unshift({ id, userId: req.user?.sub, name, items: Array.isArray(items) ? items : [] });
  await writeJSON(menusFile, list);
  res.status(201).json({ id, name });
}));

router.put('/menus/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, items } = req.body || {};
  if (!id) return res.status(400).json({ message: 'Не указан идентификатор меню' });
  const userId = req.user?.sub;
  if (isMongoEnabled()) {
    const update = { name: name || '', items: Array.isArray(items) ? items : [] };
    const found = await MenuModel.findOneAndUpdate(
      { _id: id, userId },
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    // гарантируем привязку пользователя при upsert
    if (found && !found.userId) {
      found.userId = userId;
      await found.save();
    }
    if (!found) return res.status(404).json({ message: 'Меню не найдено' });
    return res.json({ ok: true });
  }
  await ensureDataFiles();
  const list = await readJSON(menusFile);
  const idx = Array.isArray(list) ? list.findIndex((m) => m.id === id && m.userId === userId) : -1;
  const next = { id, userId, name: name || '', items: Array.isArray(items) ? items : [] };
  if (!Array.isArray(list)) {
    return res.status(500).json({ message: 'Ошибка хранилища меню' });
  }
  if (idx === -1) list.unshift(next); else list[idx] = next;
  await writeJSON(menusFile, list);
  res.json({ ok: true });
}));

router.delete('/menus/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.sub;
  if (!id) return res.status(400).json({ message: 'Не указан идентификатор меню' });
  if (isMongoEnabled()) {
    const resDb = await MenuModel.findOneAndDelete({ _id: id, userId });
    if (!resDb) return res.status(404).json({ message: 'Меню не найдено' });
    return res.json({ ok: true });
  }
  await ensureDataFiles();
  const list = await readJSON(menusFile);
  if (!Array.isArray(list)) return res.status(500).json({ message: 'Ошибка хранилища меню' });
  const next = list.filter((m) => !(m.id === id && m.userId === userId));
  if (next.length === list.length) return res.status(404).json({ message: 'Меню не найдено' });
  await writeJSON(menusFile, next);
  res.json({ ok: true });
}));

export default router;
