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
    <div className="min-h-screen flex flex-col bg-[#f0f7f4] font-sans text-slate-800">
      
      {/* 1. Header ด้านบนตาม Style Canva (หัวข้อตรงกลาง 100%) */}
      <header className="bg-[#0f766e] text-white pt-8 pb-6 px-4 text-center shadow-sm relative print:hidden">
        <div className="absolute top-6 left-6 flex items-center gap-3">
          <Link
            href="/admin/dashboard"
            className="text-emerald-100 hover:text-white font-bold inline-flex items-center gap-1 text-xs uppercase tracking-wider transition-all"
          >
            ← Dashboard
          </Link>
          <span className="text-emerald-300/60 text-xs">/</span>
          <Link
            href="/admin/courses"
            className="text-emerald-100 hover:text-white font-bold inline-flex items-center gap-1 text-xs uppercase tracking-wider transition-all"
          >
            รายวิชา
          </Link>
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1">
          ระบบเช็คชื่อนักเรียน
        </h1>
        <p className="text-emerald-100 font-medium text-xs md:text-sm">
          ระบบตรวจสอบรายชื่อเข้าชั้นเรียน สาขาวิชานวัตกรรมระบบสารสนเทศ
        </p>
      </header>

      {/* 3. Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8">
        
        {/* การ์ดส่วนหัว */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800">สรุปการเข้าเรียนแยกตามรายวิชา</h2>
            <p className="text-slate-500 text-xs font-medium mt-1">ภาพรวมสถิติการเช็คชื่อสะสมของแต่ละวิชาในระบบ</p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={() => window.print()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              พิมพ์รายงาน
            </button>
          </div>
        </div>

        {/* ตารางแสดงผลรายงาน */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/60">
                  <th className="p-4 text-xs font-bold text-slate-600">รหัสวิชา / ชื่อวิชา</th>
                  <th className="p-4 text-xs font-bold text-slate-600">อาจารย์ผู้สอน</th>
                  <th className="p-4 text-xs font-bold text-slate-600 text-center w-24">นศ. (คน)</th>
                  <th className="p-4 text-xs font-bold text-slate-600 text-center">สรุป (มา / สาย / ลา / ขาด)</th>
                  <th className="p-4 text-xs font-bold text-slate-600 text-center w-36">การเข้าเรียน (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!loading && reports.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-4">
                      <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
                        {item.courseCode}
                      </span>
                      <div className="font-bold text-slate-800 text-xs md:text-sm mt-1.5">{item.courseName}</div>
                    </td>
                    <td className="p-4 text-xs font-medium text-slate-700">{item.teacherName}</td>
                    <td className="p-4 text-center font-bold text-emerald-700 text-xs md:text-sm">{item.studentCount}</td>
                    <td className="p-4">
                      <div className="flex justify-center items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md text-[11px] font-bold">มา {item.summary.present}</span>
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-md text-[11px] font-bold">สาย {item.summary.late}</span>
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-md text-[11px] font-bold">ลา {item.summary.leave}</span>
                        <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-100 rounded-md text-[11px] font-bold">ขาด {item.summary.absent}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col items-center">
                        <span className={`text-xs font-bold font-mono ${item.percentage < 70 ? 'text-red-600' : 'text-emerald-700'}`}>
                          {item.percentage}%
                        </span>
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                          <div 
                            className={`h-full ${item.percentage < 70 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                            style={{ width: `${item.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}

                {loading && (
                  <tr>
                    <td colSpan={5} className="p-16 text-center font-bold text-slate-400 text-xs animate-pulse">
                      กำลังประมวลผลข้อมูลรายงาน...
                    </td>
                  </tr>
                )}

                {!loading && reports.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-16 text-center font-bold text-slate-400 text-xs">
                      ยังไม่มีข้อมูลรายงานในระบบ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* 4. Footer ด้านล่าง */}
      <footer className="bg-white text-[#0f766e] py-4 px-4 text-center text-xs font-medium border-t border-slate-100 mt-auto print:hidden">
        ระบบตรวจสอบรายชื่อเข้าชั้นเรียนสาขาวิชานวัตกรรมระบบสารสนเทศ
      </footer>

      <style jsx global>{`
        @media print {
          body { background: white !important; }
          header, nav, footer, .print\\:hidden { display: none !important; }
          main { max-width: 100% !important; padding: 0 !important; }
          .bg-white { box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
          td, th { padding: 8px 12px !important; }
        }
      `}</style>

    </div>
  );
}