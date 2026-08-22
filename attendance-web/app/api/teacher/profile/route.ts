import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

/**
 * [GET] - ดึงข้อมูลโปรไฟล์อาจารย์ (firstName, lastName, email)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');

    if (!teacherId) {
      return NextResponse.json({ success: false, error: 'ไม่พบ ID อาจารย์' }, { status: 400 });
    }

    const teacher = await prisma.teacher.findFirst({
      where: {
        OR: [
          { userId: teacherId },
          { id: isNaN(Number(teacherId)) ? -1 : Number(teacherId) }
        ]
      },
      include: {
        user: {
          select: { email: true, username: true }
        }
      }
    });

    if (!teacher) {
      return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลอาจารย์' }, { status: 404 });
    }

    const fullName = `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || 'อาจารย์';

    return NextResponse.json({
      success: true,
      data: {
        id: teacher.id,
        userId: teacher.userId,
        firstName: teacher.firstName || '',
        lastName: teacher.lastName || '',
        displayName: fullName,
        email: teacher.user?.email || null,
      }
    });

  } catch (error: any) {
    console.error("Teacher Profile GET Error:", error.message);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์' }, { status: 500 });
  }
}

/**
 * [PUT] - อัปเดตข้อมูลอาจารย์ (ชื่อจริง, นามสกุล, รหัสผ่าน)
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, firstName, lastName, name, password } = body;
    const searchId = id ? String(id) : "";

    if (!searchId) {
      return NextResponse.json({ success: false, error: 'ไม่พบ ID ผู้ใช้' }, { status: 400 });
    }

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

    let fName = firstName || '';
    let lName = lastName || '';

    if (!fName && name) {
      const parts = name.trim().split(/\s+/);
      fName = parts[0] || '';
      lName = parts.slice(1).join(' ') || '';
    }

    await prisma.$transaction(async (tx) => {
      const updateData: any = {};
      if (fName) updateData.firstName = fName;
      if (lName) updateData.lastName = lName;

      if (Object.keys(updateData).length > 0) {
        await tx.teacher.update({
          where: { id: teacher.id },
          data: updateData
        });
      }

      if (password && password.trim().length > 0) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await tx.user.update({
          where: { id: teacher.userId },
          data: { password: hashedPassword }
        });
      }
    });

    return NextResponse.json({ success: true, message: 'อัปเดตข้อมูลอาจารย์เรียบร้อยแล้ว' });

  } catch (error: any) {
    console.error("Teacher Profile PUT Error:", error.message);
    return NextResponse.json({ success: false, error: error.message || 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' }, { status: 500 });
  }
}