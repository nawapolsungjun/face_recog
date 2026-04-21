import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // 🚀 ดึงจำนวนทั้งหมดจากทุกตารางแบบขนาน (Parallel) เพื่อความเร็ว
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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}