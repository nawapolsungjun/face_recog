import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentId, courseId, status, date } = body;

    // 1. จัดการเรื่องวันที่: ตั้งค่าให้เป็นเวลาเริ่มต้นของวัน (00:00:00) 
    // เพื่อให้เวลาเช็คชื่อย้อนหลังเป็นระเบียบ
    const targetDate = new Date(date);
    targetDate.setHours(7, 0, 0, 0); // ตั้งเป็น 7 โมงเช้า (เวลาไทยเริ่มต้น)

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
      // 🚀 ถ้ามีแล้ว -> Update สถานะเดิม
      result = await prisma.attendance.update({
        where: { id: existingRecord.id },
        data: { status: status },
      });
    } else {
      // 🚀 ถ้ายังไม่มี (กรณีคนขาดเรียน) -> Create Record ใหม่
      result = await prisma.attendance.create({
        data: {
          studentId: Number(studentId),
          courseId: courseId,
          status: status,
          date: targetDate, // ใช้วันที่ที่ส่งมาจากหน้า Report
        },
      });
    }

    return NextResponse.json({ success: true, data: result });

  } catch (error: any) {
    console.error("🔴 Direct Attendance API Error:", error.message);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถบันทึกข้อมูลได้' },
      { status: 500 }
    );
  }
}