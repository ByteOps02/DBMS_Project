import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only';
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, department_id } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    const existingUser = await prisma.host.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'This email is already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const host = await prisma.host.create({
      data: {
        email: email.trim().toLowerCase(),
        name,
        password_hash,
        department_id: department_id || null,
        role: 'visitor',
      },
    });

    const token = jwt.sign({ userId: host.id, role: host.role }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({ token, user: { id: host.id, name: host.name, email: host.email, role: host.role, department_id: host.department_id } });
  } catch (err) {
    console.error('[Auth Signup Error]', err);
    res.status(500).json({ error: 'Failed to create account', details: err instanceof Error ? err.message : String(err) });
  }
});
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const host = await prisma.host.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!host || !host.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, host.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!host.active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    const token = jwt.sign({ userId: host.id, role: host.role }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(200).json({ token, user: { id: host.id, name: host.name, email: host.email, role: host.role, department_id: host.department_id } });
  } catch (err) {
    console.error('[Auth Login Error]', err);
    res.status(500).json({ error: 'Failed to login', details: err instanceof Error ? err.message : String(err) });
  }
});
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const host = await prisma.host.findUnique({
      where: { id: req.user!.id },
      include: { department: { select: { name: true } } }
    });

    if (!host) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(host);
  } catch (err) {
    console.error('[API GET /auth/me]', err);
    res.status(500).json({ error: 'Failed to authenticate token', details: err instanceof Error ? err.message : String(err) });
  }
});
router.post('/change-password', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const host = await prisma.host.findUnique({ where: { id: userId } });
    if (!host) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValid = await bcrypt.compare(currentPassword, host.password_hash || '');
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.host.update({
      where: { id: userId },
      data: { password_hash: hashedPassword },
    });

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('[API POST /auth/change-password]', err);
    res.status(500).json({ error: 'Failed to update password', details: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
