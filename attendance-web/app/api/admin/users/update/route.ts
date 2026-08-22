import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

/**
 * [PUT] - อัปเดตข้อมูลผู้ใช้ (อาจารย์ และ นักศึกษา) โดย Admin
 * รองรับการแก้ไข: ชื่อจริง, นามสกุล, อีเมล, username, รหัสนักศึกษา และรหัสผ่านใหม่
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { 
      id, 
      firstName, 
      lastName, 
      name, 
      role, 
      studentCode, 
      email, 
      username, 
      password 
    } = body;

    // ตรวจสอบความพร้อมของข้อมูลพื้นฐาน
    if (!id) {
      return NextResponse.json({ success: false, error: 'ไม่พบ ID ผู้ใช้ที่ต้องการอัปเดต' }, { status: 400 });
    }

    // จัดการชื่อจริงและนามสกุล (รองรับทั้งแยกฟิลด์และส่งรวมมา)
    let fName = firstName || '';
    let lName = lastName || '';

    if (!fName && name) {
      const parts = name.trim().split(/\s+/);
      fName = parts[0] || '';
      lName = parts.slice(1).join(' ') || '';
    }

    // 1. เตรียมข้อมูลสำหรับอัปเดตตารางหลัก (User Table)
    const userData: any = {
      email: email,
      username: username || (role === 'STUDENT' ? studentCode : email?.split('@')[0])
    };

    // ตรวจสอบว่ามีการส่งรหัสผ่านใหม่มาเพื่อ Reset หรือไม่
    if (password && password.trim().length > 0) {
      const hashedPassword = await bcrypt.hash(password, 10);
      userData.password = hashedPassword;
    }

    // อัปเดตตาราง User
    await prisma.user.update({
      where: { id: id },
      data: userData
    });

    // 2. แยกอัปเดตข้อมูลเฉพาะตามบทบาท (Role-based Update)
    if (role === 'TEACHER') {
      await prisma.teacher.update({
        where: { userId: id },
        data: { 
          firstName: fName,
          lastName: lName,
        }
      });
    } else if (role === 'STUDENT') {
      const studentUpdateData: any = {
        firstName: fName,
        lastName: lName,
      };

      if (studentCode) {
        studentUpdateData.studentCode = studentCode;
      }

      if (userData.password) {
        studentUpdateData.password = userData.password;
      }

      await prisma.student.update({
        where: { userId: id },
        data: studentUpdateData
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: userData.password 
        ? 'บันทึกข้อมูลและรีเซ็ตรหัสผ่านเรียบร้อยแล้ว' 
        : 'บันทึกการแก้ไขข้อมูลเรียบร้อยแล้ว' 
    });

  } catch (error: any) {
    console.error("Update User Error:", error.message);
    
    // จัดการ Error กรณีค่า Unique ซ้ำ (เช่น เปลี่ยนรหัส/อีเมลไปซ้ำกับคนอื่น)
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        success: false, 
        error: 'อีเมล หรือ รหัสประจำตัว นี้มีผู้ใช้งานอื่นใช้ไปแล้ว' 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      success: false, 
      error: 'เกิดข้อผิดพลาด: ' + error.message 
    }, { status: 500 });
  }
}