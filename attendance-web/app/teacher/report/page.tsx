'use client';
import { useState, useEffect } from 'react';

export default function ReportPage() {
  const [report, setReport] = useState({ present: [], absent: [], totalStudents: 0 });

  useEffect(() => {
    // ฟังก์ชันดึงข้อมูลสรุป
    const fetchReport = async () => {
      const res = await fetch('/api/get-daily-report'); // บอสต้องทำ Endpoint นี้เพิ่มใน Python หรือใช้ Prisma ก็ได้
      const data = await res.json();
      setReport(data);
    };
    fetchReport();
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">📊 รายงานการเข้าเรียนวันนี้</h1>
      
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-green-100 p-6 rounded-2xl text-center">
          <p className="text-green-600 text-lg">มาเรียน</p>
          <p className="text-4xl font-bold text-green-700">{report.present.length} คน</p>
        </div>
        <div className="bg-red-100 p-6 rounded-2xl text-center">
          <p className="text-red-600 text-lg">ขาดเรียน</p>
          <p className="text-4xl font-bold text-red-700">{report.absent.length} คน</p>
        </div>
      </div>

      <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-4">ชื่อนักศึกษา</th>
              <th className="p-4">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {report.present.map(name => (
              <tr key={name} className="border-t">
                <td className="p-4">{name}</td>
                <td className="p-4 text-green-600 font-bold">✅ มาเรียน</td>
              </tr>
            ))}
            {report.absent.map(name => (
              <tr key={name} className="border-t bg-red-50">
                <td className="p-4">{name}</td>
                <td className="p-4 text-red-600 font-bold">❌ ขาดเรียน</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}