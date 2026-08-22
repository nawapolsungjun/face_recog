// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@system.com';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin1234', 10);

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: adminEmail,
          username: 'superadmin',
          password: hashedPassword,
          role: 'ADMIN',
        },
      });

      await tx.admin.create({
        data: {
          userId: user.id,
          firstName: 'ผู้ดูแล',
          lastName: 'ระบบหลัก',
        },
      });
    });

    console.log('สร้างบัญชี Admin เริ่มต้นเรียบร้อยแล้ว: email = admin@system.com, password = admin1234');
  } else {
    console.log('มีบัญชี Admin อยู่ในระบบแล้ว');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });