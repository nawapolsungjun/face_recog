// attendance-web/app/api/course/[id]/students/[studentId]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; studentId: string }> } // 🚀 ปรับเป็น Promise เพื่อรองรับ Next.js 15+
) {
  try {
    // 1. Await params ก่อนใช้งาน
    const resolvedParams = await params;
    const courseId = resolvedParams.id;
    const studentIdRaw = resolvedParams.studentId;

    // 2. แปลง Student ID และเช็คค่า
    const studentId = Number(studentIdRaw);

    if (isNaN(studentId)) {
      return NextResponse.json(
        { success: false, error: 'Student ID ต้องเป็นตัวเลขเท่านั้น' },
        { status: 400 }
      );
    }

    // 🚀 3. ใช้ Prisma Update เพื่อตัดความสัมพันธ์ (Disconnect)
    // การใช้ disconnect จะลบแค่แถวในตารางกลาง (_CourseToStudent)
    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: {
        students: {
          disconnect: { id: studentId }
        }
      },
      // ดึงรายชื่อที่เหลือกลับมาด้วย เพื่อยืนยันผล
      include: {
        _count: {
          select: { students: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'ลบนักศึกษาออกจากคลาสสำเร็จ',
      currentCount: updatedCourse._count.students
    });

  } catch (error: any) {
    console.error("❌ API Error:", error.message);

    // กรณีหา Course หรือ Student ไม่เจอในความสัมพันธ์
    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลวิชาหรือนักศึกษาคนนี้ในคลาส' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}