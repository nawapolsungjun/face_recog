import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name, role, department, employeeId, studentCode, username } = body;

    // 1. ตรวจสอบว่าอีเมลซ้ำไหม
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ success: false, error: 'อีเมลนี้ถูกใช้งานแล้ว' }, { status: 400 });
    }

    // 2. Hash รหัสผ่าน
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. ใช้ Transaction เพื่อบันทึกข้อมูลลงหลายตารางพร้อมกัน
    const newUser = await prisma.$transaction(async (tx) => {
      // 🚀 แก้ไข: เพิ่ม username ลงในตาราง User
      const user = await tx.user.create({
        data: {
          email,
          username: username || email, // ✅ บันทึก username ที่ส่งมาจากหน้าบ้าน (ถ้าไม่มีให้ใช้อีเมล)
          password: hashedPassword,
          role: role,
        },
      });

      // 🍎 แยกสร้างข้อมูลตาม Role
      if (role === 'TEACHER') {
        await tx.teacher.create({
          data: {
            userId: user.id,
            name: name,
            department: department || '',
          },
        });
      }
      else if (role === 'ADMIN') {
        await tx.admin.create({
          data: {
            userId: user.id,
            name: name,
            employeeId: employeeId || '',
          },
        });
      }
      // 🎓 เพิ่ม: กรณีลงทะเบียนนักศึกษา
      else if (role === 'STUDENT') {
        await tx.student.create({
          data: {
            userId: user.id,
            name: name,
            studentCode: studentCode || '',
            password: hashedPassword, // 👈 เพิ่มบรรทัดนี้เข้าไปเพื่อให้หาย Error
          },
        });
      }

      return user;
    });

    return NextResponse.json({
      success: true,
      message: `ลงทะเบียน ${role} สำเร็จแล้วครับบอส!`
    });

  } catch (error: any) {
    console.error("❌ Admin Register Error:", error.message);
    return NextResponse.json({
      success: false,
      error: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์: ' + error.message
    }, { status: 500 });
  }
}