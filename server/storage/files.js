import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureDefault } from '../services/templates.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const dataDir = path.join(__dirname, '..', 'data');
export const menusFile = path.join(dataDir, 'menus.json');
export const templatesFile = path.join(dataDir, 'templates.json');

export async function ensureDataFiles() {
  try { await fs.mkdir(dataDir, { recursive: true }); } catch {}
  try { await fs.access(menusFile); } catch { await fs.writeFile(menusFile, JSON.stringify([],null,2)); }
  try { await fs.access(templatesFile); } catch {
    const defaults = ensureDefault([]);
    await fs.writeFile(templatesFile, JSON.stringify(defaults,null,2));
  }
}

export async function readJSON(file) {
  const txt = await fs.readFile(file, 'utf8');
  return JSON.parse(txt || 'null');
}

export async function writeJSON(file, data) {
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
}

