import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; studentId: string }> | { id: string; studentId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const { id: courseId, studentId } = resolvedParams;

    if (!courseId || !studentId) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน (courseId หรือ studentId)' },
        { status: 400 }
      );
    }

    const parsedStudentId = parseInt(studentId, 10);

    // 1. ค้นหา student ก่อนเพื่อดูว่าส่งมาเป็น Int ID หรือ String/userId/studentCode
    let targetStudentId = isNaN(parsedStudentId) ? null : parsedStudentId;

    if (!targetStudentId) {
      const foundStudent = await prisma.student.findFirst({
        where: {
          OR: [
            { studentCode: studentId },
            { userId: studentId }
          ]
        },
        select: { id: true }
      });

      if (foundStudent) {
        targetStudentId = foundStudent.id;
      }
    }

    if (!targetStudentId) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลนักศึกษาที่ต้องการลบ' },
        { status: 404 }
      );
    }

    console.log(` Removing Student ID: ${targetStudentId} from Course: ${courseId}`);

    // 2. Disconnect นักศึกษาออกจาก Course
    await prisma.course.update({
      where: { id: courseId },
      data: {
        students: {
          disconnect: {
            id: targetStudentId,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'ลบนักศึกษาออกจากรายวิชาเรียบร้อยแล้ว',
    });

  } catch (error: any) {
    console.error(" API DELETE ERROR:", error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการลบนักศึกษา' },
      { status: 500 }
    );
  }
}