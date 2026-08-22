'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function TeacherDashboard() {
  const [activeCourses, setActiveCourses] = useState<any[]>([]);
  const [archivedCourses, setArchivedCourses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [isCoursesLoading, setIsCoursesLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({ code: '', name: '' });
  const [teacherInfo, setTeacherInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // State สำหรับแก้ไขโปรไฟล์
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState({ firstName: '', lastName: '', password: '' });
  const [isUpdating, setIsUpdating] = useState(false);

  // State สำหรับ Popup ยืนยันต่างๆ
  const [showProfileConfirmModal, setShowProfileConfirmModal] = useState(false);
  const [showCourseConfirmModal, setShowCourseConfirmModal] = useState(false);
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);
  const [courseToRestore, setCourseToRestore] = useState<any>(null);

  const executeLogout = useCallback(() => {
    localStorage.removeItem('teacher_user');
    localStorage.removeItem('teacher_token');
    router.replace('/login');
  }, [router]);

  // ดึงวิชาที่กำลังเปิดสอน
  const fetchActiveCourses = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/courses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setActiveCourses(json.data);
      } else if (res.status === 401) {
        executeLogout();
      }
    } catch (err) {
      console.error("Fetch active courses error:", err);
    }
  }, [executeLogout]);

  // ดึงวิชาที่ถูกจัดเก็บ (Archive)
  const fetchArchivedCourses = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/courses/archived', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setArchivedCourses(json.data);
      }
    } catch (err) {
      console.error("Fetch archived courses error:", err);
    }
  }, []);

  const loadAllCourses = useCallback(async (token: string) => {
    setIsCoursesLoading(true);
    await Promise.all([fetchActiveCourses(token), fetchArchivedCourses(token)]);
    setIsCoursesLoading(false);
  }, [fetchActiveCourses, fetchArchivedCourses]);

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
        executeLogout();
        return;
      }

      const initialFullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.name || 'อาจารย์';
      setTeacherInfo({ ...userData, displayName: initialFullName });

      const fetchLatestProfile = async () => {
        try {
          const res = await fetch(`/api/teacher/profile?teacherId=${userData.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const resJson = await res.json();
          if (resJson.success && resJson.data) {
            const freshName = `${resJson.data.firstName || ''} ${resJson.data.lastName || ''}`.trim() || initialFullName;
            setTeacherInfo((prev: any) => ({
              ...prev,
              ...resJson.data,
              displayName: freshName,
            }));
          }
        } catch (err) {
          console.error("Failed to load teacher profile:", err);
        }
      };

      fetchLatestProfile();
      loadAllCourses(token);
    } catch (e) {
      executeLogout();
    }
  }, [router, loadAllCourses, executeLogout]);

  const handleOpenEditModal = () => {
    setEditData({ 
      firstName: teacherInfo?.firstName || '', 
      lastName: teacherInfo?.lastName || '', 
      password: '' 
    });
    setIsEditModalOpen(true);
  };

  const handleOpenProfileConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editData.firstName.trim() || !editData.lastName.trim()) {
      alert('กรุณากรอกชื่อจริงและนามสกุล');
      return;
    }
    setShowProfileConfirmModal(true);
  };

  const handleConfirmUpdateProfile = async () => {
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
          firstName: editData.firstName,
          lastName: editData.lastName,
          password: editData.password
        }),
      });

      const data = await res.json();

      if (data.success) {
        setShowProfileConfirmModal(false);
        if (editData.password && editData.password.length > 0) {
          alert('เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบใหม่');
          executeLogout();
          return;
        }

        const newFullName = `${editData.firstName} ${editData.lastName}`.trim();
        const updatedUser = { 
          ...teacherInfo, 
          firstName: editData.firstName, 
          lastName: editData.lastName, 
          displayName: newFullName 
        };
        
        localStorage.setItem('teacher_user', JSON.stringify(updatedUser));
        setTeacherInfo(updatedUser);
        setIsEditModalOpen(false);
        alert('บันทึกข้อมูลเรียบร้อยแล้ว');
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการอัปเดต');
        setShowProfileConfirmModal(false);
      }
    } catch (err) {
      alert('การเชื่อมต่อมีปัญหา');
      setShowProfileConfirmModal(false);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenCourseConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.code.trim() || !newCourse.name.trim()) {
      alert('กรุณากรอกรหัสวิชาและชื่อวิชา');
      return;
    }
    setShowCourseConfirmModal(true);
  };

  const handleConfirmCreateCourse = async () => {
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
          courseCode: newCourse.code.trim(),
          courseName: newCourse.name.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCourseConfirmModal(false);
        setIsModalOpen(false);
        setNewCourse({ code: '', name: '' });
        alert('สร้างรายวิชาสำเร็จเรียบร้อย');
        loadAllCourses(token);
      } else {
        alert(data.error || 'สร้างวิชาไม่สำเร็จ');
        setShowCourseConfirmModal(false);
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการสร้างวิชา');
      setShowCourseConfirmModal(false);
    } finally {
      setIsLoading(false);
    }
  };

  // นำวิชากลับมาเปิดสอน (Restore)
  const handleConfirmRestoreCourse = async () => {
    if (!courseToRestore) return;
    const token = localStorage.getItem('teacher_token');
    try {
      const res = await fetch(`/api/courses/${courseToRestore.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status: 'ACTIVE' })
      });
      if (res.ok) {
        setCourseToRestore(null);
        alert('นำรายวิชากลับมาเปิดสอนเรียบร้อย');
        if (token) loadAllCourses(token);
      } else {
        alert('ไม่สามารถกู้คืนรายวิชาได้');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const colors = ['bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-amber-600', 'bg-rose-600'];
  const displayCourses = activeTab === 'ACTIVE' ? activeCourses : archivedCourses;

  if (!teacherInfo) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">ชั้นเรียนของฉัน</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-slate-500 font-medium">
                อาจารย์: <span className="text-blue-600 font-bold">{teacherInfo.displayName}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleOpenEditModal}
              className="bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-2xl font-bold hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm cursor-pointer"
            >
              แก้ไขโปรไฟล์
            </button>
            <button 
              onClick={() => setIsModalOpen(true)} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-2xl font-bold shadow-lg shadow-blue-100 transition-all cursor-pointer"
            >
              + สร้างวิชาใหม่
            </button>
            <button 
              onClick={() => setShowLogoutConfirmModal(true)} 
              className="bg-white border border-slate-200 text-slate-400 px-5 py-2.5 rounded-2xl font-bold hover:bg-red-50 hover:text-red-600 transition-all shadow-sm cursor-pointer"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>

        {/* แท็บสลับ: กำลังเปิดสอน / คลังรายวิชา (Archive) */}
        <div className="flex items-center justify-between mb-8 border-b border-slate-200/80 pb-4">
          <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
            <button
              onClick={() => setActiveTab('ACTIVE')}
              className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all cursor-pointer ${
                activeTab === 'ACTIVE'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              กำลังเปิดสอน ({activeCourses.length})
            </button>
            <button
              onClick={() => setActiveTab('ARCHIVED')}
              className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all cursor-pointer ${
                activeTab === 'ARCHIVED'
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              คลังรายวิชา (Archive) ({archivedCourses.length})
            </button>
          </div>
        </div>

        {/* Course Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {isCoursesLoading ? (
            <div className="col-span-full py-20 text-center text-slate-400 font-bold animate-pulse">
              กำลังโหลดรายวิชา...
            </div>
          ) : displayCourses.map((course, idx) => (
            <div key={course.id} className="bg-white rounded-[2.5rem] shadow-sm overflow-hidden border border-slate-200 hover:shadow-xl transition-all group">
              <div className={`${activeTab === 'ARCHIVED' ? 'bg-slate-600' : colors[idx % colors.length]} p-8 text-white relative`}>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-white/70 text-xs font-black uppercase">{course.courseCode}</p>
                  {activeTab === 'ARCHIVED' && (
                    <span className="bg-amber-400/90 text-slate-900 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                      Archived
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-bold truncate">{course.courseName}</h2>
                <div className="mt-4 flex items-center gap-2">
                  <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">{course._count?.students || 0} นักศึกษา</span>
                </div>
              </div>
              <div className="p-6 space-y-3">
                {activeTab === 'ARCHIVED' ? (
                  <button
                    onClick={() => setCourseToRestore(course)}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition-all shadow-lg shadow-amber-100 cursor-pointer"
                  >
                    นำกลับมาเปิดสอน (Restore)
                  </button>
                ) : (
                  <Link href={`/teacher/course/${course.id}`} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-slate-900 text-white font-bold hover:bg-black transition-all shadow-lg shadow-slate-200">
                    เริ่มเช็คชื่อ (Face Scan)
                  </Link>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Link href={`/teacher/report/${course.id}`} className="flex items-center justify-center py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all">
                    รายงาน
                  </Link>
                  <Link href={`/teacher/course/${course.id}/students`} className="flex items-center justify-center py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all">
                    จัดการ
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {!isCoursesLoading && displayCourses.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
              <p className="text-slate-400 font-bold">
                {activeTab === 'ARCHIVED' 
                  ? 'ยังไม่มีรายวิชาที่ถูกจัดเก็บในคลัง' 
                  : 'ยังไม่มีรายวิชาที่กำลังเปิดสอน เริ่มสร้างวิชาแรกของคุณได้เลย'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: สร้างวิชาใหม่ */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
            <h2 className="text-2xl font-black text-slate-800 mb-6">สร้างรายวิชาใหม่</h2>
            <form onSubmit={handleOpenCourseConfirm} className="space-y-4">
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
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600 cursor-pointer">
                  ยกเลิก
                </button>
                <button type="submit" className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all cursor-pointer">
                  ตกลงสร้างวิชา
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Popup: ยืนยันการสร้างรายวิชา */}
      {showCourseConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 font-black text-2xl">
              ✓
            </div>
            
            <h3 className="text-2xl font-black text-slate-800">ยืนยันการสร้างรายวิชา</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              กรุณาตรวจสอบความถูกต้องก่อนสร้างรายวิชาใหม่
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
                <span className="font-bold text-slate-700">{teacherInfo.displayName}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setShowCourseConfirmModal(false)}
                className="flex-1 py-4 font-black text-slate-400 hover:text-slate-600 transition-all text-sm rounded-2xl bg-slate-50 hover:bg-slate-100 cursor-pointer"
              >
                แก้ไข
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={handleConfirmCreateCourse}
                className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-blue-100 transition-all active:scale-95 disabled:bg-slate-300 cursor-pointer"
              >
                {isLoading ? 'กำลังสร้าง...' : 'ยืนยันสร้างวิชา'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: แก้ไขโปรไฟล์ */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
            <h2 className="text-2xl font-black text-slate-800 mb-6">ตั้งค่าโปรไฟล์</h2>
            <form onSubmit={handleOpenProfileConfirm} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase ml-1">ชื่อจริง</label>
                  <input
                    required
                    type="text"
                    value={editData.firstName}
                    onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                    className="w-full mt-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
                    placeholder="ชื่อจริง"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase ml-1">นามสกุล</label>
                  <input
                    required
                    type="text"
                    value={editData.lastName}
                    onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                    className="w-full mt-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
                    placeholder="นามสกุล"
                  />
                </div>
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
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600 cursor-pointer">
                  ยกเลิก
                </button>
                <button type="submit" className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg shadow-slate-200 hover:bg-black transition-all cursor-pointer">
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Popup: ยืนยันการแก้ไขโปรไฟล์ */}
      {showProfileConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 font-black text-2xl">
              ✓
            </div>
            
            <h3 className="text-2xl font-black text-slate-800">ยืนยันการบันทึกข้อมูล</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              กรุณาตรวจสอบความถูกต้องของข้อมูลส่วนตัว
            </p>

            <div className="bg-slate-50 rounded-2xl p-4 my-6 text-xs text-slate-600 text-left space-y-2 border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">ชื่อ - นามสกุล:</span>
                <span className="font-black text-slate-800">{editData.firstName} {editData.lastName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">รหัสผ่าน:</span>
                <span className={`font-bold ${editData.password ? 'text-amber-600' : 'text-slate-400'}`}>
                  {editData.password ? 'มีการเปลี่ยนรหัสผ่านใหม่ (ต้องล็อกอินใหม่)' : 'ใช้รหัสผ่านเดิม'}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => setShowProfileConfirmModal(false)}
                className="flex-1 py-4 font-black text-slate-400 hover:text-slate-600 transition-all text-sm rounded-2xl bg-slate-50 hover:bg-slate-100 cursor-pointer"
              >
                แก้ไข
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={handleConfirmUpdateProfile}
                className="flex-[2] bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl transition-all active:scale-95 disabled:bg-slate-300 cursor-pointer"
              >
                {isUpdating ? 'กำลังบันทึก...' : 'ยืนยัน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup: ยืนยันการกู้คืนรายวิชา (Restore from Archive) */}
      {courseToRestore && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 font-black text-2xl">
              📦
            </div>
            
            <h3 className="text-2xl font-black text-slate-800">กู้คืนรายวิชา</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              คุณต้องการนำวิชา <span className="font-bold text-slate-700">{courseToRestore.courseName}</span> ({courseToRestore.courseCode}) กลับมาเปิดสอนตามปกติหรือไม่?
            </p>

            <div className="flex gap-3 mt-8">
              <button
                type="button"
                onClick={() => setCourseToRestore(null)}
                className="flex-1 py-4 font-black text-slate-400 hover:text-slate-600 transition-all text-sm rounded-2xl bg-slate-50 hover:bg-slate-100 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmRestoreCourse}
                className="flex-[2] bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-100 transition-all active:scale-95 cursor-pointer"
              >
                นำกลับมาเปิดสอน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup: ยืนยันการออกจากระบบ */}
      {showLogoutConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 font-black text-2xl">
              !
            </div>
            
            <h3 className="text-2xl font-black text-slate-800">ยืนยันการออกจากระบบ</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              คุณต้องการออกจากระบบการใช้งานในฐานะอาจารย์ใช่หรือไม่?
            </p>

            <div className="flex gap-3 mt-8">
              <button
                type="button"
                onClick={() => setShowLogoutConfirmModal(false)}
                className="flex-1 py-4 font-black text-slate-400 hover:text-slate-600 transition-all text-sm rounded-2xl bg-slate-50 hover:bg-slate-100 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={executeLogout}
                className="flex-[2] bg-red-500 hover:bg-red-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-red-100 transition-all active:scale-95 cursor-pointer"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}