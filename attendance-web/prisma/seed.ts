import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('admin1234', 10) // 🚀 รหัสผ่านคือ admin1234
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      password: hashedPassword,
      role: 'ADMIN',
      admin: {
        create: {
          name: 'ผู้ดูแลระบบสูงสุด',
        }
      }
    },
  })

  console.log(' สร้างบัญชี Admin คนแรกเรียบร้อย: admin@test.com / admin1234')
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect())