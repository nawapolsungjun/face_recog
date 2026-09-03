import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // ดึงข้อมูลแบบขนานด้วย Promise.all
    const [rawTeachers, rawStudents, rawCourses] = await Promise.all([
      // 1. ดึงรายชื่ออาจารย์ (ใช้ firstName, lastName ตาม Prisma Schema)
      prisma.teacher.findMany({
        select: {
          id: true,
          firstName: true,
          lastName: true,
          department: true,
        },
      }),
      // 2. ดึงรายชื่อนักศึกษา
      prisma.student.findMany({
        select: {
          id: true,
          studentCode: true,
          firstName: true,
          lastName: true,
        },
      }),
      // 3. ดึงรายวิชาทั้งหมด พร้อมชื่ออาจารย์ผู้สอน
      prisma.course.findMany({
        select: {
          id: true,
          courseCode: true,
          courseName: true,
          teacher: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: { 
              students: true 
            }
          }
        },
      }),
    ]);

    // Map ข้อมูลเพื่อประกอบ firstName + lastName เป็น name ส่งกลับไปให้หน้าบ้านใช้งานได้เหมือนเดิม
    const teachers = rawTeachers.map((t) => ({
      id: t.id,
      name: `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'ไม่ระบุชื่อ',
      department: t.department,
    }));

    const students = rawStudents.map((s) => ({
      id: s.id,
      studentCode: s.studentCode,
      name: `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'ไม่ระบุชื่อ',
    }));

    const courses = rawCourses.map((c) => ({
      id: c.id,
      courseCode: c.courseCode,
      courseName: c.courseName,
      teacher: c.teacher
        ? {
            name: `${c.teacher.firstName || ''} ${c.teacher.lastName || ''}`.trim() || 'ไม่ระบุชื่อ',
          }
        : null,
      _count: c._count,
    }));

    return NextResponse.json({
      success: true,
      stats: {
        teachersCount: teachers.length,
        studentsCount: students.length,
        coursesCount: courses.length,
      },
      data: {
        teachers,
        students,
        courses,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    console.error("❌ Admin Dashboard Summary Error:", errorMessage);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูลระบบ: " + errorMessage },
      { status: 500 }
    );
  }
}