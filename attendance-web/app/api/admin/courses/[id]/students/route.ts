import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

//  ดึงข้อมูลรายวิชา, รายชื่อนักศึกษาในวิชา และรายชื่อนักศึกษาทั้งหมดในระบบ
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // แกะห่อ params ด้วย await ตามกฎ Next.js เวอร์ชันใหม่
    const { id: courseId } = await params;

    const courseInfo = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        teacher: { select: { name: true } },
        students: {
          select: { id: true, studentCode: true, name: true }
        }
      }
    });

    if (!courseInfo) {
      return NextResponse.json({ success: false, error: "ไม่พบรายวิชานี้ในระบบ" }, { status: 404 });
    }

    const allStudents = await prisma.student.findMany({
      select: { id: true, studentCode: true, name: true },
      orderBy: { studentCode: 'asc' }
    });

    return NextResponse.json({
      success: true,
      data: { course: courseInfo, allStudents }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

//  แอดมินเพิ่มนักศึกษาเข้าไปในรายวิชานี้ 
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    //  แกะห่อ params ด้วย await
    const { id: courseId } = await params;
    const { studentId } = await req.json();

    if (!studentId) {
      return NextResponse.json({ success: false, error: "กรุณาระบุนักศึกษา" }, { status: 400 });
    }

    await prisma.course.update({
      where: { id: courseId },
      data: {
        students: {
          connect: { id: parseInt(studentId) }
        }
      }
    });

    return NextResponse.json({ success: true, message: "เพิ่มนักศึกษาเข้าชั้นเรียนสำเร็จ" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

//  [DELETE] แอดมินคัดนักศึกษาออกจากรายวิชานี้ (Disconnect Relation)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    //  แกะห่อ params ด้วย await
    const { id: courseId } = await params;
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ success: false, error: "กรุณาระบุนักศึกษาที่จะลบ" }, { status: 400 });
    }

    await prisma.course.update({
      where: { id: courseId },
      data: {
        students: {
          disconnect: { id: parseInt(studentId) }
        }
      }
    });

    return NextResponse.json({ success: true, message: "คัดนักศึกษาออกจากรายวิชาสำเร็จ" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

//   [PUT] แอดมินแก้ไขรหัสวิชาและชื่อรายวิชา (ระบบแยกส่วนจากหน้าอาจารย์)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    //  แกะห่อ params ด้วย await ตามกฎ Next.js เวอร์ชันใหม่เช่นกัน
    const { id: courseId } = await params;
    const { courseCode, courseName } = await req.json();

    if (!courseCode || !courseName) {
      return NextResponse.json({ success: false, error: "กรุณากรอกข้อมูลให้ครบถ้วนครับบอส" }, { status: 400 });
    }

    // ทำการอัปเดตข้อมูลแก้ไขลง Database ผ่าน Prisma
    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: {
        courseCode: courseCode,
        courseName: courseName,
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "อัปเดตข้อมูลรายวิชาสำเร็จแล้วครับบอส", 
      data: updatedCourse 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}