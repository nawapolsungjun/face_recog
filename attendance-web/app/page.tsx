'use client';
import { useState } from 'react';

export default function AttendancePage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return alert('กรุณาเลือกรูปภาพก่อนครับ');

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      // 1. ส่งรูปไปให้ Python AI สแกน
      const response = await fetch('http://localhost:8000/api/scan-attendance', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setResult(data); // โชว์ชื่อบนหน้าจอ (ที่บอสทำได้แล้ว)

      // 2.  เพิ่มส่วนนี้: สั่งบันทึกลง Prisma ทันทีที่สแกนเจอคน
      if (data.present_students.length > 0) {
        // ในฟังก์ชัน handleUpload
        const saveResponse = await fetch('/api/attendance', { // Path นี้จะวิ่งไปหา app/api/attendance/route.ts
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentNames: data.present_students,
            courseId: 1
          }),
        });

        if (saveResponse.ok) {
          alert(' บันทึกเวลาเรียนลงฐานข้อมูลเรียบร้อย!');
        }
      }

    } catch (error) {
      console.error('Error:', error);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="p-10 font-sans">
      <h1 className="text-2xl font-bold mb-5">ระบบเช็คชื่อ Web-App</h1>

      <div className="border-2 border-dashed p-10 mb-5 text-center">
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="mb-4" />
        <br />
        <button
          onClick={handleUpload}
          className="bg-blue-600 text-white px-6 py-2 rounded disabled:bg-gray-400"
          disabled={loading}
        >
          {loading ? 'กำลังประมวลผล...' : ' สแกนใบหน้าเช็คชื่อ'}
        </button>
      </div>

      {result && (
        <div className="bg-green-100 p-5 rounded">
          <h2 className="font-bold">สรุปผลการสแกน:</h2>
          <p>พบใบหน้าทั้งหมด: {result.total_faces_detected} คน</p>
          <p>นักเรียนที่มาเรียน: {result.present_students.join(', ') || 'ไม่พบนักเรียนในฐานข้อมูล'}</p>
        </div>
      )}
    </div>
  );
}