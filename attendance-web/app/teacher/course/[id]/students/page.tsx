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
      if (json.success) {
        setCourse(json.data);
        setEditData({ courseName: json.data.courseName, courseCode: json.data.courseCode });
        setIsDirty(false);
        
        if (selectedStudent) {
          const updatedStudent = json.data.students.find((s: any) => s.id === selectedStudent.id);
          if (updatedStudent) setSelectedStudent(updatedStudent);
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsDeleting(null);
      setStudentToDelete(null);
    }
  };

  if (!course) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center font-bold text-blue-600 animate-pulse">กำลังโหลดข้อมูล...</div>
    </div>
  );

  const sortedStudents = [...(course.students || [])].sort((a: any, b: any) => {
    const codeA = a.studentCode || '';
    const codeB = b.studentCode || '';
    return codeA.localeCompare(codeB, undefined, { numeric: true });
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans text-slate-900 overflow-x-hidden">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link href="/teacher/dashboard" className="text-blue-600 font-bold inline-flex items-center gap-2 hover:translate-x-[-4px] transition-all text-sm">
            ← กลับหน้า Dashboard
          </Link>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsSettingOpen(true)}
              className="bg-white text-slate-600 px-6 py-2.5 rounded-2xl font-bold text-sm shadow-sm border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer"
            >
              ตั้งค่าวิชา
            </button>
            <Link href={`/teacher/course/${courseId}`} className="bg-slate-900 text-white px-6 py-2.5 rounded-2xl font-bold text-sm shadow-xl hover:bg-black transition-all">
              เริ่มเช็คชื่อ
            </Link>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 mb-8">
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">{course.courseName}</h1>
          <div className="flex items-center gap-4 mt-4">
            <span className="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-xl text-sm font-black uppercase">{course.courseCode}</span>
            <span className="text-slate-500 font-bold">นักศึกษา: <span className="text-blue-600 font-black">{course.students?.length || 0}</span> คน</span>
          </div>
        </div>

        {/* ตารางรายชื่อนักศึกษา */}
        <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="p-6 text-slate-400 font-black uppercase text-[10px] tracking-widest w-16 text-center">ลำดับ</th>
                <th className="p-6 text-slate-400 font-black uppercase text-[10px] tracking-widest">รหัสประจำตัว</th>
                <th className="p-6 text-slate-400 font-black uppercase text-[10px] tracking-widest">ชื่อ - นามสกุล</th>
                <th className="p-6 text-slate-400 font-black uppercase text-[10px] tracking-widest text-center">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedStudents.length > 0 ? sortedStudents.map((student: any, index: number) => {
                const displayName = `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.name || 'ไม่ระบุชื่อ';

                return (
                  <tr key={student.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="p-6 text-sm font-bold text-slate-400 text-center">
                      {index + 1}
                    </td>
                    <td className="p-6 font-mono font-bold text-blue-600 text-base">
                      {student.studentCode}
                    </td>
                    <td
                      className="p-6 font-black text-slate-800 hover:text-blue-600 cursor-pointer transition-all text-lg"
                      onClick={() => { setSelectedStudent({ ...student, displayName }); setIsDrawerOpen(true); }}
                    >
                      {displayName}
                    </td>
                    <td className="p-6 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => { setSelectedStudent({ ...student, displayName }); setIsDrawerOpen(true); }}
                          className="text-blue-600 bg-blue-50 px-4 py-2 rounded-xl text-xs font-black hover:bg-blue-600 hover:text-white transition-all cursor-pointer"
                        >
                          รายงาน
                        </button>
                        <button
                          onClick={() => setStudentToDelete({ id: student.id, name: displayName })}
                          disabled={isDeleting === String(student.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            isDeleting === String(student.id) ? 'bg-slate-100 text-slate-300' : 'text-red-500 bg-red-50 hover:bg-red-500 hover:text-white'
                          }`}
                        >
                          {isDeleting === String(student.id) ? 'กำลังลบ...' : 'ลบออกจากวิชา'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={4} className="text-center p-10 text-slate-400 font-bold">ยังไม่มีนักศึกษาเข้าร่วมรายวิชานี้</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal ตั้งค่ารายวิชา */}
      {isSettingOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-800">ตั้งค่ารายวิชา</h2>
              <button onClick={() => { setIsSettingOpen(false); setIsDirty(false); }} className="text-slate-300 hover:text-slate-500 text-3xl font-light cursor-pointer">&times;</button>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ชื่อรายวิชา</label>
                  <input 
                    type="text"
                    value={editData.courseName}
                    onChange={(e) => handleInputChange('courseName', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">รหัสวิชา</label>
                  <input 
                    type="text"
                    value={editData.courseCode}
                    onChange={(e) => handleInputChange('courseCode', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                  />
                </div>

                {isDirty && (
                  <button 
                    onClick={() => setShowUpdateCourseModal(true)}
                    className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-black text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all cursor-pointer"
                  >
                    บันทึกการเปลี่ยนแปลง
                  </button>
                )}
              </div>

              {/* Danger Zone */}
              <div className="pt-6 border-t border-slate-100 space-y-3">
                <label className="text-[10px] font-black text-red-400 uppercase tracking-widest">Danger Zone</label>
                <button 
                  onClick={() => setShowArchiveCourseModal(true)}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all text-left font-black cursor-pointer"
                >
                  <span className="text-sm">จัดเก็บรายวิชา (Archive)</span>
                  <span className="text-[10px] opacity-60">ปิดคลาส</span>
                </button>
                <button 
                  onClick={() => setShowDeleteCourseModal(true)}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 transition-all text-left font-black cursor-pointer"
                >
                  <span className="text-sm">ลบรายวิชาถาวร</span>
                  <span className="text-[10px] opacity-60">กู้คืนไม่ได้</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup: ยืนยันการแก้ไขข้อมูลวิชา */}
      {showUpdateCourseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70] animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 font-black text-2xl">
              ✓
            </div>
            
            <h3 className="text-2xl font-black text-slate-800">ยืนยันการแก้ไขรายวิชา</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              คุณต้องการบันทึกการเปลี่ยนแปลงข้อมูลวิชานี้ใช่หรือไม่?
            </p>

            <div className="bg-slate-50 rounded-2xl p-4 my-6 text-xs text-slate-600 text-left space-y-2 border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">ชื่อวิชาใหม่:</span>
                <span className="font-black text-slate-800">{editData.courseName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">รหัสวิชาใหม่:</span>
                <span className="font-mono font-bold text-blue-600">{editData.courseCode}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowUpdateCourseModal(false)}
                className="flex-1 py-4 font-black text-slate-400 hover:text-slate-600 transition-all text-sm rounded-2xl bg-slate-50 hover:bg-slate-100 cursor-pointer"
              >
                แก้ไข
              </button>
              <button
                type="button"
                onClick={handleConfirmUpdateCourse}
                className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-blue-100 transition-all active:scale-95 cursor-pointer"
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
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 font-black text-2xl">
              📦
            </div>
            
            <h3 className="text-2xl font-black text-slate-800">ยืนยันการจัดเก็บรายวิชา</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              วิชานี้จะถูกย้ายไปยังคลังรายวิชา (ปิดคลาส) และจะไม่แสดงผลในหน้ารายวิชาที่กำลังเปิดสอน
            </p>

            <div className="flex gap-3 mt-8">
              <button
                type="button"
                onClick={() => setShowArchiveCourseModal(false)}
                className="flex-1 py-4 font-black text-slate-400 hover:text-slate-600 transition-all text-sm rounded-2xl bg-slate-50 hover:bg-slate-100 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmArchiveCourse}
                className="flex-[2] bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-100 transition-all active:scale-95 cursor-pointer"
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
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 font-black text-2xl">
              !
            </div>
            
            <h3 className="text-2xl font-black text-slate-800">ยืนยันการลบรายวิชา</h3>
            <p className="text-xs text-red-500 font-bold mt-2 leading-relaxed">
              คำเตือน: ข้อมูลนักศึกษาและประวัติเช็คชื่อทั้งหมดในรายวิชานี้จะหายไปถาวรและกู้คืนไม่ได้
            </p>

            <div className="flex gap-3 mt-8">
              <button
                type="button"
                onClick={() => setShowDeleteCourseModal(false)}
                className="flex-1 py-4 font-black text-slate-400 hover:text-slate-600 transition-all text-sm rounded-2xl bg-slate-50 hover:bg-slate-100 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCourse}
                className="flex-[2] bg-red-500 hover:bg-red-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-red-100 transition-all active:scale-95 cursor-pointer"
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
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 font-black text-2xl">
              !
            </div>
            
            <h3 className="text-2xl font-black text-slate-800">ยืนยันการลบนักศึกษา</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              คุณต้องการลบคุณ <span className="font-bold text-slate-700 text-sm">{studentToDelete.name}</span> ออกจากรายวิชานี้หรือไม่?
            </p>

            <div className="flex gap-3 mt-8">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="flex-1 py-4 font-black text-slate-400 hover:text-slate-600 transition-all text-sm rounded-2xl bg-slate-50 hover:bg-slate-100 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStudent}
                className="flex-[2] bg-red-500 hover:bg-red-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-red-100 transition-all active:scale-95 cursor-pointer"
              >
                ลบออกจากวิชา
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Side Drawer รายงานนักศึกษา */}
      {isDrawerOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsDrawerOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl p-8 animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-800 leading-none">{selectedStudent.displayName || selectedStudent.name}</h2>
                <p className="text-sm font-bold text-slate-400 mt-2 font-mono">{selectedStudent.studentCode}</p>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="text-slate-300 hover:text-slate-600 text-3xl font-light cursor-pointer">&times;</button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {[
                { label: 'มาเรียน', color: 'green', val: 'มาเรียน' },
                { label: 'มาสาย', color: 'amber', val: 'มาสาย' },
                { label: 'ลา', color: 'blue', val: 'ลา' },
                { label: 'ขาดเรียน', color: 'red', val: 'ขาดเรียน' }
              ].map((item) => (
                <div key={item.val} className={`bg-${item.color}-50 p-4 rounded-3xl text-center border border-${item.color}-100`}>
                  <p className={`text-[10px] font-black text-${item.color}-600 uppercase mb-1`}>{item.label}</p>
                  <p className={`text-2xl font-black text-${item.color}-700`}>
                    {selectedStudent.attendances?.filter((a: any) => a.status === item.val).length || 0}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">ประวัติการเช็คชื่อ</h3>
              <div className="space-y-3">
                {selectedStudent.attendances?.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((record: any) => (
                  <div key={record.id} className="flex justify-between items-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div>
                      <p className="text-sm font-black text-slate-700">
                        {new Date(record.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400">{new Date(record.date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</p>
                    </div>
                    <select
                      value={record.status}
                      onChange={(e) => handleStatusChange(record.id, e.target.value)}
                      className={`text-[10px] font-black px-3 py-1.5 rounded-xl border-none outline-none shadow-sm cursor-pointer transition-all ${
                        record.status === 'มาเรียน' ? 'bg-green-500 text-white' :
                        record.status === 'มาสาย' ? 'bg-amber-400 text-white' :
                        record.status === 'ลา' ? 'bg-blue-500 text-white' : 
                        'bg-red-500 text-white'
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
                  <div className="text-center py-10 text-slate-300 italic text-sm font-bold">ไม่พบข้อมูลการเช็คชื่อ</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}