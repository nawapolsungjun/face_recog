import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * [POST] เพิ่มนักศึกษาเข้าคอร์สเรียน
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const courseId = resolvedParams.id;
    const body = await req.json();
    const { studentId, studentCode } = body;

    if (!courseId) {
      return NextResponse.json({ success: false, error: 'ไม่พบรหัสรายวิชา' }, { status: 400 });
    }

    if (!studentId && !studentCode) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุนักศึกษาที่ต้องการเพิ่ม' }, { status: 400 });
    }

    // 1. ค้นหาข้อมูล Student จาก ID, UserID หรือ StudentCode
    let student = null;

    if (studentId) {
      const parsedId = parseInt(String(studentId));
      if (!isNaN(parsedId)) {
        student = await prisma.student.findUnique({ where: { id: parsedId } });
      }

      if (!student) {
        student = await prisma.student.findFirst({
          where: {
            OR: [
              { userId: String(studentId) },
              { studentCode: String(studentId) },
            ],
          },
        });
      }
    } else if (studentCode) {
      student = await prisma.student.findUnique({
        where: { studentCode: String(studentCode) },
      });
    }

    if (!student) {
      return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลนักศึกษาในระบบ' }, { status: 404 });
    }

    // 2. ผูกนักศึกษาเข้ากับรายวิชา (Connect relation)
    await prisma.course.update({
      where: { id: courseId },
      data: {
        students: {
          connect: { id: student.id },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'เพิ่มนักศึกษาเข้าสู่รายวิชาเรียบร้อยแล้ว',
    });
  } catch (error: any) {
    console.error('Add Student to Course Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการเพิ่มนักศึกษา' },
      { status: 500 }
    );
  }
}

/**
 * [DELETE] ลบนักศึกษาออกจากรายวิชา
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const courseId = resolvedParams.id;
    const { searchParams } = new URL(req.url);
    const studentIdParam = searchParams.get('studentId');

    if (!courseId || !studentIdParam) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    const parsedStudentId = parseInt(studentIdParam);

    await prisma.course.update({
      where: { id: courseId },
      data: {
        students: {
          disconnect: { id: isNaN(parsedStudentId) ? undefined : parsedStudentId },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'ลบนักศึกษาออกจากรายวิชาเรียบร้อยแล้ว',
    });
  } catch (error: any) {
    console.error('Remove Student from Course Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการลบนักศึกษา' },
      { status: 500 }
    );
  }
}