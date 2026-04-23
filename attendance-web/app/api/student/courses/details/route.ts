import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId'); // มาเป็น String (cuid)
    const studentUUID = searchParams.get('studentId'); // มาเป็น String (userId จากตาราง User)

    if (!courseId || !studentUUID) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    const course = await prisma.course.findUnique({
      where: { 
        id: courseId as string // ✅ ไม่ต้องครอบ Number() เพราะ Schema เป็น String
      },
      include: {
        students: {
          select: { id: true, name: true, studentCode: true }
        }
      }
    }) as any;

    if (!course) {
      return NextResponse.json({ success: false, error: 'ไม่พบรายวิชานี้' }, { status: 404 });
    }

    // 🚀 2. ค้นหาข้อมูลนักศึกษาจาก userId (UUID) เพื่อให้ได้ id (Int) 
    // เพราะตาราง Attendance ของบอสเก็บ studentId เป็น Int
    const studentInfo = await prisma.student.findFirst({
      where: { userId: studentUUID as string }
    });

    if (!studentInfo) {
      return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลนักศึกษา' }, { status: 404 });
    }

    // 🚀 3. ดึงประวัติเข้าเรียน (เช็ค Type ตาม Schema Attendance)
    const myAttendance = await prisma.attendance.findMany({
      where: {
        courseId: courseId as string, // ✅ ใน Schema บอส Attendance.courseId เป็น String
        studentId: studentInfo.id    // ✅ ใน Schema บอส Attendance.studentId เป็น Int
      },
      orderBy: { createdAt: 'desc' }
    });

    // 4. คำนวณ Summary
    const summary = {
      total: myAttendance.length,
      present: myAttendance.filter((a: any) => a.status === "มาเรียน").length,
      absent: myAttendance.filter((a: any) => a.status === "ขาดเรียน").length,
      late: myAttendance.filter((a: any) => a.status === "มาสาย").length,
      leave: myAttendance.filter((a: any) => a.status === "ลา").length,
    };

    return NextResponse.json({ 
      success: true, 
      data: {
        courseName: course.courseName,
        courseCode: course.courseCode,
        friends: course.students || [],
        attendance: myAttendance,
        summary: summary
      }
    });

  } catch (error: any) {
    console.error("❌ Course Details API Error:", error.message);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด: ' + error.message }, { status: 500 });
  }
}