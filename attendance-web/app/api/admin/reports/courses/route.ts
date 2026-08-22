import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * [GET] - ดึงข้อมูลสรุปสถิติการเข้าเรียนแยกตามรายวิชาสำหรับ Admin
 */
export async function GET() {
  try {
    const courses = await prisma.course.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        students: {
          select: { id: true }
        },
        attendances: {
          select: { status: true }
        }
      }
    });

    const reportData = courses.map((course: any) => {
      const teacherFullName = course.teacher 
        ? `${course.teacher.firstName || ''} ${course.teacher.lastName || ''}`.trim() 
        : 'ไม่พบผู้สอน / บัญชีถูกลบ';

      const attendances = course.attendances || [];
      const presentCount = attendances.filter((a: any) => a.status === 'มาเรียน').length;
      const lateCount = attendances.filter((a: any) => a.status === 'มาสาย').length;
      const leaveCount = attendances.filter((a: any) => a.status === 'ลา').length;
      const absentCount = attendances.filter((a: any) => a.status === 'ขาดเรียน').length;

      const totalAttendances = attendances.length;
      // คำนวณ % การเข้าเรียน (มาเรียน + มาสาย)
      const attendanceRate = totalAttendances > 0 
        ? Math.round(((presentCount + lateCount) / totalAttendances) * 100) 
        : 0;

      return {
        id: course.id,
        courseCode: course.courseCode,
        courseName: course.courseName,
        teacherName: teacherFullName,
        studentCount: course.students?.length || 0,
        summary: {
          present: presentCount,
          late: lateCount,
          leave: leaveCount,
          absent: absentCount,
          total: totalAttendances
        },
        percentage: attendanceRate
      };
    });

    return NextResponse.json({
      success: true,
      data: reportData
    });

  } catch (error: any) {
    console.error("Admin Course Reports GET Error:", error.message);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน: ' + error.message },
      { status: 500 }
    );
  }
}