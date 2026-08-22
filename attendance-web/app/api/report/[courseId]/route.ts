import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ id?: string; courseId?: string }> | { id?: string; courseId?: string } }
) {
  try {
    // 1. รองรับการดึง params ทั้งแบบ Promise (Next.js ใหม่) และ Object ปกติ
    const resolvedParams = context.params instanceof Promise ? await context.params : context.params;
    
    // ดึง courseId จาก params หรือ fallback จาก URL path
    let courseId = resolvedParams?.id || resolvedParams?.courseId;
    
    if (!courseId) {
      const url = new URL(request.url);
      const segments = url.pathname.split('/').filter(Boolean);
      courseId = segments[segments.length - 1]; // ดึง segment ตัวสุดท้ายของ url
    }

    if (!courseId || courseId === 'undefined' || courseId === 'null') {
      return NextResponse.json({ success: false, error: 'ไม่พบ ID รายวิชาที่ระบุ' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');
    const mode = searchParams.get('mode');

    // 2. ดึงข้อมูลรายวิชาและนักศึกษาทั้งหมดในวิชานี้ (ใช้ firstName และ lastName)
    const courseData = await prisma.course.findUnique({
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

    if (!courseData) {
      return NextResponse.json({ success: false, error: 'ไม่พบรายวิชาที่ระบุในระบบ' }, { status: 404 });
    }

    // 3. [MODE: SUMMARY] สรุปภาพรวมสะสมทุกคาบ
    if (mode === 'summary') {
      const allAttendances = await prisma.attendance.findMany({
        where: { courseId: courseId },
      });

      const summaryList = courseData.students.map((student: any) => {
        const studentAttendances = allAttendances.filter((a: any) => a.studentId === student.id);
        const present = studentAttendances.filter((a: any) => a.status === 'มาเรียน').length;
        const late = studentAttendances.filter((a: any) => a.status === 'มาสาย').length;
        const leave = studentAttendances.filter((a: any) => a.status === 'ลา').length;
        const absent = studentAttendances.filter((a: any) => a.status === 'ขาดเรียน').length;
        const fullName = `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'ไม่ระบุชื่อ';

        return {
          id: student.id,
          studentCode: student.studentCode,
          firstName: student.firstName,
          lastName: student.lastName,
          name: fullName,
          present,
          late,
          leave,
          absent
        };
      });

      return NextResponse.json({ success: true, data: summaryList });
    }

    // 4. [MODE: DAILY] รายงานประจำวัน
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const attendancesToday = await prisma.attendance.findMany({
      where: {
        courseId: courseId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    let presentCount = 0;
    let lateCount = 0;
    let leaveCount = 0;
    let absentCount = 0;

    const dailyData = courseData.students.map((student: any) => {
      const att = attendancesToday.find((a: any) => a.studentId === student.id);
      const status = att ? att.status : 'ขาดเรียน';
      const fullName = `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'ไม่ระบุชื่อ';

      if (status === 'มาเรียน') presentCount++;
      else if (status === 'มาสาย') lateCount++;
      else if (status === 'ลา') leaveCount++;
      else absentCount++;

      return {
        id: student.id,
        attendanceId: att ? att.id : null,
        studentCode: student.studentCode,
        firstName: student.firstName,
        lastName: student.lastName,
        name: fullName,
        status: status,
        time: att ? att.createdAt : null,
        isManual: att?.isManual || false,
        remark: att?.remark || '',
        updatedAt: att?.updatedAt || null
      };
    });

    return NextResponse.json({
      success: true,
      data: dailyData,
      summary: {
        total: courseData.students.length,
        present: presentCount,
        late: lateCount,
        leave: leaveCount,
        absent: absentCount
      }
    });

  } catch (error: any) {
    console.error("Report API Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}