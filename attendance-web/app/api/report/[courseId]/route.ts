import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id?: string; courseId?: string }> | { id?: string; courseId?: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const courseId = resolvedParams.courseId || resolvedParams.id;

    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบรหัสรายวิชา' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');
    const mode = searchParams.get('mode');
    const timeSlotParam = searchParams.get('timeSlot');
    const sessionTypeParam = searchParams.get('sessionType');

    // =========================================================================
    // 1. โหมดสรุปสถิติรายสัปดาห์ (Weeks Mode: รองรับสอนชดเชยวันเดียวกันแยกคาบ)
    // =========================================================================
    if (mode === 'weeks') {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          students: true,
        },
      });

      if (!course) {
        return NextResponse.json({ success: false, error: 'ไม่พบรายวิชานี้ในระบบ' }, { status: 404 });
      }

      const totalStudentsInClass = course.students.length;

      // ดึง AttendanceSession ทั้งหมดของวิชานี้ เรียงตามลำดับเวลาการสอนจริง
      const sessions = await prisma.attendanceSession.findMany({
        where: { courseId: courseId },
        include: {
          attendances: {
            orderBy: [
              { updatedAt: 'desc' },
              { createdAt: 'desc' },
              { id: 'desc' },
            ],
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      // แต่ละ Session คือ 1 คาบเรียน (ลงสัปดาห์ที่ 1, สัปดาห์ที่ 2, ... ต่อเนื่องกัน)
      const weeksData = sessions.map((session: any, index: number) => {
        const studentLatestStatus = new Map<number, string>();

        session.attendances.forEach((att: any) => {
          if (!studentLatestStatus.has(att.studentId)) {
            studentLatestStatus.set(att.studentId, att.status);
          }
        });

        let present = 0;
        let late = 0;
        let leave = 0;
        let absent = 0;

        course.students.forEach((student) => {
          const st = studentLatestStatus.get(student.id) || 'ขาดเรียน';
          if (st === 'มาเรียน') present++;
          else if (st === 'มาสาย') late++;
          else if (st === 'ลา') leave++;
          else absent++;
        });

        const d = new Date(session.createdAt);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const rawDate = `${y}-${m}-${day}`;
        const dateStr = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
        const timeStr = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

        const sessionNote = session.note || '';
        const timeSlotMatch = sessionNote.match(/\d{2}:\d{2}\s*-\s*\d{2}:\d{2}/);
        const extractedSlot = timeSlotMatch ? timeSlotMatch[0].replace(/\s+/g, '') : '';

        const percentage = totalStudentsInClass > 0
          ? Math.round(((present + late) / totalStudentsInClass) * 100)
          : 0;

        return {
          weekNumber: index + 1,
          sessionId: session.id,
          rawDate,
          dateStr,
          timeStr: extractedSlot || timeStr,
          present,
          late,
          leave,
          absent,
          totalCount: totalStudentsInClass,
          percentage,
          note: sessionNote,
          isChecked: true,
        };
      });

      return NextResponse.json({
        success: true,
        data: weeksData,
        totalStudents: totalStudentsInClass,
      });
    }

    // =========================================================================
    // 2. โหมดรายงานประจำวัน (Daily Mode)
    // =========================================================================
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        teacher: true,
        students: {
          orderBy: { studentCode: 'asc' },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ success: false, error: 'ไม่พบรายวิชานี้ในระบบ' }, { status: 404 });
    }

    const whereAttendance: any = {
      courseId: courseId,
      OR: [
        {
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      ],
    };

    const attendances = await prisma.attendance.findMany({
      where: whereAttendance,
      orderBy: [
        { updatedAt: 'desc' },
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
    });

    // กรองตาม timeSlot หรือ sessionType หากระบุมาใน query
    let filteredAttendances = attendances;
    if (timeSlotParam || sessionTypeParam) {
      filteredAttendances = attendances.filter((att: any) => {
        const remark = att.remark || '';
        const matchSlot = timeSlotParam ? remark.includes(timeSlotParam) : true;
        const matchType = sessionTypeParam === 'COMPENSATION' ? remark.includes('[สอนชดเชย]') : true;
        return matchSlot && matchType;
      });

      // ถ้าไม่มีให้ fallback กลับมาใช้ attendances ทั้งหมดของวันนั้น
      if (filteredAttendances.length === 0) {
        filteredAttendances = attendances;
      }
    }

    let present = 0, late = 0, leave = 0, absent = 0;

    const reportList = course.students.map((student: any) => {
      const record = filteredAttendances.find((att: any) => att.studentId === student.id);
      const status = record ? record.status : 'ขาดเรียน';
      const time = record?.createdAt || record?.date || null;
      const remark = record?.remark || '';
      const updatedAt = record?.updatedAt || null;

      if (status === 'มาเรียน') present++;
      else if (status === 'มาสาย') late++;
      else if (status === 'ลา') leave++;
      else absent++;

      const displayName = `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.name || 'ไม่ระบุชื่อ';

      return {
        id: student.id,
        studentId: student.id,
        studentCode: student.studentCode,
        firstName: student.firstName,
        lastName: student.lastName,
        name: displayName,
        status: status,
        time: time,
        remark: remark,
        updatedAt: updatedAt,
        isManual: record?.isManual || false,
      };
    });

    return NextResponse.json({
      success: true,
      data: reportList,
      summary: {
        total: course.students.length,
        present,
        late,
        leave,
        absent,
      },
    });

  } catch (error: any) {
    console.error('Report API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน' },
      { status: 500 }
    );
  }
}