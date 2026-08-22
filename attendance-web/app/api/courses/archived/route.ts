import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

/**
 * [GET] - ดึงรายการวิชาที่ถูกจัดเก็บ (ARCHIVED) ของอาจารย์ที่ Login
 */
export async function GET(request: Request) {
  try {
    // 1. ดึง Token จาก Authorization Header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'กรุณาเข้าสู่ระบบ' }, 
        { status: 401 }
      );
    }

    // 2. ตรวจสอบและถอดรหัส Token
    const decoded: any = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'your-secret-key'
    );

    const teacherUserId = decoded.userId || decoded.id;

    // 3. ค้นหาอาจารย์จาก userId
    const teacher = await prisma.teacher.findFirst({
      where: {
        OR: [
          { userId: teacherUserId },
          { id: isNaN(Number(teacherUserId)) ? -1 : Number(teacherUserId) }
        ]
      }
    });

    if (!teacher) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบสิทธิ์อาจารย์' }, 
        { status: 403 }
      );
    }

    // 4. ดึงเฉพาะวิชาที่ผูกกับอาจารย์ท่านนี้ และมีสถานะเป็น ARCHIVED
    const archivedCourses = await prisma.course.findMany({
      where: { 
        teacherId: teacher.id,
        status: 'ARCHIVED' 
      },
      orderBy: {
        updatedAt: 'desc'
      },
      include: {
        _count: {
          select: { students: true }
        }
      }
    });

    // 5. ส่งข้อมูลกลับไปที่หน้าบ้าน
    return NextResponse.json({ 
      success: true, 
      data: archivedCourses 
    });

  } catch (error: any) {
    console.error("Archived Courses GET Error:", error.message);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json(
        { success: false, error: 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่' }, 
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงคลังรายวิชา: ' + error.message }, 
      { status: 500 }
    );
  }
}