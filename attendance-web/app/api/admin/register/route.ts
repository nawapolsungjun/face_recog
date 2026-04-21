import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { email, password, name, role, department, employeeId } = await request.json();

    // 1. ตรวจสอบว่าอีเมลซ้ำไหม
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ success: false, error: 'อีเมลนี้ถูกใช้งานแล้ว' }, { status: 400 });
    }

    // 2. Hash รหัสผ่าน (สำคัญมาก! เพื่อให้ Login 401 ไม่เกิดขึ้นอีก)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. ใช้ Transaction เพื่อบันทึกข้อมูลลงหลายตารางพร้อมกัน
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role: role, // ADMIN หรือ TEACHER
        },
      });

      if (role === 'TEACHER') {
        await tx.teacher.create({
          data: {
            userId: user.id,
            name: name,
            department: department || '',
          },
        });
      } else if (role === 'ADMIN') {
        await tx.admin.create({
          data: {
            userId: user.id,
            name: name,
            employeeId: employeeId || '',
          },
        });
      }

      return user;
    });

    return NextResponse.json({ success: true, message: 'ลงทะเบียนสำเร็จ' });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}