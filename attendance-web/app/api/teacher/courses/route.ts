import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. ดึง Token จาก Authorization Header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบ Token กรุณาเข้าสู่ระบบ' }, 
        { status: 401 }
      );
    }

    // 2. ถอดรหัส Token
    const decoded: any = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'your-secret-key'
    );

    const teacherUserId = decoded.userId || decoded.id;
    const parsedId = parseInt(String(teacherUserId), 10);

    // 3. ค้นหาข้อมูลอาจารย์และรายวิชาทั้งหมดที่สอน (รองรับทั้ง userId และ id)
    const teacherData = await prisma.teacher.findFirst({
      where: {
        OR: [
          { userId: String(teacherUserId) },
          ...(!isNaN(parsedId) ? [{ id: parsedId }] : [])
        ]
      },
      include: {
        courses: {
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: { students: true }
            }
          }
        }
      }
    });

    if (!teacherData) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลอาจารย์ในระบบ' }, 
        { status: 404 }
      );
    }

    const fullName = `${teacherData.firstName || ''} ${teacherData.lastName || ''}`.trim() || 'ไม่ระบุชื่อ';

    return NextResponse.json({ 
      success: true, 
      data: teacherData.courses,
      teacher: { 
        id: teacherData.id,
        firstName: teacherData.firstName,
        lastName: teacherData.lastName,
        name: fullName 
      } 
    });

  } catch (error: any) {
    console.error("Teacher Courses API Error:", error.message);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json(
        { success: false, error: 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่' }, 
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายวิชา: ' + error.message }, 
      { status: 500 }
    );
  }
}