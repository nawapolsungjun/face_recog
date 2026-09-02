import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId?: string; id?: string }> | { courseId?: string; id?: string } }
) {
  try {
    // 1. แกะค่า params รองรับทั้ง [courseId] และ [id]
    const resolvedParams = await Promise.resolve(params);
    const courseId = resolvedParams.courseId || resolvedParams.id;

    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบรหัสรายวิชา' },
        { status: 400 }
      );
    }

    // 2. ตรวจสอบ query parameters (date, timeSlot, sessionType)
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const timeSlotParam = searchParams.get('timeSlot');
    const sessionTypeParam = searchParams.get('sessionType');

    const whereClause: any = {
      courseId: courseId,
    };

    if (dateParam) {
      const targetDate = new Date(dateParam);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      whereClause.createdAt = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    // 3. ดึงรายการ Session พร้อมข้อมูลการเช็คชื่อของนักศึกษาในแต่ละรอบ
    const sessions = await prisma.attendanceSession.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' }, // เรียงรอบ 1 -> 2 -> 3 ตามลำดับเวลา
      include: {
        attendances: {
          select: {
            id: true,
            status: true,
            remark: true,
            createdAt: true,
            date: true,
            student: {
              select: {
                id: true,
                studentCode: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // 4. แมปข้อมูล Session พร้อมสกัด sessionType และ timeSlot
    let formattedSessions = sessions.map((session: any) => {
      const sessionNote = session.note || '';
      const isCompensation = sessionNote.includes('[สอนชดเชย]');
      const sessionType = isCompensation ? 'COMPENSATION' : 'REGULAR';
      
      // สกัดช่วงเวลา timeSlot จาก note (เช่น "09:00-12:00" หรือ "13:00 - 16:00")
      const timeSlotMatch = sessionNote.match(/\d{2}:\d{2}\s*-\s*\d{2}:\d{2}/);
      const timeSlot = timeSlotMatch ? timeSlotMatch[0].replace(/\s+/g, '') : '';

      const records = session.attendances.map((att: any) => {
        const fullName = att.student
          ? `${att.student.firstName || ''} ${att.student.lastName || ''}`.trim() || 'ไม่ระบุชื่อ'
          : 'ไม่ระบุชื่อ';

        return {
          id: att.id,
          studentId: att.student?.id,
          studentCode: att.student?.studentCode,
          name: fullName,
          status: att.status,
          remark: att.remark,
          time: att.date || att.createdAt,
        };
      });

      return {
        id: session.id,
        roundNumber: session.roundNumber,
        imageUrl: session.imageUrl,
        note: session.note,
        createdAt: session.createdAt,
        sessionType,
        timeSlot,
        records,
        attendances: session.attendances.map((att: any) => ({
          ...att,
          student: att.student
            ? {
                ...att.student,
                name: `${att.student.firstName || ''} ${att.student.lastName || ''}`.trim() || 'ไม่ระบุชื่อ',
              }
            : null,
        })),
      };
    });

    // 5. กรองตาม timeSlot หรือ sessionType หากมีการระบุเจาะจงมาใน query
    if (timeSlotParam || sessionTypeParam) {
      formattedSessions = formattedSessions.filter((s: any) => {
        const matchSlot = timeSlotParam ? (!s.timeSlot || s.timeSlot === timeSlotParam.replace(/\s+/g, '')) : true;
        const matchType = sessionTypeParam ? s.sessionType === sessionTypeParam : true;
        return matchSlot && matchType;
      });
    }

    return NextResponse.json({ success: true, data: formattedSessions });
  } catch (error: any) {
    console.error('Fetch Attendance History Error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลประวัติ' },
      { status: 500 }
    );
  }
}