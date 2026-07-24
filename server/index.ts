import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import uploadRoutes from './routes/upload.js';
import visitsRoutes from './routes/visits.js';
import visitorsRoutes from './routes/visitors.js';
import hostsRoutes from './routes/hosts.js';
import departmentsRoutes from './routes/departments.js';
import analyticsRoutes from './routes/analytics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/visits', visitsRoutes);
app.use('/api/visitors', visitorsRoutes);
app.use('/api/hosts', hostsRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error', stack: process.env.NODE_ENV === 'development' ? err.stack : undefined });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
