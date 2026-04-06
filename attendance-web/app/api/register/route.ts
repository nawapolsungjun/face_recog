// สร้างไฟล์ app/api/register/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { studentCode, name, faceVector } = await req.json();

    const student = await prisma.student.create({
      data: {
        studentCode,
        name,
        faceVector: JSON.stringify(faceVector), // เก็บ Array ตัวเลขในรูปแบบ String JSON
        courseId: 1 // หรือระบุ ID วิชาที่ต้องการ
      },
    });

    return NextResponse.json({ success: true, student });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'บันทึกลงฐานข้อมูลไม่สำเร็จ' }, { status: 500 });
  }
}