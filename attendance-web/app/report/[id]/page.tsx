'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function DailyReportPage() {
  const params = useParams();
  const courseId = params.id as string;

  const [report, setReport] = useState<any>({
    success: false,
    data: [],
    summary: { total: 0, present: 0, late: 0, absent: 0, leave: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState('ทั้งหมด');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchReport = async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/report/${courseId}?date=${date}`);
      const json = await res.json();

      if (json.success) {
        setReport(json);
      } else {
        setError(json.error || 'ไม่พบข้อมูล');
        setReport({ success: false, data: [], summary: { total: 0, present: 0, late: 0, absent: 0, leave: 0 } });
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) {
      fetchReport(selectedDate);
    }
  }, [courseId, selectedDate]);

  // 🚀 ฟังก์ชันเปลี่ยนสถานะโดยตรงจากหน้า Report
  const handleStatusChange = async (studentId: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/attendance/direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          courseId,
          status: newStatus,
          date: selectedDate // บันทึกลงวันที่ที่กำลังเปิดดูอยู่
        })
      });

      if (res.ok) {
        // เมื่อแก้สำเร็จ ให้ดึงข้อมูลใหม่เพื่ออัปเดตตัวเลข Summary ด้านบน
        fetchReport(selectedDate);
      } else {
        alert('ไม่สามารถอัปเดตสถานะได้');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const filteredData = report.data.filter((item: any) => {
    if (filter === 'ทั้งหมด') return true;
    return item.status === filter;
  });

  if (loading && !report.data.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="p-10 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest">
          ⏳ Generating Report...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans">
      <div className="max-w-5xl mx-auto">

        <Link href="/teacher/dashboard" className="text-blue-600 font-black inline-flex items-center gap-2 mb-8 hover:translate-x-[-4px] transition-all text-xs uppercase tracking-widest">
          ← Back to Dashboard
        </Link>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">Attendance Report</h1>
            <div className="mt-3 flex items-center gap-3">
              <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter">Course ID: {courseId}</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-white border border-slate-200 text-slate-800 text-xs rounded-xl p-2 shadow-sm outline-none font-bold focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 w-full lg:w-auto">
            {[
              { label: 'ทั้งหมด', count: report.summary?.total || 0, color: 'text-slate-400' },
              { label: 'มาเรียน', count: report.summary?.present || 0, color: 'text-green-500' },
              { label: 'มาสาย', count: report.summary?.late || 0, color: 'text-amber-500' },
              { label: 'ลา', count: report.summary?.leave || 0, color: 'text-blue-500' },
              { label: 'ขาดเรียน', count: report.summary?.absent || 0, color: 'text-red-500' }
            ].map((stat, i) => (
              <div key={i} className="bg-white p-4 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 min-w-[120px] text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <p className={`text-3xl font-black ${stat.color}`}>{stat.count}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
          {['ทั้งหมด', 'มาเรียน', 'มาสาย', 'ลา', 'ขาดเรียน'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${filter === f
                  ? 'bg-slate-900 text-white shadow-lg scale-105'
                  : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'
                }`}
            >
              {f}
            </button>
          ))}
        </div>

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
              {filteredData.length > 0 ? (
                filteredData.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-6 text-sm font-bold text-slate-400">
                      {item.time ? new Date(item.time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '--:--'} น.
                    </td>
                    <td className="p-6 text-sm font-black text-blue-600 font-mono tracking-tighter">
                      {item.studentCode}
                    </td>
                    <td className="p-6 text-sm font-black text-slate-700">
                      {item.name}
                    </td>
                    <td className="p-6 text-center">
                      {/* 🚀 เปลี่ยนจาก span เป็น select เหมือนหน้าจัดการนักศึกษา */}
                      <select
                        value={item.status}
                        onChange={(e) => handleStatusChange(item.id, e.target.value)}
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
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-20 text-center">
                    <p className="text-slate-300 font-black uppercase tracking-widest text-xs">No records found for "{filter}"</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-10 flex justify-end">
          <button
            onClick={() => window.print()}
            className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-black transition-all active:scale-95"
          >
            🖨️ Export PDF Report
          </button>
        </div>
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @media print {
          body { background: white; }
          .bg-slate-50, .max-w-5xl { padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
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