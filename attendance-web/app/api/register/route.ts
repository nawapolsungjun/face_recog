// attendance-web/app/api/register/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { studentCode, name, faceVectors } = await req.json();

    // 🚀 ส่วนแก้ไข: เช็คว่าต้อง Stringify หรือไม่
    // ถ้า faceVectors เป็น Object อยู่แล้ว (ส่งมาจาก Frontend แบบไม่ stringify) ให้แปลงเป็น String ก่อนลง DB
    // แต่ถ้ามันเป็น String มาอยู่แล้ว (มีคน stringify มาให้แล้ว) ให้ใช้ค่านั้นเลย ไม่ต้องทำซ้ำ
    const finalData = typeof faceVectors === 'string' 
      ? faceVectors 
      : JSON.stringify(faceVectors);

    const student = await prisma.student.create({
      data: {
        studentCode,
        name,
        faceVectors: finalData, // ใช้ค่าที่จัดการแล้ว
        courseId: 1
      },
    });

    return NextResponse.json({ success: true, student });
  } catch (error) {
    console.error("Prisma Error:", error);
    return NextResponse.json({ success: false, error: 'บันทึกลงฐานข้อมูลไม่สำเร็จ' }, { status: 500 });
  }
}