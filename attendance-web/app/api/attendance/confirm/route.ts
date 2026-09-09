// attendance-web/app/api/attendance/confirm/route.ts
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
      note,
      sessionNote,
      round,
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
        students: true,
      },
    });

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบรายวิชานี้ในระบบ' },
        { status: 404 }
      );
    }

    // 3. รวบรวม Base64 สตริงของรูปภาพทั้งหมดโดยตรง (ไม่ต้องผ่าน fs)
    const validImages: string[] = [];

    if (Array.isArray(imageUrls) && imageUrls.length > 0) {
      imageUrls.forEach((img: any) => {
        if (typeof img === 'string' && img.trim()) {
          validImages.push(img.trim());
        }
      });
    } else if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim()) {
      validImages.push(imageUrl.trim());
    }

    // เชื่อมต่อ Base64 หลายรูปด้วย '|||' เพื่อให้ parseSessionImages ใน history/page.tsx แยกรูปได้
    const finalImageUrl = validImages.length > 0 ? validImages.join('|||') : null;

    // 4. บันทึกวันและเวลา
    const now = new Date();
    let sessionDate = new Date();

    if (date) {
      const [year, month, day] = date.split('-').map(Number);
      sessionDate = new Date(
        year,
        month - 1,
        day,
        now.getHours(),
        now.getMinutes(),
        now.getSeconds()
      );
    }

    const currentRoundNumber = Number(round) || 1;
    const currentSlot = timeSlot || '09:00-12:00';
    const currentType = sessionType === 'COMPENSATION' ? 'COMPENSATION' : 'REGULAR';
    const customRemark = sessionNote || note || '';

    const defaultSessionNote = customRemark
      ? `[${currentSlot}] ${currentType === 'COMPENSATION' ? '[สอนชดเชย]' : '[คาบปกติ]'} (รอบที่ ${currentRoundNumber}) - ${customRemark}`
      : `[${currentSlot}] ${currentType === 'COMPENSATION' ? '[สอนชดเชย]' : '[คาบปกติ]'} (รอบที่ ${currentRoundNumber})`;

    // 5. สร้าง Map สถานะนักศึกษา
    const statusMap = new Map<string, { status: string; remark?: string }>();
    if (Array.isArray(attendanceData)) {
      attendanceData.forEach((item: any) => {
        if (item.studentId !== undefined && item.studentId !== null) {
          statusMap.set(String(item.studentId), {
            status: item.status || 'ขาดเรียน',
            remark: item.remark || undefined,
          });
        }
      });
    }

    // 6. บันทึกลง Supabase Database ผ่าน Prisma
    const result = await prisma.$transaction(
      async (tx) => {
        // บันทึกรอบการเช็คชื่อหลัก พร้อมเก็บ Base64 ลง imageUrl
        const newSession = await tx.attendanceSession.create({
          data: {
            courseId: courseId,
            roundNumber: currentRoundNumber,
            imageUrl: finalImageUrl,
            note: defaultSessionNote,
            timeSlot: currentSlot,
            sessionType: currentType,
            createdAt: sessionDate,
          },
        });

        // บันทึกประวัตินักศึกษารายคน
        const attendanceRecords = course.students.map((student: any) => {
          const evaluated = statusMap.get(String(student.id));
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
      },
      {
        timeout: 20000,
      }
    );

    const typeLabel = result.sessionType === 'COMPENSATION' ? 'คาบสอนชดเชย' : 'คาบปกติ';
    return NextResponse.json({
      success: true,
      message: `บันทึกการเช็คชื่อ ${typeLabel} (${result.timeSlot} น.) รอบที่ ${result.roundNumber} เรียบร้อยแล้ว`,
      data: result,
    });
  } catch (error: any) {
    console.error('Confirm Attendance API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' },
      { status: 500 }
    );
  }
}