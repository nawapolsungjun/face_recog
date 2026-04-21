import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs'; // อย่าลืมติดตั้ง npm install bcryptjs
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // 1. ตรวจสอบว่ามีผู้ใช้นี้ในระบบไหม (ดึง Role มาด้วย)
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        admin: true,   // ดึงข้อมูลจากตาราง Admin 
        teacher: true, // ดึงข้อมูลจากตาราง Teacher 
      }
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'ไม่พบผู้ใช้งานนี้ในระบบ' }, { status: 404 });
    }

    // 2. ตรวจสอบรหัสผ่าน
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ success: false, error: 'รหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    // 3. สร้าง Token สำหรับรักษาการเข้าสู่ระบบ (Session)
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1d' }
    );

    // 4. ส่งข้อมูลกลับพร้อมบอก Role เพื่อใช้ Redirect 
    return NextResponse.json({
      success: true,
      role: user.role,
      name: user.role === 'ADMIN' ? user.admin?.name : user.teacher?.name,
      token
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}