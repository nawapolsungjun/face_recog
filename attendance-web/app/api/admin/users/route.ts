import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * 🔍 [GET] - ดึงรายชื่อผู้ใช้ทั้งหมดพร้อมข้อมูลเสริม (Teacher/Student)
 * รองรับการแสดงผล: ชื่อ, อีเมล, แผนกวิชา(อาจารย์), รหัสนักศึกษา(นักศึกษา)
 */
export async function GET() {
  try {
    // 1. ดึงข้อมูล User พร้อมความสัมพันธ์ Teacher และ Student แบบครบถ้วน
    const users = await prisma.user.findMany({
      include: {
        teacher: true,
        student: true,
      },
      orderBy: { 
        createdAt: 'desc' 
      }
    });

    // 2. Map ข้อมูลให้เป็นโครงสร้าง Flatten Data เพื่อให้หน้าบ้านจัดการง่าย
    const safeData = users.map((user: any) => {
      let displayName = "ไม่ระบุชื่อ";
      let sCode = null;
      let dept = null; // 🚀 เพิ่มตัวแปรสำหรับเก็บแผนกวิชา

      // ตรวจสอบบทบาทและดึงข้อมูลเฉพาะทาง
      if (user.role === 'TEACHER' && user.teacher) {
        displayName = user.teacher.name;
        dept = user.teacher.department; // 🔥 ดึงข้อมูลแผนกออกมา
      } else if (user.role === 'STUDENT' && user.student) {
        displayName = user.student.name;
        sCode = user.student.studentCode;
      } else if (user.role === 'ADMIN') {
        displayName = "ผู้ดูแลระบบ";
      }

      return {
        id: user.id,
        email: user.email,
        // ใช้ username จาก DB ถ้าไม่มีให้ใช้ส่วนหน้าของ email
        username: user.username || user.email.split('@')[0], 
        role: user.role,
        name: displayName,
        studentCode: sCode,
        department: dept // ✅ ส่งแผนกวิชาออกไปเพื่อให้หน้าแก้ไข (Modal) ใช้งานได้
      };
    });

    return NextResponse.json({ 
      success: true, 
      data: safeData 
    });

  } catch (error: any) {
    console.error("❌ Admin Users GET Error:", error.message);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถดึงข้อมูลผู้ใช้ได้: ' + error.message }, 
      { status: 500 }
    );
  }
}

/**
 * 🗑️ [DELETE] - ยกเลิกบัญชีผู้ใช้ถาวร
 * การลบที่ User จะทำการลบข้อมูลใน Teacher/Student ที่เชื่อมกันผ่าน Cascade
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ไม่พบ ID ผู้ใช้ที่ต้องการลบ' }, { status: 400 });
    }

    // ลบข้อมูลจากตาราง User (Cascade Delete จะจัดการตารางลูกเอง)
    await prisma.user.delete({
      where: { id: id }
    });

    return NextResponse.json({ success: true, message: 'ลบบัญชีผู้ใช้เรียบร้อยแล้วครับบอส' });

  } catch (error: any) {
    console.error("❌ Admin Users DELETE Error:", error.message);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถลบผู้ใช้ได้ (ข้อมูลอาจมีการเชื่อมโยงกับรายวิชาหรือประวัติเช็คชื่อ)' }, 
      { status: 500 }
    );
  }
}