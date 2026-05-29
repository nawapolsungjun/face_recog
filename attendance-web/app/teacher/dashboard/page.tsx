'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function TeacherDashboard() {
  const [courses, setCourses] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({ code: '', name: '' });
  const [teacherInfo, setTeacherInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState({ name: '', department: '', password: '' });
  const [isUpdating, setIsUpdating] = useState(false);

  // --- ฟังก์ชันดึงรายวิชา ---
  const fetchCourses = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/courses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setCourses(json.data);
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (err) {
      console.error("Fetch courses error:", err);
    }
  }, []);

  // --- ตรวจสอบสิทธิ์เมื่อโหลดหน้า ---
  useEffect(() => {
    const token = localStorage.getItem('teacher_token');
    const savedUser = localStorage.getItem('teacher_user');

    if (!token || !savedUser) {
      router.replace('/login');
      return;
    }

    try {
      const userData = JSON.parse(savedUser);
      if (userData.role !== 'TEACHER') {
        handleLogout();
        return;
      }
      setTeacherInfo(userData);
      fetchCourses(token);
    } catch (e) {
      handleLogout();
    }
  }, [router, fetchCourses]);

  // --- อัปเดตโปรไฟล์ ---
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherInfo?.id) return alert("ไม่พบข้อมูล ID ผู้ใช้");

    const token = localStorage.getItem('teacher_token');
    setIsUpdating(true);
    try {
      const res = await fetch('/api/teacher/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: teacherInfo.id,
          name: editData.name,
          department: editData.department,
          password: editData.password
        }),
      });

      const data = await res.json();

      if (data.success) {
        if (editData.password) {
          alert(' เปลี่ยนรหัสผ่านสำเร็จ! กรุณาเข้าสู่ระบบใหม่');
          handleLogout();
          return;
        }

        const updatedUser = { ...teacherInfo, name: editData.name, department: editData.department };
        localStorage.setItem('teacher_user', JSON.stringify(updatedUser));
        setTeacherInfo(updatedUser);
        setIsEditModalOpen(false);
        alert(' บันทึกข้อมูลเรียบร้อย!');
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('การเชื่อมต่อมีปัญหา');
    } finally {
      setIsUpdating(false);
    }
  };

  // --- สร้างวิชาใหม่ ---
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('teacher_token');
    if (!token) return;

    setIsLoading(true);
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
        fetchCourses(token);
      } else {
        alert(data.error || 'สร้างวิชาไม่สำเร็จ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาด');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('teacher_user');
    localStorage.removeItem('teacher_token');
    router.replace('/login');
  };

  const colors = ['bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-amber-600', 'bg-rose-600'];

  if (!teacherInfo) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">
        {/* --- Header Section --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">ชั้นเรียนของฉัน</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-slate-500 font-medium">
                อาจารย์: <span className="text-blue-600 font-bold">{teacherInfo.name}</span>
              </p>
              {teacherInfo.department && (
                <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-bold uppercase">
                  {teacherInfo.department}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                setEditData({ name: teacherInfo.name, department: teacherInfo.department || '', password: '' });
                setIsEditModalOpen(true);
              }}
              className="bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-2xl font-bold hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm"
            >
              ⚙️ แก้ไขโปรไฟล์
            </button>
            <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-2xl font-bold shadow-lg shadow-blue-100 transition-all">
              + สร้างวิชาใหม่
            </button>
            <button onClick={handleLogout} className="bg-white border border-slate-200 text-slate-400 px-5 py-2.5 rounded-2xl font-bold hover:bg-red-50 hover:text-red-600 transition-all shadow-sm">
              ออกจากระบบ
            </button>
          </div>
        </div>

        {/* --- Course Grid --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course, idx) => (
            <div key={course.id} className="bg-white rounded-[2.5rem] shadow-sm overflow-hidden border border-slate-200 hover:shadow-xl transition-all group">
              <div className={`${colors[idx % colors.length]} p-8 text-white relative`}>
                <p className="text-white/70 text-xs font-black uppercase mb-1">{course.courseCode}</p>
                <h2 className="text-2xl font-bold truncate">{course.courseName}</h2>
                <div className="mt-4 flex items-center gap-2">
                  <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">👥 {course._count?.students || 0} นักศึกษา</span>
                </div>
              </div>
              <div className="p-6 space-y-3">
                <Link href={`/course/${course.id}`} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-slate-900 text-white font-bold hover:bg-black transition-all shadow-lg shadow-slate-200">
                  เริ่มเช็คชื่อ (Face Scan)
                </Link>
                <div className="grid grid-cols-2 gap-2">
                  <Link href={`/teacher/report/${course.id}`} className="flex items-center justify-center py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all">📊 รายงาน</Link>
                  <Link href={`/teacher/course/${course.id}/students`} className="flex items-center justify-center py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all">⚙️ จัดการ</Link>
                </div>
              </div>
            </div>
          ))}

          {courses.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
              <p className="text-slate-400 font-bold">ยังไม่มีรายวิชาในขณะนี้ เริ่มสร้างวิชาแรกของคุณได้เลย!</p>
            </div>
          )}
        </div>
      </div>

      {/* --- Modal: สร้างวิชาใหม่ --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
            <h2 className="text-2xl font-black text-slate-800 mb-6">สร้างรายวิชาใหม่</h2>
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase ml-1">รหัสวิชา</label>
                <input
                  required
                  type="text"
                  value={newCourse.code}
                  onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                  placeholder="เช่น IT-101"
                  className="w-full mt-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase ml-1">ชื่อวิชา</label>
                <input
                  required
                  type="text"
                  value={newCourse.name}
                  onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                  placeholder="เช่น Web Development"
                  className="w-full mt-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600">ยกเลิก</button>
                <button disabled={isLoading} type="submit" className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:bg-slate-300 transition-all">
                  {isLoading ? 'กำลังสร้าง...' : 'ตกลงสร้างวิชา'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Modal: แก้ไขโปรไฟล์ --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
            <h2 className="text-2xl font-black text-slate-800 mb-6">⚙️ ตั้งค่าโปรไฟล์</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase ml-1">ชื่อ-นามสกุล</label>
                <input
                  required
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full mt-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase ml-1">แผนก/สาขาวิชา</label>
                <input
                  type="text"
                  value={editData.department}
                  onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                  className="w-full mt-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                />
              </div>
              <div className="pt-2 border-t border-slate-100">
                <label className="text-xs font-black text-red-400 uppercase ml-1">เปลี่ยนรหัสผ่าน (เว้นว่างไว้หากไม่ต้องการเปลี่ยน)</label>
                <input
                  type="password"
                  value={editData.password}
                  onChange={(e) => setEditData({ ...editData, password: e.target.value })}
                  placeholder="รหัสผ่านใหม่"
                  className="w-full mt-1 p-4 bg-red-50/30 border border-red-100 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none font-bold"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600">ยกเลิก</button>
                <button disabled={isUpdating} type="submit" className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg shadow-slate-200 hover:bg-black disabled:bg-slate-300 transition-all">
                  {isUpdating ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}