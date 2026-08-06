'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function AttendanceHistoryPage() {
  const params = useParams();
  const courseId = params.id as string;

  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/history/${courseId}`);
      const json = await res.json();
      if (json.success) {
        setSessions(json.data);
      }
    } catch (err) {
      console.error('Fetch history error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) fetchHistory();
  }, [courseId]);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto">
        <Link
          href="/teacher/dashboard"
          className="text-blue-600 font-black inline-flex items-center gap-2 mb-8 hover:translate-x-[-4px] transition-all text-xs uppercase tracking-widest"
        >
          ← Back to Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">
            ประวัติการเช็คชื่อตามรอบ
          </h1>
          <p className="text-slate-400 font-medium text-xs mt-1">
            รายการประวัติรูปถ่ายและการเช็คชื่อย้อนหลัง รายวิชา {courseId}
          </p>
        </div>

        {loading ? (
          <div className="p-10 text-center font-bold text-slate-400 animate-pulse">
            กำลังโหลดประวัติการเช็คชื่อ...
          </div>
        ) : sessions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="bg-blue-50 text-blue-600 font-black px-3 py-1 rounded-xl text-xs">
                      ครั้งที่ {session.roundNumber}
                    </span>
                    <span className="text-slate-400 font-bold text-xs">
                      {new Date(session.createdAt).toLocaleString('th-TH', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>

                  {session.imageUrl ? (
                    <div className="w-full h-48 bg-slate-100 rounded-2xl overflow-hidden mb-4 border border-slate-100">
                      <img
                        src={session.imageUrl}
                        alt={`รอบที่ ${session.roundNumber}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-bold text-xs mb-4">
                      ไม่มีรูปถ่าย
                    </div>
                  )}

                  <p className="text-xs font-bold text-slate-600 mb-2">
                    จำนวนรายการเช็คชื่อ: {session.attendances?.length || 0} คน
                  </p>
                </div>

                <button
                  onClick={() => setSelectedSession(session)}
                  className="w-full mt-4 bg-slate-900 hover:bg-black text-white font-black text-xs py-3 rounded-xl transition-all shadow-md"
                >
                  ดูรายละเอียดรอบนี้
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-14 rounded-3xl text-center text-slate-400 font-bold shadow-sm">
            ยังไม่มีประวัติการอัปโหลดเช็คชื่อตามรอบในวิชานี้
          </div>
        )}

        {/* Modal แสดงรายละเอียดการเช็คชื่อและรูปภาพขยาย */}
        {selectedSession && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-lg text-slate-800">
                  รายละเอียดการเช็คชื่อ ครั้งที่ {selectedSession.roundNumber}
                </h3>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="text-slate-400 hover:text-slate-600 font-black text-sm"
                >
                  ปิด window
                </button>
              </div>

              {selectedSession.imageUrl && (
                <div className="mb-6 rounded-2xl overflow-hidden border border-slate-100">
                  <img
                    src={selectedSession.imageUrl}
                    alt="รูปภาพต้นฉบับ"
                    className="w-full max-h-80 object-contain bg-slate-900"
                  />
                </div>
              )}

              <div className="divide-y divide-slate-100">
                {selectedSession.attendances?.map((att: any) => (
                  <div key={att.id} className="py-3 flex justify-between items-center">
                    <div>
                      <p className="font-mono text-xs font-bold text-blue-600">
                        {att.student?.studentCode}
                      </p>
                      <p className="font-black text-sm text-slate-700">
                        {att.student?.name}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-black px-3 py-1 rounded-xl ${
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
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}