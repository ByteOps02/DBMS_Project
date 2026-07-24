import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import uploadRoutes from './routes/upload.js';
import visitsRoutes from './routes/visits.js';
import visitorsRoutes from './routes/visitors.js';
import hostsRoutes from './routes/hosts.js';
import departmentsRoutes from './routes/departments.js';
import analyticsRoutes from './routes/analytics.js';

const app = express();

// ── CORS ─────────────────────────────────────────────────────────────────────
// In production set FRONTEND_URL to your Vercel frontend URL, e.g.
//   FRONTEND_URL=https://vms-frontend.vercel.app
// Multiple origins are supported via a comma-separated list:
//   FRONTEND_URL=https://vms-frontend.vercel.app,https://vms.example.com
const rawOrigins = process.env.FRONTEND_URL ?? 'http://localhost:5174';
const allowedOrigins = rawOrigins.split(',').map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin "${origin}" is not allowed`));
    },
    credentials: true,
  })
);

app.use(express.json());

// ── Routes ───────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('Visitor Management System API is running! 🚀');
});

app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/visits', visitsRoutes);
app.use('/api/visitors', visitorsRoutes);
app.use('/api/hosts', hostsRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/analytics', analyticsRoutes);

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// ── Export for Vercel serverless ──────────────────────────────────────────────
// Vercel's @vercel/node adapter uses the default export directly.
export default app;

// ── Local dev server ──────────────────────────────────────────────────────────
// Only bind a TCP port when running locally (not on Vercel).
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
