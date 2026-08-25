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
 * [DELETE] - ยกเลิกบัญชีผู้ใช้ถาวร (เคลียร์ Foreign Key Dependencies อัตโนมัติ)
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ไม่พบ ID ผู้ใช้ที่ต้องการลบ' }, { status: 400 });
    }

    // 1. ค้นหา User พร้อมความสัมพันธ์ของ Student และ Teacher
    const targetUser = await prisma.user.findUnique({
      where: { id: id },
      include: {
        student: {
          include: {
            attendances: true,
            courses: true,
          }
        },
        teacher: {
          include: {
            courses: {
              include: {
                attendances: true,
                students: true,
              }
            }
          }
        }
      }
    });

    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'ไม่พบบัญชีผู้ใช้นี้ในระบบ' }, { status: 404 });
    }

    // 2. ใช้ Transaction จัดการลบข้อมูลลูกตามลำดับ
    await prisma.$transaction(async (tx) => {
      // 2.1 หากเป็น Student
      if (targetUser.student) {
        // ลบประวัติการเช็คชื่อของนักศึกษาคนนี้ทั้งหมด
        await tx.attendance.deleteMany({
          where: { studentId: targetUser.student.id }
        });

        // ปลดความสัมพันธ์รายวิชาที่นักศึกษาลงเรียน
        await tx.student.update({
          where: { id: targetUser.student.id },
          data: {
            courses: {
              set: []
            }
          }
        });

        // ลบเรคคอร์ด Student
        await tx.student.delete({
          where: { id: targetUser.student.id }
        });
      }

      // 2.2 หากเป็น Teacher
      if (targetUser.teacher) {
        // วนลูปจัดการคอร์สที่อาจารย์ท่านนี้สอน
        for (const course of targetUser.teacher.courses) {
          // ลบประวัติการเช็คชื่อในคอร์สนี้ทั้งหมด
          await tx.attendance.deleteMany({
            where: { courseId: course.id }
          });

          // ปลดนักศึกษาทั้งหมดออกจากคอร์สนี้
          await tx.course.update({
            where: { id: course.id },
            data: {
              students: {
                set: []
              }
            }
          });

          // ลบคอร์สนี้ทิ้ง
          await tx.course.delete({
            where: { id: course.id }
          });
        }

        // ลบเรคคอร์ด Teacher
        await tx.teacher.delete({
          where: { id: targetUser.teacher.id }
        });
      }

      // 2.3 ลบ User ออกจากระบบ
      await tx.user.delete({
        where: { id: id }
      });
    });

    return NextResponse.json({ success: true, message: 'ลบบัญชีผู้ใช้และข้อมูลที่เกี่ยวข้องเรียบร้อยแล้ว' });

  } catch (error: any) {
    console.error("Admin Users DELETE Error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่สามารถลบผู้ใช้ได้' }, 
      { status: 500 }
    );
  }
}