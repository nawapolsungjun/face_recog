import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // 1. ดึงข้อมูลรายวิชา พร้อมจำนวนนักศึกษา และข้อมูลการเช็คชื่อทั้งหมด
    const courses = await prisma.course.findMany({
      include: {
        teacher: true,
        _count: {
          select: { students: true } // นับจำนวนนักศึกษาในวิชา
        },
        attendances: true // ดึงข้อมูลการเช็คชื่อมานับ
      }
    });

    // 2. คำนวณสรุปผลของแต่ละวิชา
    const reportData = courses.map(course => {
      const totalRecords = course.attendances.length;
      
      // นับแยกตามสถานะ
      const present = course.attendances.filter(a => a.status === 'มาเรียน').length;
      const late = course.attendances.filter(a => a.status === 'มาสาย').length;
      const leave = course.attendances.filter(a => a.status === 'ลา').length;
      const absent = course.attendances.filter(a => a.status === 'ขาดเรียน').length;

      // คำนวณ % การเข้าเรียน (มาเรียน + มาสาย) / (ทั้งหมดที่เช็คชื่อไปแล้ว)
      // กันกรณีส่วนเป็น 0
      const attendanceRate = totalRecords > 0 
        ? Math.round(((present + late) / totalRecords) * 100) 
        : 0;

      return {
        id: course.id,
        courseCode: course.courseCode,
        courseName: course.courseName,
        teacherName: course.teacher.name,
        studentCount: course._count.students,
        summary: {
          present,
          late,
          leave,
          absent,
          total: totalRecords
        },
        percentage: attendanceRate
      };
    });

    return NextResponse.json({ success: true, data: reportData });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}