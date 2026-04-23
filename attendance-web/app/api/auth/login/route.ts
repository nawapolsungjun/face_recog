import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs'; 
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // 1. ค้นหาผู้ใช้ พร้อมดึงข้อมูลจากตารางที่เกี่ยวข้อง
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        admin: true,   
        teacher: true, 
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

    // 3. สร้าง JWT Token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1d' }
    );

    // 4. 🔥 ปรับปรุงการส่งข้อมูลกลับ: รวมให้เป็นก้อน "user" 
    // เพื่อให้หน้าบ้านเอาไปเก็บลง localStorage('user') ได้ทันที
    const userData = {
      id: user.id, // นี่คือ userId (String UUID) ที่เราใช้ใน Profile API
      role: user.role,
      name: user.role === 'ADMIN' ? user.admin?.name : user.teacher?.name,
      // ถ้าเป็นอาจารย์ ให้ส่งแผนกไปด้วย เพื่อให้หน้า Dashboard โชว์ได้ทันที
      department: user.role === 'TEACHER' ? user.teacher?.department : null 
    };

    return NextResponse.json({
      success: true,
      token,
      user: userData, // ✅ ส่งกลับเป็นก้อนตามที่หน้าบ้านรอรับ
      role: user.role // ส่งแยกไว้อีกตัวเพื่อความสะดวกในการ Redirect
    });

  } catch (error: any) {
    console.error("❌ Login API Error:", error.message);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}