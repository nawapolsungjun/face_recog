import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

export function verifyToken(token: string) {
  try {
    // 🚀 ถอดรหัส Token เพื่อเอาข้อมูล user id และ role ออกมา
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded as { id: string; role: string; email: string };
  } catch (error) {
    console.error("JWT Verify Error:", error);
    return null;
  }
}

// แถมฟังก์ชันสร้าง Token ให้ด้วยครับบอส เผื่อต้องใช้ในหน้า Login API
export function generateToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}