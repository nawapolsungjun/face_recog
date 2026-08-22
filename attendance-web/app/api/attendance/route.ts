import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { studentNames, courseId } = await req.json();

    if (!studentNames || !Array.isArray(studentNames)) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบรายชื่อนักเรียน' },
        { status: 400 }
      );
    }

    // 1. ตั้งค่าช่วงเวลาของ "วันนี้" (00:00 - 23:59)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const records = await Promise.all(
      studentNames.map(async (fullNameStr: string) => {
        if (!fullNameStr || fullNameStr === 'Unknown') return null;

        const trimmed = fullNameStr.trim();
        const parts = trimmed.split(/\s+/);
        const firstName = parts[0] || '';
        const lastName = parts.slice(1).join(' ') || '';

        // 2. ค้นหานักศึกษาจาก firstName และ lastName
        const student = await prisma.student.findFirst({
          where: {
            OR: [
              {
                AND: [
                  { firstName: { equals: firstName } },
                  ...(lastName ? [{ lastName: { equals: lastName } }] : [])
                ]
              },
              { firstName: { contains: trimmed } },
              { lastName: { contains: trimmed } }
            ]
          }
        });

        if (student) {
          // 3. ตรวจสอบการเช็คชื่อซ้ำภายในวันเดียวกัน
          const existingRecord = await prisma.attendance.findFirst({
            where: {
              studentId: student.id,
              courseId: String(courseId),
              createdAt: {
                gte: startOfDay,
                lte: endOfDay
              }
            }
          });

          if (existingRecord) return null;

          // 4. บันทึกข้อมูลการเช็คชื่อ
          return prisma.attendance.create({
            data: {
              studentId: student.id,
              courseId: String(courseId),
              status: 'มาเรียน'
            }
          });
        }
        return null;
      })
    );

    const savedCount = records.filter(r => r !== null).length;
    return NextResponse.json({ success: true, count: savedCount });

  } catch (error: any) {
    console.error("Attendance API Error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}