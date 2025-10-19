import { Router } from 'express';
import { isMongoEnabled } from '../db.js';
import { TemplateModel } from '../models/template.js';
import { requireAuth } from '../auth.js';
import { asyncHandler } from '../middlewares/error.js';
import { ensureDataFiles, readJSON, writeJSON, templatesFile } from '../storage/files.js';
import { validateTemplates, ensureDefault, templatesEqual } from '../services/templates.js';

const router = Router();

router.get('/templates', requireAuth, asyncHandler(async (req, res) => {
  if (isMongoEnabled()) {
    const list = await TemplateModel.find({}).sort({ name: 1 }).lean();
    const current = list.map((t) => ({ name: t.name, value: t.value }));
    const normalized = ensureDefault(current);
    if (!templatesEqual(current, normalized)) {
      await TemplateModel.deleteMany({});
      if (normalized.length) await TemplateModel.insertMany(normalized);
    }
    return res.json(normalized);
  }
  await ensureDataFiles();
  const templates = await readJSON(templatesFile);
  const rawList = Array.isArray(templates) ? templates : [];
  const current = rawList.map((t) => ({
    name: typeof t?.name === 'string' ? t.name : '',
    value: typeof t?.value === 'string' ? t.value : '',
  })).filter((t) => t.name);
  const normalized = ensureDefault(current);
  if (!templatesEqual(current, normalized)) {
    await writeJSON(templatesFile, normalized);
  }
  res.json(normalized);
}));

router.post('/templates/bulk', requireAuth, asyncHandler(async (req, res) => {
  const { templates } = req.body || {};
  const validation = validateTemplates(templates);
  if (!validation.ok) {
    return res.status(400).json({ message: 'Некорректные шаблоны', errors: validation.errors });
  }
  const normalized = validation.normalized;

  if (isMongoEnabled()) {
    await TemplateModel.deleteMany({});
    if (normalized.length) await TemplateModel.insertMany(normalized);
    return res.json({ ok: true, templates: normalized });
  }
  await ensureDataFiles();
  await writeJSON(templatesFile, normalized);
  res.json({ ok: true, templates: normalized });
}));

router.delete('/templates/:name', requireAuth, asyncHandler(async (req, res) => {
  const { name } = req.params;
  if (!name) return res.status(400).json({ message: 'Требуется указать имя шаблона' });
  if (name === 'default') return res.status(400).json({ message: 'Шаблон \"default\" нельзя удалить' });
  if (isMongoEnabled()) {
    await TemplateModel.findOneAndDelete({ name });
    const list = await TemplateModel.find({}).sort({ name: 1 }).lean();
    const current = list.map((t) => ({ name: t.name, value: t.value }));
    const normalized = ensureDefault(current);
    if (!templatesEqual(current, normalized)) {
      await TemplateModel.deleteMany({});
      if (normalized.length) await TemplateModel.insertMany(normalized);
    }
    return res.json({ ok: true });
  }
  await ensureDataFiles();
  const list = await readJSON(templatesFile);
  const rawList = Array.isArray(list) ? list : [];
  const filtered = rawList
    .filter((t) => t?.name !== name)
    .map((t) => ({
      name: typeof t?.name === 'string' ? t.name : '',
      value: typeof t?.value === 'string' ? t.value : '',
    }))
    .filter((t) => t.name);
  const next = ensureDefault(filtered);
  await writeJSON(templatesFile, next);
  res.json({ ok: true });
}));

export default router;
