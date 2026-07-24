import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();
router.get('/', async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    res.status(200).json(departments);
  } catch (err) {
    console.error('[API /departments]', err);
    res.status(500).json({ error: 'Failed to fetch departments', details: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
