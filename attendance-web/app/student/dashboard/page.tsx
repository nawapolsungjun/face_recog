'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [courseCode, setCourseCode] = useState('');
  const [myCourses, setMyCourses] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [isPageLoading, setIsPageLoading] = useState(true);

  // State สำหรับ Modal แจ้งเตือนต่างๆ
  const [showJoinConfirmModal, setShowJoinConfirmModal] = useState(false);
  const [showNoFaceJoinModal, setShowNoFaceJoinModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedCourseData, setSelectedCourseData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState({ firstName: '', lastName: '', password: '' });
  const [isUpdating, setIsUpdating] = useState(false);
  const [showFaceWarning, setShowFaceWarning] = useState(false);

  const executeLogout = useCallback(() => {
    localStorage.removeItem('student_user');
    localStorage.removeItem('student_token');
    router.replace('/student/login');
  }, [router]);

  const fetchMyCourses = useCallback(async (studentId: string, token: string) => {
    try {
      const res = await fetch(`/api/student/courses?studentId=${studentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) setMyCourses(json.data);
    } catch (err) {
      console.error("Fetch courses error:", err);
    }
  }, []);

  useEffect(() => {
    const checkUserAndFace = async () => {
      const savedUser = localStorage.getItem('student_user');
      const token = localStorage.getItem('student_token');

      if (!savedUser) {
        router.push('/student/login');
        return;
      }

      const userData = JSON.parse(savedUser);

      if (userData.role !== 'STUDENT') {
        executeLogout();
        return;
      }

      const initialFullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.name || 'นักศึกษา';
      setUser({ ...userData, displayName: initialFullName });

      try {
        const resProfile = await fetch(`/api/student/profile?studentId=${userData.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const profileData = await resProfile.json();

        let hasFace = false;
        if (profileData.success && profileData.data) {
          hasFace = !!profileData.data.faceVectors;
          if (!hasFace) {
            setShowFaceWarning(true);
          }

          const freshName = `${profileData.data.firstName || ''} ${profileData.data.lastName || ''}`.trim() || initialFullName;
          setUser((prev: any) => ({
            ...prev,
            ...profileData.data,
            hasFaceVectors: hasFace,
            displayName: freshName
          }));
        }

        await fetchMyCourses(userData.id, token || '');
        setIsPageLoading(false);
      } catch (err) {
        console.error("Check status error:", err);
        setIsPageLoading(false);
      }
    };

    checkUserAndFace();
  }, [router, fetchMyCourses, executeLogout]);

  const handleOpenDetails = async (courseId: string) => {
    setIsDetailModalOpen(true);
    setIsLoadingDetail(true);
    try {
      const token = localStorage.getItem('student_token');
      const res = await fetch(`/api/student/courses/details?courseId=${courseId}&studentId=${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setSelectedCourseData(json.data);
      }
    } catch {
      alert("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // 1. กดปุ่ม JOIN -> ตรวจสอบว่ามีข้อมูลใบหน้าหรือยัง
  const handleJoinClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseCode.trim()) {
      alert('กรุณากรอกรหัส Classroom');
      return;
    }

    const hasFace = !!(user?.faceVectors || user?.hasFaceVectors);

    if (!hasFace) {
      setShowNoFaceJoinModal(true);
    } else {
      setShowJoinConfirmModal(true);
    }
  };

  // 2. กดยืนยันการเข้าชั้นเรียนจริง
  const handleConfirmJoinClass = async () => {
    setIsJoining(true);
    setStatus('กำลังเข้าร่วม...');
    try {
      const token = localStorage.getItem('student_token');
      const res = await fetch('/api/student/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ studentId: user.id, courseCode: courseCode.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('เข้าร่วมสำเร็จ');
        setCourseCode('');
        setShowJoinConfirmModal(false);
        setShowNoFaceJoinModal(false);
        if (token) fetchMyCourses(user.id, token);
      } else {
        setStatus(`${data.error}`);
        setShowJoinConfirmModal(false);
        setShowNoFaceJoinModal(false);
      }
    } catch {
      setStatus('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      setShowJoinConfirmModal(false);
      setShowNoFaceJoinModal(false);
    } finally {
      setIsJoining(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const token = localStorage.getItem('student_token');
      const res = await fetch('/api/student/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: user.id,
          firstName: editData.firstName,
          lastName: editData.lastName,
          password: editData.password
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (editData.password && editData.password.length > 0) {
          alert('เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบใหม่');
          executeLogout();
          return;
        }
        alert('บันทึกเรียบร้อย');
        const newFullName = `${editData.firstName} ${editData.lastName}`.trim();
        const updatedUser = { 
          ...user, 
          firstName: editData.firstName, 
          lastName: editData.lastName, 
          displayName: newFullName 
        };
        localStorage.setItem('student_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setIsEditModalOpen(false);
      } else {
        alert(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch {
      alert('เกิดข้อผิดพลาด');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-[#f0f7f4] flex items-center justify-center p-10">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-emerald-800 font-bold animate-pulse uppercase text-xs tracking-widest">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f7f4] font-sans text-slate-800 print:bg-white print:p-0">
      
      {/* 1. Header ด้านบนตาม Style Canva (หัวข้อตรงกลาง 100%) */}
      <header className="bg-[#0f766e] text-white pt-8 pb-6 px-4 text-center shadow-sm relative print:hidden">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1">
              ระบบเช็คชื่อนักเรียน
            </h1>
            <p className="text-emerald-100 font-medium text-xs md:text-sm">
              นักศึกษา: <span className="font-bold text-white">{user?.displayName}</span> <span className="font-mono text-emerald-200">({user?.studentCode})</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={() => { 
                setEditData({ 
                  firstName: user.firstName || '', 
                  lastName: user.lastName || '', 
                  password: '' 
                }); 
                setIsEditModalOpen(true); 
              }} 
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              แก้ไขโปรไฟล์
            </button>
            <button 
              onClick={() => setShowLogoutModal(true)} 
              className="bg-red-500/80 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      {/* 2. Navigation Bar */}
      <nav className="bg-[#0d9488] shadow-inner px-4 overflow-x-auto print:hidden">
        <div className="max-w-4xl mx-auto flex items-center justify-start gap-1 min-w-max py-2 text-white font-bold text-xs">
          <span className="px-3 py-1 bg-white/20 rounded-lg">หน้าหลักนักศึกษา</span>
        </div>
      </nav>

      {/* 3. Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8">
        
        {/* แถบแจ้งเตือนสแกนหน้า */}
        {showFaceWarning && !(user?.faceVectors || user?.hasFaceVectors) && (
          <div className="mb-6 animate-in slide-in-from-top duration-500 print:hidden">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-amber-800 text-sm">ยังไม่ได้ลงทะเบียนใบหน้า</h3>
                <p className="text-amber-700 text-xs mt-0.5">กรุณาลงทะเบียนใบหน้าเพื่อใช้งานระบบเช็คชื่ออัตโนมัติ</p>
              </div>
              <Link
                href="/student/face-enrollment"
                className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all whitespace-nowrap"
              >
                ลงทะเบียนเดี๋ยวนี้
              </Link>
            </div>
          </div>
        )}

        {/* ฟอร์มเข้าร่วมชั้นเรียน */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200/80 mb-8 print:hidden">
          <h2 className="text-lg font-black text-slate-800 mb-3">เข้าร่วมชั้นเรียนใหม่</h2>
          <form onSubmit={handleJoinClick} className="flex flex-col sm:flex-row gap-3">
            <input 
              type="text" 
              placeholder="กรอกรหัส Classroom" 
              required 
              className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs md:text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
              value={courseCode} 
              onChange={(e) => setCourseCode(e.target.value)} 
            />
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs md:text-sm shadow-sm transition-all cursor-pointer">
              JOIN
            </button>
          </form>
          {status && <p className="mt-3 text-xs font-bold text-emerald-700">{status}</p>}
        </div>

        {/* Courses List */}
        <h2 className="text-xl font-black text-slate-800 mb-4">วิชาที่ลงทะเบียนแล้ว</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myCourses.length > 0 ? myCourses.map((course) => (
            <div key={course.id} onClick={() => handleOpenDetails(course.id)} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 hover:border-emerald-500/50 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border border-emerald-100">{course.courseCode}</span>
                  <span className="text-[10px] text-emerald-600 font-bold uppercase">• Active</span>
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">{course.courseName}</h3>
                <p className="text-slate-400 text-xs italic mb-4">คลิกเพื่อดูเพื่อนและประวัติเช็คชื่อ</p>
              </div>
              <div className="w-full bg-slate-50 text-slate-500 text-center py-2 rounded-xl text-[10px] font-bold border border-slate-100 uppercase">
                Face Scan System
              </div>
            </div>
          )) : (
            <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400 font-bold text-xs">ยังไม่มีวิชาที่เข้าร่วม...</div>
          )}
        </div>
      </main>

      {/* 4. Footer ด้านล่าง */}
      <footer className="bg-[#0f766e] text-emerald-100 py-4 px-4 text-center text-xs font-medium mt-auto print:hidden">
        © 2026 ระบบตรวจสอบรายชื่อเข้าชั้นเรียนสาขาวิชานวัตกรรมระบบสารสนเทศ
      </footer>

      {/* 1. Modal แจ้งเตือนกรณี "ยังไม่ได้ลงทะเบียนใบหน้า" */}
      {showNoFaceJoinModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-xl border border-slate-100 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mx-auto mb-4 font-black text-xl">
              !
            </div>
            
            <h3 className="text-xl font-black text-slate-800">ยังไม่ลงทะเบียนใบหน้า</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              หากคุณเข้าชั้นเรียนตอนนี้ <br />
              <span className="text-amber-600 font-bold">จะไม่สามารถเช็คชื่อด้วยใบหน้าได้</span> <br />
              คุณต้องการดำเนินการอย่างไร?
            </p>

            <div className="bg-slate-50 rounded-xl p-4 my-5 text-xs text-slate-600 text-left space-y-2 border border-slate-200/60">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">รหัสวิชาที่จะเข้าร่วม:</span>
                <span className="font-mono font-bold text-emerald-700">{courseCode.trim()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">สถานะใบหน้า:</span>
                <span className="font-bold text-red-500">ยังไม่มีข้อมูลในระบบ</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Link
                href="/student/face-enrollment"
                className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-bold text-xs shadow-sm transition-all text-center"
              >
                ลงทะเบียนใบหน้าก่อน
              </Link>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowNoFaceJoinModal(false)}
                  className="flex-1 py-2.5 font-bold text-slate-400 hover:text-slate-600 text-xs rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={isJoining}
                  onClick={handleConfirmJoinClass}
                  className="flex-1 bg-slate-800 hover:bg-slate-900 text-white py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
                >
                  {isJoining ? 'กำลังเข้าร่วม...' : 'ยืนยันเข้าชั้นเรียน'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal ป๊อบอัปยืนยันการเข้าร่วมชั้นเรียน */}
      {showJoinConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-xl border border-slate-100 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4 font-black text-xl">
              ✓
            </div>
            
            <h3 className="text-xl font-black text-slate-800">ยืนยันการเข้าร่วมชั้นเรียน</h3>
            <p className="text-xs text-slate-400 mt-1">
              คุณต้องการเข้าร่วมรายวิชารหัส <br />
              <span className="font-mono font-bold text-emerald-700 text-sm">{courseCode.trim()}</span> ใช่หรือไม่?
            </p>

            <div className="bg-slate-50 rounded-xl p-4 my-5 text-xs text-slate-600 text-left space-y-2 border border-slate-200/60">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">นักศึกษา:</span>
                <span className="font-bold text-slate-800">{user?.displayName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">รหัสประจำตัว:</span>
                <span className="font-mono font-bold text-slate-700">{user?.studentCode}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={isJoining}
                onClick={() => setShowJoinConfirmModal(false)}
                className="flex-1 py-2.5 font-bold text-slate-400 hover:text-slate-600 text-xs rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isJoining}
                onClick={handleConfirmJoinClass}
                className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                {isJoining ? 'กำลังเข้าร่วม...' : 'ยืนยัน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal Popup: ยืนยันการออกจากระบบ */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-xl border border-slate-100 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mx-auto mb-4 font-black text-xl">
              !
            </div>
            
            <h3 className="text-xl font-black text-slate-800">ยืนยันการออกจากระบบ</h3>
            <p className="text-xs text-slate-500 mt-1">
              คุณต้องการออกจากระบบการใช้งานในฐานะนักศึกษาใช่หรือไม่?
            </p>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 font-bold text-slate-400 hover:text-slate-600 text-xs rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={executeLogout}
                className="flex-[2] bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal รายละเอียดวิชา */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 print:static print:bg-white print:p-0">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100 print:shadow-none print:rounded-none print:max-h-none">
            <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10 print:border-none">
              <div>
                <h2 className="text-xl font-black text-slate-800">{selectedCourseData?.courseName || 'กำลังโหลด...'}</h2>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-tight">นักศึกษา: {user?.displayName} ({user?.studentCode})</p>
              </div>
              <div className="flex gap-2 print:hidden">
                <button onClick={() => window.print()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer">พิมพ์รายงาน</button>
                <button onClick={() => { setIsDetailModalOpen(false); setSelectedCourseData(null); }} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold text-xs cursor-pointer">ปิด</button>
              </div>
            </div>

            {isLoadingDetail ? (
              <div className="p-20 text-center text-slate-400 font-bold animate-pulse">กำลังดึงข้อมูล...</div>
            ) : selectedCourseData && (
              <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-6">
                {/* กล่องสรุปสถานะ 4 ช่อง */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">ทั้งหมด</p>
                    <p className="text-xl font-black text-slate-800">{selectedCourseData.summary.total}</p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-xl text-center border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase">มาเรียน</p>
                    <p className="text-xl font-black text-emerald-700">{selectedCourseData.summary.present}</p>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-xl text-center border border-amber-100">
                    <p className="text-[10px] font-bold text-amber-600 uppercase">มาสาย</p>
                    <p className="text-xl font-black text-amber-700">{selectedCourseData.summary.late}</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-xl text-center border border-red-100">
                    <p className="text-[10px] font-bold text-red-600 uppercase">ขาดเรียน</p>
                    <p className="text-xl font-black text-red-700">{selectedCourseData.summary.absent}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* ตารางเพื่อนในคลาส: แสดง ลำดับ, รหัสประจำตัว, ชื่อ - นามสกุล */}
                  <div className="print:hidden">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">เพื่อนในคลาส ({selectedCourseData.friends.length})</h3>
                      <input 
                        type="text" 
                        placeholder="ค้นหาเพื่อน..." 
                        className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none w-40 font-medium" 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                      />
                    </div>
                    
                    <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-sm max-h-64 overflow-y-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100 sticky top-0 bg-slate-50 z-10">
                          <tr>
                            <th className="px-3 py-2.5 w-12 text-center">ลำดับ</th>
                            <th className="px-3 py-2.5 w-32">รหัสประจำตัว</th>
                            <th className="px-3 py-2.5">ชื่อ - นามสกุล</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedCourseData.friends
                            .filter((f: any) => {
                              const friendName = `${f.firstName || ''} ${f.lastName || ''}`.trim() || f.name || '';
                              return friendName.toLowerCase().includes(searchTerm.toLowerCase()) || (f.studentCode && f.studentCode.includes(searchTerm));
                            })
                            .map((f: any, index: number) => {
                              const friendName = `${f.firstName || ''} ${f.lastName || ''}`.trim() || f.name || 'ไม่ระบุชื่อ';
                              return (
                                <tr key={f.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-3 py-2.5 text-center font-bold text-slate-400">
                                    {index + 1}
                                  </td>
                                  <td className="px-3 py-2.5 font-mono font-bold text-emerald-700">
                                    {f.studentCode}
                                  </td>
                                  <td className="px-3 py-2.5 font-bold text-slate-800">
                                    {friendName}
                                  </td>
                                </tr>
                              );
                            })}
                          {selectedCourseData.friends.length === 0 && (
                            <tr>
                              <td colSpan={3} className="p-6 text-center text-slate-400 italic">ไม่พบรายชื่อเพื่อนในคลาส</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ประวัติการเข้าเรียน */}
                  <div className="print:col-span-2">
                    <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">ประวัติการเข้าเรียน</h3>
                    <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-sm max-h-64 overflow-y-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100 sticky top-0 bg-slate-50 z-10">
                          <tr><th className="px-4 py-2.5">วันที่</th><th className="px-4 py-2.5 text-right">สถานะ</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedCourseData.attendance.length > 0 ? selectedCourseData.attendance.map((a: any) => (
                            <tr key={a.id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2.5 font-bold text-slate-600">{new Date(a.createdAt || a.date).toLocaleDateString('th-TH')}</td>
                              <td className="px-4 py-2.5 text-right">
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                                  a.status === 'มาเรียน' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 
                                  a.status === 'มาสาย' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  'bg-red-50 text-red-700 border-red-200'
                                }`}>{a.status}</span>
                              </td>
                            </tr>
                          )) : (
                            <tr><td colSpan={2} className="p-8 text-center text-slate-400 italic">ยังไม่มีข้อมูลการเช็คชื่อ</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal แก้ไขข้อมูลส่วนตัว */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white rounded-2xl p-6 md:p-8 w-full max-w-md shadow-xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-black mb-5 text-slate-800">จัดการข้อมูลส่วนตัว</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อจริง</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500" 
                    value={editData.firstName} 
                    onChange={(e) => setEditData({ ...editData, firstName: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">นามสกุล</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500" 
                    value={editData.lastName} 
                    onChange={(e) => setEditData({ ...editData, lastName: e.target.value })} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">รหัสผ่านใหม่</label>
                <input 
                  type="password" 
                  placeholder="ปล่อยว่างถ้าไม่ต้องการเปลี่ยน" 
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500" 
                  value={editData.password} 
                  onChange={(e) => setEditData({ ...editData, password: e.target.value })} 
                />
              </div>

              <div className="pt-3 border-t border-slate-100">
                <label className="block text-xs font-bold text-emerald-700 mb-1">โมเดลใบหน้า (Face Scan)</label>
                <p className="text-[11px] text-slate-500 mb-3 font-medium">สามารถอัปเดตใบหน้าใหม่ได้ หากระบบสแกนเดิมมีปัญหา</p>
                <Link href="/student/re-enroll" className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-all">
                  อัปเดตใบหน้าใหม่
                </Link>
              </div>

              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-2.5 font-bold text-slate-400 hover:text-slate-600 text-xs rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer">ยกเลิก</button>
                <button type="submit" disabled={isUpdating} className="flex-1 py-2.5 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl text-xs shadow-sm transition-all active:scale-95 cursor-pointer">
                  {isUpdating ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}