import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.get('/public', async (req, res) => {
  try {
    const visits = await prisma.visit.findMany({
      where: {
        status: 'approved',
        valid_until: {
          gte: new Date()
        }
      },
      include: {
        visitor: true,
        host: true
      },
      orderBy: { created_at: 'desc' }
    });

    const formatted = visits.map((v) => ({
      ...v,
      visitors: v.visitor,
      hosts: v.host
    }));

    res.json(formatted);
  } catch (err) {
    console.error('[API GET /visits/public]', err);
    res.status(500).json({ error: 'Failed to fetch public visits', details: err instanceof Error ? err.message : String(err) });
  }
});
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const authUser = req.user!;
    const {
      status,
      statuses,
      search,
      date,
      limit,
      offset,
      host_id: qHostId,
      approved_from,
      approved_to,
      checkout_from,
      checkout_to,
      created_from,
      created_to,
    } = req.query as Record<string, string>;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type WhereClause = Record<string, any>;
    const where: WhereClause = {};
    if (authUser.role === 'host') {
      where.host_id = authUser.id;
    } else if (authUser.role === 'visitor') {
      const visitorProfiles = await prisma.visitor.findMany({
        where: { email: { equals: authUser.email, mode: 'insensitive' } },
        select: { id: true },
      });
      const visitorIds = visitorProfiles.map((v: { id: string }) => v.id);
      where.visitor_id = visitorIds.length > 0
        ? { in: visitorIds }
        : { equals: '00000000-0000-0000-0000-000000000000' };
    }
    if (status) where.status = status;
    if (statuses) {
      const statusArray = statuses.split(',').filter(Boolean);
      where.status = { in: statusArray };
    }
    if (qHostId) where.host_id = qHostId;
    
    if (approved_from || approved_to) {
      where.approved_at = {
        ...(approved_from ? { gte: new Date(approved_from) } : {}),
        ...(approved_to ? { lt: new Date(approved_to) } : {}),
      };
    }
    if (checkout_from || checkout_to) {
      where.check_out_time = {
        ...(checkout_from ? { gte: new Date(checkout_from) } : {}),
        ...(checkout_to ? { lt: new Date(checkout_to) } : {}),
      };
    }
    if (created_from || created_to) {
      where.created_at = {
        ...(created_from ? { gte: new Date(created_from) } : {}),
        ...(created_to ? { lte: new Date(created_to) } : {}),
      };
    }
    if (date) {
      const start = new Date(date); start.setHours(0, 0, 0, 0);
      const end = new Date(date); end.setHours(23, 59, 59, 999);
      where.created_at = { gte: start, lte: end };
    }
    if (search) {
      where.OR = [
        { purpose: { contains: search, mode: 'insensitive' } },
        { visitor: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const take = limit ? Math.min(Number(limit), 200) : 50;
    const skip = offset ? Number(offset) : 0;

    const visits = await prisma.visit.findMany({
      where,
      include: {
        visitor: true,
        host: { select: { id: true, name: true, email: true, department_id: true } },
      },
      orderBy: { created_at: 'desc' },
      take,
      skip,
    });

    res.status(200).json(visits);
  } catch (err: unknown) {
    console.error('[API GET /visits]', err);
    res.status(500).json({ error: 'Failed to fetch visits', details: err instanceof Error ? err.message : String(err) });
  }
});
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const visit = await prisma.visit.findUnique({
      where: { id },
      include: {
        visitor: true,
        host: { select: { id: true, name: true, email: true, department_id: true } },
      },
    });

    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    res.status(200).json({ ...visit, visitors: visit.visitor, hosts: visit.host });
  } catch (err: unknown) {
    console.error('[API GET /visits/:id]', err);
    res.status(500).json({ error: 'Failed to fetch visit', details: err instanceof Error ? err.message : String(err) });
  }
});
router.post('/', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const body = req.body;

    const visit = await prisma.visit.create({
      data: {
        ...(body.id ? { id: body.id } : {}),
        visitor_id: body.visitor_id,
        host_id: body.host_id ?? null,
        purpose: body.purpose,
        status: (body.status as 'pending') ?? 'pending',
        scheduled_time: body.scheduled_time ? new Date(body.scheduled_time) : new Date(),
        valid_until: body.valid_until ? new Date(body.valid_until) : null,
        valid_from: body.valid_from ? new Date(body.valid_from) : new Date(),
        expected_out_time: body.expected_out_time ? new Date(body.expected_out_time) : null,
        notes: body.notes ?? null,
        vehicle_number: body.vehicle_number ?? null,
        vehicle_type: body.vehicle_type ?? null,
        additional_guests: body.additional_guests ?? 0,
        pass_type: (body.pass_type as 'single_day' | 'multi_day') ?? 'single_day',
      },
    });

    res.status(201).json(visit);
  } catch (err) {
    console.error('[API POST /visits]', err);
    res.status(500).json({ error: 'Failed to create visit', details: err instanceof Error ? err.message : String(err) });
  }
});
router.post('/bulk', requireAuth, async (req: AuthRequest, res) => {
  try {
    const authUser = req.user!;
    const { approverEmail, visitors } = req.body;

    if (!['admin', 'guard', 'host'].includes(authUser.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const approver = await prisma.host.findUnique({
      where: { email: approverEmail.trim().toLowerCase() },
      select: { id: true },
    });

    if (!approver) {
      return res.status(404).json({ error: `No faculty/staff/admin found with email: ${approverEmail}` });
    }
    let createdCount = 0;
    for (const vData of visitors) {
      const email = vData.email.trim().toLowerCase();
      
      let visitor = await prisma.visitor.findFirst({
        where: { email },
      });

      if (!visitor) {
        visitor = await prisma.visitor.create({
          data: {
            name: vData.name,
            email,
            phone: vData.phone || "N/A",
          }
        });
      }

      await prisma.visit.create({
        data: {
          visitor_id: visitor.id,
          host_id: approver.id,
          purpose: vData.purpose || "N/A",
          status: "pending",
          valid_from: vData.valid_from ? new Date(vData.valid_from) : new Date(),
          valid_until: vData.valid_until ? new Date(vData.valid_until) : null,
          additional_guests: vData.additional_guests || 0,
          vehicle_number: vData.vehicle_number || null,
          vehicle_type: vData.vehicle_type || null,
          pass_type: vData.pass_type || "single_day",
        }
      });
      createdCount++;
    }

    res.status(201).json({ success: true, count: createdCount });
  } catch (err) {
    console.error('[API POST /visits/bulk]', err);
    res.status(500).json({ error: 'Failed to process bulk upload', details: err instanceof Error ? err.message : String(err) });
  }
});
router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const authUser = req.user!;
    const id = req.params.id as string;
    const body = req.body;

    const allowedRoles = ['admin', 'guard'];
    if (!allowedRoles.includes(authUser.role)) {
      const visit = await prisma.visit.findUnique({ where: { id }, select: { host_id: true } });
      if (visit?.host_id !== authUser.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const updated = await prisma.visit.update({
      where: { id },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.approved_at !== undefined && { approved_at: body.approved_at ? new Date(body.approved_at) : null }),
        ...(body.approved_by !== undefined && { approved_by: body.approved_by }),
        ...(body.check_in_time !== undefined && { check_in_time: body.check_in_time ? new Date(body.check_in_time) : null }),
        ...(body.check_out_time !== undefined && { check_out_time: body.check_out_time ? new Date(body.check_out_time) : null }),
        ...(body.exit_gate !== undefined && { exit_gate: body.exit_gate }),
        ...(body.entry_gate !== undefined && { entry_gate: body.entry_gate }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
      include: {
        visitor: true,
        host: true
      }
    });

    res.status(200).json({ ...updated, visitors: (updated as unknown as Record<string, unknown>).visitor, hosts: (updated as unknown as Record<string, unknown>).host });
  } catch (err: unknown) {
    console.error('[API PATCH /visits/:id]', err);
    res.status(500).json({ error: 'Failed to update visit', details: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
