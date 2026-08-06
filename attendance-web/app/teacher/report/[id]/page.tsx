'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function AttendanceReportPage() {
  const params = useParams();
  const courseId = params.id as string;

  // --- States หลัก ---
  const [reportMode, setReportMode] = useState<'daily' | 'summary'>('daily');
  const [dailyReport, setDailyReport] = useState<any>({
    success: false,
    data: [],
    summary: { total: 0, present: 0, late: 0, absent: 0, leave: 0 }
  });
  const [summaryReport, setSummaryReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- States สำหรับโหมดประจำวัน ---
  const [filter, setFilter] = useState('ทั้งหมด');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // 1. ดึงข้อมูลรายงานประจำวัน (Daily)
  const fetchDailyReport = async (date: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/report/${courseId}?date=${date}`);
      const json = await res.json();
      if (json.success) {
        setDailyReport(json);
      } else {
        setDailyReport({ success: false, data: [], summary: { total: 0, present: 0, late: 0, absent: 0, leave: 0 } });
      }
    } catch (err) {
      console.error("Fetch daily report error:", err);
    } finally {
      setLoading(false);
    }
  };

  // 2. ดึงข้อมูลสรุปภาพรวมทุกคาบ (Overall Summary Matrix)
  const fetchSummaryReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/report/${courseId}?mode=summary`);
      const json = await res.json();
      if (json.success) {
        setSummaryReport(json.data || []);
      }
    } catch (err) {
      console.error("Fetch summary report error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) {
      if (reportMode === 'daily') {
        fetchDailyReport(selectedDate);
      } else {
        fetchSummaryReport();
      }
    }
  }, [courseId, selectedDate, reportMode]);

  // แก้ไขสถานะการเช็คชื่อ
  const handleStatusChange = async (studentId: number, newStatus: string, currentTimeStr?: string) => {
    try {
      const res = await fetch(`/api/attendance/direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          courseId,
          status: newStatus,
          date: selectedDate,
          time: currentTimeStr
        })
      });

      if (res.ok) {
        fetchDailyReport(selectedDate);
      } else {
        alert('ไม่สามารถอัปเดตสถานะได้');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  // แก้ไขเวลาเช็คชื่อแบบ Manual
  const handleTimeChange = async (studentId: number, currentStatus: string, newTimeStr: string) => {
    try {
      const res = await fetch(`/api/attendance/direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          courseId,
          status: currentStatus,
          date: selectedDate,
          time: newTimeStr
        })
      });

      if (res.ok) {
        fetchDailyReport(selectedDate);
      } else {
        alert('ไม่สามารถอัปเดตเวลาได้');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const filteredDailyData = dailyReport.data.filter((item: any) => {
    if (filter === 'ทั้งหมด') return true;
    return item.status === filter;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto">

        {/* แถบนกดย้อนกลับ + ลิงก์ประวัติ */}
        <div className="flex justify-between items-center mb-8">
          <Link href="/teacher/dashboard" className="text-blue-600 font-black inline-flex items-center gap-2 hover:translate-x-[-4px] transition-all text-xs uppercase tracking-widest">
            ← Back to Dashboard
          </Link>

          <Link href={`/teacher/course/${courseId}/history`} className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-sm">
            ดูประวัติรูปถ่ายตามรอบ
          </Link>
        </div>

        {/* ส่วนหัว + ปุ่มสลับโหมดรายงาน (Daily / Overall / History) */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">รายงานการเข้าเรียน</h1>
            <p className="text-slate-400 font-medium text-xs mt-1">รายงานสรุปการเข้าเรียน รายวิชา {courseId}</p>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {/* Tab สลับระหว่าง "รายวัน" กับ "สรุปทุกคาบ" */}
            <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
              <button
                onClick={() => setReportMode('daily')}
                className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
                  reportMode === 'daily' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                รายงานประจำวัน
              </button>
              <button
                onClick={() => setReportMode('summary')}
                className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
                  reportMode === 'summary' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                สรุปรวมทุกคาบ (ทั้งเทอม)
              </button>
            </div>

            {/* ปุ่มทางลัดเข้าหน้าประวัติการเช็คชื่อตามรอบ */}
            <Link
              href={`/teacher/course/${courseId}/history`}
              className="bg-slate-900 hover:bg-black text-white px-5 py-3 rounded-2xl text-xs font-black shadow-md transition-all active:scale-95 whitespace-nowrap"
            >
              ประวัติรูปถ่ายตามรอบ
            </Link>
          </div>
        </div>

        {/* ==================== 1. โหมดรายงานประจำวัน (DAILY MODE) ==================== */}
        {reportMode === 'daily' && (
          <div className="animate-in fade-in duration-300">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">เลือกวันที่:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 shadow-sm outline-none font-bold focus:ring-2 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {/* การ์ดนับสถิติด้านบน */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 w-full lg:w-auto">
                {[
                  { label: 'ทั้งหมด', count: dailyReport.summary?.total || 0, color: 'text-slate-400' },
                  { label: 'มาเรียน', count: dailyReport.summary?.present || 0, color: 'text-green-500' },
                  { label: 'มาสาย', count: dailyReport.summary?.late || 0, color: 'text-amber-500' },
                  { label: 'ลา', count: dailyReport.summary?.leave || 0, color: 'text-blue-500' },
                  { label: 'ขาดเรียน', count: dailyReport.summary?.absent || 0, color: 'text-red-500' }
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-4 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 min-w-[100px] text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                    <p className={`text-2xl font-black ${stat.color}`}>{stat.count}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* แท็บกรองสถานะ */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
              {['ทั้งหมด', 'มาเรียน', 'มาสาย', 'ลา', 'ขาดเรียน'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                    filter === f ? 'bg-slate-900 text-white shadow-lg scale-105' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* ตารางแสดงข้อมูลรายวัน */}
            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 overflow-hidden border border-slate-100">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Check-in Time</th>
                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Student ID</th>
                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Full Name</th>
                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={4} className="p-14 text-center font-bold text-slate-400 animate-pulse">กำลังโหลดรายงานประจำวัน...</td></tr>
                  ) : filteredDailyData.length > 0 ? (
                    filteredDailyData.map((item: any) => {
                      const timeString = item.time 
                        ? new Date(item.time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false }) 
                        : '';

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="p-6 text-sm font-bold text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="time"
                                value={timeString}
                                onChange={(e) => handleTimeChange(item.id, item.status, e.target.value)}
                                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg p-1.5 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                              />
                              <span className="text-xs text-slate-400 font-medium">น.</span>
                            </div>
                          </td>
                          <td className="p-6 text-sm font-black text-blue-600 font-mono tracking-tighter">
                            {item.studentCode}
                          </td>
                          <td className="p-6 text-sm font-black text-slate-700">
                            {item.name}
                          </td>
                          <td className="p-6 text-center">
                            <select
                              value={item.status}
                              onChange={(e) => handleStatusChange(item.id, e.target.value, timeString)}
                              className={`text-[10px] font-black px-4 py-2 rounded-xl border-none outline-none shadow-sm cursor-pointer transition-all ring-1 ${
                                item.status === 'มาเรียน' ? 'bg-green-50 text-green-600 ring-green-100' :
                                item.status === 'มาสาย' ? 'bg-yellow-50 text-yellow-600 ring-yellow-100' :
                                item.status === 'ลา' ? 'bg-blue-50 text-blue-600 ring-blue-100' :
                                'bg-red-50 text-red-600 ring-red-100'
                              }`}
                            >
                              <option value="มาเรียน">มาเรียน</option>
                              <option value="มาสาย">มาสาย</option>
                              <option value="ลา">ลา</option>
                              <option value="ขาดเรียน">ขาดเรียน</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-20 text-center">
                        <p className="text-slate-300 font-black uppercase tracking-widest text-xs">No records found for "{filter}" in selected date</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== 2. โหมดสรุปภาพรวมทุกคาบ (OVERALL SUMMARY MODE) ==================== */}
        {reportMode === 'summary' && (
          <div className="animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 overflow-hidden border border-slate-100">
              <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-black">ตารางสรุปการเข้าเรียนภาพรวมทุกคาบ</h2>
                  <p className="text-slate-400 text-xs mt-0.5">รวมสถิตินักศึกษาทุกคนตั้งแต่วันเปิดรายวิชา</p>
                </div>
                <span className="text-xs font-mono bg-blue-600 text-white px-3 py-1.5 rounded-xl font-bold">
                  นักศึกษาทั้งหมด {summaryReport.length} คน
                </span>
              </div>

              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">รหัสนักศึกษา</th>
                    <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">ชื่อ-นามสกุล</th>
                    <th className="p-5 text-[10px] font-black text-green-600 uppercase tracking-widest text-center">มาเรียน</th>
                    <th className="p-5 text-[10px] font-black text-amber-500 uppercase tracking-widest text-center">มาสาย</th>
                    <th className="p-5 text-[10px] font-black text-blue-500 uppercase tracking-widest text-center">ลา</th>
                    <th className="p-5 text-[10px] font-black text-red-500 uppercase tracking-widest text-center">ขาดเรียน</th>
                    <th className="p-5 text-[10px] font-black text-slate-700 uppercase tracking-widest text-center">อัตราเข้าเรียน (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={7} className="p-14 text-center font-bold text-slate-400 animate-pulse">กำลังคำนวณสถิติภาพรวมทุกคาบ...</td></tr>
                  ) : summaryReport.length > 0 ? (
                    summaryReport.map((student: any) => {
                      const totalChecked = (student.present || 0) + (student.late || 0) + (student.leave || 0) + (student.absent || 0);
                      const attendPercentage = totalChecked > 0 
                        ? Math.round((((student.present || 0) + (student.late || 0)) / totalChecked) * 100) 
                        : 0;

                      return (
                        <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-5 font-mono text-sm font-bold text-blue-600">{student.studentCode}</td>
                          <td className="p-5 font-black text-slate-700 text-sm">{student.name}</td>
                          <td className="p-5 text-center font-black text-green-600 bg-green-50/30">{student.present || 0}</td>
                          <td className="p-5 text-center font-black text-amber-500 bg-amber-50/30">{student.late || 0}</td>
                          <td className="p-5 text-center font-black text-blue-500 bg-blue-50/30">{student.leave || 0}</td>
                          <td className="p-5 text-center font-black text-red-500 bg-red-50/30">{student.absent || 0}</td>
                          <td className="p-5 text-center">
                            <span className={`px-3 py-1.5 rounded-xl font-mono font-black text-xs ${
                              attendPercentage >= 80 ? 'bg-green-100 text-green-700' :
                              attendPercentage >= 50 ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {attendPercentage}%
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-14 text-center text-slate-400 font-bold">
                        ไม่พบข้อมูลสถิติการเข้าเรียนในรายวิชานี้
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ปุ่ม Export PDF */}
        <div className="mt-10 flex justify-end">
          <button
            onClick={() => window.print()}
            className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-black transition-all active:scale-95"
          >
            Export PDF Report
          </button>
        </div>
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @media print {
          body { background: white; }
          .bg-slate-50, .max-w-6xl { padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
          button, Link, input, .no-scrollbar, select { -webkit-appearance: none; border: none; background: transparent; }
          button, Link, input, .no-scrollbar { display: none !important; }
          .shadow-2xl, .shadow-xl { box-shadow: none !important; border: 1px solid #eee !important; }
          .rounded-[2.5rem] { border-radius: 1rem !important; }
          td, th { padding: 12px !important; }
        }
      `}</style>
    </div>
  );
}