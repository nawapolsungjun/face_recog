'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function TeacherDashboard() {
  const [courses, setCourses] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({ code: '', name: '' });
  const [teacherInfo, setTeacherInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const getAuthToken = () => localStorage.getItem('token');

  const fetchCourses = async () => {
    const token = getAuthToken();
    if (!token) return router.push('/login');

    try {
      // 🚀 ใช้ API เส้น /api/courses ที่เราปรับปรุงให้กรอง status: 'ACTIVE'
      const res = await fetch('/api/courses', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const json = await res.json();
      if (json.success) {
        setCourses(json.data);
        // หมายเหตุ: บอสอาจจะต้องดึงข้อมูลอาจารย์แยกหรือส่งมาพร้อมก้อน API
        // ในที่นี้ผมอ้างอิงตามโครงสร้างเดิมของบอส
        if (json.teacher) setTeacherInfo(json.teacher);
      } else if (res.status === 401) {
        router.push('/login');
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const token = getAuthToken();

    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          courseCode: newCourse.code,
          courseName: newCourse.name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setNewCourse({ code: '', name: '' });
        fetchCourses();
      } else {
        alert(data.error || 'สร้างวิชาไม่สำเร็จ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  const colors = ['bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-amber-600', 'bg-rose-600'];

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">🏫 ชั้นเรียนของฉัน</h1>
            <p className="text-slate-500 font-medium mt-1">
              อาจารย์ผู้สอน: <span className="text-blue-600 font-bold">{teacherInfo?.name || 'ยินดีต้อนรับ'}</span>
            </p>
          </div>
          
          {/* 🚀 กลุ่มปุ่มจัดการ (เพิ่มปุ่มคลังรายวิชา) */}
          <div className="flex flex-wrap gap-3">
             <Link 
                href="/teacher/archive"
                className="bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-2xl font-bold hover:bg-slate-50 transition-all active:scale-95 flex items-center gap-2 shadow-sm"
              >
                📦 คลังรายวิชา
              </Link>
             <button 
                onClick={handleLogout}
                className="bg-white border border-slate-200 text-slate-400 px-5 py-2.5 rounded-2xl font-bold hover:bg-red-50 hover:text-red-600 transition-all active:scale-95 shadow-sm"
              >
                ออกจากระบบ
              </button>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-2xl font-bold shadow-lg shadow-blue-100 transition-all active:scale-95"
              >
                + สร้างวิชาใหม่
              </button>
          </div>
        </div>

        {/* Grid แสดงรายวิชา */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course, idx) => (
            <div key={course.id} className="bg-white rounded-[2.5rem] shadow-sm overflow-hidden border border-slate-200 hover:shadow-xl hover:translate-y-[-4px] transition-all group">
              
              <Link href={`/course/${course.id}/students`}>
                <div className={`${colors[idx % colors.length]} p-8 text-white relative cursor-pointer`}>
                  <p className="text-white/70 text-xs font-black uppercase tracking-[0.2em] mb-1">{course.courseCode}</p>
                  <h2 className="text-2xl font-bold truncate leading-tight">{course.courseName}</h2>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">
                       👥 {course._count?.students || 0} นักศึกษา
                    </span>
                  </div>
                </div>
              </Link>

              <div className="p-6 space-y-3">
                <Link href={`/course/${course.id}`} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-slate-900 text-white font-bold hover:bg-black transition-all active:scale-95">
                  📸 เริ่มเช็คชื่อ (Face Scan)
                </Link>
                <div className="grid grid-cols-2 gap-2">
                    <Link href={`/report/${course.id}`} className="flex items-center justify-center py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all">
                      📊 รายงาน
                    </Link>
                    <Link href={`/course/${course.id}/students`} className="flex items-center justify-center py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all">
                      ⚙️ จัดการ
                    </Link>
                </div>
              </div>
            </div>
          ))}

          {/* Empty State */}
          {courses.length === 0 && (
            <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
               <span className="text-6xl block mb-4">📭</span>
               <p className="text-slate-400 font-bold text-lg">ยังไม่มีรายวิชาที่กำลังสอนอยู่ในขณะนี้</p>
               <button onClick={() => setIsModalOpen(true)} className="text-blue-600 font-black mt-2 underline decoration-2">สร้างวิชาแรกของคุณ</button>
            </div>
          )}
        </div>

        {/* Modal สร้างวิชาใหม่ */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-[3rem] p-10 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
              <h2 className="text-3xl font-black text-slate-800 mb-2">วิชาใหม่</h2>
              <p className="text-slate-500 mb-8 font-medium">กรอกรายละเอียดเพื่อเริ่มต้นชั้นเรียน</p>
              
              <form onSubmit={handleCreateCourse} className="space-y-5">
                <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">รหัสวิชา</label>
                    <input 
                      type="text" placeholder="เช่น IT-401" required
                      className="w-full mt-1 p-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-800"
                      value={newCourse.code}
                      onChange={(e) => setNewCourse({...newCourse, code: e.target.value})}
                    />
                </div>
                <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">ชื่อรายวิชา</label>
                    <input 
                      type="text" placeholder="ชื่อวิชาภาษาไทยหรืออังกฤษ" required
                      className="w-full mt-1 p-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-800"
                      value={newCourse.name}
                      onChange={(e) => setNewCourse({...newCourse, name: e.target.value})}
                    />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 rounded-2xl font-bold text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button 
                    type="submit" disabled={isLoading}
                    className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:bg-slate-300 transition-all"
                  >
                    {isLoading ? 'กำลังบันทึก...' : 'สร้างชั้นเรียน'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}