'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AdminCourseManagementPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);

  // --- States สำหรับ Modal สร้างวิชาใหม่ ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newCourse, setNewCourse] = useState({ code: '', name: '', teacherId: '' });

  // --- ฟังก์ชันดึงข้อมูลรายวิชาและอาจารย์ทั้งหมด ---
  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/dashboard-summary');
      const json = await res.json();
      if (json.success) {
        setCourses(json.data.courses);
        setTeachers(json.data.teachers); // ดึงรายชื่ออาจารย์มาเก็บไว้ใช้งาน
      }
    } catch (err) {
      console.error("Fetch courses error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // --- ฟังก์ชันสร้างรายวิชาใหม่ (แอดมินเป็นคนสร้าง) ---
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.code || !newCourse.name || !newCourse.teacherId) {
      return alert("กรุณากรอกข้อมูลและเลือกอาจารย์ผู้สอนให้ครบถ้วนครับ");
    }

    setIsCreating(true);
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseCode: newCourse.code,
          courseName: newCourse.name,
          teacherId: newCourse.teacherId
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(' สร้างรายวิชาใหม่สำเร็จแล้วครับ!');
        setIsModalOpen(false); // ปิด Modal
        setNewCourse({ code: '', name: '', teacherId: '' }); // รีเซ็ตฟอร์ม
        fetchInitialData(); // โหลดตารางใหม่
      } else {
        alert(data.error || 'สร้างวิชาไม่สำเร็จ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsCreating(false);
    }
  };

  // --- ฟังก์ชันลบรายวิชาออกจากระบบ ---
  const handleDeleteCourse = async (id: string, courseName: string) => {
    if (!confirm(`ยืนยันการลบรายวิชา "${courseName}" ใช่หรือไม่?\nข้อมูลการเช็คชื่อทั้งหมดในวิชานี้จะถูกลบถาวร!`)) return;
    
    try {
      const res = await fetch(`/api/admin/courses?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        alert('ลบรายวิชาเรียบร้อยแล้วครับบอส');
        fetchInitialData();
      } else {
        alert(json.error || 'เกิดข้อผิดพลาดในการลบ');
      }
    } catch (err) {
      alert('การเชื่อมต่อฐานข้อมูลล้มเหลว');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans text-slate-900">
      <div className="max-w-5xl mx-auto">
        
        {/* แถบนำทางกลับ */}
        <Link href="/admin/dashboard" className="text-blue-600 font-bold text-sm uppercase tracking-widest flex items-center gap-2 mb-6 hover:translate-x-[-4px] transition-all">
          ← กลับหน้า Dashboard
        </Link>
        
        {/* ส่วนหัวของหน้า + ปุ่มสร้างวิชาใหม่ */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">รายวิชาในระบบ</h1>
            <p className="text-slate-500 font-medium mt-2">ตรวจสอบและควบคุมรายวิชาทั้งหมดที่ถูกสร้างขึ้นในระบบ</p>
          </div>
          
          {/*  ปุ่มเปิด Modal สร้างวิชาใหม่ */}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-2xl font-black text-sm shadow-xl shadow-blue-100 transition-all active:scale-95"
          >
            + สร้างรายวิชาใหม่
          </button>
        </div>

        {/* 📊 ตารางแสดงผลรายวิชา */}
        <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">รหัสวิชา</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">ชื่อรายวิชา</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">อาจารย์ผู้สอน</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              
              {loading && (
                <tr>
                  <td colSpan={4} className="text-center p-14 text-slate-400 font-bold animate-pulse">
                     กำลังดึงข้อมูลรายวิชาจากระบบ...
                  </td>
                </tr>
              )}

              {!loading && courses.map((course, idx) => (
                <tr key={course.id || idx} className="hover:bg-blue-50/30 transition-all group">
                  <td className="p-6">
                    <span className="text-xs font-black text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl font-mono">
                      {course.courseCode}
                    </span>
                  </td>
                  <td className="p-6">
                    <div className="font-black text-slate-700 text-lg">{course.courseName}</div>
                    <div className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                      👥 นักศึกษาในชั้นเรียน: {course._count?.students || 0} คน
                    </div>
                  </td>
                  <td className="p-6 text-sm text-slate-500 font-bold">
                    {course.teacher?.name || (
                      <span className="text-amber-500 italic text-xs"> ไม่พบผู้สอน / บัญชีถูกลบ</span>
                    )}
                  </td>
                  <td className="p-6 text-center">
                    <div className="flex justify-center items-center gap-2">
                      
                      <Link 
                        href={`/admin/courses/${course.id}/students`}
                        className="bg-slate-900 text-white px-4 py-2.5 rounded-xl font-black text-xs hover:bg-black transition-all shadow-sm whitespace-nowrap"
                      >
                        ⚙️ จัดการชั้นเรียน
                      </Link>

                      <Link 
                        href={`/teacher/report/${course.id}`}
                        className="bg-slate-100 text-slate-600 px-4 py-2.5 rounded-xl font-black text-xs hover:bg-slate-200 transition-all shadow-sm whitespace-nowrap"
                      >
                        📊 รายงาน
                      </Link>

                      <button 
                        onClick={() => handleDeleteCourse(course.id, course.courseName)}
                        className="bg-red-50 text-red-500 px-4 py-2.5 rounded-xl font-black text-xs hover:bg-red-600 hover:text-white transition-all shadow-sm whitespace-nowrap"
                      >
                        ลบรายวิชา
                      </button>

                    </div>
                  </td>
                </tr>
              ))}

              {!loading && courses.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center p-14 text-slate-400 font-bold">
                     ยังไม่มีรายวิชาถูกสร้างขึ้นในระบบขณะนี้
                  </td>
                </tr>
              )}

            </tbody>
          </table>
        </div>
      </div>

      {/*  MODAL สร้างรายวิชาใหม่สำหรับ Admin  */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300 border border-slate-100">
            <h2 className="text-2xl font-black text-slate-800 mb-6">สร้างรายวิชาใหม่ (Admin)</h2>
            
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">รหัสวิชา</label>
                <input
                  required
                  type="text"
                  value={newCourse.code}
                  onChange={(e) => setNewCourse({...newCourse, code: e.target.value})}
                  placeholder="เช่น IT-302"
                  className="w-full mt-1 p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
                />
              </div>
              
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">ชื่อวิชา</label>
                <input
                  required
                  type="text"
                  value={newCourse.name}
                  onChange={(e) => setNewCourse({...newCourse, name: e.target.value})}
                  placeholder="เช่น Image Processing AI"
                  className="w-full mt-1 p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
                />
              </div>

              {/* ชิ้นส่วนสำคัญ: เลือกอาจารย์ผู้รับผิดชอบวิชา */}
              <div>
                <label className="text-[10px] font-black text-blue-600 uppercase ml-1 tracking-wider">อาจารย์ผู้สอนรายวิชา</label>
                <select
                  required
                  value={newCourse.teacherId}
                  onChange={(e) => setNewCourse({...newCourse, teacherId: e.target.value})}
                  className="w-full mt-1 p-4 bg-blue-50/50 border border-blue-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-700 appearance-none cursor-pointer"
                >
                  <option value="" disabled>-- เลือกอาจารย์ผู้สอน --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.department ? `(${t.department})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 mt-6 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 py-4 font-black text-slate-400 hover:text-slate-600 transition-all text-sm"
                >
                  ยกเลิก
                </button>
                <button 
                  disabled={isCreating} 
                  type="submit" 
                  className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:bg-slate-300 transition-all active:scale-[0.98]"
                >
                  {isCreating ? 'กำลังบันทึก...' : 'ตกลงสร้างวิชา'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}