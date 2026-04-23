import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 🚀 รับค่า userId (UUID) และ faceVectors (Array หรือ JSON String)
    const { userId, faceVectors } = body;

    // 1. ตรวจสอบข้อมูลเบื้องต้น
    if (!userId || !faceVectors) {
      return NextResponse.json({ 
        success: false, 
        error: 'ข้อมูลไม่ครบถ้วน (ขาด ID หรือ ข้อมูลใบหน้า)' 
      }, { status: 400 });
    }

    // 2. ตรวจสอบว่ามีนักศึกษาคนนี้อยู่ในระบบจริงไหม
    const student = await prisma.student.findFirst({
      where: { userId: userId },
    });

    if (!student) {
      return NextResponse.json({ 
        success: false, 
        error: 'ไม่พบข้อมูลนักศึกษาในระบบ กรุณาติดต่อแอดมิน' 
      }, { status: 404 });
    }

    // 3. 🚩 อัปเดตข้อมูลใบหน้าลงในฐานข้อมูล
    // เปลี่ยนจาก .create เป็น .update เพราะ Admin สร้าง User ไว้รอแล้ว
    const updatedStudent = await prisma.student.update({
      where: { 
        id: student.id // อัปเดตผ่าน Primary Key (Int) ที่เราหาเจอจาก findFirst
      },
      data: {
        // ✅ บันทึกค่าลงฟิลด์ faceVectors (เติม s ตามที่ DB บอสมี)
        // ตรวจสอบก่อนว่าถ้าเป็น Array ให้แปลงเป็น String JSON
        faceVectors: typeof faceVectors === 'string' ? faceVectors : JSON.stringify(faceVectors),
      },
    });

    console.log(`✅ [SUCCESS] Face vectors updated for: ${updatedStudent.name}`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'ลงทะเบียนใบหน้าเข้าสู่ระบบสำเร็จแล้วครับบอส!',
      data: { 
        name: updatedStudent.name,
        studentCode: updatedStudent.studentCode 
      }
    });

  } catch (error: any) {
    console.error("🔴 FACE REGISTRATION API ERROR:", error.message);
    
    return NextResponse.json({ 
      success: false, 
      error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message 
    }, { status: 500 });
  }
}