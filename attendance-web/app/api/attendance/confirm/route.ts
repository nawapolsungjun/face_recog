import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { courseId, date, imageUrls, imageUrl, attendanceData, detectedNames, note, round } = body;

    // 1. ตรวจสอบความถูกต้องของ courseId
    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบรหัสรายวิชา' },
        { status: 400 }
      );
    }

    // 2. ดึงข้อมูลนักศึกษาทั้งหมดในรายวิชานี้ (ใช้ students: true ป้องกัน Error ฟิลด์ไม่ตรง)
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        students: true
      }
    });

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบรายวิชานี้ในระบบ' },
        { status: 404 }
      );
    }

    // 3. จัดการบันทึกรูปภาพ (รองรับทั้ง Array และ Base64)
    const rawImages: string[] = Array.isArray(imageUrls)
      ? imageUrls
      : imageUrl
      ? [imageUrl]
      : [];

    const savedPaths: string[] = [];
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');

    if (rawImages.length > 0) {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      for (const imgStr of rawImages) {
        if (imgStr && imgStr.startsWith('data:image')) {
          const base64Data = imgStr.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          const fileName = `session_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
          const filePath = path.join(uploadDir, fileName);
          fs.writeFileSync(filePath, buffer);
          savedPaths.push(`/uploads/${fileName}`);
        } else if (imgStr && !imgStr.startsWith('blob:')) {
          savedPaths.push(imgStr);
        }
      }
    }

    const savedImagePath = savedPaths.length > 0 ? savedPaths.join(',') : null;

    // 4. กำหนดวันที่และรอบ
    const sessionDate = date ? new Date(date) : new Date();
    const currentRoundNumber = Number(round) || 1;

    // 5. สร้าง Map สถานะและ Remark ที่ส่งมาจาก Frontend
    const statusMap = new Map<number, { status: string; remark?: string }>();
    if (Array.isArray(attendanceData)) {
      attendanceData.forEach((item: any) => {
        if (item.studentId) {
          statusMap.set(Number(item.studentId), {
            status: item.status || 'ขาดเรียน',
            remark: item.remark || (currentRoundNumber >= 2 && item.status === 'มาสาย' ? 'เช็คชื่อรอบที่ 2' : undefined)
          });
        }
      });
    }

    // 6. บันทึกข้อมูลด้วย Transaction
    const result = await prisma.$transaction(async (tx) => {
      // สร้าง Session การเช็คชื่อรอบใหม่
      const newSession = await tx.attendanceSession.create({
        data: {
          courseId: courseId,
          roundNumber: currentRoundNumber,
          imageUrl: savedImagePath,
          note: note || (currentRoundNumber >= 2 ? `เช็คชื่อรอบที่ ${currentRoundNumber}` : null),
          createdAt: sessionDate,
        }
      });

      // จัดเตรียมรายการบันทึกของนักศึกษาทุกคน
      const attendanceRecords = course.students.map((student: any) => {
        const evaluated = statusMap.get(student.id);
        const finalStatus = evaluated ? evaluated.status : 'ขาดเรียน';
        const finalRemark = evaluated?.remark || (currentRoundNumber >= 2 && finalStatus === 'มาสาย' ? 'เช็คชื่อรอบที่ 2' : null);

        return {
          studentId: student.id,
          courseId: courseId,
          status: finalStatus,
          remark: finalRemark,
          sessionId: newSession.id,
          date: sessionDate,
          createdAt: sessionDate,
          updatedAt: sessionDate,
        };
      });

      // บันทึก Attendance ของทุกคนลงฐานข้อมูล
      await tx.attendance.createMany({
        data: attendanceRecords,
      });

      return {
        sessionId: newSession.id,
        roundNumber: currentRoundNumber,
      };
    });

    return NextResponse.json({
      success: true,
      message: `บันทึกการเช็คชื่อรอบที่ ${result.roundNumber} เรียบร้อยแล้ว`,
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