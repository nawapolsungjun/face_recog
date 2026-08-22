import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { courseId } = resolvedParams;

    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบรหัสรายวิชา' },
        { status: 400 }
      );
    }

    // ดึงรายการ Session ทั้งหมด เรียงจากล่าสุดไปเก่าสุด
    const sessions = await prisma.attendanceSession.findMany({
      where: { courseId: courseId },
      orderBy: { createdAt: 'desc' },
      include: {
        attendances: {
          select: {
            id: true,
            status: true,
            createdAt: true,
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

    // แมปชื่อเต็ม student.name เพื่อความสมบูรณ์และแสดงผลในระบบ
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