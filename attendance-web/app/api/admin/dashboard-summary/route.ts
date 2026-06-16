import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 🚀 ดึงข้อมูลทุกอย่างแบบขนาน (Parallel ด้วย Promise.all) เพื่อความเร็วสูงสุดในการโหลดหน้าบ้าน
    const [teachers, students, courses] = await Promise.all([
      // 1. ดึงรายชื่ออาจารย์ทั้งหมด
      prisma.teacher.findMany({
        select: {
          id: true,
          name: true,
          department: true,
        },
      }),
      // 2. ดึงรายชื่อนักศึกษาทั้งหมด
      prisma.student.findMany({
        select: {
          id: true,
          studentCode: true,
          name: true,
        },
      }),
      // 3. ดึงรายวิชาทั้งหมด พร้อมชื่ออาจารย์ และจำนวนนักศึกษาในชั้นเรียน [🚀 แก้ไขจุดพัง]
      prisma.course.findMany({
        select: {
          id: true,
          courseCode: true,
          courseName: true,
          teacher: {
            select: {
              name: true,
            },
          },
          // 🚀 ขยับออกมาให้อยู่ระดับเดียวกับ course ตรงนี้ เพื่อให้นับจำนวนนักศึกษาในวิชานั้นๆ ได้ถูกต้อง
          _count: {
            select: { 
              students: true 
            }
          }
        },
      }),
    ]);

    // 📦 ส่งข้อมูลกลับไปให้หน้าบ้านใน Format ที่ต้องการ
    return NextResponse.json({
      success: true,
      stats: {
        teachersCount: teachers.length, // จำนวนอาจารย์ทั้งหมด
        studentsCount: students.length, // จำนวนนักศึกษาทั้งหมด
        coursesCount: courses.length,   // จำนวนวิชาทั้งหมด
      },
      data: {
        teachers,
        students,
        courses,
      },
    });
  } catch (error: any) {
    console.error("❌ Admin Dashboard Summary Error:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูลระบบ" },
      { status: 500 }
    );
  }
}