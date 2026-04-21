import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { studentCode, password } = await req.json();

    // 1. ค้นหานักศึกษาจากรหัส
    const student = await prisma.student.findUnique({
      where: { studentCode },
    });

    if (!student) {
      return NextResponse.json({ success: false, error: 'ไม่พบรหัสนักศึกษานี้ในระบบ' }, { status: 401 });
    }

    // 2. ตรวจสอบรหัสผ่าน (เปรียบเทียบ Plain text กับ Hash ใน DB)
    const isPasswordValid = await bcrypt.compare(password, student.password);

    if (!isPasswordValid) {
      return NextResponse.json({ success: false, error: 'รหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    // 3. ส่งข้อมูลกลับ (ในระบบจริงควรทำ JWT หรือ Session ตรงนี้ครับ)
    return NextResponse.json({
      success: true,
      user: {
        id: student.id,
        name: student.name,
        studentCode: student.studentCode,
      }
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' }, { status: 500 });
  }
}