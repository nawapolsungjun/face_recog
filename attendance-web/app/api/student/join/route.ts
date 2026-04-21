import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { studentId, courseCode } = await req.json();

    // 1. ตรวจสอบว่ามีวิชานี้จริงไหม
    const course = await prisma.course.findUnique({
      where: { courseCode: courseCode },
    });

    if (!course) {
      return NextResponse.json({ success: false, error: 'ไม่พบรหัสชั้นเรียนนี้' }, { status: 404 });
    }

    // 2. ผูกนักเรียนเข้ากับวิชา (Many-to-Many)
    await prisma.student.update({
      where: { id: Number(studentId) },
      data: {
        courses: {
          connect: { id: course.id }
        }
      }
    });

    return NextResponse.json({ success: true, message: 'เข้าร่วมชั้นเรียนสำเร็จ' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการเข้าร่วม' }, { status: 500 });
  }
}