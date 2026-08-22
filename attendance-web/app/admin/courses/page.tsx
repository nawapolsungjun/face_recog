'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

export default function AdminCourseManagementPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // States สำหรับ Modal สร้างวิชาใหม่
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newCourse, setNewCourse] = useState({ code: '', name: '', teacherId: '' });

  // States สำหรับ Popup ยืนยัน
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

  // 1. กดสร้างวิชา -> เปิด Popup ยืนยัน
  const handleOpenCreateConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.code.trim() || !newCourse.name.trim() || !newCourse.teacherId) {
      alert('กรุณากรอกข้อมูลและเลือกอาจารย์ผู้สอนให้ครบถ้วน');
      return;
    }
    setShowCreateConfirmModal(true);
  };

  // 2. กดยืนยันใน Popup สร้างวิชาจริง
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
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      setShowCreateConfirmModal(false);
    } finally {
      setIsCreating(false);
    }
  };

  // 3. กดยืนยันลบรายวิชาจริง
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
    } catch (err) {
      alert('การเชื่อมต่อฐานข้อมูลล้มเหลว');
    }
  };

  const selectedTeacherObj = teachers.find(t => String(t.id) === String(newCourse.teacherId));

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans text-slate-900">
      <div className="max-w-5xl mx-auto">
        <Link href="/admin/dashboard" className="text-blue-600 font-bold text-sm uppercase tracking-widest flex items-center gap-2 mb-6 hover:translate-x-[-4px] transition-all">
          ← กลับหน้า Dashboard
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">รายวิชาในระบบ</h1>
            <p className="text-slate-500 font-medium mt-2">ตรวจสอบและควบคุมรายวิชาทั้งหมดที่ถูกสร้างขึ้นในระบบ</p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-2xl font-black text-sm shadow-xl shadow-blue-100 transition-all active:scale-95 cursor-pointer"
          >
            + สร้างรายวิชาใหม่
          </button>
        </div>

        {/* ตารางแสดงผลรายวิชา */}
        <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-16 text-center">ลำดับ</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">รหัสวิชา</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">ชื่อรายวิชา</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">อาจารย์ผู้สอน</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && (
                <tr>
                  <td colSpan={5} className="text-center p-14 text-slate-400 font-bold animate-pulse">
                    กำลังดึงข้อมูลรายวิชาจากระบบ...
                  </td>
                </tr>
              )}

              {!loading && courses.map((course, idx) => (
                <tr key={course.id || idx} className="hover:bg-blue-50/30 transition-all group">
                  <td className="p-6 text-sm font-bold text-slate-400 text-center">
                    {idx + 1}
                  </td>
                  <td className="p-6">
                    <span className="text-xs font-black text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl font-mono">
                      {course.courseCode}
                    </span>
                  </td>
                  <td className="p-6">
                    <div className="font-black text-slate-700 text-lg">{course.courseName}</div>
                    <div className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                      นักศึกษาในชั้นเรียน: {course._count?.students || 0} คน
                    </div>
                  </td>
                  <td className="p-6 text-sm text-slate-600 font-bold">
                    {course.teacherDisplayName || (
                      <span className="text-amber-500 italic text-xs">ไม่พบผู้สอน / บัญชีถูกลบ</span>
                    )}
                  </td>
                  <td className="p-6 text-center">
                    <div className="flex justify-center items-center gap-2">
                      <Link
                        href="/admin/reports/courses"
                        className="bg-slate-100 text-slate-600 px-4 py-2.5 rounded-xl font-black text-xs hover:bg-slate-200 transition-all shadow-sm whitespace-nowrap"
                      >
                        รายงาน
                      </Link>

                      <button
                        onClick={() => setCourseToDelete({ id: course.id, name: course.courseName })}
                        className="bg-red-50 text-red-500 px-4 py-2.5 rounded-xl font-black text-xs hover:bg-red-600 hover:text-white transition-all shadow-sm whitespace-nowrap cursor-pointer"
                      >
                        ลบรายวิชา
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && courses.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center p-14 text-slate-400 font-bold">
                    ยังไม่มีรายวิชาถูกสร้างขึ้นในระบบขณะนี้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL สร้างรายวิชาใหม่สำหรับ Admin */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300 border border-slate-100">
            <h2 className="text-2xl font-black text-slate-800 mb-6">สร้างรายวิชาใหม่ (Admin)</h2>

            <form onSubmit={handleOpenCreateConfirm} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">รหัสวิชา</label>
                <input
                  required
                  type="text"
                  value={newCourse.code}
                  onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
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
                  onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                  placeholder="เช่น Image Processing AI"
                  className="w-full mt-1 p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-blue-600 uppercase ml-1 tracking-wider">อาจารย์ผู้สอนรายวิชา</label>
                <select
                  required
                  value={newCourse.teacherId}
                  onChange={(e) => setNewCourse({ ...newCourse, teacherId: e.target.value })}
                  className="w-full mt-1 p-4 bg-blue-50/50 border border-blue-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-700 appearance-none cursor-pointer"
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
                  className="flex-1 py-4 font-black text-slate-400 hover:text-slate-600 transition-all text-sm cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-[0.98] cursor-pointer"
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
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 font-black text-2xl">
              ✓
            </div>

            <h3 className="text-2xl font-black text-slate-800">ยืนยันการสร้างรายวิชา</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              กรุณาตรวจสอบความถูกต้องของข้อมูลรายวิชา
            </p>

            <div className="bg-slate-50 rounded-2xl p-4 my-6 text-xs text-slate-600 text-left space-y-2 border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">รหัสวิชา:</span>
                <span className="font-mono font-black text-blue-600 text-sm">{newCourse.code.trim()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">ชื่อวิชา:</span>
                <span className="font-black text-slate-800">{newCourse.name.trim()}</span>
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
                className="flex-1 py-4 font-black text-slate-400 hover:text-slate-600 transition-all text-sm rounded-2xl bg-slate-50 hover:bg-slate-100 cursor-pointer"
              >
                แก้ไข
              </button>
              <button
                type="button"
                disabled={isCreating}
                onClick={handleConfirmCreateCourse}
                className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-blue-100 transition-all active:scale-95 disabled:bg-slate-300 cursor-pointer"
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
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 font-black text-2xl">
              !
            </div>

            <h3 className="text-2xl font-black text-slate-800">ยืนยันการลบรายวิชา</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              คุณต้องการลบวิชา <span className="font-bold text-slate-700">{courseToDelete.name}</span> หรือไม่? <br />
              <span className="text-red-500 font-bold">ข้อมูลการเช็คชื่อและนักศึกษาในวิชานี้จะถูกลบถาวร</span>
            </p>

            <div className="flex gap-3 mt-8">
              <button
                type="button"
                onClick={() => setCourseToDelete(null)}
                className="flex-1 py-4 font-black text-slate-400 hover:text-slate-600 transition-all text-sm rounded-2xl bg-slate-50 hover:bg-slate-100 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCourse}
                className="flex-[2] bg-red-500 hover:bg-red-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-red-100 transition-all active:scale-95 cursor-pointer"
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