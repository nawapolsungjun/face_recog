'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

export default function AdminCourseManagementPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newCourse, setNewCourse] = useState({ code: '', name: '', teacherId: '' });

  const [showCreateConfirmModal, setShowCreateConfirmModal] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<{ id: string; name: string } | null>(null);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/courses');
      const json = await res.json();
      if (json.success && json.data) {
        setCourses(json.data.courses || []);
        setTeachers(json.data.teachers || []);
      }
    } catch (err) {
      console.error("Fetch courses error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleOpenCreateConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.code.trim() || !newCourse.name.trim() || !newCourse.teacherId) {
      alert('กรุณากรอกข้อมูลและเลือกอาจารย์ผู้สอนให้ครบถ้วน');
      return;
    }
    setShowCreateConfirmModal(true);
  };

  const handleConfirmCreateCourse = async () => {
    setIsCreating(true);
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseCode: newCourse.code.trim(),
          courseName: newCourse.name.trim(),
          teacherId: newCourse.teacherId
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('สร้างรายวิชาใหม่สำเร็จเรียบร้อย');
        setShowCreateConfirmModal(false);
        setIsModalOpen(false);
        setNewCourse({ code: '', name: '', teacherId: '' });
        fetchInitialData();
      } else {
        alert(data.error || 'สร้างวิชาไม่สำเร็จ');
        setShowCreateConfirmModal(false);
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      setShowCreateConfirmModal(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfirmDeleteCourse = async () => {
    if (!courseToDelete) return;
    try {
      const res = await fetch(`/api/admin/courses?id=${courseToDelete.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        alert('ลบรายวิชาเรียบร้อยแล้ว');
        setCourseToDelete(null);
        fetchInitialData();
      } else {
        alert(json.error || 'เกิดข้อผิดพลาดในการลบ');
      }
    } catch {
      alert('การเชื่อมต่อฐานข้อมูลล้มเหลว');
    }
  };

  const selectedTeacherObj = teachers.find(t => String(t.id) === String(newCourse.teacherId));

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f7f4] font-sans text-slate-800">
      
      {/* 1. Header ด้านบน */}
      <header className="bg-[#0f766e] text-white pt-8 pb-6 px-4 text-center shadow-sm relative">
        <div className="absolute top-6 left-6">
          <Link
            href="/admin/dashboard"
            className="text-emerald-100 hover:text-white font-bold inline-flex items-center gap-2 text-xs uppercase tracking-wider transition-all"
          >
            ← Back to Dashboard
          </Link>
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1">
          ระบบตรวจสอบรายชื่อเข้าชั้นเรียน
        </h1>
        <p className="text-emerald-100 font-medium text-xs md:text-sm">
          สาขาวิชานวัตกรรมระบบสารสนเทศ
        </p>
      </header>

      {/* 2. Navigation Bar */}
      <nav className="bg-[#0d9488] shadow-inner px-4 overflow-x-auto">
        <div className="max-w-5xl mx-auto flex items-center justify-start gap-2 min-w-max py-2 text-white font-bold text-xs">
          <span className="px-3 py-1 bg-white/20 rounded-lg">จัดการรายวิชาในระบบ (Admin)</span>
        </div>
      </nav>

      {/* 3. Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8">
        
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800">รายวิชาในระบบ</h2>
            <p className="text-slate-500 text-xs font-medium mt-1">ตรวจสอบและควบคุมรายวิชาทั้งหมดที่ถูกสร้างขึ้นในระบบ</p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm shadow-sm transition-all cursor-pointer"
          >
            + สร้างรายวิชาใหม่
          </button>
        </div>

        {/* ตารางแสดงผลรายวิชา */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/60">
                  <th className="p-4 text-xs font-bold text-slate-600 w-16 text-center">ลำดับ</th>
                  <th className="p-4 text-xs font-bold text-slate-600 w-32">รหัสวิชา</th>
                  <th className="p-4 text-xs font-bold text-slate-600">ชื่อรายวิชา</th>
                  <th className="p-4 text-xs font-bold text-slate-600">อาจารย์ผู้สอน</th>
                  <th className="p-4 text-xs font-bold text-slate-600 text-center w-56">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td colSpan={5} className="text-center p-14 text-slate-400 font-bold text-xs animate-pulse">
                      กำลังดึงข้อมูลรายวิชาจากระบบ...
                    </td>
                  </tr>
                )}

                {!loading && courses.map((course, idx) => (
                  <tr key={course.id || idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-4 text-xs font-bold text-slate-400 text-center">
                      {idx + 1}
                    </td>
                    <td className="p-4 font-mono font-bold text-emerald-700 text-xs md:text-sm">
                      {course.courseCode}
                    </td>
                    <td className="p-4">
                      <Link 
                        href={`/admin/courses/${course.id}/students`} 
                        className="font-bold text-slate-800 hover:text-emerald-700 transition-colors text-xs md:text-sm inline-block"
                      >
                        {course.courseName}
                      </Link>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        นักศึกษาในชั้นเรียน: {course._count?.students || 0} คน
                      </div>
                    </td>
                    <td className="p-4 text-xs font-medium text-slate-700">
                      {course.teacherDisplayName || (
                        <span className="text-amber-600 italic text-xs">ไม่พบผู้สอน / บัญชีถูกลบ</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center items-center gap-1.5 flex-wrap">
                        {/* ปุ่มดูรายชื่อ */}
                        <Link
                          href={`/admin/courses/${course.id}/students`}
                          className="text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white px-2.5 py-1.5 rounded-xl text-xs font-bold border border-emerald-200/60 transition-all whitespace-nowrap"
                        >
                          รายชื่อ
                        </Link>

                        {/* ปุ่มดูรายงานเฉพาะวิชา */}
                        <Link
                          href={`/admin/reports/courses/${course.id}`}
                          className="text-slate-600 bg-slate-50 hover:bg-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-bold border border-slate-200/60 transition-all whitespace-nowrap"
                        >
                          รายงาน
                        </Link>

                        <button
                          onClick={() => setCourseToDelete({ id: course.id, name: course.courseName })}
                          className="text-red-600 bg-red-50 hover:bg-red-600 hover:text-white px-2.5 py-1.5 rounded-xl text-xs font-bold border border-red-200/60 transition-all whitespace-nowrap cursor-pointer"
                        >
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!loading && courses.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center p-14 text-slate-400 font-bold text-xs">
                      ยังไม่มีรายวิชาถูกสร้างขึ้นในระบบขณะนี้
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* 4. Footer ด้านล่าง */}
      <footer className="bg-white text-[#0f766e] py-4 px-4 text-center text-xs font-medium border-t border-slate-100 mt-auto">
        ระบบตรวจสอบรายชื่อเข้าชั้นเรียนสาขาวิชานวัตกรรมระบบสารสนเทศ
      </footer>

      {/* Modal สร้างรายวิชาใหม่ */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 md:p-8 shadow-xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-black text-slate-800 mb-5">สร้างรายวิชาใหม่ (Admin)</h2>

            <form onSubmit={handleOpenCreateConfirm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">รหัสวิชา</label>
                <input
                  required
                  type="text"
                  value={newCourse.code}
                  onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                  placeholder="เช่น IT-302"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs md:text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อวิชา</label>
                <input
                  required
                  type="text"
                  value={newCourse.name}
                  onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                  placeholder="เช่น Image Processing AI"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs md:text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-700 mb-1">อาจารย์ผู้สอนรายวิชา</label>
                <select
                  required
                  value={newCourse.teacherId}
                  onChange={(e) => setNewCourse({ ...newCourse, teacherId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs md:text-sm font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
                >
                  <option value="" disabled>-- เลือกอาจารย์ผู้สอน --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 mt-6 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 font-bold text-slate-400 hover:text-slate-600 text-xs rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all active:scale-[0.99] cursor-pointer"
                >
                  ตกลงสร้างวิชา
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Popup: ยืนยันการสร้างรายวิชา */}
      {showCreateConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-xl border border-slate-100 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4 font-black text-xl">
              ✓
            </div>

            <h3 className="text-xl font-black text-slate-800">ยืนยันการสร้างรายวิชา</h3>
            <p className="text-xs text-slate-400 mt-1">
              กรุณาตรวจสอบความถูกต้องของข้อมูลรายวิชา
            </p>

            <div className="bg-slate-50 rounded-xl p-4 my-5 text-xs text-slate-600 text-left space-y-2 border border-slate-200/60">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">รหัสวิชา:</span>
                <span className="font-mono font-bold text-emerald-700">{newCourse.code.trim()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">ชื่อวิชา:</span>
                <span className="font-bold text-slate-800">{newCourse.name.trim()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">อาจารย์ผู้สอน:</span>
                <span className="font-bold text-slate-700">{selectedTeacherObj?.name || '-'}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={isCreating}
                onClick={() => setShowCreateConfirmModal(false)}
                className="flex-1 py-2.5 font-bold text-slate-400 hover:text-slate-600 text-xs rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer"
              >
                แก้ไข
              </button>
              <button
                type="button"
                disabled={isCreating}
                onClick={handleConfirmCreateCourse}
                className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 disabled:bg-slate-300 cursor-pointer"
              >
                {isCreating ? 'กำลังสร้าง...' : 'ยืนยันสร้างวิชา'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup: ยืนยันการลบรายวิชา */}
      {courseToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-xl border border-slate-100 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mx-auto mb-4 font-black text-xl">
              !
            </div>

            <h3 className="text-xl font-black text-slate-800">ยืนยันการลบรายวิชา</h3>
            <p className="text-xs text-slate-500 mt-2">
              คุณต้องการลบวิชา <span className="font-bold text-slate-800">{courseToDelete.name}</span> หรือไม่? <br />
              <span className="text-red-500 font-bold mt-1 inline-block">ข้อมูลการเช็คชื่อและนักศึกษาในวิชานี้จะถูกลบถาวร</span>
            </p>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setCourseToDelete(null)}
                className="flex-1 py-2.5 font-bold text-slate-400 hover:text-slate-600 text-xs rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCourse}
                className="flex-[2] bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                ลบรายวิชา
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}