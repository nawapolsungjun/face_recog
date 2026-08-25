import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'กรุณาแนบไฟล์ Excel หรือ CSV' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลในไฟล์' }, { status: 400 });
    }

    let importedCount = 0;
    let skippedCount = 0;

    for (const row of rows) {
      const studentCode = String(
        row.studentCode || row['รหัสนักศึกษา'] || row['รหัสประจำตัว'] || row['student_code'] || row['รหัส'] || ''
      ).trim();

      const firstName = String(
        row.firstName || row['ชื่อ'] || row['first_name'] || ''
      ).trim();

      const lastName = String(
        row.lastName || row['นามสกุล'] || row['last_name'] || ''
      ).trim();

      let email = String(
        row.email || row['อีเมล'] || row['อีเมลระบบ'] || ''
      ).trim();

      let rawPassword = String(
        row.password || row['รหัสผ่าน'] || ''
      ).trim();

      if (!studentCode || !firstName || !lastName) {
        skippedCount++;
        continue;
      }

      // ถ้าไม่มีอีเมลในไฟล์ ให้สร้าง default เป็น รหัสนักศึกษา@student.com
      if (!email) {
        email = `${studentCode.replace(/[^a-zA-Z0-9]/g, '')}@student.com`;
      }

      // รหัสผ่านเริ่มต้น: ถ้าไม่ระบุ ให้ใช้ studentCode
      if (!rawPassword) {
        rawPassword = studentCode;
      }

      const hashedPassword = await bcrypt.hash(rawPassword, 10);

      // 1. ตรวจสอบว่ามี User หรือยัง
      let existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ username: studentCode }, { email: email }],
        },
      });

      if (!existingUser) {
        existingUser = await prisma.user.create({
          data: {
            username: studentCode,
            email: email,
            password: hashedPassword,
            role: 'STUDENT',
          },
        });
      }

      // 2. สร้างหรืออัปเดตข้อมูล Student (แนบ password เข้าไปด้วย)
      const existingStudent = await prisma.student.findUnique({
        where: { studentCode },
      });

      if (!existingStudent) {
        await prisma.student.create({
          data: {
            studentCode,
            firstName,
            lastName,
            password: hashedPassword,
            userId: existingUser.id,
          },
        });
      } else {
        await prisma.student.update({
          where: { id: existingStudent.id },
          data: {
            firstName: firstName || existingStudent.firstName,
            lastName: lastName || existingStudent.lastName,
            password: existingStudent.password || hashedPassword,
            userId: existingStudent.userId || existingUser.id,
          },
        });
      }

      importedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `นำเข้านักศึกษาสำเร็จ ${importedCount} คน (ข้ามแถวที่ข้อมูลไม่ครบ ${skippedCount} คน)`,
    });
  } catch (error: any) {
    console.error('Import Users Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล' }, { status: 500 });
  }
}