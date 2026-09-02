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

    // 1. ดึงข้อมูลรายวิชา, ผู้สอน (ดึง id, firstName, lastName จาก Teacher โดยตรง) และเพื่อนร่วมคลาส
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
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

    // 2. ค้นหา numeric studentId (Int) สำหรับตาราง Attendance
    let numericStudentId: number | null = null;
    const parsed = parseInt(studentIdParam, 10);

    if (!isNaN(parsed)) {
      numericStudentId = parsed;
    } else {
      // หาก studentIdParam เป็น CUID ของ User ให้ค้นหา student ที่ตรงกัน
      const userRecord = await prisma.user.findFirst({
        where: { id: studentIdParam },
        select: {
          id: true,
          student: {
            select: { id: true, studentCode: true }
          }
        }
      });

      if (userRecord?.student?.id) {
        numericStudentId = Number(userRecord.student.id);
      } else {
        // Fallback: หากยังไม่พบ ให้หา student ในคอร์สนี้จาก studentCode หรือ id
        const matchedStudent = course.students.find(
          (s: any) => String(s.id) === studentIdParam || s.studentCode === studentIdParam
        );
        if (matchedStudent) {
          numericStudentId = Number(matchedStudent.id);
        }
      }
    }

    // 3. ดึงประวัติการเข้าเรียนของนักศึกษาคนนี้ในวิชานี้
    let attendances: any[] = [];
    if (numericStudentId !== null && !isNaN(numericStudentId)) {
      attendances = await prisma.attendance.findMany({
        where: {
          courseId: courseId,
          studentId: numericStudentId
        },
        orderBy: { createdAt: 'desc' }
      });
    }

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

    // ประกอบชื่ออาจารย์ผู้สอนจาก Teacher
    const teacherName = course.teacher
      ? `${course.teacher.firstName || ''} ${course.teacher.lastName || ''}`.trim() || 'อาจารย์ประจำวิชา'
      : 'ไม่ระบุผู้สอน';

    return NextResponse.json({
      success: true,
      data: {
        id: course.id,
        courseCode: course.courseCode,
        courseName: course.courseName,
        teacherName,
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