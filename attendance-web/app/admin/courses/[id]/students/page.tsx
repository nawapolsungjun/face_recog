'use client';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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

  // States สำหรับ Searchable Select ที่หน้าตาเหมือน Select Box
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpenSelect, setIsOpenSelect] = useState(false);
  const selectBoxRef = useRef<HTMLDivElement>(null);

  // States สำหรับค้นหาและจัดเรียงรายชื่อนักศึกษาในคลาส
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // States สำหรับโหมดแก้ไขข้อมูลวิชา
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [isSavingCourse, setIsSavingCourse] = useState(false);

  // Modal สำหรับคัดนักศึกษาออก
  const [studentToRemove, setStudentToRemove] = useState<{ id: number; name: string } | null>(null);

  // ปิด Dropdown เมื่อคลิกนอกพื้นที่
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectBoxRef.current && !selectBoxRef.current.contains(event.target as Node)) {
        setIsOpenSelect(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ฟังก์ชันดึงข้อมูลวิชาและนักศึกษา
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/students`);
      const json = await res.json();
      if (json.success && json.data) {
        setCourse(json.data.course);
        setAllStudents(json.data.allStudents || []);
        setEditCode(json.data.course.courseCode || '');
        setEditName(json.data.course.courseName || '');
      } else {
        alert(json.error || 'ไม่พบข้อมูลรายวิชา');
      }
    } catch (err) {
      console.error("Error fetching students:", err);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (courseId) fetchData();
  }, [courseId, fetchData]);

  // ฟังก์ชันบันทึกการแก้ไขชื่อ/รหัสวิชา
  const handleUpdateCourseDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCode.trim() || !editName.trim()) return alert("กรุณากรอกข้อมูลให้ครบถ้วน");

    setIsSavingCourse(true);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/students`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseCode: editCode.trim(), courseName: editName.trim() })
      });
      const json = await res.json();
      if (json.success) {
        alert("อัปเดตข้อมูลรายวิชาเรียบร้อยแล้ว");
        setIsEditingCourse(false);
        fetchData();
      } else {
        alert(json.error);
      }
    } catch {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsSavingCourse(false);
    }
  };

  // ฟังก์ชันเพิ่มนักศึกษาเข้าวิชา
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return alert("กรุณาเลือกนักศึกษา");

    const isExist = course?.students?.some((s: any) => s.id === parseInt(selectedStudentId));
    if (isExist) return alert("นักศึกษาคนนี้อยู่ในรายวิชานี้เรียบร้อยแล้ว");

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: selectedStudentId })
      });
      const json = await res.json();
      if (json.success) {
        alert("เพิ่มนักศึกษาเข้าชั้นเรียนเรียบร้อย");
        setSelectedStudentId('');
        setSearchQuery('');
        fetchData();
      } else {
        alert(json.error);
      }
    } catch {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ฟังก์ชันยืนยันคัดนักศึกษาออกจากวิชา
  const handleConfirmRemoveStudent = async () => {
    if (!studentToRemove) return;

    try {
      const res = await fetch(`/api/admin/courses/${courseId}/students?studentId=${studentToRemove.id}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        alert("คัดนักศึกษาออกจากรายวิชาเรียบร้อยแล้ว");
        setStudentToRemove(null);
        fetchData();
      } else {
        alert(json.error);
      }
    } catch {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
    }
  };

  // นักศึกษาที่ยังไม่ได้ลงทะเบียนในวิชานี้
  const availableStudents = useMemo(() => {
    const enrolledIds = new Set((course?.students || []).map((s: any) => s.id));
    const available = allStudents.filter((s: any) => !enrolledIds.has(s.id));

    return available
      .map((student: any) => {
        const studentName = `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.name || 'ไม่ระบุชื่อ';
        return {
          ...student,
          cleanDisplayName: studentName,
          fullLabel: `[${student.studentCode}] ${studentName}`
        };
      })
      .sort((a: any, b: any) => (a.studentCode || '').localeCompare(b.studentCode || '', undefined, { numeric: true }));
  }, [allStudents, course?.students]);

  // กรองรายชื่อใน Select เมื่อพิมพ์ค้นหา
  const filteredDropdownOptions = useMemo(() => {
    if (!searchQuery.trim()) return availableStudents;
    const q = searchQuery.toLowerCase().trim();
    return availableStudents.filter(
      (s: any) => s.studentCode.toLowerCase().includes(q) || s.cleanDisplayName.toLowerCase().includes(q)
    );
  }, [availableStudents, searchQuery]);

  // กรองและเรียงลำดับรายชื่อนักศึกษาในตารางคลาส
  const filteredAndSortedStudents = useMemo(() => {
    if (!course?.students) return [];
    return [...course.students]
      .filter((student: any) => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase().trim();
        const code = (student.studentCode || '').toLowerCase();
        const studentName = `${student.firstName || ''} ${student.lastName || ''} ${student.name || ''}`.toLowerCase();
        return code.includes(term) || studentName.includes(term);
      })
      .sort((a: any, b: any) => {
        const codeA = a.studentCode || '';
        const codeB = b.studentCode || '';
        if (sortOrder === 'asc') {
          return codeA.localeCompare(codeB, undefined, { numeric: true });
        } else {
          return codeB.localeCompare(codeA, undefined, { numeric: true });
        }
      });
  }, [course?.students, searchTerm, sortOrder]);

  if (loading && !course) {
    return (
      <div className="min-h-screen bg-[#f0f7f4] flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-emerald-800 font-bold animate-pulse text-xs uppercase tracking-widest">กำลังโหลดข้อมูลรายวิชา...</p>
        </div>
      </div>
    );
  }

  const teacherName = course?.teacher?.firstName
    ? `${course.teacher.firstName} ${course.teacher.lastName || ''}`.trim()
    : course?.teacher?.name || 'ไม่ระบุอาจารย์';

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f7f4] font-sans text-slate-800">
      
      {/* 1. Header ด้านบน */}
      <header className="bg-[#0f766e] text-white pt-8 pb-6 px-4 text-center shadow-sm relative">
        <div className="absolute top-6 left-6 flex items-center gap-3">
          <Link
            href="/admin/dashboard"
            className="text-emerald-100 hover:text-white font-bold inline-flex items-center gap-1 text-xs uppercase tracking-wider transition-all"
          >
            ← Dashboard
          </Link>
          <span className="text-emerald-300/60 text-xs">/</span>
          <Link
            href="/admin/courses"
            className="text-emerald-100 hover:text-white font-bold inline-flex items-center gap-1 text-xs uppercase tracking-wider transition-all"
          >
            รายวิชา
          </Link>
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1">
          ระบบตรวจสอบรายชื่อเข้าชั้นเรียน
        </h1>
        <p className="text-emerald-100 font-medium text-xs md:text-sm">
          สาขาวิชานวัตกรรมระบบสารสนเทศ
        </p>
      </header>
  
      {/* 2. Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 space-y-6">
        
        {/* รายละเอียดวิชาหัวข้อหลัก */}
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200/80">
          {!isEditingCourse ? (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 rounded-xl font-mono uppercase">
                    {course?.courseCode}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">
                    อาจารย์ผู้สอน: <span className="text-slate-700">{teacherName}</span>
                  </span>
                </div>
                <h2 className="text-2xl font-black text-slate-800">{course?.courseName}</h2>
              </div>
              <button
                onClick={() => setIsEditingCourse(true)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                แก้ไขข้อมูลวิชา
              </button>
            </div>
          ) : (
            <form onSubmit={handleUpdateCourseDetails} className="space-y-4">
              <span className="text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-lg">
                แก้ไขข้อมูลรายวิชา
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">รหัสวิชา</label>
                  <input 
                    type="text"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl font-bold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">ชื่อวิชาใหม่</label>
                  <input 
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl font-bold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditingCourse(false)}
                  className="px-4 py-2 text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSavingCourse}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all disabled:bg-slate-300 cursor-pointer"
                >
                  {isSavingCourse ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ฟอร์มเพิ่มนักศึกษาเข้าชั้นเรียน (Custom Searchable Select Style) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-base font-black text-slate-800">เพิ่มนักศึกษาเข้าสู่รายวิชานี้</h3>
            <span className="text-xs text-slate-400 font-bold">
              คงเหลือยังไม่ลงทะเบียน {availableStudents.length} คน
            </span>
          </div>

          <form onSubmit={handleAddStudent} className="flex flex-col sm:flex-row gap-3 items-center">
            
            {/* Searchable Select Component */}
            <div className="relative flex-1 w-full" ref={selectBoxRef}>
              <div 
                className="relative w-full cursor-pointer"
                onClick={() => setIsOpenSelect(prev => !prev)}
              >
                <input
                  type="text"
                  placeholder={`-- เลือกนักศึกษาจากฐานข้อมูลระบบ (${availableStudents.length} คนที่ยังไม่ลงทะเบียน) --`}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedStudentId('');
                    setIsOpenSelect(true);
                  }}
                  onFocus={() => setIsOpenSelect(true)}
                  className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-xs md:text-sm font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-text"
                />
                
                {/* ไอคอน Dropdown Arrow ด้านขวาให้เหมือน Select */}
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* เมนูตัวเลือก Dropdown List */}
              {isOpenSelect && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto z-50 divide-y divide-slate-100 animate-in fade-in duration-150">
                  {filteredDropdownOptions.length > 0 ? (
                    filteredDropdownOptions.map((student: any) => (
                      <div
                        key={student.id}
                        onClick={() => {
                          setSelectedStudentId(String(student.id));
                          setSearchQuery(student.fullLabel);
                          setIsOpenSelect(false);
                        }}
                        className={`px-4 py-2.5 text-xs md:text-sm cursor-pointer hover:bg-emerald-50/80 transition-colors flex justify-between items-center ${
                          selectedStudentId === String(student.id) ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-slate-700'
                        }`}
                      >
                        <span className="font-mono font-bold text-emerald-700">[{student.studentCode}]</span>
                        <span className="font-bold text-slate-800">{student.cleanDisplayName}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400 font-bold">
                      ไม่พบข้อมูลที่ตรงกับคำค้นหา
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !selectedStudentId}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-6 py-2.5 rounded-xl font-bold text-xs md:text-sm shadow-sm transition-all whitespace-nowrap disabled:bg-slate-300 cursor-pointer"
            >
              {isSubmitting ? 'กำลังบันทึก...' : '+ เพิ่มเข้าวิชา'}
            </button>
          </form>
        </div>

        {/* แถบค้นหาในคลาส */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex items-center justify-between gap-3">
          <div className="relative w-full max-w-sm">
            <input
              type="text"
              placeholder="ค้นหารหัส หรือ ชื่อในวิชานี้..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <span className="text-xs text-slate-500 font-bold">
            แสดง <span className="text-emerald-700 font-black">{filteredAndSortedStudents.length}</span> จากทั้งหมด {course?.students?.length || 0} คน
          </span>
        </div>

        {/* ตารางแสดงรายชื่อนักศึกษาในวิชานี้ */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/60">
                  <th className="p-4 text-xs font-bold text-slate-600 w-16 text-center">ลำดับ</th>
                  
                  <th 
                    className="p-4 text-xs font-bold text-slate-600 w-48 cursor-pointer select-none hover:bg-slate-100 transition-colors"
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    title="คลิกเพื่อเรียงลำดับรหัส"
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <span>รหัสประจำตัว</span>
                      <span className="text-[10px] bg-slate-200/70 text-slate-600 px-1.5 py-0.5 rounded font-black">
                        {sortOrder === 'asc' ? '▲' : '▼'}
                      </span>
                    </div>
                  </th>

                  <th className="p-4 text-xs font-bold text-slate-600">ชื่อ - นามสกุล</th>
                  <th className="p-4 text-xs font-bold text-slate-600 text-center w-36">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAndSortedStudents.length > 0 ? (
                  filteredAndSortedStudents.map((student: any, index: number) => {
                    const studentName = `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.name || 'ไม่ระบุชื่อ';

                    return (
                      <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-4 text-xs font-bold text-slate-400 text-center">
                          {index + 1}
                        </td>
                        <td className="p-4 font-mono text-xs md:text-sm font-bold text-emerald-700">
                          {student.studentCode}
                        </td>
                        <td className="p-4 font-bold text-slate-800 text-xs md:text-sm">
                          {studentName}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={() => setStudentToRemove({ id: student.id, name: studentName })}
                            className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-xl font-bold text-xs transition-all border border-red-200/60 cursor-pointer"
                          >
                            คัดออก
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center p-14 text-slate-400 font-bold text-xs">
                      {searchTerm ? 'ไม่พบข้อมูลที่ตรงกับคำค้นหา' : 'ยังไม่มีนักศึกษาลงทะเบียนในรายวิชานี้'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* 3. Footer ด้านล่าง */}
      <footer className="bg-white text-[#0f766e] py-4 px-4 text-center text-xs font-medium border-t border-slate-100 mt-auto">
        ระบบตรวจสอบรายชื่อเข้าชั้นเรียนสาขาวิชานวัตกรรมระบบสารสนเทศ
      </footer>

      {/* Modal Popup: ยืนยันการคัดนักศึกษาออก */}
      {studentToRemove && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-xl border border-slate-100 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mx-auto mb-4 font-black text-xl">
              !
            </div>

            <h3 className="text-xl font-black text-slate-800">ยืนยันการคัดนักศึกษาออก</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              คุณต้องการคัดคุณ <span className="font-bold text-slate-800">{studentToRemove.name}</span> ออกจากรายวิชานี้หรือไม่? <br />
              <span className="text-red-500 font-bold mt-1 inline-block">ข้อมูลสถิติการเข้าเรียนของนักศึกษาคนนี้ในวิชานี้จะหายไป</span>
            </p>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setStudentToRemove(null)}
                className="flex-1 py-2.5 font-bold text-slate-400 hover:text-slate-600 text-xs rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-all"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveStudent}
                className="flex-[2] bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                คัดออกจากวิชา
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}