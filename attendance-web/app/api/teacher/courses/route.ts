import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { headers } from 'next/headers';

export async function GET() {
  try {
    // 1. ดึง Token จาก Header เพื่อดูว่าเป็นอาจารย์คนไหน (ตามฟังก์ชัน 1.1)
    const headerList = headers();
    const authHeader = (await headerList).get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ success: false, error: 'ไม่พบ Token' }, { status: 401 });
    }

    // 2. ถอดรหัส Token
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // 3. ดึงข้อมูลอาจารย์และรายวิชา (ตามฟังก์ชัน 2.5)
    const teacherData = await prisma.teacher.findUnique({
      where: { userId: decoded.userId },
      include: {
        courses: {
          include: {
            _count: {
              select: { students: true }
            }
          }
        }
      }
    });

    if (!teacherData) {
      return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลอาจารย์' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      data: teacherData.courses,
      teacher: { name: teacherData.name } 
    });

  } catch (error: any) {
    console.error("❌ API Error:", error.message);
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
}