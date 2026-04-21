import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { headers } from 'next/headers';

/**
 * 🔍 [GET] - ดึงรายการวิชาของอาจารย์ (เฉพาะที่ ACTIVE)
 * ใช้สำหรับ: แสดงผลหน้า Dashboard หลัก
 */
export async function GET() {
  try {
    const headerList = await headers();
    const authHeader = headerList.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // หา teacherId ของอาจารย์ที่ Login อยู่
    const teacher = await prisma.teacher.findUnique({
      where: { userId: decoded.userId }
    });

    if (!teacher) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // 🚀 ดึงเฉพาะวิชาที่ status เป็น ACTIVE เท่านั้น
    const courses = await prisma.course.findMany({
      where: { 
        teacherId: teacher.id,
        status: 'ACTIVE' // ✅ กรองวิชาที่ Archive ทิ้งไป
      },
      orderBy: {
        createdAt: 'desc' // เรียงตามวิชาที่สร้างล่าสุด
      },
      include: {
        _count: {
          select: { students: true } // แถมยอดจำนวนนักศึกษาไปโชว์ที่การ์ดด้วย
        }
      }
    });

    return NextResponse.json({ success: true, data: courses });

  } catch (error: any) {
    console.error("❌ Fetch Courses Error:", error.message);
    return NextResponse.json({ success: false, error: 'ไม่สามารถโหลดรายวิชาได้' }, { status: 500 });
  }
}

/**
 * ➕ [POST] - สร้างรายวิชาใหม่
 * ใช้สำหรับ: ฟังก์ชัน 2.1 ในหน้า Dashboard
 */
export async function POST(request: Request) {
  try {
    const headerList = await headers();
    const authHeader = headerList.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนสร้างวิชา' }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    const teacher = await prisma.teacher.findUnique({
      where: { userId: decoded.userId }
    });

    if (!teacher) {
      return NextResponse.json({ success: false, error: 'ไม่พบสิทธิ์อาจารย์ในระบบ' }, { status: 403 });
    }

    const { courseCode, courseName } = await request.json();

    const newCourse = await prisma.course.create({
      data: {
        courseCode,
        courseName,
        teacherId: teacher.id, 
        status: 'ACTIVE' // 🚀 มั่นใจว่าสร้างใหม่ต้องเป็น ACTIVE เสมอ
      },
    });

    return NextResponse.json({ success: true, data: newCourse });

  } catch (error: any) {
    console.error("❌ Create Course Error:", error.message);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการสร้างวิชา' }, { status: 500 });
  }
}