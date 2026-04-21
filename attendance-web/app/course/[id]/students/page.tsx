'use client';
import { useEffect, useState } from 'react';
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

  // 🚀 1. State สำหรับจัดการการแก้ไขข้อมูลวิชา
  const [isSettingOpen, setIsSettingOpen] = useState(false);
  const [editData, setEditData] = useState({ courseName: '', courseCode: '' });
  const [isDirty, setIsDirty] = useState(false); // เช็คว่ามีการพิมพ์แก้ไขหรือไม่

  const getAuthToken = () => localStorage.getItem('token');

  const fetchCourseData = async () => {
    const token = getAuthToken();
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setCourse(json.data);
        setEditData({ courseName: json.data.courseName, courseCode: json.data.courseCode });
        setIsDirty(false); // Reset สถานะการแก้ไขเมื่อโหลดข้อมูลใหม่
        
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
  };

  useEffect(() => {
    if (courseId) fetchCourseData();
  }, [courseId]);

  // ฟังก์ชันตรวจจับการพิมพ์
  const handleInputChange = (field: string, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  // 🚀 2. ฟังก์ชันแก้ไขข้อมูลวิชา (เรียกใช้เมื่อกดยืนยันบันทึก)
  const handleUpdateCourse = async () => {
    if (!confirm('ยืนยันการแก้ไขข้อมูลรายวิชาใช่หรือไม่?')) return;
    
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
        alert('บันทึกการเปลี่ยนแปลงเรียบร้อยแล้วครับบอส!');
        fetchCourseData();
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const deleteCourse = async () => {
    if (!confirm('‼️ ยืนยันการลบวิชานี้? ข้อมูลนักศึกษาและประวัติเช็คชื่อทั้งหมดจะหายไปถาวรและกู้คืนไม่ได้')) return;
    const token = getAuthToken();
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) router.push('/teacher/dashboard');
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

  const handleDelete = async (studentId: any, studentName: string) => {
    if (!confirm(`ยืนยันที่จะลบคุณ "${studentName}" ออกจากรายวิชานี้หรือไม่?`)) return;
    const idToDelete = String(studentId);
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
        if (selectedStudent?.id === studentId) setIsDrawerOpen(false);
      } else {
        alert(`ลบไม่สำเร็จ: ${data.error}`);
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsDeleting(null);
    }
  };

  if (!course) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center font-bold animate-bounce text-blue-600">⏳ กำลังโหลด...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans text-slate-900 overflow-x-hidden">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link href="/teacher/dashboard" className="text-blue-600 font-bold inline-flex items-center gap-2 hover:translate-x-[-4px] transition-all">
            ← กลับหน้า Dashboard
          </Link>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsSettingOpen(true)}
              className="bg-white text-slate-600 px-6 py-2.5 rounded-2xl font-bold text-sm shadow-sm border border-slate-200 hover:bg-slate-50 transition-all"
            >
              ⚙️ ตั้งค่าวิชา
            </button>
            <Link href={`/course/${courseId}`} className="bg-slate-900 text-white px-6 py-2.5 rounded-2xl font-bold text-sm shadow-xl hover:bg-black transition-all">
              📸 เริ่มเช็คชื่อ
            </Link>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 mb-8">
          <h1 className="text-4xl font-black text-slate-800">{course.courseName}</h1>
          <div className="flex items-center gap-4 mt-4">
            <span className="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-xl text-sm font-black uppercase">{course.courseCode}</span>
            <span className="text-slate-500 font-bold">นักศึกษา: <span className="text-blue-600 font-black">{course.students?.length || 0}</span> คน</span>
          </div>
        </div>

        {/* ตารางรายชื่อ */}
        <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="p-6 text-slate-400 font-black uppercase text-xs">รหัสนักศึกษา</th>
                <th className="p-6 text-slate-400 font-black uppercase text-xs">ชื่อ-นามสกุล</th>
                <th className="p-6 text-slate-400 font-black uppercase text-xs text-center">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {course.students?.map((student: any) => (
                <tr key={student.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="p-6 font-mono font-bold text-slate-500">{student.studentCode}</td>
                  <td
                    className="p-6 font-black text-slate-800 hover:text-blue-600 cursor-pointer transition-all"
                    onClick={() => { setSelectedStudent(student); setIsDrawerOpen(true); }}
                  >
                    {student.name}
                  </td>
                  <td className="p-6 text-center flex justify-center gap-2">
                    <button
                      onClick={() => { setSelectedStudent(student); setIsDrawerOpen(true); }}
                      className="text-blue-600 bg-blue-50 px-4 py-2 rounded-xl text-xs font-black hover:bg-blue-600 hover:text-white transition-all"
                    >
                      รายงาน
                    </button>
                    <button
                      onClick={() => handleDelete(student.id, student.name)}
                      disabled={isDeleting === String(student.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${isDeleting === String(student.id) ? 'bg-slate-100 text-slate-300' : 'text-red-500 bg-red-50 hover:bg-red-500 hover:text-white'}`}
                    >
                      {isDeleting === String(student.id) ? '...' : 'ลบออกจากวิชา'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🚀 MODAL ตั้งค่ารายวิชา (ปรับปรุงใหม่) */}
      {isSettingOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-800">ตั้งค่ารายวิชา</h2>
              <button onClick={() => { setIsSettingOpen(false); setIsDirty(false); }} className="text-slate-300 hover:text-slate-500 text-3xl font-light">&times;</button>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ชื่อรายวิชา</label>
                  <input 
                    type="text"
                    value={editData.courseName}
                    onChange={(e) => handleInputChange('courseName', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">รหัสวิชา</label>
                  <input 
                    type="text"
                    value={editData.courseCode}
                    onChange={(e) => handleInputChange('courseCode', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 🚀 ปุ่มยืนยันการบันทึก (จะแสดงเมื่อมีการแก้ไขข้อมูลเท่านั้น) */}
                {isDirty && (
                  <button 
                    onClick={handleUpdateCourse}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all animate-in fade-in slide-in-from-top-2"
                  >
                    ✅ บันทึกการเปลี่ยนแปลง
                  </button>
                )}
              </div>

              {/* ส่วนอันตราย */}
              <div className="pt-6 border-t border-slate-100 space-y-3">
                <label className="text-[10px] font-black text-red-400 uppercase tracking-widest">Danger Zone</label>
                <button 
                  onClick={() => {
                    if(confirm('ต้องการจัดเก็บรายวิชานี้ใช่หรือไม่? วิชานี้จะย้ายไปอยู่ที่คลังรายวิชา')) {
                      const token = getAuthToken();
                      fetch(`/api/courses/${courseId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ status: 'ARCHIVED' })
                      }).then(() => router.push('/teacher/dashboard'));
                    }
                  }}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all text-left font-black"
                >
                  <span className="text-sm">📦 จัดเก็บรายวิชา (Archive)</span>
                  <span className="text-[10px] opacity-60">ปิดคลาส</span>
                </button>
                <button 
                  onClick={deleteCourse}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 transition-all text-left font-black"
                >
                  <span className="text-sm">🗑️ ลบรายวิชาถาวร</span>
                  <span className="text-[10px] opacity-60">กู้คืนไม่ได้</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SIDE DRAWER */}
      {isDrawerOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsDrawerOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl p-8 animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-800 leading-none">{selectedStudent.name}</h2>
                <p className="text-sm font-bold text-slate-400 mt-2">{selectedStudent.studentCode}</p>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="text-slate-300 hover:text-slate-600 text-3xl font-light">&times;</button>
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