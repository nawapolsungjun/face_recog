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
        const mode = searchParams.get('mode'); // 🚀 รับค่า mode เพิ่มเติม

        // 1. ดึงข้อมูลรายวิชาและนักศึกษาทั้งหมดในวิชานี้ก่อน
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

        // ==========================================
        // 🚀 โหมดที่ 1: สรุปภาพรวมทุกคาบทั้งเทอม (?mode=summary)
        // ==========================================
        if (mode === 'summary') {
            const allAttendances = await prisma.attendance.findMany({
                where: { courseId: courseId },
                select: { studentId: true, status: true }
            });

            const summaryReport = courseData.students.map(student => {
                const logs = allAttendances.filter(a => a.studentId === student.id);
                
                return {
                    id: student.id,
                    studentCode: student.studentCode,
                    name: student.name,
                    present: logs.filter(a => a.status === 'มาเรียน' || a.status === 'PRESENT').length,
                    late: logs.filter(a => a.status === 'มาสาย' || a.status === 'LATE').length,
                    leave: logs.filter(a => a.status === 'ลา' || a.status === 'LEAVE').length,
                    absent: logs.filter(a => a.status === 'ขาดเรียน' || a.status === 'ABSENT').length,
                };
            });

            return NextResponse.json({
                success: true,
                mode: 'summary',
                data: summaryReport
            });
        }

        // ==========================================
        // 🟢 โหมดที่ 2: รายงานประจำวัน (โค้ดเดิมของบอส 100%)
        // ==========================================
        if (!dateStr) {
            return NextResponse.json({ success: false, error: 'กรุณาระบุวันที่' }, { status: 400 });
        }

        const selectedDate = new Date(dateStr);
        const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));

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

        const statusPriority: Record<string, number> = {
            'มาเรียน': 1, 'PRESENT': 1,
            'มาสาย': 2, 'LATE': 2,
            'ลา': 3, 'LEAVE': 3,
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
                leave: fullReport.filter(s => s.status === 'ลา' || s.status === 'LEAVE').length,
                absent: fullReport.filter(s => s.status === 'ขาดเรียน' || s.status === 'ABSENT').length
            }
        });

    } catch (error: any) {
        console.error("🔴 Report API Error:", error.message);
        return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน' }, { status: 500 });
    }
}