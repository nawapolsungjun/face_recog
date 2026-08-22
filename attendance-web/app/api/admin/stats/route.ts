import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ป้องกัน Caching บน Next.js เพื่อให้ดึงสถิติล่าสุดทุกครั้ง
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // ดึงจำนวนทั้งหมดจากทุกตารางแบบขนาน (Parallel) เพื่อประสิทธิภาพและความเร็ว
    const [teacherCount, studentCount, courseCount] = await Promise.all([
      prisma.teacher.count(),
      prisma.student.count(),
      prisma.course.count()
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        teachers: teacherCount,
        students: studentCount,
        courses: courseCount
      }
    });
  } catch (error: any) {
    console.error('Admin Stats API Error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ' },
      { status: 500 }
    );
  }
}