'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function TeacherDashboard() {
  const [courses, setCourses] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({ code: '', name: '', teacher: '' });
  const [isLoading, setIsLoading] = useState(false);

  const fetchCourses = async () => {
    const res = await fetch('/api/courses');
    const json = await res.json();
    if (json.success) setCourses(json.data);
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseCode: newCourse.code,
          courseName: newCourse.name,
          teacherName: newCourse.teacher,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setNewCourse({ code: '', name: '', teacher: '' });
        fetchCourses();
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการสร้างวิชา');
    } finally {
      setIsLoading(false);
    }
  };

  const colors = ['bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-600', 'bg-rose-600'];

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">🏫 ชั้นเรียนของฉัน</h1>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-full font-bold shadow-lg shadow-blue-200 transition-all active:scale-95"
          >
            + สร้างวิชาใหม่
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course, idx) => (
            <div key={course.id} className="bg-white rounded-3xl shadow-md overflow-hidden border border-slate-200 hover:shadow-xl transition-all group animate-in fade-in zoom-in duration-300">
              
              {/* 🚀 คลิกที่แถบสีหรือชื่อวิชาเพื่อไปหน้า "รายชื่อนักเรียน" */}
              <Link href={`/course/${course.id}/students`}>
                <div className={`${colors[idx % colors.length]} p-8 text-white relative cursor-pointer hover:brightness-90 transition-all`}>
                  <h2 className="text-2xl font-bold truncate">{course.courseName}</h2>
                  <p className="text-blue-100 text-sm mt-1 font-medium tracking-wide">{course.courseCode}</p>
                  <div className="absolute bottom-4 right-6 opacity-20 group-hover:opacity-40 transition-opacity">
                    <span className="text-4xl">📚</span>
                  </div>
                </div>
              </Link>

              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-slate-500 text-sm font-medium">👨‍🏫 {course.teacherName}</p>
                    {/* แสดงจำนวนนักเรียนถ้ามีข้อมูล */}
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-bold">
                        {course._count?.students || 0} คน
                    </span>
                </div>

                <div className="flex flex-col gap-2">
                  <Link href={`/course/${course.id}`} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition-colors">
                    📸 เข้าห้องเรียน (สแกน)
                  </Link>
                  <Link href={`/report/${course.id}`} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-50 text-slate-600 font-semibold hover:bg-slate-100 transition-colors">
                    📊 ดูรายงาน
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal สำหรับสร้างวิชา (โค้ดเดิม) */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in fade-in slide-in-from-bottom-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-6">สร้างวิชาใหม่</h2>
              <form onSubmit={handleCreateCourse} className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 ml-1">รหัสวิชา</label>
                    <input 
                    type="text" placeholder="เช่น CS101" required
                    className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={newCourse.code}
                    onChange={(e) => setNewCourse({...newCourse, code: e.target.value})}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 ml-1">ชื่อวิชา</label>
                    <input 
                    type="text" placeholder="เช่น Internet of Things" required
                    className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={newCourse.name}
                    onChange={(e) => setNewCourse({...newCourse, name: e.target.value})}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 ml-1">ชื่ออาจารย์</label>
                    <input 
                    type="text" placeholder="ระบุชื่อผู้สอน" required
                    className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={newCourse.teacher}
                    onChange={(e) => setNewCourse({...newCourse, teacher: e.target.value})}
                    />
                </div>
                <div className="flex gap-3 mt-6">
                  <button 
                    type="button" onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button 
                    type="submit" disabled={isLoading}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 disabled:bg-slate-300 transition-all"
                  >
                    {isLoading ? 'กำลังสร้าง...' : 'สร้างวิชา'}
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