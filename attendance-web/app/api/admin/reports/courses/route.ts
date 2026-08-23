import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const courses = await prisma.course.findMany({
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        students: {
          select: { id: true, studentCode: true }
        },
        attendances: {
          orderBy: [
            { updatedAt: 'desc' },
            { createdAt: 'desc' },
            { id: 'desc' }
          ]
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const reportData = courses.map((course) => {
      const totalStudents = course.students.length;
      const teacherName = course.teacher
        ? `${course.teacher.firstName || ''} ${course.teacher.lastName || ''}`.trim() || 'ไม่ระบุชื่อ'
        : 'ไม่ระบุอาจารย์';

      // จัดกลุ่มตามวันที่ (YYYY-MM-DD) เพื่อคำนวณแบบรายสัปดาห์ (1 วัน = 1 สัปดาห์)
      const dayMap = new Map<string, any[]>();
      course.attendances.forEach((att) => {
        const targetDate = att.date || att.createdAt;
        const d = new Date(targetDate);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateKey = `${y}-${m}-${day}`;

        if (!dayMap.has(dateKey)) {
          dayMap.set(dateKey, []);
        }
        dayMap.get(dateKey)!.push(att);
      });

      let totalPresent = 0;
      let totalLate = 0;
      let totalLeave = 0;
      let totalAbsent = 0;

      // ประมวลผลสถานะล่าสุดของนักศึกษาแต่ละคนในแต่ละวัน
      dayMap.forEach((records) => {
        const latestStatusMap = new Map<number, string>();
        records.forEach((r) => {
          if (!latestStatusMap.has(r.studentId)) {
            latestStatusMap.set(r.studentId, r.status);
          }
        });

        course.students.forEach((student) => {
          const st = latestStatusMap.get(student.id) || 'ขาดเรียน';
          if (st === 'มาเรียน') totalPresent++;
          else if (st === 'มาสาย') totalLate++;
          else if (st === 'ลา') totalLeave++;
          else totalAbsent++;
        });
      });

      const totalCheckedRecords = totalPresent + totalLate + totalLeave + totalAbsent;
      const percentage = totalCheckedRecords > 0
        ? Math.round(((totalPresent + totalLate) / totalCheckedRecords) * 100)
        : 0;

      return {
        id: course.id,
        courseCode: course.courseCode,
        courseName: course.courseName,
        teacherName,
        totalStudents,
        totalWeeks: dayMap.size,
        summary: {
          present: totalPresent,
          late: totalLate,
          leave: totalLeave,
          absent: totalAbsent,
        },
        percentage
      };
    });

    return NextResponse.json({ success: true, data: reportData });
  } catch (error: any) {
    console.error('Admin Courses Report API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}