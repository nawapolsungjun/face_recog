import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { courseCode, courseName, teacherId } = body;

    if (!courseCode || !courseName || !teacherId) {
      return NextResponse.json({ success: false, error: "กรุณากรอกข้อมูลให้ครบถ้วน" }, { status: 400 });
    }

    // 🚀 สร้างวิชาใหม่โดยผูกเข้ากับ ID ของอาจารย์ที่แอดมินเลือก
    const newCourse = await prisma.course.create({
      data: {
        courseCode,
        courseName,
        teacherId: parseInt(teacherId), // แปลงเป็น Int ตาม Schema ของบอส
        status: "ACTIVE" // หรือค่าเริ่มต้นที่บอสใช้
      }
    });

    return NextResponse.json({ success: true, data: newCourse });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}