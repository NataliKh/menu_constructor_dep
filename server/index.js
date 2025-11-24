import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './db.js';
import { requestLogger } from './middlewares/logger.js';
import { errorHandler, notFound } from './middlewares/error.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import templatesRouter from './routes/templates.js';
import menusRouter from './routes/menus.js';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(requestLogger);

// try to connect MongoDB if URI provided
await connectDB(process.env.MONGODB_URI);

// Mount routers
app.use('/api', healthRouter);
app.use('/api', authRouter);
app.use('/api', templatesRouter);
app.use('/api', menusRouter);

// Serve built client assets
app.use(express.static(distPath));

// SPA fallback: send index.html for non-API routes so deep links work
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distPath, 'index.html'));
});

// Fallbacks
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
