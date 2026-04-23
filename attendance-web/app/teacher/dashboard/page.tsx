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

  // 1. ฟังก์ชันดึงวิชา (ใช้โทเค็นและข้อมูลอาจารย์)
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

  // 2. ตรวจสอบสิทธิ์ (เปลี่ยนมาใช้ teacher_user และ teacher_token)
  useEffect(() => {
    // 🚀 1. เปลี่ยนมาดึงกุญแจ teacher_token
    const token = localStorage.getItem('teacher_token');
    // 🚀 2. ดึงข้อมูลอาจารย์จาก teacher_user
    const savedUser = localStorage.getItem('teacher_user');

    if (!token || !savedUser) {
      console.warn("🔐 No teacher session found, redirecting...");
      router.replace('/login'); 
      return;
    }

    try {
      const userData = JSON.parse(savedUser);

      // 🚩 Check Role ป้องกันนักศึกษาแอบเข้ามา
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

  // 🛠 ฟังก์ชันอัปเดตโปรไฟล์
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherInfo?.id) return alert("ไม่พบข้อมูล ID ผู้ใช้");
    
    // 🚀 3. ดึงกุญแจอาจารย์มาใช้ในการอัปเดต Profile
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
          alert('🔐 เปลี่ยนรหัสผ่านสำเร็จ! กรุณาเข้าสู่ระบบใหม่');
          handleLogout();
          return;
        }

        // 🚀 4. อัปเดตข้อมูลกลับลงใน teacher_user
        const updatedUser = { ...teacherInfo, name: editData.name, department: editData.department };
        localStorage.setItem('teacher_user', JSON.stringify(updatedUser));
        setTeacherInfo(updatedUser);
        setIsEditModalOpen(false);
        alert('💾 บันทึกข้อมูลเรียบร้อย!');
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('การเชื่อมต่อมีปัญหา');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    // 🚀 5. ดึงกุญแจ teacher_token มาใช้สร้างวิชา
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
    // 🚀 6. ลบ Key ของอาจารย์ทิ้งให้หมดทั้งกุญแจและข้อมูล
    localStorage.removeItem('teacher_user');
    localStorage.removeItem('teacher_token');
    // ไม่ใช้ clear() เพื่อให้นักศึกษาที่ Login อยู่อีก Tab ไม่หลุดครับ
    router.replace('/login');
  };

  const colors = ['bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-amber-600', 'bg-rose-600'];

  if (!teacherInfo) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">
        {/* Header ส่วนแสดงผลเหมือนเดิม */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">🏫 ชั้นเรียนของฉัน</h1>
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
             <Link href="/teacher/archive" className="bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-2xl font-bold hover:bg-slate-50 transition-all shadow-sm">
                📦 คลังรายวิชา
              </Link>
             <button onClick={handleLogout} className="bg-white border border-slate-200 text-slate-400 px-5 py-2.5 rounded-2xl font-bold hover:bg-red-50 hover:text-red-600 transition-all shadow-sm">
                ออกจากระบบ
              </button>
              <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-2xl font-bold shadow-lg shadow-blue-100 transition-all">
                + สร้างวิชาใหม่
              </button>
          </div>
        </div>

        {/* ส่วนรายชื่อวิชา (Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course, idx) => (
            <div key={course.id} className="bg-white rounded-[2.5rem] shadow-sm overflow-hidden border border-slate-200 hover:shadow-xl transition-all group">
              <Link href={`/course/${course.id}/students`}>
                <div className={`${colors[idx % colors.length]} p-8 text-white relative cursor-pointer`}>
                  <p className="text-white/70 text-xs font-black uppercase mb-1">{course.courseCode}</p>
                  <h2 className="text-2xl font-bold truncate">{course.courseName}</h2>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">👥 {course._count?.students || 0} นักศึกษา</span>
                  </div>
                </div>
              </Link>
              <div className="p-6 space-y-3">
                <Link href={`/course/${course.id}`} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-slate-900 text-white font-bold hover:bg-black transition-all">📸 เริ่มเช็คชื่อ (Face Scan)</Link>
                <div className="grid grid-cols-2 gap-2">
                    <Link href={`/report/${course.id}`} className="flex items-center justify-center py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all">📊 รายงาน</Link>
                    <Link href={`/course/${course.id}/students`} className="flex items-center justify-center py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all">⚙️ จัดการ</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- ส่วน Modal แก้ไขโปรไฟล์และสร้างวิชา (บอสใช้ UI เดิมได้เลยครับ) --- */}
      {/* ... (เหมือนโค้ดที่บอสส่งมาด้านบน) ... */}
    </div>
  );
}