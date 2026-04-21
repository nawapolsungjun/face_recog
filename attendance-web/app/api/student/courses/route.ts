import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get('studentId');

  if (!studentId) return NextResponse.json({ error: 'Missing studentId' }, { status: 400 });

  try {
    const studentWithCourses = await prisma.student.findUnique({
      where: { id: Number(studentId) },
      include: {
        courses: true // 🚀 ดึงวิชาที่นักเรียนคนนี้ลงทะเบียนไว้ออกมา
      }
    });

    return NextResponse.json({ success: true, data: studentWithCourses?.courses || [] });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Database Error' }, { status: 500 });
  }
}