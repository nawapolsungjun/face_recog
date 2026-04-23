import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get('studentId');

  if (!studentId) {
    return NextResponse.json({ success: false, error: 'Missing studentId' }, { status: 400 });
  }

  try {
    let studentWithCourses = null;

    // 1. ตรวจสอบก่อนว่า studentId ที่ส่งมาเป็นตัวเลข (Int) หรือ String UUID
    const isNumeric = !isNaN(Number(studentId)) && !isNaN(parseFloat(studentId));

    if (isNumeric) {
      // 🟢 กรณีเป็นตัวเลข (เช่น 7) -> ค้นหาผ่านฟิลด์ id
      studentWithCourses = await prisma.student.findUnique({
        where: { id: Number(studentId) },
        include: {
          courses: { include: { teacher: true } }
        }
      });
    } else {
      // 🔵 กรณีเป็น String (เช่น cmoah14s...) -> ค้นหาผ่านฟิลด์ userId
      studentWithCourses = await prisma.student.findUnique({
        where: { userId: studentId },
        include: {
          courses: { include: { teacher: true } }
        }
      });
    }

    // 2. ถ้าหาไม่เจอจริงๆ ให้ส่ง 404
    if (!studentWithCourses) {
      return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลวิชาของนักศึกษาท่านนี้' }, { status: 404 });
    }

    // 3. จัด Format ข้อมูลส่งกลับ (รวมไว้ในนี้เลยเพื่อความอ่านง่าย)
    const formattedCourses = studentWithCourses.courses.map((course) => ({
      id: course.id,
      courseCode: course.courseCode,
      courseName: course.courseName,
      teacherName: course.teacher?.name || "ไม่ระบุชื่ออาจารย์"
    }));

    return NextResponse.json({ success: true, data: formattedCourses });

  } catch (error: any) {
    console.error(" Fetch Student Courses Error:", error.message);
    return NextResponse.json({ 
      success: false, 
      error: 'Database Error', 
      details: error.message 
    }, { status: 500 });
  }
}