// attendance-web/app/api/teacher/courses/[id]/week/route.ts
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
      return NextResponse.json({ success: false, error: 'ไม่พบรหัสวิชา' }, { status: 400 });
    }

    // 1. ดึงข้อมูลรายวิชาและนักศึกษาทั้งหมดในคลาส
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        students: {
          select: { id: true, studentCode: true }
        },
        attendances: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!course) {
      return NextResponse.json({ success: false, error: 'ไม่พบรายวิชานี้' }, { status: 404 });
    }

    const totalStudentsInClass = course.students.length;

    // 2. จัดกลุ่ม Attendance ตามวันที่ (YYYY-MM-DD)
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

    // 3. แปลงแต่ละวันเป็นข้อมูล 1 สัปดาห์ พร้อมคำนวณยอด มา / สาย / ลา / ขาด
    const sortedDates = Array.from(dayMap.keys()).sort();

    const weeksData = sortedDates.map((dateKey) => {
      const records = dayMap.get(dateKey)!;
      
      // ดึงสถานะล่าสุดของนักศึกษาแต่ละคนในวันนั้น (ป้องกัน record ซ้ำ)
      const studentLatestStatus = new Map<number, string>();
      records.forEach((r) => {
        studentLatestStatus.set(r.studentId, r.status);
      });

      let present = 0;
      let late = 0;
      let leave = 0;
      let absent = 0;

      // ตรวจสอบนักศึกษาทุกคนในคลาส
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

  } catch (error: any) {
    console.error('Weeks API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}