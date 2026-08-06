// app/api/attendance/history/[courseId]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;

    // ดึงรายการ Session ทั้งหมด เรียงจากล่าสุดไปเก่าสุด
    const sessions = await prisma.attendanceSession.findMany({
      where: { courseId: courseId },
      orderBy: { createdAt: 'desc' },
      include: {
        attendances: {
          select: {
            id: true,
            status: true,
            student: {
              select: {
                studentCode: true,
                name: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({ success: true, data: sessions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}