import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs'; // 👈 บอสอย่าลืมติดตั้ง npm install bcryptjs นะครับ

/**
 * 📝 [PUT] - อัปเดตข้อมูลผู้ใช้ (อาจารย์ และ นักศึกษา) โดย Admin
 * รองรับการแก้ไข: ชื่อ, อีเมล, username, แผนกวิชา, รหัสนักศึกษา และ "รหัสผ่านใหม่"
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, role, studentCode, department, email, username, password } = body;

    // ตรวจสอบความพร้อมของข้อมูลพื้นฐาน
    if (!id) {
      return NextResponse.json({ success: false, error: 'ไม่พบ ID ผู้ใช้ที่ต้องการอัปเดต' }, { status: 400 });
    }

    // 1. 🚀 เตรียมข้อมูลสำหรับอัปเดตตารางหลัก (User Table)
    const userData: any = {
      email: email,
      username: username || (role === 'STUDENT' ? studentCode : undefined)
    };

    // 🚩 ตรวจสอบว่า Admin มีการส่งรหัสผ่านใหม่มาเพื่อ Reset หรือไม่
    if (password && password.trim().length > 0) {
      // ทำการ Hash รหัสผ่านใหม่ก่อนบันทึกเพื่อความปลอดภัย
      const hashedPassword = await bcrypt.hash(password, 10);
      userData.password = hashedPassword;
    }

    // อัปเดตตาราง User
    await prisma.user.update({
      where: { id: id },
      data: userData
    });

    // 2. 🍎 แยกอัปเดตข้อมูลเฉพาะตามบทบาท (Role-based Update)
    if (role === 'TEACHER') {
      // อัปเดตตาราง Teacher ผ่าน userId
      await prisma.teacher.update({
        where: { userId: id },
        data: { 
          name: name,
          department: department // แก้ไขแผนกวิชาให้อาจารย์
        }
      });
    } 
    else if (role === 'STUDENT') {
      // อัปเดตตาราง Student ผ่าน userId
      await prisma.student.update({
        where: { userId: id },
        data: { 
          name: name,
          studentCode: studentCode // แก้ไขรหัสนักศึกษา
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: userData.password 
        ? '💾 บันทึกข้อมูลและ "รีเซ็ตรหัสผ่าน" เรียบร้อยแล้วครับบอส!' 
        : '💾 บันทึกการแก้ไขข้อมูลเรียบร้อยแล้วครับบอส!' 
    });

  } catch (error: any) {
    console.error("❌ Update User Error:", error.message);
    
    // จัดการ Error กรณีค่า Unique ซ้ำ (เช่น เปลี่ยนรหัส/อีเมลไปซ้ำกับคนอื่น)
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        success: false, 
        error: 'อีเมล หรือ รหัสประจำตัว นี้มีผู้ใช้งานอื่นใช้ไปแล้วครับ' 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      success: false, 
      error: 'เกิดข้อผิดพลาด: ' + error.message 
    }, { status: 500 });
  }
}