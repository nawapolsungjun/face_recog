import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, department, password } = body;
    const searchId = id ? String(id) : "";

    if (!searchId) {
      return NextResponse.json({ success: false, error: 'ไม่พบ ID ผู้ใช้' }, { status: 400 });
    }

    // 1. ค้นหาอาจารย์ (รองรับทั้ง ID ตัวเลข หรือ UUID)
    const teacher = await prisma.teacher.findFirst({
      where: {
        OR: [
          { id: isNaN(Number(searchId)) ? -1 : Number(searchId) },
          { userId: searchId }
        ]
      }
    });

    if (!teacher || !teacher.userId) {
      return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลอาจารย์' }, { status: 404 });
    }

    // 2. อัปเดตชื่อและสาขาวิชาในตาราง Teacher
    await prisma.teacher.update({
      where: { id: teacher.id },
      data: { 
        name: name || undefined,
        department: department || undefined 
      }
    });

    // 3. อัปเดตรหัสผ่านในตาราง User (ถ้ามีการกรอกมา)
    if (password && password.length > 0) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { id: teacher.userId },
        data: { password: hashedPassword }
      });
    }

    return NextResponse.json({ success: true, message: 'อัปเดตข้อมูลอาจารย์เรียบร้อย' });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}