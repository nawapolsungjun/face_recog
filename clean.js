const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('⏳ กำลังล้างข้อมูลที่เสียในตาราง Attendance...')
  
  // บังคับลบข้อมูลทั้งหมดในตาราง Attendance เพื่อเคลียร์ค่าที่อ่านไม่ออก
  const deleted = await prisma.attendance.deleteMany({})
  
  console.log(`✅ ลบข้อมูลขยะออกไปทั้งหมด ${deleted.count} รายการ`)
  console.log('🚀 ตอนนี้บอสสามารถเปิด Prisma Studio และรันรายงานได้ตามปกติแล้วครับ!')
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect())