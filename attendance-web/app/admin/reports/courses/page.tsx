'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminCoursesReportPage() {
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const getAuthToken = () => localStorage.getItem('admin_token') || localStorage.getItem('token');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const token = getAuthToken();
    try {
      const res = await fetch('/api/admin/reports/courses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setReports(json.data);
      } else {
        setReports([]);
      }
    } catch (err) {
      console.error('Fetch admin reports error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f7f4] font-sans text-slate-800">
      {/* Header */}
      <header className="bg-[#0f766e] text-white pt-8 pb-6 px-4 text-center shadow-sm relative print:hidden">
        <div className="absolute top-6 left-6">
          <Link
            href="/admin/dashboard"
            className="text-emerald-100 hover:text-white font-bold inline-flex items-center gap-2 text-xs uppercase tracking-wider transition-all"
          >
            ← DASHBOARD / รายวิชา
          </Link>
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1">
          ระบบเช็คชื่อนักเรียน
        </h1>
        <p className="text-emerald-100 font-medium text-xs md:text-sm">
          ระบบตรวจสอบรายชื่อเข้าชั้นเรียน สาขาวิชานวัตกรรมระบบสารสนเทศ
        </p>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8">
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200/80 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-800">
              สรุปการเข้าเรียนแยกตามรายวิชา
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              ภาพรวมสถิติการเช็คชื่อสะสมของแต่ละวิชาในระบบ (คลิกที่รายวิชาเพื่อดูรายงานอย่างละเอียด)
            </p>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer print:hidden"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            พิมพ์รายงาน
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/60">
                  <th className="p-4 text-xs font-bold text-slate-600 w-44">รหัสวิชา / ชื่อวิชา</th>
                  <th className="p-4 text-xs font-bold text-slate-600">อาจารย์ผู้สอน</th>
                  <th className="p-4 text-xs font-bold text-slate-600 text-center w-24">นศ. (คน)</th>
                  <th className="p-4 text-xs font-bold text-slate-600 text-center">สรุป (มา / สาย / ลา / ขาด)</th>
                  <th className="p-4 text-xs font-bold text-slate-600 text-center w-36">การเข้าเรียน (%)</th>
                  <th className="p-4 text-xs font-bold text-slate-600 text-center w-28 print:hidden">การกระทำ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-14 text-center font-bold text-slate-400 animate-pulse text-xs">
                      กำลังโหลดข้อมูลสรุปรายวิชา...
                    </td>
                  </tr>
                ) : reports.length > 0 ? (
                  reports.map((item) => (
                    <tr 
                      key={item.id} 
                      onClick={() => router.push(`/admin/reports/courses/${item.id}`)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      title="คลิกเพื่อดูรายละเอียดการเช็คชื่อของวิชานี้"
                    >
                      <td className="p-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono mb-1">
                          {item.courseCode}
                        </span>
                        <div className="text-xs font-bold text-slate-800">{item.courseName}</div>
                      </td>

                      <td className="p-4 text-xs font-bold text-slate-700">
                        {item.teacherName}
                      </td>

                      <td className="p-4 text-center font-bold font-mono text-emerald-700 text-xs">
                        {item.totalStudents}
                      </td>

                      <td className="p-4">
                        <div className="flex justify-center items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-xs font-bold">
                            มา {item.summary.present}
                          </span>
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg text-xs font-bold">
                            สาย {item.summary.late}
                          </span>
                          <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-xs font-bold">
                            ลา {item.summary.leave}
                          </span>
                          <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-100 rounded-lg text-xs font-bold">
                            ขาด {item.summary.absent}
                          </span>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col items-center">
                          <span className={`text-xs font-mono font-bold ${item.percentage >= 80 ? 'text-emerald-700' : item.percentage >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                            {item.percentage}%
                          </span>
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${item.percentage >= 80 ? 'bg-emerald-500' : item.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${item.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 text-center print:hidden" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/admin/reports/courses/${item.id}`}
                          className="inline-flex items-center px-3 py-1.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition-all"
                        >
                          ดูรายงาน →
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-16 text-center text-slate-400 font-bold text-xs">
                      ไม่พบข้อมูลรายวิชาในระบบ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

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