import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const studentIdParam = searchParams.get('studentId');

    if (!courseId || !studentIdParam) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    const studentId = parseInt(studentIdParam, 10);

    // 1. ดึงข้อมูลรายวิชาและเพื่อนร่วมคลาส (ดึง firstName และ lastName แทน name)
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        students: {
          select: {
            id: true,
            studentCode: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    if (!course) {
      return NextResponse.json({ success: false, error: 'ไม่พบรายวิชา' }, { status: 404 });
    }

    // 2. ดึงประวัติการเข้าเรียนของนักศึกษาคนนี้ในวิชานี้
    const attendances = await prisma.attendance.findMany({
      where: {
        courseId: courseId,
        studentId: studentId
      },
      orderBy: { createdAt: 'desc' }
    });

    const present = attendances.filter((a: any) => a.status === 'มาเรียน').length;
    const late = attendances.filter((a: any) => a.status === 'มาสาย').length;
    const leave = attendances.filter((a: any) => a.status === 'ลา').length;
    const absent = attendances.filter((a: any) => a.status === 'ขาดเรียน').length;

    // จัดการรายชื่อเพื่อนร่วมชั้นเรียน
    const formattedFriends = course.students.map((s: any) => ({
      id: s.id,
      studentCode: s.studentCode,
      firstName: s.firstName,
      lastName: s.lastName,
      name: `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'ไม่ระบุชื่อ'
    }));

    return NextResponse.json({
      success: true,
      data: {
        id: course.id,
        courseCode: course.courseCode,
        courseName: course.courseName,
        friends: formattedFriends,
        attendance: attendances,
        summary: {
          total: attendances.length,
          present,
          late,
          leave,
          absent
        }
      }
    });

  } catch (error: any) {
    console.error("Course Details API Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}