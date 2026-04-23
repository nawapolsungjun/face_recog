import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { studentCode, password } = await req.json();

    // 1. 🚀 ค้นหาจากตาราง User และดึงข้อมูล Student พ่วงมาด้วย
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: studentCode },
          { email: `${studentCode}@student.ac.th` }
        ]
      },
      include: {
        student: true 
      }
    });

    // ตรวจสอบว่ามี User หรือไม่
    if (!user || !user.password) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบรหัสนักศึกษานี้ในระบบ' }, 
        { status: 401 }
      );
    }

    // 🚩 [เสริม] ตรวจสอบ Role: ป้องกันคนที่มีสิทธิ์อื่น (ADMIN/TEACHER) ล็อกอินผิดช่องทาง
    if (user.role !== 'STUDENT') {
      return NextResponse.json(
        { success: false, error: 'บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานในส่วนของนักศึกษา' }, 
        { status: 403 }
      );
    }

    // 2. ✅ ตรวจสอบรหัสผ่าน
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'รหัสผ่านไม่ถูกต้อง' }, 
        { status: 401 }
      );
    }

    // ตรวจสอบข้อมูลในตาราง Student
    if (!user.student) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลนักศึกษาที่ผูกกับบัญชีนี้' }, 
        { status: 403 }
      );
    }

    // 3. 🚀 ส่งข้อมูลกลับ (เพิ่ม role เพื่อแก้ปัญหา Redirect Loop ที่ Dashboard)
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,             // ใช้ UUID/String จากตาราง User
        name: user.student.name,
        studentCode: user.student.studentCode,
        role: user.role          // ✅ ส่ง 'STUDENT' กลับไปให้ Dashboard เช็คผ่าน
      }
    });

  } catch (error: any) {
    console.error("❌ Student Login API Error:", error.message);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' }, 
      { status: 500 }
    );
  }
}