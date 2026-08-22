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
    } catch (err) {
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
      // ถ้ายังไม่มีข้อมูลใบหน้า -> เปิด Modal เตือนก่อน
      setShowNoFaceJoinModal(true);
    } else {
      // ถ้ามีแล้ว -> เปิด Modal ยืนยันการเข้าเรียนปกติ
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
    } catch (err) {
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
    } catch (err) {
      alert('เกิดข้อผิดพลาด');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-10">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 font-bold animate-pulse uppercase text-xs tracking-widest">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans text-slate-900 print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto print:hidden">
        {/* Header */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 mb-8 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
          <div className="z-10 text-center md:text-left">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">สวัสดีครับ, {user?.displayName}</h1>
            <p className="text-slate-500 font-medium text-sm">รหัสประจำตัว: {user?.studentCode}</p>
          </div>
          <div className="flex items-center gap-3 z-10">
            <button 
              onClick={() => { 
                setEditData({ 
                  firstName: user.firstName || '', 
                  lastName: user.lastName || '', 
                  password: '' 
                }); 
                setIsEditModalOpen(true); 
              }} 
              className="bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-600 px-5 py-2.5 rounded-xl font-bold transition-all text-sm cursor-pointer"
            >
              โปรไฟล์
            </button>
            <button 
              onClick={() => setShowLogoutModal(true)} 
              className="text-red-500 font-bold text-sm hover:bg-red-50 px-4 py-2 rounded-xl transition-all cursor-pointer"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>

        {/* แถบแจ้งเตือนสแกนหน้า */}
        {showFaceWarning && !(user?.faceVectors || user?.hasFaceVectors) && (
          <div className="mb-8 animate-in slide-in-from-top duration-500">
            <div className="bg-amber-50 border-2 border-dashed border-amber-200 rounded-[2rem] p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-center md:text-left">
                <div>
                  <h3 className="font-black text-amber-800 tracking-tight">ยังไม่ได้ลงทะเบียนใบหน้า</h3>
                  <p className="text-amber-600/80 text-xs font-bold uppercase tracking-widest mt-0.5">
                    กรุณาลงทะเบียนเพื่อใช้งานระบบเช็คชื่ออัตโนมัติ
                  </p>
                </div>
              </div>

              <Link
                href="/student/face-enrollment"
                className="bg-amber-500 hover:bg-amber-600 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-lg shadow-amber-200 transition-all active:scale-95 whitespace-nowrap"
              >
                ลงทะเบียนเดี๋ยวนี้
              </Link>
            </div>
          </div>
        )}

        {/* ฟอร์มเข้าร่วมชั้นเรียน */}
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 mb-10 text-slate-900 relative">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">เข้าร่วมชั้นเรียน</h2>
          <form onSubmit={handleJoinClick} className="flex flex-col md:flex-row gap-4">
            <input 
              type="text" 
              placeholder="กรอกรหัส Classroom" 
              required 
              className="flex-1 p-4 bg-slate-50 rounded-2xl text-slate-800 outline-none font-bold border border-slate-200 focus:ring-2 focus:ring-blue-500" 
              value={courseCode} 
              onChange={(e) => setCourseCode(e.target.value)} 
            />
            <button type="submit" className="bg-slate-900 hover:bg-black text-white px-8 py-4 rounded-2xl font-bold shadow-lg transition-all active:scale-95 cursor-pointer">
              JOIN
            </button>
          </form>
          {status && <p className="mt-4 text-xs font-bold text-blue-600">{status}</p>}
        </div>

        {/* Courses List */}
        <h2 className="text-2xl font-black text-slate-800 mb-6">วิชาที่ลงทะเบียน</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {myCourses.length > 0 ? myCourses.map((course) => (
            <div key={course.id} onClick={() => handleOpenDetails(course.id)} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:scale-[1.02] cursor-pointer transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase">{course.courseCode}</div>
                <span className="text-[10px] text-green-500 font-black tracking-widest uppercase">• Active</span>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-1">{course.courseName}</h3>
              <p className="text-slate-400 text-xs mb-4 italic">คลิกดูเพื่อนและประวัติเช็คชื่อ</p>
              <div className="w-full bg-slate-50 text-slate-400 text-center py-2.5 rounded-xl text-[10px] font-black border border-slate-50 uppercase">Face Scan System</div>
            </div>
          )) : (
            <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 font-bold">ยังไม่มีวิชาที่เข้าร่วม...</div>
          )}
        </div>
      </div>

      {/* 1. Modal แจ้งเตือนกรณี "ยังไม่ได้ลงทะเบียนใบหน้า" เมื่อกดเข้าเรียน */}
      {showNoFaceJoinModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 font-black text-2xl">
              !
            </div>
            
            <h3 className="text-2xl font-black text-slate-800">ยังไม่ลงทะเบียนใบหน้า</h3>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed font-medium">
              หากคุณเข้าชั้นเรียนตอนนี้ <br />
              <span className="text-amber-600 font-bold">จะไม่สามารถเช็คชื่อด้วยใบหน้าได้</span> <br />
              คุณต้องการดำเนินการอย่างไร?
            </p>

            <div className="bg-slate-50 rounded-2xl p-4 my-6 text-xs text-slate-600 text-left space-y-2 border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">รหัสวิชาที่จะเข้าร่วม:</span>
                <span className="font-mono font-black text-blue-600 text-sm">{courseCode.trim()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">สถานะใบหน้า:</span>
                <span className="font-bold text-red-500">ยังไม่มีข้อมูลในระบบ</span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              {/* ปุ่มลงทะเบียนใบหน้าก่อน */}
              <Link
                href="/student/face-enrollment"
                className="w-full bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-200 transition-all active:scale-95 text-center"
              >
                ลงทะเบียนใบหน้าก่อน
              </Link>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowNoFaceJoinModal(false)}
                  className="flex-1 py-3.5 font-bold text-slate-400 hover:text-slate-600 transition-all text-xs rounded-2xl bg-slate-50 hover:bg-slate-100 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={isJoining}
                  onClick={handleConfirmJoinClass}
                  className="flex-1 bg-slate-900 hover:bg-black text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 disabled:bg-slate-300 cursor-pointer"
                >
                  {isJoining ? 'กำลังเข้าร่วม...' : 'ยืนยันเข้าชั้นเรียน'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal ป๊อบอัปยืนยันการเข้าร่วมชั้นเรียน (กรณีมีใบหน้าแล้ว) */}
      {showJoinConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 font-black text-2xl">
              ✓
            </div>
            
            <h3 className="text-2xl font-black text-slate-800">ยืนยันการเข้าร่วมชั้นเรียน</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              คุณต้องการเข้าร่วมรายวิชารหัส <br />
              <span className="font-mono font-black text-blue-600 text-base">{courseCode.trim()}</span> ใช่หรือไม่?
            </p>

            <div className="bg-slate-50 rounded-2xl p-4 my-6 text-xs text-slate-600 text-left space-y-2 border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">นักศึกษา:</span>
                <span className="font-black text-slate-800">{user?.displayName}</span>
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
                className="flex-1 py-4 font-black text-slate-400 hover:text-slate-600 transition-all text-sm rounded-2xl bg-slate-50 hover:bg-slate-100 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isJoining}
                onClick={handleConfirmJoinClass}
                className="flex-[2] bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl transition-all active:scale-95 disabled:bg-slate-300 cursor-pointer"
              >
                {isJoining ? 'กำลังเข้าร่วม...' : 'ยืนยัน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal Popup: ยืนยันการออกจากระบบของนักศึกษา */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 font-black text-2xl">
              !
            </div>
            
            <h3 className="text-2xl font-black text-slate-800">ยืนยันการออกจากระบบ</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              คุณต้องการออกจากระบบการใช้งานในฐานะนักศึกษาใช่หรือไม่?
            </p>

            <div className="flex gap-3 mt-8">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
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

      {/* Modal รายละเอียดวิชา */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 print:static print:bg-white print:p-0">
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl print:shadow-none print:rounded-none print:max-h-none">
            <div className="p-8 border-b flex justify-between items-center bg-white sticky top-0 z-10 print:border-none">
              <div>
                <h2 className="text-2xl font-black text-slate-800">{selectedCourseData?.courseName || 'กำลังโหลด...'}</h2>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-tight">นักศึกษา: {user?.displayName} ({user?.studentCode})</p>
              </div>
              <div className="flex gap-3 print:hidden">
                <button onClick={() => window.print()} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg transition-all active:scale-95 text-sm cursor-pointer">พิมพ์รายงาน</button>
                <button onClick={() => { setIsDetailModalOpen(false); setSelectedCourseData(null); }} className="bg-slate-100 text-slate-500 px-5 py-2.5 rounded-xl font-bold text-sm cursor-pointer">ปิด</button>
              </div>
            </div>

            {isLoadingDetail ? (
              <div className="p-20 text-center text-slate-400 font-bold animate-pulse">กำลังดึงข้อมูล...</div>
            ) : selectedCourseData && (
              <div className="p-8 overflow-y-auto flex-1 space-y-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl text-center border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase">ทั้งหมด</p>
                    <p className="text-2xl font-black text-slate-800">{selectedCourseData.summary.total}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-2xl text-center border border-green-100">
                    <p className="text-[10px] font-black text-green-500 uppercase">มาเรียน</p>
                    <p className="text-2xl font-black text-green-700">{selectedCourseData.summary.present}</p>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-2xl text-center border border-amber-100">
                    <p className="text-[10px] font-black text-amber-500 uppercase">มาสาย</p>
                    <p className="text-2xl font-black text-amber-700">{selectedCourseData.summary.late}</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-2xl text-center border border-red-100">
                    <p className="text-[10px] font-black text-red-500 uppercase">ขาดเรียน</p>
                    <p className="text-2xl font-black text-red-700">{selectedCourseData.summary.absent}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="print:hidden">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-black text-slate-800 text-sm uppercase">เพื่อนในคลาส ({selectedCourseData.friends.length})</h3>
                      <input 
                        type="text" 
                        placeholder="ค้นหาเพื่อน..." 
                        className="text-[10px] p-2 bg-slate-50 border rounded-lg outline-none w-32" 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                      />
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {selectedCourseData.friends
                        .filter((f: any) => {
                          const friendName = `${f.firstName || ''} ${f.lastName || ''}`.trim() || f.name || '';
                          return friendName.toLowerCase().includes(searchTerm.toLowerCase());
                        })
                        .map((f: any) => {
                          const friendName = `${f.firstName || ''} ${f.lastName || ''}`.trim() || f.name || 'ไม่ระบุชื่อ';
                          return (
                            <div key={f.id} className="flex justify-between p-3 bg-slate-50 rounded-xl text-xs border border-slate-50">
                              <span className="font-bold text-slate-700">{friendName}</span>
                              <span className="text-slate-400 font-mono">{f.studentCode}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  <div className="print:col-span-2">
                    <h3 className="font-black text-slate-800 text-sm uppercase mb-4">ประวัติการเข้าเรียน</h3>
                    <div className="border rounded-2xl overflow-hidden shadow-sm">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase">
                          <tr><th className="px-4 py-3">วันที่</th><th className="px-4 py-3 text-right">สถานะ</th></tr>
                        </thead>
                        <tbody>
                          {selectedCourseData.attendance.length > 0 ? selectedCourseData.attendance.map((a: any) => (
                            <tr key={a.id} className="border-t">
                              <td className="px-4 py-3 font-bold text-slate-600">{new Date(a.createdAt).toLocaleDateString('th-TH')}</td>
                              <td className="px-4 py-3 text-right">
                                <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${a.status === 'มาเรียน' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>{a.status}</span>
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
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-black mb-6 text-slate-800">จัดการข้อมูลส่วนตัว</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">ชื่อจริง</label>
                  <input 
                    type="text" 
                    required
                    className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700" 
                    value={editData.firstName} 
                    onChange={(e) => setEditData({ ...editData, firstName: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">นามสกุล</label>
                  <input 
                    type="text" 
                    required
                    className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700" 
                    value={editData.lastName} 
                    onChange={(e) => setEditData({ ...editData, lastName: e.target.value })} 
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">รหัสผ่านใหม่</label>
                <input 
                  type="password" 
                  placeholder="ปล่อยว่างถ้าไม่ต้องการเปลี่ยน" 
                  className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700" 
                  value={editData.password} 
                  onChange={(e) => setEditData({ ...editData, password: e.target.value })} 
                />
              </div>

              <div className="pt-6 border-t border-slate-100">
                <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest block mb-2">โมเดลใบหน้า (Face Scan)</label>
                <p className="text-xs text-slate-500 mb-4 font-medium italic">สามารถอัปเดตใบหน้าใหม่ได้ หากระบบสแกนเดิมมีปัญหา</p>
                <Link href="/student/re-enroll" className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-slate-100 text-blue-600 font-bold hover:bg-blue-100 transition-all">
                  อัปเดตใบหน้าใหม่
                </Link>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 font-bold text-slate-400 bg-slate-50 rounded-2xl transition-all cursor-pointer">ยกเลิก</button>
                <button type="submit" disabled={isUpdating} className="flex-1 py-4 font-bold text-white bg-blue-600 rounded-2xl shadow-lg transition-all active:scale-95 cursor-pointer">
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