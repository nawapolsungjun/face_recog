const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('⏳ กำลังใช้คำสั่ง Raw SQL เพื่อล้างตาราง Attendance ที่เสียอยู่...');
  
  try {
    // ใช้ $executeRawUnsafe เพื่อสั่งลบที่ตัว Database โดยตรง ไม่ผ่านตัวกรอง Prisma
    // วิธีนี้จะลบข้อมูลทิ้งได้แม้ข้อมูลข้างในจะพังขนาดไหนก็ตาม
    await prisma.$executeRawUnsafe(`DELETE FROM Attendance;`);
    
    // ล้างตัวนับ ID ให้กลับไปเริ่มที่ 1 ใหม่
    await prisma.$executeRawUnsafe(`DELETE FROM sqlite_sequence WHERE name='Attendance';`);
    
    console.log('✅ ล้างข้อมูลขยะในตาราง Attendance สำเร็จ 100%!');
  } catch (err) {
    console.error('❌ เกิดข้อผิดพลาดตอนลบ:', err.message);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect())