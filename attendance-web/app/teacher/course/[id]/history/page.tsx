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
    }  {
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
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">
        <Link
          href="/teacher/dashboard"
          className="text-blue-600 font-bold inline-flex items-center gap-2 mb-8 hover:translate-x-[-4px] transition-all text-xs uppercase tracking-widest"
        >
          ← กลับหน้า Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">
            ประวัติการเช็คชื่อตามรอบ
          </h1>
          <p className="text-slate-500 font-bold text-xs mt-1">
            รายวิชา: <span className="text-blue-600">{courseInfo?.courseName || 'กำลังโหลด...'}</span> 
            {courseInfo?.courseCode && <span className="ml-2 font-mono text-slate-400">({courseInfo.courseCode})</span>}
          </p>
        </div>

        {loading ? (
          <div className="p-14 text-center font-bold text-slate-400 animate-pulse">
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
                  className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="bg-blue-50 text-blue-600 font-black px-3 py-1 rounded-xl text-xs">
                        ครั้งที่ {roundNum}
                      </span>
                      <span className="text-slate-400 font-bold text-xs">
                        {session.createdAt ? new Date(session.createdAt).toLocaleString('th-TH', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        }) : '-'}
                      </span>
                    </div>

                    {imageList.length > 0 ? (
                      <div className="relative w-full h-48 bg-slate-100 rounded-2xl overflow-hidden mb-4 border border-slate-100">
                        <img
                          src={imageList[0]}
                          alt={`รอบที่ ${roundNum}`}
                          className="w-full h-full object-cover"
                        />
                        {imageList.length > 1 && (
                          <div className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[10px] font-black px-2.5 py-1 rounded-lg backdrop-blur-sm">
                            +{imageList.length - 1} รูปเพิ่ม
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-48 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-bold text-xs mb-4">
                        ไม่มีรูปถ่าย
                      </div>
                    )}

                    <p className="text-xs font-bold text-slate-600 mb-2">
                      จำนวนรายการเช็คชื่อ: {session.attendances?.length || session.totalChecked || 0} คน
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedSession({ ...session, roundNumber: roundNum })}
                    className="w-full mt-4 bg-slate-900 hover:bg-black text-white font-black text-xs py-3 rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    ดูรายละเอียดรอบนี้
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white p-14 rounded-3xl text-center text-slate-400 font-bold shadow-sm">
            ยังไม่มีประวัติการอัปโหลดเช็คชื่อตามรอบในวิชานี้
          </div>
        )}

        {/* Modal แสดงรายละเอียดการเช็คชื่อ */}
        {selectedSession && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] max-w-3xl w-full p-8 max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h3 className="font-black text-xl text-slate-800">
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
                  <p className="text-xs font-black text-slate-400 mb-3 uppercase tracking-wider">
                    รูปภาพประกอบการเช็คชื่อ
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedSession.imageUrl
                      .split(',')
                      .filter((url: string) => url.trim() !== '')
                      .map((imgUrl: string, idx: number) => (
                        <div
                          key={idx}
                          className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-900 h-48"
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

              <div className="divide-y divide-slate-50 border rounded-2xl overflow-hidden">
                {selectedSession.attendances && selectedSession.attendances.length > 0 ? (
                  selectedSession.attendances.map((att: any) => {
                    const studentName = `${att.student?.firstName || ''} ${att.student?.lastName || ''}`.trim() || att.student?.name || 'ไม่ระบุชื่อ';

                    return (
                      <div key={att.id} className="p-4 flex justify-between items-center bg-white hover:bg-slate-50 transition-colors">
                        <div>
                          <p className="font-mono text-xs font-bold text-blue-600">
                            {att.student?.studentCode}
                          </p>
                          <p className="font-black text-sm text-slate-800">
                            {studentName}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-black px-3 py-1.5 rounded-xl ${
                            att.status === 'มาเรียน'
                              ? 'bg-green-50 text-green-600'
                              : att.status === 'มาสาย'
                              ? 'bg-amber-50 text-amber-600'
                              : att.status === 'ลา'
                              ? 'bg-blue-50 text-blue-600'
                              : 'bg-red-50 text-red-600'
                          }`}
                        >
                          {att.status}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-slate-400 font-bold">
                    ไม่มีรายการเช็คชื่อรายบุคคลในรอบนี้
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}