import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { studentId, faceVectors } = await req.json();

    if (!studentId || !faceVectors) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    // 🚀 อัปเดตลงฐานข้อมูลโดยตรง (ไม่เช็ค Token แล้ว)
    await prisma.student.update({
      where: { userId: studentId }, // ค้นหาด้วย userId (UUID)
      data: {
        faceVectors: JSON.stringify(faceVectors), // บันทึกเป็นก้อน JSON String
      },
    });

    return NextResponse.json({
      success: true,
      message: 'อัปเดตใบหน้าสำเร็จ (No-Token Mode)',
    });

  } catch (error: any) {
    console.error(" Update Face Error:", error.message);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' }, { status: 500 });
  }
}