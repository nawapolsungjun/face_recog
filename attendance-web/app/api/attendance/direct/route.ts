import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentId, courseId, status, date, time, remark } = body;

    if (!studentId || !courseId || !status || !date) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน (ต้องการ studentId, courseId, status และ date)' },
        { status: 400 }
      );
    }

    const numericStudentId = Number(studentId);

    // 1. กำหนดวันที่และเวลาเป้าหมาย
    const targetDate = new Date(date);
    if (time) {
      const [hours, minutes] = time.split(':').map(Number);
      targetDate.setHours(hours || 0, minutes || 0, 0, 0);
    } else {
      const now = new Date();
      targetDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
    }

    // 2. กำหนดช่วงเวลาของวันนั้น (00:00 - 23:59:59)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // 3. ค้นหารายการเช็คชื่อล่าสุดของนักศึกษาในวันนั้น
    const existingRecord = await prisma.attendance.findFirst({
      where: {
        studentId: numericStudentId,
        courseId: String(courseId),
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    let result;

    if (existingRecord) {
      // มีข้อมูลเดิม: อัปเดตสถานะ เวลา และบันทึก Audit trail
      result = await prisma.attendance.update({
        where: { id: existingRecord.id },
        data: {
          status: status,
          createdAt: targetDate,
          isManual: true,
          remark: remark || 'แก้ไขโดยอาจารย์',
          updatedAt: new Date(),
        },
      });
    } else {
      // ยังไม่มีข้อมูล: สร้างรายการเช็คชื่อใหม่
      result = await prisma.attendance.create({
        data: {
          studentId: numericStudentId,
          courseId: String(courseId),
          status: status,
          createdAt: targetDate,
          isManual: true,
          remark: remark || 'แก้ไขโดยอาจารย์',
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'อัปเดตสถานะการเข้าเรียนเรียบร้อยแล้ว',
      data: result 
    });

  } catch (error: any) {
    console.error("Direct Attendance API Error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่สามารถบันทึกข้อมูลได้' },
      { status: 500 }
    );
  }
}