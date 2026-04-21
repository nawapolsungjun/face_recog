'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function CourseReportPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/reports/courses')
      .then(res => res.json())
      .then(json => {
        if (json.success) setReports(json.data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <Link href="/admin/dashboard" className="text-blue-600 font-bold text-sm mb-6 inline-block">
          ← กลับหน้า Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-black text-slate-800">สรุปการเข้าเรียนแยกตามรายวิชา</h1>
          <p className="text-slate-500 font-medium">ภาพรวมสถิติการเช็คชื่อสะสมของแต่ละวิชาในระบบ</p>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">รหัสวิชา / ชื่อวิชา</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">อาจารย์ผู้สอน</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">นศ. (คน)</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">สรุป (มา/สาย/ลา/ขาด)</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">การเข้าเรียน (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {!loading && reports.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-all">
                  <td className="p-6">
                    <div className="font-black text-slate-700">{item.courseCode}</div>
                    <div className="text-sm text-slate-400 font-medium">{item.courseName}</div>
                  </td>
                  <td className="p-6 font-bold text-slate-600">{item.teacherName}</td>
                  <td className="p-6 text-center font-black text-blue-600">{item.studentCount}</td>
                  <td className="p-6">
                    <div className="flex justify-center gap-2">
                      <span className="px-2 py-1 bg-green-50 text-green-600 rounded-lg text-[10px] font-black">มา {item.summary.present}</span>
                      <span className="px-2 py-1 bg-yellow-50 text-yellow-600 rounded-lg text-[10px] font-black">สาย {item.summary.late}</span>
                      <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black">ลา {item.summary.leave}</span>
                      <span className="px-2 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-black">ขาด {item.summary.absent}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-col items-center">
                      <span className={`text-lg font-black ${item.percentage < 70 ? 'text-red-500' : 'text-green-600'}`}>
                        {item.percentage}%
                      </span>
                      <div className="w-20 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                        <div 
                          className={`h-full ${item.percentage < 70 ? 'bg-red-500' : 'bg-green-500'}`} 
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="p-20 text-center font-black text-slate-300 animate-pulse">กำลังประมวลผลข้อมูลรายงาน...</div>}
        </div>
      </div>
    </div>
  );
}