'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [courseCode, setCourseCode] = useState('');
  const [myCourses, setMyCourses] = useState<any[]>([]);
  const [status, setStatus] = useState('');

  // 1. โหลดข้อมูลนักเรียนและวิชาที่ลงไว้
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      router.push('/student/login');
      return;
    }
    const userData = JSON.parse(savedUser);
    setUser(userData);
    fetchMyCourses(userData.id);
  }, []);

  const fetchMyCourses = async (studentId: number) => {
    const res = await fetch(`/api/student/courses?studentId=${studentId}`);
    const json = await res.json();
    if (json.success) setMyCourses(json.data);
  };

  // 2. ฟังก์ชัน Join Class
  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('⌛ กำลังเข้าร่วม...');
    
    const res = await fetch('/api/student/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: user.id, courseCode }),
    });

    const data = await res.json();
    if (data.success) {
      setStatus('✅ เข้าร่วมสำเร็จ!');
      setCourseCode('');
      fetchMyCourses(user.id); // โหลดรายการวิชาใหม่
    } else {
      setStatus(`❌ ${data.error}`);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Header ส่วนตัวนักเรียน */}
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-2xl font-black text-slate-800">สวัสดีครับ, {user.name} 👋</h1>
            <p className="text-slate-500 font-medium">รหัสนักศึกษา: {user.studentCode}</p>
          </div>
          <button 
            onClick={() => { localStorage.clear(); router.push('/student/login'); }}
            className="text-red-500 font-bold text-sm hover:bg-red-50 px-4 py-2 rounded-xl transition-all"
          >
            ออกจากระบบ
          </button>
        </div>

        {/* ส่วนใส่รหัสเข้าชั้นเรียน */}
        <div className="bg-blue-600 rounded-3xl p-8 shadow-2xl shadow-blue-200 mb-10 text-white">
          <h2 className="text-xl font-bold mb-4">🏫 เข้าร่วมชั้นเรียนใหม่</h2>
          <form onSubmit={handleJoinClass} className="flex flex-col md:flex-row gap-4">
            <input 
              type="text" 
              placeholder="กรอกรหัส Classroom (เช่น CS101)" 
              required
              className="flex-1 p-4 rounded-2xl text-slate-800 outline-none focus:ring-4 focus:ring-blue-300 transition-all font-bold"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
            />
            <button 
              type="submit"
              className="bg-slate-900 hover:bg-black text-white px-8 py-4 rounded-2xl font-bold transition-all active:scale-95"
            >
              Join Class
            </button>
          </form>
          {status && <p className="mt-4 text-sm font-bold animate-pulse">{status}</p>}
        </div>

        {/* รายการวิชาที่ลงทะเบียนไว้ */}
        <h2 className="text-2xl font-bold text-slate-800 mb-6">วิชาที่ฉันลงทะเบียน</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {myCourses.length > 0 ? myCourses.map((course) => (
            <div key={course.id} className="bg-white p-6 rounded-3xl shadow-md border border-slate-100 hover:shadow-lg transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-xs font-black uppercase">
                  {course.courseCode}
                </div>
                <span className="text-xs text-slate-400 font-bold">ACTIVE</span>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-1">{course.courseName}</h3>
              <p className="text-slate-500 text-sm mb-4">อาจารย์: {course.teacherName}</p>
              <div className="w-full bg-slate-50 text-slate-400 text-center py-2 rounded-xl text-xs font-bold italic">
                เช็คชื่อผ่านระบบสแกนใบหน้าเท่านั้น
              </div>
            </div>
          )) : (
            <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
              <span className="text-4xl block mb-2">📒</span>
              ยังไม่มีวิชาที่เข้าร่วม... ลองใส่รหัส Classroom ด้านบนดูครับ
            </div>
          )}
        </div>
      </div>
    </div>
  );
}