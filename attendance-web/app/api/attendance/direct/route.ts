import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentId, courseId, status, date, time } = body;

    // 1. จัดการเรื่องวันที่และเวลา
    const targetDate = new Date(date);

    if (time) {
      // กรณีระบุเวลามา (HH:mm) ให้นำเวลามาตั้งค่า
      const [hours, minutes] = time.split(':').map(Number);
      targetDate.setHours(hours, minutes, 0, 0);
    } else {
      // กรณีไม่ได้ระบุเวลา ให้ตั้งเป็น 7 โมงเช้าตามเดิม
      targetDate.setHours(7, 0, 0, 0);
    }

    // 2. ใช้ findFirst เพื่อเช็คก่อนว่ามี Record ของนักศึกษาคนนี้ ในวิชานี้ วันนี้หรือยัง
    const startOfDay = new Date(new Date(date).setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date(date).setHours(23, 59, 59, 999));

    const existingRecord = await prisma.attendance.findFirst({
      where: {
        studentId: Number(studentId),
        courseId: courseId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    let result;

    if (existingRecord) {
      // ถ้ามีแล้ว Update สถานะและเวลาใหม่
      result = await prisma.attendance.update({
        where: { id: existingRecord.id },
        data: { 
          status: status,
          date: targetDate
        },
      });
    } else {
      // ถ้ายังไม่มี Create Record ใหม่พร้อมเวลา
      result = await prisma.attendance.create({
        data: {
          studentId: Number(studentId),
          courseId: courseId,
          status: status,
          date: targetDate,
        },
      });
    }

    return NextResponse.json({ success: true, data: result });

  } catch (error: any) {
    console.error("Direct Attendance API Error:", error.message);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถบันทึกข้อมูลได้' },
      { status: 500 }
    );
  }
}