// app/api/courses/[id]/students/[studentId]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
    request: Request,
    // ✅ จุดที่ 1: ชื่อใน Type ต้องตรงกับ [studentId]
    { params }: { params: Promise<{ id: string; studentId: string }> } 
) {
    try {
        // ✅ จุดที่ 2: ดึงค่า studentId (ไม่มี s)
        const { id, studentId } = await params;

        console.log(`🗑️ Removing Student ID: ${studentId} from Course: ${id}`);

        await prisma.course.update({
            where: { id: id },
            data: {
                students: {
                    disconnect: { 
                        // ✅ จุดที่ 3: ใช้ studentId ให้ตรงกัน
                        id: Number(studentId) 
                    }
                }
            }
        });

        return NextResponse.json({ success: true, message: 'ลบสำเร็จ' });

    } catch (error: any) {
        console.error("🔴 API DELETE ERROR:", error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}