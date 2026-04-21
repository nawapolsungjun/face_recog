// attendance-web/app/api/report/[courseId]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const { courseId } = await params;
        const { searchParams } = new URL(request.url);
        const dateStr = searchParams.get('date'); 

        if (!dateStr) {
            return NextResponse.json({ success: false, error: 'กรุณาระบุวันที่' }, { status: 400 });
        }

        const selectedDate = new Date(dateStr);
        const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));

        const courseData = await prisma.course.findUnique({
            where: { id: courseId },
            include: {
                students: {
                    select: {
                        id: true,
                        studentCode: true,
                        name: true
                    }
                }
            }
        });

        if (!courseData) {
            return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลรายวิชา' }, { status: 404 });
        }

        const attendances = await prisma.attendance.findMany({
            where: {
                courseId: courseId,
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });

        const fullReport = courseData.students.map(student => {
            const attendanceRecord = attendances.find(a => a.studentId === student.id);

            return {
                id: student.id,
                studentCode: student.studentCode,
                name: student.name,
                time: attendanceRecord ? attendanceRecord.date : null,
                status: attendanceRecord ? attendanceRecord.status : 'ขาดเรียน'
            };
        });

        // 🚀 1. ปรับ Priority ให้รองรับ 'ลา'
        const statusPriority: Record<string, number> = {
            'มาเรียน': 1, 'PRESENT': 1,
            'มาสาย': 2, 'LATE': 2,
            'ลา': 3, 'LEAVE': 3, // ✅ เพิ่ม 'ลา' ให้อยู่ลำดับก่อน 'ขาดเรียน'
            'ขาดเรียน': 4, 'ABSENT': 4
        };

        fullReport.sort((a, b) => {
            const priorityA = statusPriority[a.status] || 99;
            const priorityB = statusPriority[b.status] || 99;
            return priorityA - priorityB;
        });

        return NextResponse.json({ 
            success: true, 
            data: fullReport,
            summary: {
                total: courseData.students.length,
                present: fullReport.filter(s => s.status === 'มาเรียน' || s.status === 'PRESENT').length,
                late: fullReport.filter(s => s.status === 'มาสาย' || s.status === 'LATE').length,
                leave: fullReport.filter(s => s.status === 'ลา' || s.status === 'LEAVE').length, // ✅ 2. นับยอดลาส่งไปหน้าบ้าน
                absent: fullReport.filter(s => s.status === 'ขาดเรียน' || s.status === 'ABSENT').length
            }
        });

    } catch (error: any) {
        console.error("🔴 Report API Error:", error.message);
        return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน' }, { status: 500 });
    }
}