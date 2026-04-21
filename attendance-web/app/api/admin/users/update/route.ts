import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * 📝 [PUT] - อัปเดตข้อมูลผู้ใช้ (อาจารย์ และ นักศึกษา)
 * รองรับการแก้ไข: ชื่อ, อีเมล, username, แผนกวิชา, และรหัสนักศึกษา
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, role, studentCode, department, email, username } = body;

    // ตรวจสอบความพร้อมของข้อมูลพื้นฐาน
    if (!id) {
      return NextResponse.json({ success: false, error: 'ไม่พบ ID ผู้ใช้ที่ต้องการอัปเดต' }, { status: 400 });
    }

    // 1. 🚀 อัปเดตข้อมูลที่ตารางหลัก (User Table)
    // เราจะอัปเดต email และ username (ถ้าส่งมา) เพื่อใช้ในการ Login
    await prisma.user.update({
      where: { id: id },
      data: { 
        email: email,
        username: username || (role === 'STUDENT' ? studentCode : undefined) 
      }
    });

    // 2. 🍎 แยกอัปเดตข้อมูลเฉพาะตามบทบาท (Role-based Update)
    if (role === 'TEACHER') {
      // อัปเดตตาราง Teacher ผ่าน userId
      await prisma.teacher.update({
        where: { userId: id },
        data: { 
          name: name,
          department: department // 👈 เพิ่มการบันทึกแผนกวิชาให้อาจารย์
        }
      });
    } 
    else if (role === 'STUDENT') {
      // อัปเดตตาราง Student ผ่าน userId
      await prisma.student.update({
        where: { userId: id },
        data: { 
          name: name,
          studentCode: studentCode // 👈 อัปเดตรหัสนักศึกษา
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: ' บันทึกการแก้ไขข้อมูลเรียบร้อยแล้วครับบอส!' 
    });

  } catch (error: any) {
    console.error(" Update User Error:", error.message);
    
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