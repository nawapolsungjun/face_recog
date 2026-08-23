'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function StudentListPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const [course, setCourse] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // State สำหรับจัดการการแก้ไขข้อมูลวิชา
  const [isSettingOpen, setIsSettingOpen] = useState(false);
  const [editData, setEditData] = useState({ courseName: '', courseCode: '' });
  const [isDirty, setIsDirty] = useState(false);

  // State สำหรับ Popup ยืนยันต่างๆ
  const [showUpdateCourseModal, setShowUpdateCourseModal] = useState(false);
  const [showArchiveCourseModal, setShowArchiveCourseModal] = useState(false);
  const [showDeleteCourseModal, setShowDeleteCourseModal] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<{ id: any; name: string } | null>(null);

  const getAuthToken = () => localStorage.getItem('teacher_token') || localStorage.getItem('token');

  const fetchCourseData = useCallback(async () => {
    const token = getAuthToken();
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success && json.data) {
        setCourse(json.data);
        setEditData({ courseName: json.data.courseName, courseCode: json.data.courseCode });
        setIsDirty(false);

        if (selectedStudent) {
          const updatedStudent = json.data.students.find((s: any) => s.id === selectedStudent.id);
          if (updatedStudent) {
            const freshName = `${updatedStudent.firstName || ''} ${updatedStudent.lastName || ''}`.trim() || updatedStudent.name || 'ไม่ระบุชื่อ';
            setSelectedStudent({ ...updatedStudent, displayName: freshName });
          }
        }
      } else {
        if (res.status === 401) router.push('/login');
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }
  }, [courseId, router, selectedStudent]);

  useEffect(() => {
    if (courseId) fetchCourseData();
  }, [courseId, fetchCourseData]);

  const handleInputChange = (field: string, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  // ยืนยันแก้ไขข้อมูลวิชา
  const handleConfirmUpdateCourse = async () => {
    const token = getAuthToken();
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editData)
      });
      if (res.ok) {
        setShowUpdateCourseModal(false);
        setIsSettingOpen(false);
        alert('บันทึกการเปลี่ยนแปลงเรียบร้อยแล้ว');
        fetchCourseData();
      } else {
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  // ยืนยันจัดเก็บรายวิชา (Archive)
  const handleConfirmArchiveCourse = async () => {
    const token = getAuthToken();
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'ARCHIVED' })
      });
      if (res.ok) {
        setShowArchiveCourseModal(false);
        router.push('/teacher/dashboard');
      } else {
        alert('ไม่สามารถจัดเก็บรายวิชาได้');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  // ยืนยันลบรายวิชาถาวร
  const handleConfirmDeleteCourse = async () => {
    const token = getAuthToken();
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setShowDeleteCourseModal(false);
        router.push('/teacher/dashboard');
      }
    } catch {
      alert('ไม่สามารถลบวิชาได้');
    }
  };

  const handleStatusChange = async (attendanceId: number, newStatus: string) => {
    const token = getAuthToken();
    try {
      const res = await fetch(`/api/attendance/${attendanceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) fetchCourseData();
    } catch {
      alert('ไม่สามารถอัปเดตสถานะได้');
    }
  };

  // ยืนยันลบนักศึกษาออกจากวิชา
  const handleConfirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    const idToDelete = String(studentToDelete.id);
    const token = getAuthToken();
    setIsDeleting(idToDelete);

    try {
      const res = await fetch(`/api/courses/${courseId}/students/${idToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCourse((prev: any) => ({
          ...prev,
          students: prev.students.filter((s: any) => String(s.id) !== idToDelete)
        }));
        if (selectedStudent?.id === studentToDelete.id) setIsDrawerOpen(false);
        setStudentToDelete(null);
      } else {
        alert(`ลบไม่สำเร็จ: ${data.error}`);
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsDeleting(null);
      setStudentToDelete(null);
    }
  };

  if (!course) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f7f4]">
      <div className="text-center font-bold text-emerald-700 animate-pulse">กำลังโหลดข้อมูล...</div>
    </div>
  );

  const sortedStudents = [...(course.students || [])].sort((a: any, b: any) => {
    const codeA = a.studentCode || '';
    const codeB = b.studentCode || '';
    return codeA.localeCompare(codeB, undefined, { numeric: true });
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f7f4] font-sans text-slate-800">

      {/* 1. Header ด้านบน (หัวข้อตรงกลาง 100% เหมือนหน้า Report) */}
      <header className="bg-[#0f766e] text-white pt-8 pb-6 px-4 text-center shadow-sm relative">
        {/* ปุ่ม Back มุมซ้ายบน */}
        <div className="absolute top-6 left-6">
          <Link
            href="/teacher/dashboard"
            className="text-emerald-100 hover:text-white font-bold inline-flex items-center gap-2 text-xs uppercase tracking-wider transition-all"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* ปุ่มจัดการวิชา มุมขวาบน */}
        <div className="absolute top-6 right-6 hidden md:flex items-center gap-5">
          <button
            onClick={() => setIsSettingOpen(true)}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            ตั้งค่าวิชา
          </button>
          <Link
            href={`/teacher/course/${courseId}`}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow transition-all"
          >
            เริ่มเช็คชื่อ (Face Scan)
          </Link>
        </div>

        {/* ข้อความหัวข้อตรงกลาง */}
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1">
          ระบบเช็คชื่อนักเรียน
        </h1>
        <p className="text-emerald-100 font-medium text-xs md:text-sm">
          วิชา: <span className="font-bold text-white">{course.courseName}</span> <span className="font-mono text-emerald-200">({course.courseCode})</span>
        </p>
      </header>

      {/* 2. Navigation Tabs Bar */}
      <nav className="bg-[#0d9488] shadow-inner px-4 overflow-x-auto">
        <div className="max-w-5xl mx-auto flex items-center justify-center gap-1 min-w-max">
          <Link
            href={`/teacher/course/${courseId}`}
            className="flex items-center gap-2 px-5 py-3 font-bold text-xs md:text-sm text-emerald-50 hover:bg-emerald-700/50 hover:text-white rounded-t-xl transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            เช็คชื่อสแกนใบหน้า
          </Link>

          <Link
            href={`/teacher/report/${courseId}`}
            className="flex items-center gap-2 px-5 py-3 font-bold text-xs md:text-sm text-emerald-50 hover:bg-emerald-700/50 hover:text-white rounded-t-xl transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            รายงานประจำวัน
          </Link>

          <button
            type="button"
            className="flex items-center gap-2 px-5 py-3 font-bold text-xs md:text-sm bg-white text-slate-800 shadow rounded-t-xl"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            จัดการรายชื่อนักศึกษา
          </button>
        </div>
      </nav>

      {/* 3. เนื้อหาหลัก: ตารางรายชื่อนักศึกษา */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8">

        {/* การ์ดสรุปข้อมูลรายวิชา */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">รายวิชา</span>
            <h2 className="text-2xl font-black text-slate-800">{course.courseName}</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-emerald-50 text-emerald-700 font-mono font-bold text-xs px-3.5 py-1.5 rounded-xl border border-emerald-100">
              {course.courseCode}
            </span>
            <span className="bg-slate-50 text-slate-600 font-bold text-xs px-3.5 py-1.5 rounded-xl border border-slate-200/60">
              นักศึกษาทั้งหมด {course.students?.length || 0} คน
            </span>
          </div>
        </div>

        {/* ตารางรายชื่อนักศึกษา */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/60">
                  <th className="p-4 text-xs font-bold text-slate-600 w-16 text-center">ลำดับ</th>
                  <th className="p-4 text-xs font-bold text-slate-600 w-40">รหัสประจำตัว</th>
                  <th className="p-4 text-xs font-bold text-slate-600">ชื่อ - นามสกุล</th>
                  <th className="p-4 text-xs font-bold text-slate-600 text-center w-48">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedStudents.length > 0 ? sortedStudents.map((student: any, index: number) => {
                  const displayName = `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.name || 'ไม่ระบุชื่อ';

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-4 text-xs font-bold text-slate-400 text-center">
                        {index + 1}
                      </td>
                      <td className="p-4 font-mono font-bold text-emerald-700 text-xs md:text-sm">
                        {student.studentCode}
                      </td>
                      <td
                        className="p-4 font-bold text-slate-800 hover:text-emerald-700 cursor-pointer text-xs md:text-sm"
                        onClick={() => { setSelectedStudent({ ...student, displayName }); setIsDrawerOpen(true); }}
                      >
                        {displayName}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => { setSelectedStudent({ ...student, displayName }); setIsDrawerOpen(true); }}
                            className="text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white px-3.5 py-1.5 rounded-xl text-xs font-bold border border-emerald-200/60 transition-all cursor-pointer"
                          >
                            รายงาน
                          </button>
                          <button
                            onClick={() => setStudentToDelete({ id: student.id, name: displayName })}
                            disabled={isDeleting === String(student.id)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${isDeleting === String(student.id)
                                ? 'bg-slate-100 text-slate-300 border-slate-200'
                                : 'text-red-600 bg-red-50 hover:bg-red-600 hover:text-white border-red-200/60'
                              }`}
                          >
                            {isDeleting === String(student.id) ? 'กำลังลบ...' : 'ลบออก'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={4} className="text-center p-14 text-slate-400 font-bold text-xs">
                      ยังไม่มีนักศึกษาเข้าร่วมรายวิชานี้
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* 4. Footer ด้านล่าง */}
      <footer className="bg-[#0f766e] text-emerald-100 py-4 px-4 text-center text-xs font-medium mt-auto">
        © 2026 ระบบตรวจสอบรายชื่อเข้าชั้นเรียนสาขาวิชานวัตกรรมระบบสารสนเทศ
      </footer>

      {/* Modal ตั้งค่ารายวิชา */}
      {isSettingOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 md:p-8 border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800">ตั้งค่ารายวิชา</h2>
              <button
                onClick={() => { setIsSettingOpen(false); setIsDirty(false); }}
                className="text-slate-300 hover:text-slate-500 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อรายวิชา</label>
                <input
                  type="text"
                  value={editData.courseName}
                  onChange={(e) => handleInputChange('courseName', e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">รหัสวิชา</label>
                <input
                  type="text"
                  value={editData.courseCode}
                  onChange={(e) => handleInputChange('courseCode', e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {isDirty && (
                <button
                  onClick={() => setShowUpdateCourseModal(true)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer mt-2"
                >
                  บันทึกการเปลี่ยนแปลง
                </button>
              )}

              {/* Danger Zone */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <label className="block text-[11px] font-bold text-red-500 uppercase tracking-wider">Danger Zone</label>
                <button
                  onClick={() => setShowArchiveCourseModal(true)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 transition-all text-left font-bold text-xs cursor-pointer border border-amber-200/60"
                >
                  <span>จัดเก็บรายวิชา (Archive)</span>
                  <span className="text-[10px] text-amber-600 font-medium">ปิดคลาส</span>
                </button>
                <button
                  onClick={() => setShowDeleteCourseModal(true)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 transition-all text-left font-bold text-xs cursor-pointer border border-red-200/60"
                >
                  <span>ลบรายวิชาถาวร</span>
                  <span className="text-[10px] text-red-500 font-medium">กู้คืนไม่ได้</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup: ยืนยันการแก้ไขข้อมูลวิชา */}
      {showUpdateCourseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-xl border border-slate-100 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4 font-black text-xl">
              ✓
            </div>

            <h3 className="text-xl font-black text-slate-800">ยืนยันการแก้ไขรายวิชา</h3>
            <p className="text-xs text-slate-400 mt-1">
              คุณต้องการบันทึกการเปลี่ยนแปลงข้อมูลวิชานี้ใช่หรือไม่?
            </p>

            <div className="bg-slate-50 rounded-xl p-4 my-5 text-xs text-slate-600 text-left space-y-2 border border-slate-200/60">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">ชื่อวิชาใหม่:</span>
                <span className="font-bold text-slate-800">{editData.courseName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">รหัสวิชาใหม่:</span>
                <span className="font-mono font-bold text-emerald-700">{editData.courseCode}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowUpdateCourseModal(false)}
                className="flex-1 py-2.5 font-bold text-slate-400 hover:text-slate-600 text-xs rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer"
              >
                แก้ไข
              </button>
              <button
                type="button"
                onClick={handleConfirmUpdateCourse}
                className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                ยืนยันบันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup: ยืนยันการจัดเก็บรายวิชา (Archive) */}
      {showArchiveCourseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-xl border border-slate-100 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mx-auto mb-4 font-black text-xl">
              📦
            </div>

            <h3 className="text-xl font-black text-slate-800">ยืนยันการจัดเก็บรายวิชา</h3>
            <p className="text-xs text-slate-500 mt-2">
              วิชานี้จะถูกย้ายไปยังคลังรายวิชา (ปิดคลาส) และจะไม่แสดงผลในหน้ารายวิชาที่กำลังเปิดสอน
            </p>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowArchiveCourseModal(false)}
                className="flex-1 py-2.5 font-bold text-slate-400 hover:text-slate-600 text-xs rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmArchiveCourse}
                className="flex-[2] bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                จัดเก็บรายวิชา
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup: ยืนยันการลบรายวิชาถาวร */}
      {showDeleteCourseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-xl border border-slate-100 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mx-auto mb-4 font-black text-xl">
              !
            </div>

            <h3 className="text-xl font-black text-slate-800">ยืนยันการลบรายวิชา</h3>
            <p className="text-xs text-red-500 font-bold mt-2 leading-relaxed">
              คำเตือน: ข้อมูลนักศึกษาและประวัติเช็คชื่อทั้งหมดในรายวิชานี้จะหายไปถาวรและกู้คืนไม่ได้
            </p>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowDeleteCourseModal(false)}
                className="flex-1 py-2.5 font-bold text-slate-400 hover:text-slate-600 text-xs rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCourse}
                className="flex-[2] bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                ลบวิชาถาวร
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup: ยืนยันการลบนักศึกษาออกจากวิชา */}
      {studentToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-xl border border-slate-100 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mx-auto mb-4 font-black text-xl">
              !
            </div>

            <h3 className="text-xl font-black text-slate-800">ยืนยันการลบนักศึกษา</h3>
            <p className="text-xs text-slate-500 mt-2">
              คุณต้องการลบคุณ <span className="font-bold text-slate-800">{studentToDelete.name}</span> ออกจากรายวิชานี้หรือไม่?
            </p>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="flex-1 py-2.5 font-bold text-slate-400 hover:text-slate-600 text-xs rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStudent}
                className="flex-[2] bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                ลบออกจากวิชา
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Side Drawer รายงานประวัตินักศึกษา */}
      {isDrawerOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsDrawerOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-xl p-6 md:p-8 animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-black text-slate-800 leading-none">{selectedStudent.displayName || selectedStudent.name}</h2>
                <p className="text-xs font-bold text-emerald-700 mt-2 font-mono">{selectedStudent.studentCode}</p>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="text-slate-300 hover:text-slate-600 text-2xl font-bold cursor-pointer">&times;</button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
              {[
                { label: 'มาเรียน', val: 'มาเรียน', color: 'text-emerald-700', bg: 'bg-emerald-50' },
                { label: 'มาสาย', val: 'มาสาย', color: 'text-amber-700', bg: 'bg-amber-50' },
                { label: 'ลา', val: 'ลา', color: 'text-blue-700', bg: 'bg-blue-50' },
                { label: 'ขาดเรียน', val: 'ขาดเรียน', color: 'text-red-700', bg: 'bg-red-50' }
              ].map((item) => (
                <div key={item.val} className={`${item.bg} p-3 rounded-xl text-center border border-slate-100`}>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">{item.label}</p>
                  <p className={`text-xl font-black ${item.color}`}>
                    {selectedStudent.attendances?.filter((a: any) => a.status === item.val).length || 0}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">ประวัติการเช็คชื่อ</h3>
              <div className="space-y-2">
                {selectedStudent.attendances?.sort((a: any, b: any) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()).map((record: any) => (
                  <div key={record.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {new Date(record.createdAt || record.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </p>
                      <p className="text-[10px] font-medium text-slate-400">
                        {new Date(record.createdAt || record.date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                      </p>
                    </div>
                    <select
                      value={record.status}
                      onChange={(e) => handleStatusChange(record.id, e.target.value)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border outline-none cursor-pointer transition-all ${record.status === 'มาเรียน' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          record.status === 'มาสาย' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            record.status === 'ลา' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              'bg-red-50 text-red-700 border-red-200'
                        }`}
                    >
                      <option value="มาเรียน">มาเรียน</option>
                      <option value="มาสาย">มาสาย</option>
                      <option value="ลา">ลา</option>
                      <option value="ขาดเรียน">ขาดเรียน</option>
                    </select>
                  </div>
                ))}
                {(!selectedStudent.attendances || selectedStudent.attendances.length === 0) && (
                  <div className="text-center py-10 text-slate-400 italic text-xs font-bold">ไม่พบข้อมูลการเช็คชื่อ</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}