import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

/**
 * 🔍 [GET] - ดึงข้อมูลโปรไฟล์นักศึกษามาเช็ค (ฉบับป้องกัน Error 500)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId'); 

    if (!studentId || studentId === 'undefined' || studentId === 'null') {
      return NextResponse.json({ success: false, error: 'ID นักศึกษาไม่ถูกต้อง' }, { status: 400 });
    }

    // 🚀 เปลี่ยนจาก findUnique เป็น findFirst เพื่อป้องกัน Error กรณีฟิลด์ไม่ใช่ Unique ใน DB
    const student = await prisma.student.findFirst({
      where: { 
        userId: studentId // มั่นใจว่าใน Schema ตาราง Student มีฟิลด์ userId ที่เก็บ UUID นะครับ
      },
      select: {
        id: true,
        name: true,
        studentCode: true,
        faceVectors: true, // ตัวชี้ชะตาว่าจะโดนดีดไปสแกนหน้าไหม
      }
    });

    if (!student) {
      console.warn(`⚠️ [Profile API] ไม่พบข้อมูลนักศึกษาสำหรับ User ID: ${studentId}`);
      return NextResponse.json({ 
        success: false, 
        error: 'ไม่พบข้อมูลนักศึกษาในระบบ (อาจยังไม่ได้ผูกข้อมูล Student)' 
      }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: student });

  } catch (error: any) {
    // 📢 พิมพ์ Error ออกทางหน้าจอ Console ของ Server (Terminal) เพื่อให้บอสตรวจสอบได้ง่าย
    console.error("❌ [GET Profile Error]:", error.message);
    return NextResponse.json({ success: false, error: 'Server Error: ' + error.message }, { status: 500 });
  }
}

/**
 * 🛠 [PUT] - อัปเดตโปรไฟล์นักศึกษา
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, password } = body;
    const searchId = id ? String(id) : "";

    if (!searchId) {
      return NextResponse.json({ success: false, error: 'ไม่พบ ID ผู้ใช้ที่ส่งมา' }, { status: 400 });
    }

    // 1. ค้นหานักศึกษา (ใช้ findFirst เพื่อความยืดหยุ่น)
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { id: isNaN(Number(searchId)) ? -1 : Number(searchId) }, 
          { userId: searchId } 
        ]
      }
    });

    if (!student || !student.userId) {
      return NextResponse.json({ 
        success: false, 
        error: `ไม่พบข้อมูลนักศึกษาในระบบ` 
      }, { status: 404 });
    }

    // 2. อัปเดตข้อมูลแบบ Transaction เพื่อความปลอดภัย
    await prisma.$transaction(async (tx) => {
      // อัปเดตชื่อในตาราง Student
      if (name) {
        await tx.student.update({
          where: { id: student.id },
          data: { name: name }
        });
      }

      // อัปเดตรหัสผ่านในตาราง User
      if (password && password.length > 0) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await tx.user.update({
          where: { id: student.userId as string }, 
          data: { password: hashedPassword }
        });
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: '💾 บันทึกการเปลี่ยนแปลงข้อมูลเรียบร้อยแล้วครับบอส!' 
    });

  } catch (error: any) {
    console.error("❌ [PUT Profile Error]:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}