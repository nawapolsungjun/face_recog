import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ป้องกัน Next.js Cache เพื่อให้ดึงข้อมูลล่าสุดเสมอ
export const dynamic = 'force-dynamic';

/**
 * [GET] - ดึงรายชื่อผู้ใช้ทั้งหมดพร้อมข้อมูลแยกชื่อ-นามสกุล (Teacher/Student)
 */
export async function GET() {
  try {
    // 1. ดึงข้อมูล User พร้อมความสัมพันธ์ Teacher และ Student
    const users = await prisma.user.findMany({
      include: {
        teacher: true,
        student: true,
      },
      orderBy: { 
        createdAt: 'desc' 
      }
    });

    // 2. จัดรูปแบบข้อมูลส่งกลับหน้าบ้าน
    const safeData = users.map((user: any) => {
      let firstName = "";
      let lastName = "";
      let sCode = null;

      if (user.role === 'TEACHER' && user.teacher) {
        firstName = user.teacher.firstName || "";
        lastName = user.teacher.lastName || "";
      } else if (user.role === 'STUDENT' && user.student) {
        firstName = user.student.firstName || "";
        lastName = user.student.lastName || "";
        sCode = user.student.studentCode;
      }

      const fullName = `${firstName} ${lastName}`.trim() || "ไม่ระบุชื่อ";

      return {
        id: user.id,
        email: user.email,
        username: user.username || user.email.split('@')[0],
        role: user.role,
        firstName: firstName,
        lastName: lastName,
        name: fullName,
        studentCode: sCode,
        createdAt: user.createdAt,
      };
    });

    return NextResponse.json({ 
      success: true, 
      data: safeData 
    });

  } catch (error: any) {
    console.error("Admin Users GET Error:", error.message);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถดึงข้อมูลผู้ใช้ได้: ' + error.message }, 
      { status: 500 }
    );
  }
}

/**
 * [DELETE] - ยกเลิกบัญชีผู้ใช้ถาวร
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ไม่พบ ID ผู้ใช้ที่ต้องการลบ' }, { status: 400 });
    }

    // ลบข้อมูลจากตาราง User (Cascade Delete จะจัดการข้อมูลที่เชื่อมโยงกัน)
    await prisma.user.delete({
      where: { id: id }
    });

    return NextResponse.json({ success: true, message: 'ลบบัญชีผู้ใช้เรียบร้อยแล้ว' });

  } catch (error: any) {
    console.error("Admin Users DELETE Error:", error.message);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถลบผู้ใช้ได้ (ข้อมูลอาจมีการเชื่อมโยงกับรายวิชาหรือประวัติเช็คชื่อ)' }, 
      { status: 500 }
    );
  }
}