import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id?: string; courseId?: string }> | { id?: string; courseId?: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const courseId = resolvedParams.courseId || resolvedParams.id;

    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบรหัสรายวิชา' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');
    const mode = searchParams.get('mode');

    // 1. โหมดสรุปสถิติ 18 สัปดาห์ (Weeks Mode: 1 วัน = 1 สัปดาห์)
    if (mode === 'weeks') {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          students: true,
          attendances: {
            orderBy: [
              { updatedAt: 'desc' },
              { createdAt: 'desc' },
              { id: 'desc' }
            ]
          }
        }
      });

      if (!course) {
        return NextResponse.json({ success: false, error: 'ไม่พบรายวิชานี้ในระบบ' }, { status: 404 });
      }

      const totalStudentsInClass = course.students.length;

      // จัดกลุ่มตามวันที่ (YYYY-MM-DD)
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

      const sortedDates = Array.from(dayMap.keys()).sort();

      const weeksData = sortedDates.map((dateKey) => {
        const records = dayMap.get(dateKey)!;

        // ดึงสถานะล่าสุดของนักศึกษาแต่ละคน (เนื่องจาก records เรียง desc ไว้แล้ว ตัวแรกที่เจอคือสถานะล่าสุดจริง)
        const studentLatestStatus = new Map<number, string>();
        records.forEach((r) => {
          if (!studentLatestStatus.has(r.studentId)) {
            studentLatestStatus.set(r.studentId, r.status);
          }
        });

        let present = 0;
        let late = 0;
        let leave = 0;
        let absent = 0;

        // เทียบกับนักศึกษาทุกคนในคลาส
        course.students.forEach((student) => {
          const st = studentLatestStatus.get(student.id) || 'ขาดเรียน';
          if (st === 'มาเรียน') present++;
          else if (st === 'มาสาย') late++;
          else if (st === 'ลา') leave++;
          else absent++;
        });

        const d = new Date(dateKey);
        const dateStr = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });

        const percentage = totalStudentsInClass > 0
          ? Math.round(((present + late) / totalStudentsInClass) * 100)
          : 0;

        return {
          rawDate: dateKey,
          dateStr,
          present,
          late,
          leave,
          absent,
          totalCount: totalStudentsInClass,
          percentage
        };
      });

      return NextResponse.json({
        success: true,
        data: weeksData,
        totalStudents: totalStudentsInClass
      });
    }

    // 2. โหมดรายงานประจำวัน (Daily Mode)
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        teacher: true,
        students: {
          orderBy: { studentCode: 'asc' }
        }
      }
    });

    if (!course) {
      return NextResponse.json({ success: false, error: 'ไม่พบรายวิชานี้ในระบบ' }, { status: 404 });
    }

    const attendances = await prisma.attendance.findMany({
      where: {
        courseId: courseId,
        OR: [
          {
            date: {
              gte: startOfDay,
              lte: endOfDay
            }
          },
          {
            createdAt: {
              gte: startOfDay,
              lte: endOfDay
            }
          }
        ]
      },
      orderBy: [
        { updatedAt: 'desc' },
        { createdAt: 'desc' },
        { id: 'desc' }
      ]
    });

    let present = 0, late = 0, leave = 0, absent = 0;

    const reportList = course.students.map((student: any) => {
      // ค้นหา record ที่อัปเดตล่าสุดของนักศึกษาคนนี้ในวันนั้น
      const record = attendances.find((att: any) => att.studentId === student.id);
      const status = record ? record.status : 'ขาดเรียน';
      const time = record?.createdAt || record?.date || null;
      const remark = record?.remark || '';
      const updatedAt = record?.updatedAt || null;

      if (status === 'มาเรียน') present++;
      else if (status === 'มาสาย') late++;
      else if (status === 'ลา') leave++;
      else absent++;

      const displayName = `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.name || 'ไม่ระบุชื่อ';

      return {
        id: student.id,
        studentId: student.id,
        studentCode: student.studentCode,
        firstName: student.firstName,
        lastName: student.lastName,
        name: displayName,
        status: status,
        time: time,
        remark: remark,
        updatedAt: updatedAt,
        isManual: record?.isManual || false
      };
    });

    return NextResponse.json({
      success: true,
      data: reportList,
      summary: {
        total: course.students.length,
        present,
        late,
        leave,
        absent
      }
    });

  } catch (error: any) {
    console.error('Report API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน' },
      { status: 500 }
    );
  }
}