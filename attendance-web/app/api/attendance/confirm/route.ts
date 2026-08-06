import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { courseId, imageUrl, attendanceData, note } = body;

    // 1. ตรวจสอบความถูกต้องของข้อมูลที่ส่งมา
    if (!courseId || !attendanceData || !Array.isArray(attendanceData) || attendanceData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลรายวิชาหรือรายการเช็คชื่อไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    // 2. จัดการเรื่องไฟล์รูปภาพ: หากส่งมาเป็น Base64 ให้เซฟลงโฟลเดอร์ public/uploads
    let savedImagePath: string | null = null;

    if (imageUrl && imageUrl.startsWith('data:image')) {
      const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const fileName = `session_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, buffer);
      savedImagePath = `/uploads/${fileName}`;
    } else if (imageUrl && !imageUrl.startsWith('blob:')) {
      savedImagePath = imageUrl;
    }

    // 3. บันทึกข้อมูลด้วย Transaction
    const result = await prisma.$transaction(async (tx) => {
      const sessionCount = await tx.attendanceSession.count({
        where: { courseId: courseId }
      });
      const nextRoundNumber = sessionCount + 1;

      const newSession = await tx.attendanceSession.create({
        data: {
          courseId: courseId,
          roundNumber: nextRoundNumber,
          imageUrl: savedImagePath,
          note: note || null,
        }
      });

      const attendanceRecords = attendanceData.map((item: { studentId: number | string; status: string }) => ({
        studentId: Number(item.studentId),
        courseId: courseId,
        status: item.status,
        date: newSession.createdAt,
        sessionId: newSession.id,
      }));

      await tx.attendance.createMany({
        data: attendanceRecords,
      });

      return {
        sessionId: newSession.id,
        roundNumber: nextRoundNumber,
      };
    });

    return NextResponse.json({
      success: true,
      message: `บันทึกการเช็คชื่อ ครั้งที่ ${result.roundNumber} เรียบร้อยแล้ว`,
      data: result,
    });

  } catch (error: any) {
    console.error('Confirm Attendance API Error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' },
      { status: 500 }
    );
  }
}