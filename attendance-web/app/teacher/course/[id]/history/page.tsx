'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function AttendanceHistoryPage() {
  const params = useParams();
  const courseId = params.id as string;

  const [courseInfo, setCourseInfo] = useState<{ courseName: string; courseCode: string } | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);

  const getAuthToken = () => localStorage.getItem('teacher_token') || localStorage.getItem('token');

  // ดึงข้อมูลชื่อวิชา
  const fetchCourseInfo = useCallback(async () => {
    const token = getAuthToken();
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success && json.data) {
        setCourseInfo({
          courseName: json.data.courseName,
          courseCode: json.data.courseCode
        });
      }
    } catch (err) {
      console.error('Fetch course info error:', err);
    }
  }, [courseId]);

  // ดึงประวัติการเช็คชื่อตามรอบ
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    const token = getAuthToken();
    try {
      let res = await fetch(`/api/teacher/course/${courseId}/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        // Fallback endpoint
        res = await fetch(`/api/attendance/history/${courseId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }

      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setSessions(json.data);
      } else {
        setSessions([]);
      }
    } catch (err) {
      console.error('Fetch history error:', err);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (courseId) {
      fetchCourseInfo();
      fetchHistory();
    }
  }, [courseId, fetchCourseInfo, fetchHistory]);

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f7f4] font-sans text-slate-800">

      {/* 1. Header ด้านบนตาม Style Canva (หัวข้อตรงกลาง 100%) */}
      <header className="bg-[#0f766e] text-white pt-8 pb-6 px-4 text-center shadow-sm relative print:hidden">
        <div className="absolute top-6 left-6">
          <Link
            href="/teacher/dashboard"
            className="text-emerald-100 hover:text-white font-bold inline-flex items-center gap-2 text-xs uppercase tracking-wider transition-all"
          >
            ← Back to Dashboard
          </Link>
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1">
          ระบบตรวจสอบรายชื่อด้วยการรู้จำใบหน้า
        </h1>
        <p className="text-emerald-100 font-medium text-xs md:text-sm">
          สาขาวิชานวัตกรรมระบบสารสนเทศ คณะบริหารธุรกิจ มหาวิทยาลัยเทคโนโลยีราชมงคลกรุงเทพ
        </p>
      </header>

      {/* 2. Navigation Tabs Bar */}
      <nav className="bg-[#0d9488] shadow-inner px-4 overflow-x-auto print:hidden">
        <div className="max-w-5xl mx-auto flex items-center justify-center gap-1 min-w-max">
          <Link
            href={`/teacher/course/${courseId}`}
            className="flex items-center gap-2 px-5 py-3 font-bold text-xs md:text-sm text-emerald-50 hover:bg-emerald-700/50 hover:text-white rounded-t-xl transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            เช็คชื่อสแกนใบหน้า
          </Link>

          <Link
            href={`/teacher/report/${courseId}`}
            className="flex items-center gap-2 px-5 py-3 font-bold text-xs md:text-sm text-emerald-50 hover:bg-emerald-700/50 hover:text-white rounded-t-xl transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            รายงานประจำวัน
          </Link>

          <Link
            href={`/teacher/course/${courseId}/students`}
            className="flex items-center gap-2 px-5 py-3 font-bold text-xs md:text-sm text-emerald-50 hover:bg-emerald-700/50 hover:text-white rounded-t-xl transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            จัดการรายชื่อนักศึกษา
          </Link>

          <button
            type="button"
            className="flex items-center gap-2 px-5 py-3 font-bold text-xs md:text-sm bg-white text-slate-800 shadow rounded-t-xl"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            ประวัติการบันทึก
          </button>
        </div>
      </nav>

      {/* 3. Main Content: รายการประวัติการเช็คชื่อตามรอบ */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8">

        {/* การ์ดสรุปข้อมูล */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ประวัติการบันทึก</span>
            <h2 className="text-2xl font-black text-slate-800">รายการเช็คชื่อย้อนหลังตามรอบ</h2>
          </div>
          <span className="bg-emerald-50 text-emerald-700 font-bold text-xs px-3.5 py-1.5 rounded-xl border border-emerald-100">
            บันทึกแล้วทั้งหมด {sessions.length} รอบ
          </span>
        </div>

        {loading ? (
          <div className="p-16 text-center font-bold text-slate-400 animate-pulse bg-white rounded-2xl border border-slate-200/80">
            กำลังโหลดประวัติการเช็คชื่อ...
          </div>
        ) : sessions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session, index) => {
              const imageList = session.imageUrl
                ? session.imageUrl.split(',').filter((url: string) => url.trim() !== '')
                : [];
              const roundNum = session.roundNumber || session.round || (sessions.length - index);

              return (
                <div
                  key={session.id || index}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 hover:border-emerald-500/50 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="bg-emerald-50 text-emerald-700 font-bold px-3 py-1 rounded-xl text-xs border border-emerald-100">
                        ครั้งที่ {roundNum}
                      </span>
                      <span className="text-slate-400 font-medium text-xs">
                        {session.createdAt ? new Date(session.createdAt).toLocaleString('th-TH', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        }) : '-'}
                      </span>
                    </div>

                    {imageList.length > 0 ? (
                      <div className="relative w-full h-44 bg-slate-100 rounded-xl overflow-hidden mb-3 border border-slate-100">
                        <img
                          src={imageList[0]}
                          alt={`รอบที่ ${roundNum}`}
                          className="w-full h-full object-cover"
                        />
                        {imageList.length > 1 && (
                          <div className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-sm">
                            +{imageList.length - 1} รูปเพิ่ม
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-44 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 font-bold text-xs mb-3 border border-slate-100">
                        ไม่มีรูปถ่าย
                      </div>
                    )}

                    <p className="text-xs font-bold text-slate-600 mb-1">
                      จำนวนรายการเช็คชื่อ: <span className="text-emerald-700 font-black">{session.attendances?.length || session.totalChecked || 0}</span> คน
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedSession({ ...session, roundNumber: roundNum })}
                    className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
                  >
                    ดูรายละเอียดรอบนี้
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white p-16 rounded-2xl text-center text-slate-400 font-bold text-xs border border-slate-200/80">
            ยังไม่มีประวัติการอัปโหลดเช็คชื่อตามรอบในวิชานี้
          </div>
        )}
      </main>

      {/* 4. Footer ด้านล่าง */}
      <footer className="bg-[#0f766e] text-emerald-100 py-4 px-4 text-center text-xs font-medium md:text-sm">
        © 2026 ระบบตรวจสอบรายชื่อด้วยการรู้จำใบหน้า
        <p className="text-emerald-100 font-medium text-xs md:text-sm">
          สาขาวิชานวัตกรรมระบบสารสนเทศ คณะบริหารธุรกิจ มหาวิทยาลัยเทคโนโลยีราชมงคลกรุงเทพ
        </p>
      </footer>

      {/* Modal แสดงรายละเอียดการเช็คชื่อ */}
      {selectedSession && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 md:p-8 max-h-[90vh] overflow-y-auto shadow-xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
              <h3 className="font-black text-lg text-slate-800">
                รายละเอียดการเช็คชื่อ ครั้งที่ {selectedSession.roundNumber}
              </h3>
              <button
                onClick={() => setSelectedSession(null)}
                className="text-slate-300 hover:text-slate-600 font-bold text-2xl cursor-pointer"
              >
                &times;
              </button>
            </div>

            {selectedSession.imageUrl && (
              <div className="mb-6">
                <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                  รูปภาพประกอบการเช็คชื่อ
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedSession.imageUrl
                    .split(',')
                    .filter((url: string) => url.trim() !== '')
                    .map((imgUrl: string, idx: number) => (
                      <div
                        key={idx}
                        className="rounded-xl overflow-hidden border border-slate-200/60 bg-slate-900 h-44"
                      >
                        <img
                          src={imgUrl.trim()}
                          alt={`รูปถ่ายการเช็คชื่อ #${idx + 1}`}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden">
              {selectedSession.attendances && selectedSession.attendances.length > 0 ? (
                selectedSession.attendances.map((att: any) => {
                  const studentName = `${att.student?.firstName || ''} ${att.student?.lastName || ''}`.trim() || att.student?.name || 'ไม่ระบุชื่อ';

                  return (
                    <div key={att.id} className="p-3.5 flex justify-between items-center bg-white hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="font-mono text-xs font-bold text-emerald-700">
                          {att.student?.studentCode}
                        </p>
                        <p className="font-bold text-xs md:text-sm text-slate-800">
                          {studentName}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-xl border ${att.status === 'มาเรียน'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : att.status === 'มาสาย'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : att.status === 'ลา'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                      >
                        {att.status}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-400 font-bold text-xs">
                  ไม่มีรายการเช็คชื่อรายบุคคลในรอบนี้
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}