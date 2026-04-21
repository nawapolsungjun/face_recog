import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { headers } from 'next/headers';

/**
 * 📦 [GET] - ดึงรายการวิชาที่ถูกจัดเก็บ (ARCHIVED) ของอาจารย์ที่ Login
 * Path: /api/courses/archived
 */
export async function GET() {
  try {
    // 1. ดึง Token จาก Header
    const headerList = await headers();
    const authHeader = headerList.get('authorization');
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

    // 3. ค้นหาอาจารย์จาก userId ใน Token
    const teacher = await prisma.teacher.findUnique({
      where: { userId: decoded.userId }
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
        updatedAt: 'desc' // เรียงตามวิชาที่เพิ่งถูกกดจัดเก็บล่าสุด
      },
      include: {
        _count: {
          select: { students: true } // ดึงจำนวนนักศึกษามาโชว์ด้วย
        }
      }
    });

    // 5. ส่งข้อมูลกลับไปที่หน้าบ้าน
    return NextResponse.json({ 
      success: true, 
      data: archivedCourses 
    });

  } catch (error: any) {
    console.error("❌ Archived API Error:", error.message);
    
    // จัดการกรณี Token หมดอายุหรือผิดพลาด
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json(
        { success: false, error: 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่' }, 
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' }, 
      { status: 500 }
    );
  }
}