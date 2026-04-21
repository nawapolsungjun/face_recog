import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { studentNames, courseId } = await req.json();

        // 🚀 1. ตั้งค่าช่วงเวลาของ "วันนี้" (00:00 - 23:59)
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        if (!studentNames || !Array.isArray(studentNames)) {
            return NextResponse.json({ success: false, error: 'ไม่พบรายชื่อนักเรียน' }, { status: 400 });
        }

        const records = await Promise.all(
            studentNames.map(async (name: string) => {
                if (!name || name === "Unknown") return null;

                const student = await prisma.student.findFirst({
                    where: { name: name.trim() }
                });

                if (student) {
                    // 2. เช็คการเช็คชื่อซ้ำภายในวันเดียวกัน
                    const existingRecord = await prisma.attendance.findFirst({
                        where: {
                            studentId: student.id,
                            courseId: String(courseId),
                            date: {
                                gte: startOfDay,
                                lte: endOfDay
                            }
                        }
                    });

                    if (existingRecord) return null;

                    // 3. บันทึกข้อมูล (Type Date จะใช้งานได้ทันทีหลัง npx prisma generate)
                    return prisma.attendance.create({
                        data: {
                            studentId: student.id,
                            courseId: String(courseId),
                            date: new Date(), // ✅ Prisma จะมองเป็น DateTime ตาม Schema
                            status: 'มาเรียน',
                        },
                    });
                }
                return null;
            })
        );

        const savedCount = records.filter(r => r !== null).length;
        return NextResponse.json({ success: true, count: savedCount });

    } catch (error: any) {
        console.error("❌ API Error:", error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}