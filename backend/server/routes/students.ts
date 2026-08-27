import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

/**
 * Helper to get strictly 09:30 PM (21:30) IST curfew for a specific date
 */
function getCurfewISTForDate(baseDate: Date = new Date()): Date {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(baseDate.getTime() + IST_OFFSET_MS);
  
  // Year, Month, Date in IST
  const y = istTime.getUTCFullYear();
  const m = istTime.getUTCMonth();
  const d = istTime.getUTCDate();

  // 21:30 IST is 16:00 UTC (21.5 - 5.5 = 16)
  return new Date(Date.UTC(y, m, d, 16, 0, 0, 0));
}

/**
 * Helper to check if an IST timestamp is within the Night Curfew Window (21:30 to 06:00 IST)
 */
function isCurfewNightTimeIST(date: Date = new Date()): boolean {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(date.getTime() + IST_OFFSET_MS);
  const hours = istTime.getUTCHours();
  const minutes = istTime.getUTCMinutes();
  const totalMinutes = hours * 60 + minutes;

  // 21:30 is 1290 minutes, 06:00 is 360 minutes
  return totalMinutes >= 1290 || totalMinutes < 360;
}

/**
 * 1. HIGH-SPEED SCANNER ENDPOINT: POST /api/students/scan-pass
 * Used by security guards at main gates. Sub-second execution (< 50ms).
 */
router.post('/scan-pass', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { scanData, gate = 'Main Gate' } = req.body;
    if (!scanData || typeof scanData !== 'string') {
      return res.status(400).json({ error: 'Valid scan data (Roll Number or ID) is required.' });
    }

    let cleanIdentifier = scanData.trim();
    // Parse JSON payload if scanned from modern Dynamic QR
    try {
      if (cleanIdentifier.startsWith('{') && cleanIdentifier.endsWith('}')) {
        const parsed = JSON.parse(cleanIdentifier);
        cleanIdentifier = parsed.rollNumber || parsed.roll_number || parsed.id || cleanIdentifier;
      }
    } catch {
      // Continue with raw string
    }

    // 1. Instant Lookup
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { roll_number: { equals: cleanIdentifier, mode: 'insensitive' } },
          { email: { equals: cleanIdentifier, mode: 'insensitive' } },
          ...(cleanIdentifier.length === 36 ? [{ id: cleanIdentifier }] : [])
        ]
      },
      include: {
        leaves: {
          where: {
            status: 'approved',
            from_date: { lte: new Date(Date.now() + 12 * 60 * 60 * 1000) }, // Valid from 12h before start
            to_date: { gte: new Date() }
          },
          orderBy: { from_date: 'asc' },
          take: 1
        }
      }
    });

    if (!student) {
      return res.status(404).json({ error: `Student with identifier "${cleanIdentifier}" not found in database.` });
    }

    if (student.status === 'suspended') {
      return res.status(403).json({
        error: 'Student is currently suspended from leaving campus. Please report to the Hostel Warden Office.',
        student
      });
    }

    const now = new Date();

    // 2. SCENARIO A: Student is currently INSIDE -> Triggering EXIT
    if (student.status === 'inside') {
      const activeLeave = student.leaves[0];
      let movementType = 'day_outing';
      let expectedIn = getCurfewISTForDate(now);
      let leaveId: string | undefined = undefined;
      let message = 'Day Outing Approved — Return before 09:30 PM';

      if (activeLeave) {
        movementType = 'hostel_leave';
        expectedIn = new Date(activeLeave.to_date);
        leaveId = activeLeave.id;
        message = `Approved Vacation/Leave Exit (${activeLeave.leave_type.replace('_', ' ')}) — Have a safe journey!`;
      }

      const [movement] = await prisma.$transaction([
        prisma.studentMovement.create({
          data: {
            student_id: student.id,
            movement_type: movementType,
            exit_time: now,
            exit_gate: gate,
            expected_in: expectedIn,
            leave_id: leaveId
          }
        }),
        prisma.student.update({
          where: { id: student.id },
          data: { status: activeLeave ? 'on_leave' : 'out_day' }
        })
      ]);

      return res.json({
        success: true,
        action: 'exit',
        movement_type: movementType,
        message,
        expected_in: expectedIn,
        student: { ...student, status: activeLeave ? 'on_leave' : 'out_day' },
        movement
      });
    }

    // 3. SCENARIO B: Student is currently OUT (out_day or on_leave) -> Triggering ENTRY
    const activeMovement = await prisma.studentMovement.findFirst({
      where: {
        student_id: student.id,
        entry_time: null
      },
      orderBy: { exit_time: 'desc' }
    });

    // Check for approved Curfew Extension today
    const activeExtension = await prisma.curfewExtension.findFirst({
      where: {
        student_id: student.id,
        status: 'approved',
        requested_until: { gte: new Date(now.getTime() - 6 * 60 * 60 * 1000) }
      },
      orderBy: { created_at: 'desc' }
    });

    const defaultExpectedIn = activeMovement ? new Date(activeMovement.expected_in) : getCurfewISTForDate(now);
    const effectiveExpectedIn = activeExtension ? new Date(activeExtension.requested_until) : defaultExpectedIn;

    const isPastCurfew = now.getTime() > effectiveExpectedIn.getTime();
    const isNightCurfew = isCurfewNightTimeIST(now) && !activeExtension;
    const isOverdue = isPastCurfew || isNightCurfew;
    const delayMinutes = isOverdue
      ? Math.max(1, Math.floor((now.getTime() - effectiveExpectedIn.getTime()) / 60000))
      : 0;
    
    // Strike Calculation: Increment strikes if overdue on a day outing
    const newStrikeCount = isOverdue ? student.late_strike_count + 1 : student.late_strike_count;
    const isNowFlagged = newStrikeCount >= 3;

    const [updatedMovement, updatedStudent] = await prisma.$transaction([
      ...(activeMovement
        ? [
            prisma.studentMovement.update({
              where: { id: activeMovement.id },
              data: {
                entry_time: now,
                entry_gate: gate,
                curfew_delay_minutes: delayMinutes,
                is_overdue: isOverdue
              }
            })
          ]
        : [
            prisma.studentMovement.create({
              data: {
                student_id: student.id,
                movement_type: student.status === 'on_leave' ? 'hostel_leave' : 'day_outing',
                exit_time: new Date(now.getTime() - 60 * 60 * 1000),
                entry_time: now,
                entry_gate: gate,
                expected_in: effectiveExpectedIn,
                curfew_delay_minutes: delayMinutes,
                is_overdue: isOverdue
              }
            })
          ]),
      prisma.student.update({
        where: { id: student.id },
        data: {
          status: 'inside',
          late_strike_count: newStrikeCount,
          is_flagged: isNowFlagged
        }
      }),
      ...(activeMovement?.leave_id
        ? [
            prisma.hostelLeave.update({
              where: { id: activeMovement.leave_id },
              data: { status: 'completed' }
            })
          ]
        : [])
    ]);

    let message = 'Entry Verified — Welcome back to Campus!';
    if (isOverdue) {
      message = `Curfew Violated (${delayMinutes > 0 ? `+${delayMinutes} mins late` : 'Night Curfew 09:30 PM–06:00 AM'})! Strike ${newStrikeCount}/3 recorded.`;
      if (isNowFlagged) {
        message = `🚨 HABITUAL DEFAULTER (3/3 Strikes)! Student must report to Hostel Warden Office.`;
      }
    } else if (activeExtension) {
      message = `Entry Verified under Approved Curfew Extension (+${activeExtension.additional_minutes} mins granted).`;
    }

    return res.json({
      success: true,
      action: 'entry',
      movement_type: activeMovement?.movement_type || 'day_outing',
      message,

      expected_in: effectiveExpectedIn,
      is_overdue: isOverdue,
      curfew_delay_minutes: delayMinutes,
      strikes: newStrikeCount,
      is_flagged: isNowFlagged,
      has_extension: !!activeExtension,
      student: updatedStudent,
      movement: updatedMovement
    });
  } catch (err) {
    console.error('[API POST /students/scan-pass Error]', err);
    res.status(500).json({ error: 'Failed to process gate scan', details: err instanceof Error ? err.message : String(err) });
  }
});


/**
 * 2. REAL-TIME HOSTEL CENSUS: GET /api/students/census
 */
router.get('/census', requireAuth, async (_req: AuthRequest, res) => {
  try {
    const [total, inside, outDay, onLeave, overdueMovements, blocks] = await Promise.all([
      prisma.student.count(),
      prisma.student.count({ where: { status: 'inside' } }),
      prisma.student.count({ where: { status: 'out_day' } }),
      prisma.student.count({ where: { status: 'on_leave' } }),
      prisma.studentMovement.count({
        where: {
          entry_time: null,
          expected_in: { lt: new Date() }
        }
      }),
      prisma.student.groupBy({
        by: ['hostel_block', 'status'],
        _count: { _all: true }
      })
    ]);

    res.json({
      total,
      inside,
      out_day: outDay,
      on_leave: onLeave,
      overdue: overdueMovements,
      blocks
    });
  } catch (err) {
    console.error('[API GET /students/census]', err);
    res.status(500).json({ error: 'Failed to fetch census data' });
  }
});

/**
 * 3. OVERDUE DEFAULTERS RADAR: GET /api/students/overdue
 */
router.get('/overdue', requireAuth, async (_req: AuthRequest, res) => {
  try {
    const overdueList = await prisma.studentMovement.findMany({
      where: {
        entry_time: null,
        expected_in: { lt: new Date() }
      },
      include: {
        student: true
      },
      orderBy: { expected_in: 'asc' }
    });

    res.json(overdueList);
  } catch (err) {
    console.error('[API GET /students/overdue]', err);
    res.status(500).json({ error: 'Failed to fetch overdue records' });
  }
});

/**
 * 4. STUDENT DIRECTORY: GET /api/students
 */
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { search, status, hostel_block, limit = '100', offset = '0' } = req.query;

    const where: Record<string, unknown> = {};

    if (status && typeof status === 'string') {
      where.status = status;
    }

    if (hostel_block && typeof hostel_block === 'string') {
      where.hostel_block = hostel_block;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { roll_number: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { room_number: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } }
      ];
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        take: Math.min(Number(limit), 200),
        skip: Number(offset),
        orderBy: { roll_number: 'asc' }
      }),
      prisma.student.count({ where })
    ]);

    res.json({ students, total });
  } catch (err) {
    console.error('[API GET /students]', err);
    res.status(500).json({ error: 'Failed to fetch student directory' });
  }
});

/**
 * 5. BULK CSV ONBOARDING: POST /api/students/bulk
 */
router.post('/bulk', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: 'Array of student records is required.' });
    }

    let inserted = 0;
    let updated = 0;

    for (const item of students) {
      if (!item.roll_number || !item.name || !item.email) continue;

      const studentData = {
        roll_number: String(item.roll_number).trim().toUpperCase(),
        name: String(item.name).trim(),
        email: String(item.email).toLowerCase().trim(),
        phone: String(item.phone || '').trim(),
        hostel_block: String(item.hostel_block || 'Hostel Block A').trim(),
        room_number: String(item.room_number || 'N/A').trim(),
        branch: String(item.branch || 'CSE').trim(),
        year: Number(item.year) || 1,
        parent_name: String(item.parent_name || 'Parent/Guardian').trim(),
        parent_phone: String(item.parent_phone || item.phone || '').trim(),
        photo_url: item.photo_url || null
      };

      const existing = await prisma.student.findUnique({
        where: { roll_number: studentData.roll_number }
      });

      if (existing) {
        await prisma.student.update({
          where: { id: existing.id },
          data: studentData
        });
        updated++;
      } else {
        await prisma.student.create({
          data: studentData
        });
        inserted++;
      }
    }

    res.json({
      success: true,
      message: `Bulk onboarding complete: ${inserted} added, ${updated} updated.`,
      inserted,
      updated
    });
  } catch (err) {
    console.error('[API POST /students/bulk]', err);
    res.status(500).json({ error: 'Failed to process bulk upload', details: err instanceof Error ? err.message : String(err) });
  }
});

/**
 * 5b. UPDATE STUDENT DIRECTORY DETAILS: PATCH /api/students/:id
 */
router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      phone,
      hostel_block,
      room_number,
      branch,
      year,
      parent_name,
      parent_phone,
      status,
      late_strike_count,
      is_flagged
    } = req.body;

    const student = await prisma.student.findUnique({ where: { id: String(id) } });
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const updated = await prisma.student.update({
      where: { id: String(id) },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(email !== undefined ? { email: String(email).trim().toLowerCase() } : {}),
        ...(phone !== undefined ? { phone: String(phone).trim() } : {}),
        ...(hostel_block !== undefined ? { hostel_block: String(hostel_block).trim() } : {}),
        ...(room_number !== undefined ? { room_number: String(room_number).trim() } : {}),
        ...(branch !== undefined ? { branch: String(branch).trim().toUpperCase() } : {}),
        ...(year !== undefined ? { year: Number(year) } : {}),
        ...(parent_name !== undefined ? { parent_name: String(parent_name).trim() } : {}),
        ...(parent_phone !== undefined ? { parent_phone: String(parent_phone).trim() } : {}),
        ...(status !== undefined ? { status: String(status) } : {}),
        ...(late_strike_count !== undefined ? { late_strike_count: Number(late_strike_count) } : {}),
        ...(is_flagged !== undefined ? { is_flagged: Boolean(is_flagged) } : {})
      }
    });

    res.json({
      success: true,
      message: `Student details for ${updated.name} (${updated.roll_number}) updated successfully.`,
      student: updated
    });
  } catch (err) {
    console.error('[API PATCH /students/:id]', err);
    res.status(500).json({ error: 'Failed to update student details', details: err instanceof Error ? err.message : String(err) });
  }
});

/**
 * 6. LEAVE REQUESTS: POST /api/students/leave
 */
router.post('/leave', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { student_id, roll_number, leave_type = 'vacation', from_date, to_date, destination, reason } = req.body;


    if (!from_date || !to_date || !destination || !reason) {
      return res.status(400).json({ error: 'From Date, To Date, Destination, and Reason are required.' });
    }

    let targetStudentId = student_id;
    if (!targetStudentId && roll_number) {
      const s = await prisma.student.findUnique({ where: { roll_number } });
      if (s) targetStudentId = s.id;
    }

    if (!targetStudentId) {
      // Fallback: check logged-in user email
      const s = await prisma.student.findFirst({ where: { email: req.user?.email } });
      if (s) targetStudentId = s.id;
    }

    if (!targetStudentId) {
      return res.status(400).json({ error: 'Valid student ID or Roll Number is required.' });
    }

    const leave = await prisma.hostelLeave.create({
      data: {
        student_id: targetStudentId,
        leave_type,
        from_date: new Date(from_date),
        to_date: new Date(to_date),
        destination,
        reason,
        status: 'pending'
      }
    });

    res.status(201).json(leave);
  } catch (err) {
    console.error('[API POST /students/leave]', err);
    res.status(500).json({ error: 'Failed to submit leave request' });
  }
});

/**
 * 7. LIST LEAVES: GET /api/students/leaves
 */
router.get('/leaves', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { status, student_id } = req.query;

    const where: Record<string, unknown> = {};
    if (status && typeof status === 'string') where.status = status;
    if (student_id && typeof student_id === 'string') where.student_id = student_id;

    const leaves = await prisma.hostelLeave.findMany({
      where,
      include: {
        student: true
      },
      orderBy: { created_at: 'desc' }
    });

    res.json(leaves);
  } catch (err) {
    console.error('[API GET /students/leaves]', err);
    res.status(500).json({ error: 'Failed to list leave requests' });
  }
});

/**
 * 8. APPROVE / REJECT LEAVE: PATCH /api/students/leave/:id
 */
router.patch('/leave/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid leave status.' });
    }

    const leave = await prisma.hostelLeave.update({
      where: { id: String(id) },
      data: {

        status,
        approved_by: req.user?.id || req.user?.email || 'Warden',
        approved_at: status === 'approved' ? new Date() : null
      },
      include: {
        student: true
      }
    });

    res.json(leave);
  } catch (err) {
    console.error('[API PATCH /students/leave/:id]', err);
    res.status(500).json({ error: 'Failed to update leave request' });
  }
});

/**
 * 9. LIVE MOVEMENTS HISTORY: GET /api/students/movements
 */
router.get('/movements', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { student_id, limit = '100' } = req.query;

    const movements = await prisma.studentMovement.findMany({
      where: student_id ? { student_id: String(student_id) } : undefined,
      include: {
        student: true
      },
      orderBy: { exit_time: 'desc' },
      take: Math.min(Number(limit), 200)
    });

    const now = new Date();
    const enriched = movements.map((m) => {
      const isDayOuting = m.movement_type === 'day_outing';
      // For Day Outing, curfew deadline is strictly 09:30 PM (21:30 IST) of the exit date
      const curfewDeadline = isDayOuting
        ? getCurfewISTForDate(new Date(m.exit_time))
        : new Date(m.expected_in);

      let isLate = false;
      let delayMinutes = 0;

      if (m.entry_time) {
        const entryDate = new Date(m.entry_time);
        if (entryDate.getTime() > curfewDeadline.getTime() || isCurfewNightTimeIST(entryDate)) {
          isLate = true;
          delayMinutes = Math.max(1, Math.round((entryDate.getTime() - curfewDeadline.getTime()) / 60000));
        }
      } else {
        // Outing In progress
        if (now.getTime() > curfewDeadline.getTime() || isCurfewNightTimeIST(now)) {
          isLate = true;
          delayMinutes = Math.max(1, Math.round((now.getTime() - curfewDeadline.getTime()) / 60000));
        }
      }

      return {
        ...m,
        expected_in: curfewDeadline.toISOString(),
        is_overdue: isLate,
        curfew_delay_minutes: delayMinutes
      };
    });

    res.json(enriched);

  } catch (err) {
    console.error('[API GET /students/movements]', err);
    res.status(500).json({ error: 'Failed to fetch movements log' });
  }
});


/**
 * 10. HOSTEL BLOCK A 10-FLOOR OCCUPANCY HEATMAP: GET /api/students/floor-census
 */
router.get('/floor-census', requireAuth, async (_req: AuthRequest, res) => {
  try {
    const allStudents = await prisma.student.findMany({
      where: { hostel_block: 'Hostel Block A' },
      orderBy: [{ room_number: 'asc' }, { roll_number: 'asc' }]
    });

    const floorConfigs = [
      { floor: 1, label: "Floor 1 (Rooms 101–153)", description: "Girls (All Academic Years)", expectedPrefix: "1" },
      { floor: 2, label: "Floor 2 (Rooms 201–253)", description: "1st Year Boys (BT26)", expectedPrefix: "2" },
      { floor: 3, label: "Floor 3 (Rooms 301–353)", description: "1st Year Boys (BT26)", expectedPrefix: "3" },
      { floor: 4, label: "Floor 4 (Rooms 401–453)", description: "2nd Year Boys (BT25)", expectedPrefix: "4" },
      { floor: 5, label: "Floor 5 (Rooms 501–553)", description: "2nd Year Boys (BT25)", expectedPrefix: "5" },
      { floor: 6, label: "Floor 6 (Rooms 601–653)", description: "3rd Year Boys (BT24)", expectedPrefix: "6" },
      { floor: 7, label: "Floor 7 (Rooms 701–753)", description: "3rd Year Boys (BT24)", expectedPrefix: "7" },
      { floor: 8, label: "Floor 8 (Rooms 801–853)", description: "3rd Year Boys (BT24)", expectedPrefix: "8" },
      { floor: 9, label: "Floor 9 (Rooms 901–953)", description: "4th Year Boys (BT23)", expectedPrefix: "9" },
      { floor: 10, label: "Floor 10 (Rooms 1001–1053)", description: "4th Year Boys (BT23)", expectedPrefix: "10" },
    ];

    const floors = floorConfigs.map((fc) => {
      const floorStudents = allStudents.filter((s) => {
        const rm = s.room_number.trim();
        if (fc.floor === 10) return rm.startsWith('10');
        if (fc.floor === 1) return rm.startsWith('1') && !rm.startsWith('10');
        return rm.startsWith(fc.expectedPrefix);
      });

      const inside = floorStudents.filter((s) => s.status === 'inside').length;
      const outDay = floorStudents.filter((s) => s.status === 'out_day').length;
      const onLeave = floorStudents.filter((s) => s.status === 'on_leave').length;
      const flagged = floorStudents.filter((s) => s.is_flagged || s.late_strike_count >= 3).length;

      return {
        ...fc,
        total: floorStudents.length,
        inside,
        out_day: outDay,
        on_leave: onLeave,
        flagged,
        occupancyRate: floorStudents.length > 0 ? Math.round((inside / floorStudents.length) * 100) : 100,
        students: floorStudents
      };
    });

    res.json({
      hostel: "Hostel Block A",
      totalResidents: allStudents.length,
      totalInside: allStudents.filter((s) => s.status === 'inside').length,
      totalOut: allStudents.filter((s) => s.status === 'out_day').length,
      totalLeave: allStudents.filter((s) => s.status === 'on_leave').length,
      floors
    });
  } catch (err) {
    console.error('[API GET /students/floor-census]', err);
    res.status(500).json({ error: 'Failed to generate floor census' });
  }
});

/**
 * 11. WARDEN DISCIPLINARY ACTION / PARDON: POST /api/students/:id/reset-strikes
 */
router.post('/:id/reset-strikes', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const student = await prisma.student.update({
      where: { id: String(id) },
      data: {
        late_strike_count: 0,
        is_flagged: false
      }
    });

    res.json({ success: true, message: `Curfew strikes reset for ${student.name} (${student.roll_number}).`, student });
  } catch (err) {
    console.error('[API POST /students/:id/reset-strikes]', err);
    res.status(500).json({ error: 'Failed to reset student curfew strikes' });
  }
});

/**
 * 12. PARENT CONSENT VERIFICATION: PATCH /api/students/leave/:id/parent-consent
 */
router.patch('/leave/:id/parent-consent', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { parent_consent, parent_remarks } = req.body;

    if (!['pending', 'verified', 'exempted'].includes(parent_consent)) {
      return res.status(400).json({ error: 'Invalid parent consent status.' });
    }

    const leave = await prisma.hostelLeave.update({
      where: { id: String(id) },
      data: {
        parent_consent,
        parent_remarks: parent_remarks || null
      },
      include: {
        student: true
      }
    });

    res.json({ success: true, message: `Parent consent marked as "${parent_consent}".`, leave });
  } catch (err) {
    console.error('[API PATCH /students/leave/:id/parent-consent]', err);
    res.status(500).json({ error: 'Failed to update parent consent' });
  }
});

/**
 * 13. NIGHT ROLL-CALL CENSUS EXPORT (CSV): GET /api/students/export-census
 */
router.get('/export-census', requireAuth, async (_req: AuthRequest, res) => {
  try {
    const students = await prisma.student.findMany({
      orderBy: [{ hostel_block: 'asc' }, { room_number: 'asc' }, { roll_number: 'asc' }]
    });

    const headers = 'Roll Number,Name,Hostel Block,Room,Program,Status,Strikes,Flagged,Student Phone,Parent Phone\n';
    const rows = students.map((s) => {
      return `"${s.roll_number}","${s.name}","${s.hostel_block}","${s.room_number}","B.Tech ${s.branch}","${s.status.toUpperCase()}",${s.late_strike_count},${s.is_flagged ? 'YES' : 'NO'},"${s.phone}","${s.parent_phone}"`;
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="Hostel_Night_Census_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(headers + rows);
  } catch (err) {
    console.error('[API GET /students/export-census]', err);
    res.status(500).json({ error: 'Failed to export night census CSV' });
  }
});

/**
 * 14. REQUEST CURFEW EXTENSION: POST /api/students/curfew-extension
 */
router.post('/curfew-extension', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { roll_number, additional_minutes = 30, reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Reason for curfew extension is required.' });
    }

    const cleanRoll = roll_number ? roll_number.trim().toUpperCase() : req.user?.roll_number;
    if (!cleanRoll) {
      return res.status(400).json({ error: 'Student Roll Number is required.' });
    }

    const student = await prisma.student.findUnique({ where: { roll_number: cleanRoll } });
    if (!student) {
      return res.status(404).json({ error: `Student with roll number "${cleanRoll}" not found.` });
    }

    const requestedUntil = new Date(Date.now() + Number(additional_minutes) * 60000);

    const extension = await prisma.curfewExtension.create({
      data: {
        student_id: student.id,
        roll_number: student.roll_number,
        student_name: student.name,
        requested_until: requestedUntil,
        additional_minutes: Number(additional_minutes),
        reason: reason.trim(),
        status: 'pending'
      }
    });

    res.status(201).json({
      success: true,
      message: `Curfew Extension request for +${additional_minutes} mins submitted to Warden Office.`,
      extension
    });
  } catch (err) {
    console.error('[API POST /students/curfew-extension]', err);
    res.status(500).json({ error: 'Failed to submit curfew extension' });
  }
});

/**
 * 15. LIST CURFEW EXTENSIONS: GET /api/students/curfew-extensions
 */
router.get('/curfew-extensions', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { status, student_id } = req.query;

    const extensions = await prisma.curfewExtension.findMany({
      where: {
        ...(status ? { status: String(status) } : {}),
        ...(student_id ? { student_id: String(student_id) } : {})
      },
      orderBy: { created_at: 'desc' },
      take: 50
    });

    res.json(extensions);
  } catch (err) {
    console.error('[API GET /students/curfew-extensions]', err);
    res.status(500).json({ error: 'Failed to fetch curfew extensions' });
  }
});

/**
 * 16. APPROVE / REJECT CURFEW EXTENSION: PATCH /api/students/curfew-extensions/:id
 */
router.patch('/curfew-extensions/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' | 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be "approved" or "rejected".' });
    }

    const extension = await prisma.curfewExtension.update({
      where: { id: String(id) },
      data: {
        status,
        reviewed_by: req.user?.name || 'Hostel Warden',
        reviewed_at: new Date()
      }
    });

    res.json({ success: true, message: `Curfew Extension request ${status}.`, extension });
  } catch (err) {
    console.error('[API PATCH /students/curfew-extensions/:id]', err);
    res.status(500).json({ error: 'Failed to update curfew extension' });
  }
});

/**
 * 17. ADD DISCIPLINARY LOG: POST /api/students/:id/disciplinary-log
 */
router.post('/:id/disciplinary-log', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { action_type, remarks } = req.body;

    if (!remarks || !remarks.trim()) {
      return res.status(400).json({ error: 'Remarks are required for disciplinary record.' });
    }

    const student = await prisma.student.findUnique({ where: { id: String(id) } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const log = await prisma.studentDisciplinaryLog.create({
      data: {
        student_id: student.id,
        roll_number: student.roll_number,
        action_type: action_type || 'warning',
        remarks: remarks.trim(),
        warden_name: req.user?.name || 'Chief Warden'
      }
    });

    res.status(201).json({ success: true, message: 'Disciplinary action recorded in student dossier.', log });
  } catch (err) {
    console.error('[API POST /students/:id/disciplinary-log]', err);
    res.status(500).json({ error: 'Failed to create disciplinary log' });
  }
});

/**
 * 18. LIST DISCIPLINARY LOGS: GET /api/students/:id/disciplinary-logs
 */
router.get('/:id/disciplinary-logs', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const logs = await prisma.studentDisciplinaryLog.findMany({
      where: { student_id: String(id) },
      orderBy: { created_at: 'desc' }
    });

    res.json(logs);
  } catch (err) {
    console.error('[API GET /students/:id/disciplinary-logs]', err);
    res.status(500).json({ error: 'Failed to fetch disciplinary logs' });
  }
});

export default router;

