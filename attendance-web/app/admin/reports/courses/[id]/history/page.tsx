'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function AdminCourseHistoryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.id as string;
  const filterDateParam = searchParams.get('date');

  const [courseInfo, setCourseInfo] = useState<{ courseName: string; courseCode: string; teacher?: any } | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessionDetail, setSelectedSessionDetail] = useState<any | null>(null);

  const getAuthToken = () => localStorage.getItem('admin_token') || localStorage.getItem('token');

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    const token = getAuthToken();
    try {
      // 1. ดึงข้อมูลรายวิชา
      const resCourse = await fetch(`/api/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const courseJson = await resCourse.json();
      if (courseJson.success && courseJson.data) {
        setCourseInfo(courseJson.data);
      }

      // 2. ดึงประวัติรอบการเช็คชื่อ
      const url = filterDateParam 
        ? `/api/attendance/history/${courseId}?date=${filterDateParam}`
        : `/api/attendance/history/${courseId}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setSessions(json.data);
      } else {
        setSessions([]);
      }
    } catch (err) {
      console.error('Fetch admin history error:', err);
    } finally {
      setLoading(false);
    }
  }, [courseId, filterDateParam]);

  useEffect(() => {
    if (courseId) {
      fetchHistory();
    }
  }, [courseId, fetchHistory]);

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f7f4] font-sans text-slate-800">
      {/* Header สำหรับ Admin */}
      <header className="bg-[#0f766e] text-white pt-8 pb-6 px-4 text-center shadow-sm relative print:hidden">
        <div className="absolute top-6 left-6 flex items-center gap-3">
          <Link
            href={`/admin/reports/courses/${courseId}`}
            className="text-emerald-100 hover:text-white font-bold inline-flex items-center gap-1 text-xs uppercase tracking-wider transition-all"
          >
            ← กลับไปหน้ารายงานรายวิชา
          </Link>
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1">
          ระบบเช็คชื่อนักเรียน (ผู้ดูแลระบบ)
        </h1>
        <p className="text-emerald-100 font-medium text-xs md:text-sm">
          วิชา: <span className="font-bold text-white">{courseInfo?.courseName || 'กำลังโหลด...'}</span> {courseInfo?.courseCode ? `(${courseInfo.courseCode})` : ''}
        </p>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8">
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200/80 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">ประวัติการบันทึก (โหมดผู้ดูแลระบบ)</span>
              <h2 className="text-xl font-black text-slate-800">
                รายการเช็คชื่อย้อนหลังตามรอบ
              </h2>
              {filterDateParam && (
                <p className="text-xs text-slate-500 font-bold mt-0.5">
                  กรองเฉพาะวันที่: <span className="text-emerald-700 font-mono">{filterDateParam}</span>
                  <Link href={`/admin/reports/courses/${courseId}/history`} className="ml-2 text-xs text-slate-400 hover:text-slate-600 underline">
                    (แสดงทุกวัน)
                  </Link>
                </p>
              )}
            </div>

            <span className="text-xs font-bold px-3.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
              บันทึกแล้วทั้งหมด {sessions.length} รอบ
            </span>
          </div>
        </div>

        {/* Sessions Card Grid */}
        {loading ? (
          <div className="p-16 text-center text-slate-400 font-bold animate-pulse text-xs">
            กำลังโหลดประวัติการบันทึก...
          </div>
        ) : sessions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {sessions.map((session: any, idx: number) => {
              const dateFormatted = session.createdAt
                ? new Date(session.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
                : '-';
              const timeFormatted = session.createdAt
                ? new Date(session.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })
                : '-';
              
              const imgList = session.imageUrl ? session.imageUrl.split(',') : [];
              const firstImg = imgList[0] || null;

              return (
                <div
                  key={session.id || idx}
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
                        ครั้งที่ {session.roundNumber || idx + 1}
                      </span>
                      <span className="text-xs text-slate-400 font-mono font-bold">
                        {dateFormatted} {timeFormatted}
                      </span>
                    </div>

                    <div className="relative rounded-xl overflow-hidden bg-slate-100 border border-slate-100 h-44 mb-4">
                      {firstImg ? (
                        <>
                          <img src={firstImg} alt="Session Image" className="w-full h-full object-cover" />
                          {imgList.length > 1 && (
                            <span className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-1 rounded-md">
                              +{imgList.length - 1} รูปเพิ่ม
                            </span>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xs">
                          ไม่มีรูปภาพ
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 font-medium mb-1">
                      จำนวนรายการเช็คชื่อ: <span className="font-bold text-slate-800">{session.attendances?.length || 0} คน</span>
                    </p>
                    {session.note && (
                      <p className="text-[11px] text-slate-400 italic mb-4">
                        {session.note}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedSessionDetail(session)}
                    className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
                  >
                    ดูรายละเอียดรอบนี้
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-16 text-center text-slate-400 font-bold text-xs border border-slate-200/80">
            ไม่พบประวัติการบันทึกการเช็คชื่อ
          </div>
        )}
      </main>

      {/* Modal ย่อย: ดูรายชื่อนักศึกษาในรอบนั้น */}
      {selectedSessionDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-xl border border-slate-100 max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
            <h4 className="text-base font-black text-slate-800 mb-1">
              รายละเอียดการเช็คชื่อ ครั้งที่ {selectedSessionDetail.roundNumber}
            </h4>
            <p className="text-xs text-slate-400 mb-4">
              เวลาบันทึก: {new Date(selectedSessionDetail.createdAt).toLocaleTimeString('th-TH')} น.
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {selectedSessionDetail.attendances?.map((att: any, i: number) => (
                <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl text-xs">
                  <div>
                    <span className="font-mono font-bold text-emerald-700 mr-2">{att.student?.studentCode}</span>
                    <span className="font-bold text-slate-700">{att.student?.name}</span>
                    {att.remark && <div className="text-[10px] text-slate-400 mt-0.5">{att.remark}</div>}
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                    att.status === 'มาเรียน' ? 'bg-emerald-100 text-emerald-800' :
                    att.status === 'มาสาย' ? 'bg-amber-100 text-amber-800' :
                    att.status === 'ลา' ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {att.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-4 mt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSessionDetail(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}