import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { courseId, imageUrls, imageUrl, attendanceData, detectedNames, note } = body;

    // 1. ตรวจสอบความถูกต้องของ courseId
    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบรหัสรายวิชา' },
        { status: 400 }
      );
    }

    // 2. ดึงข้อมูลนักศึกษาทั้งหมดในรายวิชานี้
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        students: {
          select: {
            id: true,
            studentCode: true,
            firstName: true,
            lastName: true,
          }
        }
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

    // 4. นับจำนวน Session เดิมเพื่อตั้งลำดับรอบ
    const sessionCount = await prisma.attendanceSession.count({
      where: { courseId: courseId }
    });
    const nextRoundNumber = sessionCount + 1;

    // 5. เตรียม Set รายชื่อและ ID ของคนที่ตรวจจับได้ (Clean ช่องว่างทั้งหมด)
    const detectedCleanSet = new Set<string>();
    if (Array.isArray(detectedNames)) {
      detectedNames.forEach((name: string) => {
        if (name && name !== 'Unknown') {
          detectedCleanSet.add(name.replace(/\s+/g, ' ').trim());
        }
      });
    }

    const presentStudentIdSet = new Set<number>();
    if (Array.isArray(attendanceData)) {
      attendanceData.forEach((item: any) => {
        if (item.status === 'มาเรียน') {
          presentStudentIdSet.add(Number(item.studentId));
        }
      });
    }

    // 6. บันทึกข้อมูลด้วย Transaction
    const result = await prisma.$transaction(async (tx) => {
      // สร้าง Session การเช็คชื่อรอบใหม่
      const newSession = await tx.attendanceSession.create({
        data: {
          courseId: courseId,
          roundNumber: nextRoundNumber,
          imageUrl: savedImagePath,
          note: note || null,
        }
      });

      // จัดเตรียมรายการบันทึกของนักศึกษาทุกคนในวิชา
      const attendanceRecords = course.students.map((student: any) => {
        const studentFullName = `${student.firstName || ''} ${student.lastName || ''}`.replace(/\s+/g, ' ').trim();
        
        // ตรวจสอบว่ามาเรียนหรือไม่ (เช็คจาก ID, ชื่อนามสกุลเต็ม หรือชื่อต้น)
        const isPresent =
          presentStudentIdSet.has(student.id) ||
          detectedCleanSet.has(studentFullName) ||
          (student.firstName && detectedCleanSet.has(student.firstName.trim()));

        return {
          studentId: student.id,
          courseId: courseId,
          status: isPresent ? 'มาเรียน' : 'ขาดเรียน',
          sessionId: newSession.id,
          createdAt: newSession.createdAt,
          updatedAt: newSession.createdAt,
        };
      });

      // บันทึกข้อมูล Attendance ของทุกคน
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