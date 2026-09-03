import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      courseId,
      date,
      timeSlot,
      sessionType,
      imageUrls,
      imageUrl,
      attendanceData,
      detectedNames,
      note,
      round
    } = body;

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
        students: true
      }
    });

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบรายวิชานี้ในระบบ' },
        { status: 404 }
      );
    }

    // 3. จัดการเก็บรูปภาพในรูปแบบ Base64 หรือลิงก์ (ไม่ต้องเขียนลง File System บน Vercel)
    const rawImages: string[] = Array.isArray(imageUrls)
      ? imageUrls
      : imageUrl
      ? [imageUrl]
      : [];

    const savedPaths: string[] = [];

    if (rawImages.length > 0) {
      for (const imgStr of rawImages) {
        if (imgStr) {
          // หากเป็น Base64 หรือ URL ปกติ สามารถเก็บบันทึกลง DB ได้โดยตรงทันที
          savedPaths.push(imgStr);
        }
      }
    }

    const savedImagePath = savedPaths.length > 0 ? savedPaths.join(',') : null;

    // 4. บันทึก "เวลาจริงที่เช็คชื่อ" (Real Timestamp)
    const now = new Date();
    let sessionDate = new Date();

    if (date) {
      const [year, month, day] = date.split('-').map(Number);
      // รวมวันที่ที่เลือกเข้ากับ ชั่วโมง:นาที:วินาที ปัจจุบันจริง
      sessionDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
    }

    const currentRoundNumber = Number(round) || 1;
    const currentSlot = timeSlot || '09:00-12:00';
    const currentType = sessionType === 'COMPENSATION' ? 'COMPENSATION' : 'REGULAR';

    const defaultSessionNote = note || (
      currentType === 'COMPENSATION'
        ? `[สอนชดเชย] ช่วงเวลา ${currentSlot} น. (รอบที่ ${currentRoundNumber})`
        : `ช่วงเวลา ${currentSlot} น. (รอบที่ ${currentRoundNumber})`
    );

    // 5. สร้าง Map สถานะและ Remark
    const statusMap = new Map<number, { status: string; remark?: string }>();
    if (Array.isArray(attendanceData)) {
      attendanceData.forEach((item: any) => {
        if (item.studentId) {
          statusMap.set(Number(item.studentId), {
            status: item.status || 'ขาดเรียน',
            remark: item.remark || (currentRoundNumber >= 2 && item.status === 'มาสาย' ? `เช็คชื่อรอบที่ 2 (${currentSlot} น.)` : undefined)
          });
        }
      });
    }

    // 6. บันทึกข้อมูลด้วย Database Transaction
    const result = await prisma.$transaction(async (tx) => {
      const newSession = await tx.attendanceSession.create({
        data: {
          courseId: courseId,
          roundNumber: currentRoundNumber,
          imageUrl: savedImagePath,
          note: defaultSessionNote,
          createdAt: sessionDate,
        }
      });

      const attendanceRecords = course.students.map((student: any) => {
        const evaluated = statusMap.get(student.id);
        const finalStatus = evaluated ? evaluated.status : 'ขาดเรียน';
        
        let finalRemark = evaluated?.remark;
        if (!finalRemark) {
          if (currentType === 'COMPENSATION') {
            finalRemark = `[สอนชดเชย] ${finalStatus === 'มาเรียน' ? 'เข้าเรียน' : finalStatus} (${currentSlot} น.)`;
          } else if (currentRoundNumber >= 2 && finalStatus === 'มาสาย') {
            finalRemark = `เช็คชื่อรอบที่ 2 (${currentSlot} น.)`;
          }
        }

        return {
          studentId: student.id,
          courseId: courseId,
          status: finalStatus,
          remark: finalRemark || null,
          sessionId: newSession.id,
          date: sessionDate,
          createdAt: sessionDate,
          updatedAt: new Date(),
        };
      });

      await tx.attendance.createMany({
        data: attendanceRecords,
      });

      return {
        sessionId: newSession.id,
        roundNumber: currentRoundNumber,
        sessionType: currentType,
        timeSlot: currentSlot,
      };
    });

    const typeLabel = result.sessionType === 'COMPENSATION' ? 'คาบสอนชดเชย' : 'คาบปกติ';
    return NextResponse.json({
      success: true,
      message: `บันทึกการเช็คชื่อ ${typeLabel} (${result.timeSlot} น.) รอบที่ ${result.roundNumber} เรียบร้อยแล้ว`,
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