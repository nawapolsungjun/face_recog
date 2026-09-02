// attendance-web/app/api/student/update-face/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { studentId, userId, faceVectors } = body;

    const rawId = studentId ?? userId;

    if (!rawId || !faceVectors) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    const stringId = String(rawId).trim();
    const parsedIntId = parseInt(stringId, 10);
    const isNumeric = !isNaN(parsedIntId);

    // ค้นหานักศึกษา: ถ้าเป็นตัวเลขจะเช็คที่ id (Int) หากไม่ใช่จะเช็คที่ userId หรือ studentCode (String)
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          ...(isNumeric ? [{ id: parsedIntId }] : []),
          { userId: stringId },
          { studentCode: stringId }
        ]
      }
    });

    if (!student) {
      return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลนักศึกษาในระบบ' }, { status: 404 });
    }

    // จัดรูปแบบ faceVectors ให้เป็น JSON String
    const formattedVectors = typeof faceVectors === 'string'
      ? faceVectors
      : JSON.stringify(faceVectors);

    // อัปเดตข้อมูลโครงสร้างเวกเตอร์ใบหน้าด้วย Primary Key (student.id ที่เป็น Int)
    await prisma.student.update({
      where: { id: student.id },
      data: {
        faceVectors: formattedVectors,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'อัปเดตใบหน้าสำเร็จเรียบร้อย',
    });

  } catch (error: any) {
    console.error("Update Face Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' 
    }, { status: 500 });
  }
}