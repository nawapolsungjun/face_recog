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
        if (json.success && json.data) {
          setReports(json.data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Fetch error:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">
        <Link href="/admin/courses" className="text-blue-600 font-bold text-sm mb-6 inline-block hover:translate-x-[-4px] transition-all">
          ← กลับหน้ารายวิชา
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">สรุปการเข้าเรียนแยกตามรายวิชา</h1>
          <p className="text-slate-500 font-medium mt-1">ภาพรวมสถิติการเช็คชื่อสะสมของแต่ละวิชาในระบบ</p>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100">
          <table className="w-full text-left border-collapse">
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
                <tr key={item.id} className="hover:bg-blue-50/30 transition-all">
                  <td className="p-6">
                    <span className="text-xs font-black text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-xl font-mono">
                      {item.courseCode}
                    </span>
                    <div className="font-black text-slate-700 text-lg mt-1">{item.courseName}</div>
                  </td>
                  <td className="p-6 font-bold text-slate-600">{item.teacherName}</td>
                  <td className="p-6 text-center font-black text-blue-600 text-base">{item.studentCount}</td>
                  <td className="p-6">
                    <div className="flex justify-center gap-2">
                      <span className="px-2.5 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-black">มา {item.summary.present}</span>
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-black">สาย {item.summary.late}</span>
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-black">ลา {item.summary.leave}</span>
                      <span className="px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-black">ขาด {item.summary.absent}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-col items-center">
                      <span className={`text-base font-black ${item.percentage < 70 ? 'text-red-500' : 'text-green-600'}`}>
                        {item.percentage}%
                      </span>
                      <div className="w-24 h-2 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
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

          {loading && (
            <div className="p-20 text-center font-bold text-slate-300 animate-pulse">
              กำลังประมวลผลข้อมูลรายงาน...
            </div>
          )}

          {!loading && reports.length === 0 && (
            <div className="p-20 text-center font-bold text-slate-400">
              ยังไม่มีข้อมูลรายงานในระบบ
            </div>
          )}
        </div>
      </div>
    </div>
  );
}