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
    const now = new Date();

    // 1. กำหนดเวลาที่บันทึกของคาบนั้น (targetDate)
    const targetDate = new Date(date);
    if (time) {
      const [hours, minutes] = time.split(':').map(Number);
      targetDate.setHours(hours || 0, minutes || 0, 0, 0);
    } else {
      targetDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
    }

    // 2. จัดรูปแบบเวลาที่อาจารย์กดแก้ไขจริง (เช่น 07:19 น.)
    const editTimeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
    const baseRemark = remark?.trim() || 'แก้ไขโดยอาจารย์';
    const finalRemark = `${baseRemark} (แก้ไขเมื่อ ${editTimeStr} น.)`;

    // 3. กำหนดช่วงเวลาของวันนั้น
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existingRecord = await prisma.attendance.findFirst({
      where: {
        studentId: numericStudentId,
        courseId: String(courseId),
        OR: [
          {
            date: {
              gte: startOfDay,
              lte: endOfDay,
            }
          },
          {
            createdAt: {
              gte: startOfDay,
              lte: endOfDay,
            }
          }
        ]
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    let result;

    if (existingRecord) {
      result = await prisma.attendance.update({
        where: { id: existingRecord.id },
        data: {
          status: status,
          date: targetDate,
          createdAt: targetDate,
          isManual: true,
          remark: finalRemark,
          updatedAt: now,
        },
      });
    } else {
      result = await prisma.attendance.create({
        data: {
          studentId: numericStudentId,
          courseId: String(courseId),
          status: status,
          date: targetDate,
          createdAt: targetDate,
          isManual: true,
          remark: finalRemark,
          updatedAt: now,
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