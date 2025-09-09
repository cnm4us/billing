import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { router as workflowsRouter } from './routes/workflows.js';

dotenv.config();

const app = express();

/** Behind Nginx on the same box */
app.set('trust proxy', 'loopback'); // trust 127.0.0.1 only

/** CORS: allow your domains (adjust as needed) */
const ALLOWED = (process.env.CORS_ORIGINS || 'https://billing.bawebtech.com,https://bawebtech.com').split(',').map(s => s.trim());
app.use(cors({
  origin(origin, cb) {
    if (!origin || ALLOWED.includes(origin)) return cb(null, true);
    return cb(new Error('CORS blocked'), false);
  },
  credentials: true
}));

app.use(express.json());
app.use(morgan('combined'));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, '..', 'public')));

/** Simple root + health */
app.get('/', (_req, res) => res.json({ ok: true, service: 'billing-workflow-mvp' }));
app.get('/api/health', (_req, res) => res.json({ ok: true, secure: _req.secure }));

/** API routes */
app.use('/api/workflows', workflowsRouter);

/** 404 */
app.use((req, res) => res.status(404).json({ error: 'Not found', path: req.originalUrl }));

/** 500 */
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = Number(process.env.PORT || 3100);     // match your Nginx upstream
const host = process.env.HOST || '127.0.0.1';      // keep private
app.listen(port, host, () => {
  console.log(`MVP server listening on http://${host}:${port} (proxied at https://billing.bawebtech.com)`);
});


