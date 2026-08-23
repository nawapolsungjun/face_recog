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

    // 2. ตรวจสอบว่ามีการส่ง query date มาเพื่อกรองเฉพาะวันหรือไม่
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

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

    // 4. แมปชื่อเต็ม student.name เพื่อความสมบูรณ์และพร้อมแสดงผลใน UI
    const formattedSessions = sessions.map((session: any) => ({
      ...session,
      attendances: session.attendances.map((att: any) => {
        const fullName = att.student
          ? `${att.student.firstName || ''} ${att.student.lastName || ''}`.trim() || 'ไม่ระบุชื่อ'
          : 'ไม่ระบุชื่อ';

        return {
          ...att,
          student: att.student
            ? {
                ...att.student,
                name: fullName,
              }
            : null,
        };
      }),
    }));

    return NextResponse.json({ success: true, data: formattedSessions });
  } catch (error: any) {
    console.error('Fetch Attendance History Error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลประวัติ' },
      { status: 500 }
    );
  }
}