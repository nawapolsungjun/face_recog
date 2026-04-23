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
      return NextResponse.json({ success: false, error: '❌ ไม่พบรหัสชั้นเรียนนี้ในระบบ' }, { status: 404 });
    }

    // 2. ค้นหานักศึกษาจาก UUID (userId) หรือ ID (Int)
    // 🚀 เพิ่มจุดนี้เพื่อให้รองรับ ID ที่ส่งมาจาก Dashboard (ซึ่งเป็น UUID)
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { userId: studentId }, // ค้นหาด้วย UUID (เช่น cmoaok...)
          { id: isNaN(Number(studentId)) ? -1 : Number(studentId) } // ค้นหาด้วย ID ตัวเลข (ถ้ามี)
        ]
      }
    });

    if (!student) {
      return NextResponse.json({ success: false, error: '❌ ไม่พบข้อมูลนักศึกษาในระบบ' }, { status: 404 });
    }

    // 3. ผูกนักเรียนเข้ากับวิชา (Many-to-Many)
    // ✅ เปลี่ยนมาใช้ student.id ที่เราหาเจอจากขั้นตอนที่ 2
    await prisma.student.update({
      where: { id: student.id }, 
      data: {
        courses: {
          connect: { id: course.id }
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `✅ เข้าร่วมวิชา ${course.courseName} สำเร็จแล้วครับบอส!` 
    });

  } catch (error: any) {
    console.error("❌ Join Class API Error:", error.message);
    // 💡 ส่ง Error Message ออกไปดูเลยว่าพังเพราะอะไร (เช่น ลงทะเบียนซ้ำ)
    return NextResponse.json({ 
      success: false, 
      error: 'เกิดข้อผิดพลาด: ' + error.message 
    }, { status: 500 });
  }
}