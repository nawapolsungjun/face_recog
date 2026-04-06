import { prisma } from '../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { studentNames, courseId } = await req.json();
        console.log(" ได้รับข้อมูลสแกน:", studentNames);

        const records = await Promise.all(
            studentNames.map(async (name: string) => {
                const student = await prisma.student.findFirst({
                    where: { name: name }
                });

                if (student) {
                    console.log(` พบนักเรียน ${name} (ID: ${student.id}) กำลังบันทึก...`);
                    return prisma.attendance.create({
                        data: {
                            studentId: student.id,
                            courseId: courseId,
                            status: 'PRESENT',
                        },
                    });
                } else {
                    console.log(` ไม่พบชื่อ ${name} ในฐานข้อมูล Student`);
                    return null;
                }
            })
        );

        return NextResponse.json({ success: true, count: records.filter(r => r !== null).length });
    } catch (error) {
        console.error(" Database Error:", error);
        return NextResponse.json({ success: false, error: 'Database Error' }, { status: 500 });
    }
}