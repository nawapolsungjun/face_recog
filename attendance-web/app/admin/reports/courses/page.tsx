'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CourseOverviewPrintForm from '@/app/components/reports/CourseAttendanceSheetPrintForm';

export const dynamic = 'force-dynamic';

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
      
      {/* 1. ส่วนหน้าจอปกติ (ซ่อนอัตโนมัติเมื่อสั่งพิมพ์) */}
      <div className="print:hidden flex flex-col flex-1">
        
        {/* Header */}
        <header className="bg-[#0f766e] text-white pt-8 pb-6 px-4 text-center shadow-sm relative">
          <div className="absolute top-6 left-6">
            <Link
              href="/admin/dashboard"
              className="text-emerald-100 hover:text-white font-bold inline-flex items-center gap-1.5 text-xs uppercase tracking-wider transition-all"
            >
              ← Dashboard
            </Link>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1">
            ระบบตรวจสอบรายชื่อด้วยการรู้จำใบหน้า
          </h1>
          <p className="text-emerald-100 font-medium text-xs md:text-sm">
            สาขาวิชานวัตกรรมระบบสารสนเทศ คณะบริหารธุรกิจ มหาวิทยาลัยเทคโนโลยีราชมงคลกรุงเทพ
          </p>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-[18px] font-bold text-slate-400">รายงานภาพรวม</span>
              <h2 className="text-2xl font-black text-slate-800">สรุปการเข้าเรียนแยกตามรายวิชา</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                ภาพรวมสถิติการเช็คชื่อสะสมของแต่ละวิชาในระบบ (คลิกที่รายวิชาเพื่อดูรายงานอย่างละเอียด)
              </p>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2m2 4h6a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2zm8-12V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v4h10z" />
              </svg>
              พิมพ์รายงาน (PDF)
            </button>
          </div>

          {/* ตารางแสดงรายงาน (แยกคอลัมน์รหัสวิชาและชื่อวิชา) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/60">
                    <th className="p-4 text-xs font-bold text-slate-600 w-14 text-center">ลำดับ</th>
                    <th className="p-4 text-xs font-bold text-slate-600 w-28 text-center">รหัสวิชา</th>
                    <th className="p-4 text-xs font-bold text-slate-600">ชื่อรายวิชา</th>
                    <th className="p-4 text-xs font-bold text-slate-600 w-48">อาจารย์ผู้สอน</th>
                    <th className="p-4 text-xs font-bold text-slate-600 text-center w-24">นศ. (คน)</th>
                    <th className="p-4 text-xs font-bold text-slate-600 text-center w-64">สรุปการเข้าเรียน</th>
                    <th className="p-4 text-xs font-bold text-slate-600 text-center w-32">การเข้าเรียน (%)</th>
                    <th className="p-4 text-xs font-bold text-slate-600 text-center w-28">การกระทำ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="p-14 text-center font-bold text-slate-400 animate-pulse text-xs">
                        กำลังโหลดข้อมูลสรุปรายวิชา...
                      </td>
                    </tr>
                  ) : reports.length > 0 ? (
                    reports.map((item, index) => (
                      <tr 
                        key={item.id || index} 
                        onClick={() => router.push(`/admin/reports/courses/${item.id}`)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                        title="คลิกเพื่อดูรายละเอียดการเช็คชื่อของวิชานี้"
                      >
                        {/* ลำดับ */}
                        <td className="p-4 text-center text-xs font-bold text-slate-400">
                          {index + 1}
                        </td>

                        {/* รหัสวิชา (แยกคอลัมน์เดี่ยว) */}
                        <td className="p-4 text-center">
                          <span className="p-4 font-bold text-slate-800 text-xs md:text-sm">
                            {item.courseCode}
                          </span>
                        </td>

                        {/* ชื่อรายวิชา (แยกคอลัมน์เดี่ยว) */}
                        <td className="p-4 font-bold text-slate-800 text-xs md:text-sm">
                          {item.courseName}
                        </td>

                        {/* อาจารย์ผู้สอน */}
                        <td className="p-4 text-xs font-medium text-slate-700">
                          {item.teacherName || '-'}
                        </td>

                        {/* จำนวนนักศึกษา */}
                        <td className="p-4 text-center font-bold font-mono text-emerald-700 text-xs">
                          {item.totalStudents || 0}
                        </td>

                        {/* สรุปผลสถานะ */}
                        <td className="p-4">
                          <div className="flex justify-center items-center gap-1 text-xs font-bold whitespace-nowrap">
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-100">
                              มา {item.summary?.present || 0}
                            </span>
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md border border-amber-100">
                              สาย {item.summary?.late || 0}
                            </span>
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-100">
                              ลา {item.summary?.leave || 0}
                            </span>
                            <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded-md border border-red-100">
                              ขาด {item.summary?.absent || 0}
                            </span>
                          </div>
                        </td>

                        {/* ร้อยละการเข้าเรียน */}
                        <td className="p-4">
                          <div className="flex flex-col items-center">
                            <span className={`text-xs font-mono font-bold ${item.percentage >= 80 ? 'text-emerald-700' : item.percentage >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                              {item.percentage || 0}%
                            </span>
                            <div className="w-20 h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${item.percentage >= 80 ? 'bg-emerald-500' : item.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${item.percentage || 0}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>

                        {/* ปุ่มการกระทำ */}
                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <Link
                            href={`/admin/reports/courses/${item.id}`}
                            className="inline-flex items-center px-3 py-1.5 bg-slate-100 hover:bg-emerald-700 hover:text-white text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all"
                          >
                            ดูรายงาน
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-16 text-center text-slate-400 font-bold text-xs">
                        ไม่พบข้อมูลรายวิชาในระบบ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>

       <footer className="bg-[#0f766e] text-emerald-100 py-4 px-4 text-center text-xs font-medium md:text-sm">
        © 2026 ระบบตรวจสอบรายชื่อด้วยการรู้จำใบหน้า
        <p className="text-emerald-100 font-medium text-xs md:text-sm">
          สาขาวิชานวัตกรรมระบบสารสนเทศ คณะบริหารธุรกิจ มหาวิทยาลัยเทคโนโลยีราชมงคลกรุงเทพ
        </p>
      </footer>
      </div>

    </div>
  );
}