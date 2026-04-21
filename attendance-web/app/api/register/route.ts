// attendance-web/app/api/register/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // 🚀 รับค่าให้ตรงกับที่หน้า Frontend (app/student/register/page.tsx) ส่งมา
    const { code, name, password, faceVectors } = body;

    // 1. ตรวจสอบข้อมูลเบื้องต้น
    if (!code || !name || !password || !faceVectors) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    // 2. ตรวจสอบว่ารหัสนักศึกษานี้มีในระบบหรือยัง
    const existingStudent = await prisma.student.findUnique({
      where: { studentCode: String(code) },
    });

    if (existingStudent) {
      return NextResponse.json({ success: false, error: 'รหัสนักศึกษานี้ลงทะเบียนไปแล้ว' }, { status: 400 });
    }

    // 3. เข้ารหัสรหัสผ่าน (bcrypt)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. บันทึกลงฐานข้อมูล (Create New Student)
    const newStudent = await prisma.student.create({
      data: {
        studentCode: String(code),
        name: name,
        password: hashedPassword,
        // ✅ บอสเช็คตรงนี้: ถ้าส่งมาเป็น Array เรา Stringify ให้เลยรอบเดียวจบ
        faceVectors: typeof faceVectors === 'string' ? faceVectors : JSON.stringify(faceVectors),
      },
    });

    console.log(`✅ [SUCCESS] Registered student: ${name} (${code})`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'ลงทะเบียนและบันทึกใบหน้าสำเร็จ',
      data: { id: newStudent.id, studentCode: newStudent.studentCode }
    });

  } catch (error: any) {
    // 💡 ถ้าพัง บอสดูใน Terminal นะครับ มันจะบอกว่า Prisma พลาดที่ฟิลด์ไหน
    console.error("🔴 REGISTRATION API ERROR:", error);
    
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' 
    }, { status: 500 });
  }
}