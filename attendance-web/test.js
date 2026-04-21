const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function test() {
  try {
    const data = await prisma.attendance.findMany()
    console.log("✅ Database OK, Data count:", data.length)
  } catch (e) {
    console.error("❌ Database still broken:", e.message)
  }
}
test()