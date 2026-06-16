'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function AdminCourseStudentsPage() {
  const params = useParams();
  const courseId = params.id as string;

  const [course, setCourse] = useState<any>(null);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- States สำหรับโหมดแก้ไขข้อมูลวิชา ---
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [isSavingCourse, setIsSavingCourse] = useState(false);

  // ---  ฟังก์ชันดึงข้อมูลวิชาและนักศึกษา ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/students`);
      const json = await res.json();
      if (json.success) {
        setCourse(json.data.course);
        setAllStudents(json.data.allStudents);
        // กำหนดค่าเริ่มต้นให้กับฟิลด์แก้ไข
        setEditCode(json.data.course.courseCode);
        setEditName(json.data.course.courseName);
      } else {
        alert(json.error);
      }
    } catch (err) {
      console.error("Error fetching students:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) fetchData();
  }, [courseId]);

  // ---  ฟังก์ชันบันทึกการแก้ไขชื่อ/รหัสวิชา ---
  const handleUpdateCourseDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCode || !editName) return alert("กรุณากรอกข้อมูลให้ครบถ้วนครับ");

    setIsSavingCourse(true);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/students`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseCode: editCode, courseName: editName })
      });
      const json = await res.json();
      if (json.success) {
        alert(" อัปเดตข้อมูลรายวิชาเรียบร้อยแล้วครับ!");
        setIsEditingCourse(false);
        fetchData(); // รีโหลดข้อมูลเพื่อแสดงชื่อใหม่
      } else {
        alert(json.error);
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsSavingCourse(false);
    }
  };

  // --- ฟังก์ชันเพิ่มนักศึกษาเข้าวิชา ---
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return alert("กรุณาเลือกนักศึกษาก่อนครับบอส");

    const isExist = course.students.some((s: any) => s.id === parseInt(selectedStudentId));
    if (isExist) return alert("นักศึกษาคนนี้อยู่ในรายวิชานี้เรียบร้อยแล้วครับ");

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: selectedStudentId })
      });
      const json = await res.json();
      if (json.success) {
        alert("เพิ่มนักศึกษาเข้าชั้นเรียนเรียบร้อย!");
        setSelectedStudentId('');
        fetchData();
      } else {
        alert(json.error);
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- ฟังก์ชันคัดนักศึกษาออกจากวิชา ---
  const handleRemoveStudent = async (studentId: number, studentName: string) => {
    if (!confirm(` ยืนยันการคัดคุณ "${studentName}" ออกจากรายวิชานี้ใช่หรือไม่?\n(ข้อมูลสถิติการเข้าเรียนของนักศึกษาคนนี้ในวิชานี้จะหายไป)`)) return;

    try {
      const res = await fetch(`/api/admin/courses/${courseId}/students?studentId=${studentId}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        alert("คัดนักศึกษาออกจากรายวิชาเรียบร้อยแล้วครับบอส");
        fetchData();
      } else {
        alert(json.error);
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
    }
  };

  if (loading && !course) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <p className="text-slate-400 font-bold animate-pulse text-lg">กำลังโหลดข้อมูลชั้นเรียนของแอดมิน...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans text-slate-900">
      <div className="max-w-4xl mx-auto">
        
        {/* แถบนำทางกลับ */}
        <Link href="/admin/courses" className="text-blue-600 font-bold text-sm uppercase tracking-widest flex items-center gap-2 mb-6 hover:translate-x-[-4px] transition-all">
          ← กลับหน้าจัดการรายวิชาทั้งหมด
        </Link>

        {/* รายละเอียดวิชาหัวข้อหลัก + ฟอร์มแก้ไขในตัว */}
        <div className="bg-slate-800 text-white p-8 rounded-[2.5rem] shadow-xl mb-8 border border-slate-700 relative overflow-hidden">
          <div className="relative z-10">
            
            {!isEditingCourse ? (
              <>
                {/* โหมดโชว์ปกติ */}
                <span className="text-xs font-black bg-blue-500 text-white px-3 py-1.5 rounded-xl uppercase tracking-widest font-mono">
                  {course?.courseCode}
                </span>
                <div className="flex justify-between items-start mt-3 gap-4">
                  <h1 className="text-3xl font-black tracking-tight">{course?.courseName}</h1>
                  <button
                    onClick={() => setIsEditingCourse(true)}
                    className="bg-slate-700/60 hover:bg-slate-700 text-slate-200 hover:text-white px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5"
                  >
                    แก้ไขข้อมูลวิชา
                  </button>
                </div>
                <p className="text-slate-400 font-medium mt-1 text-sm">อาจารย์ผู้สอน: {course?.teacher?.name || 'ไม่ระบุอาจารย์'}</p>
              </>
            ) : (
              /* โหมดเปิดฟอร์มแก้ไข (เมื่อแอดมินกดปุ่มแก้ไข) */
              <form onSubmit={handleUpdateCourseDetails} className="space-y-3 max-w-xl">
                <span className="text-xs font-black bg-amber-500 text-slate-950 px-3 py-1 rounded-md uppercase tracking-wider">
                  แก้ไขข้อมูลรายวิชา
                </span>
                <div className="flex gap-3 mt-2">
                  <div className="w-1/3">
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">รหัสวิชา</label>
                    <input 
                      type="text"
                      value={editCode}
                      onChange={(e) => setEditCode(e.target.value)}
                      className="w-full p-3 bg-slate-700 text-white rounded-xl font-bold outline-none border border-slate-600 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div className="w-2/3">
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">ชื่อวิชาใหม่</label>
                    <input 
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full p-3 bg-slate-700 text-white rounded-xl font-bold outline-none border border-slate-600 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingCourse(false)}
                    className="px-4 py-2 text-slate-400 hover:text-white font-bold text-xs"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingCourse}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black transition-all disabled:bg-slate-600"
                  >
                    {isSavingCourse ? 'กำลังเซฟ...' : 'บันทึกเปลี่ยนชื่อ'}
                  </button>
                </div>
              </form>
            )}

          </div>
          <div className="absolute right-[-20px] bottom-[-20px] text-slate-700/30 text-9xl font-black select-none font-mono">
            ID
          </div>
        </div>

        {/* ฟอร์มเพิ่มนักศึกษาเข้าชั้นเรียน */}
        <div className="bg-white p-6 rounded-[2rem] shadow-md border border-slate-100 mb-8">
          <h2 className="text-lg font-black text-slate-800 mb-4">เพิ่มนักศึกษาเข้าสู่รายวิชานี้</h2>
          <form onSubmit={handleAddStudent} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 cursor-pointer"
              >
                <option value="">-- เลือกนักศึกษาจากฐานข้อมูลระบบ --</option>
                {allStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    [{student.studentCode}] {student.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-xl font-black text-sm shadow-md shadow-blue-100 transition-all active:scale-95 whitespace-nowrap disabled:bg-slate-300"
            >
              {isSubmitting ? 'กำลังบันทึก...' : 'เพิ่มเข้าวิชา'}
            </button>
          </form>
        </div>

        {/*  ตารางแสดงรายชื่อนักศึกษาในวิชานี้ */}
        <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100">
          <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-black text-slate-700 text-base">รายชื่อนักศึกษาในคลาส</h3>
            <span className="text-xs font-black bg-slate-200 text-slate-600 px-3 py-1 rounded-full font-mono">
              ทั้งหมด {course?.students?.length || 0} คน
            </span>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/20">
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">รหัสนักศึกษา</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">ชื่อ-นามสกุล</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {course?.students?.map((student: any) => (
                <tr key={student.id} className="hover:bg-red-50/10 transition-all group">
                  <td className="p-5 font-mono text-sm font-bold text-blue-600">
                    {student.studentCode}
                  </td>
                  <td className="p-5 font-black text-slate-700">
                    {student.name}
                  </td>
                  <td className="p-5 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveStudent(student.id, student.name)}
                      className="bg-red-50 text-red-500 px-4 py-2 rounded-xl font-black text-xs hover:bg-red-600 hover:text-white transition-all shadow-sm"
                    >
                      คัดออกจากการเรียน
                    </button>
                  </td>
                </tr>
              ))}

              {course?.students?.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center p-14 text-slate-400 font-bold">
                     ยังไม่มีนักศึกษาลงทะเบียนในรายวิชานี้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}