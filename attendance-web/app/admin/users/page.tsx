// attendance-web/app/admin/users/page.tsx
'use client';
import { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function AdminUsersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // กำหนดค่าเริ่มต้นตาม Query Parameter ใน URL
  const [activeTab, setActiveTab] = useState<'STUDENT' | 'TEACHER'>(
    tabParam === 'TEACHER' ? 'TEACHER' : 'STUDENT'
  );

  useEffect(() => {
    if (tabParam === 'TEACHER') {
      setActiveTab('TEACHER');
    } else if (tabParam === 'STUDENT') {
      setActiveTab('STUDENT');
    }
  }, [tabParam]);

  const handleTabChange = (newTab: 'STUDENT' | 'TEACHER') => {
    setActiveTab(newTab);
    router.replace(`/admin/users?tab=${newTab}`, { scroll: false });
  };

  // State การค้นหาและการจัดเรียง
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // State สำหรับ Modal แก้ไขข้อมูล
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    studentCode: '',
    email: '',
    password: '',
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // States สำหรับ Custom Popups
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [successModal, setSuccessModal] = useState<{
    show: boolean;
    title: string;
    message: string;
  }>({
    show: false,
    title: '',
    message: '',
  });

  const getAuthToken = () => localStorage.getItem('admin_token') || localStorage.getItem('token');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const token = getAuthToken();
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setUsers(json.data);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error('Fetch users error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  // กรองตาม Tab, คำค้นหา และเรียงลำดับ
  const processedUsers = useMemo(() => {
    return users
      .filter((u) => {
        if (u.role !== activeTab) return false;
        if (!searchTerm.trim()) return true;

        const term = searchTerm.toLowerCase().trim();
        const code = (u.studentCode || u.username || '').toLowerCase();
        const firstName = (u.firstName || '').toLowerCase();
        const lastName = (u.lastName || '').toLowerCase();
        const fullName = (u.name || `${u.firstName || ''} ${u.lastName || ''}`).toLowerCase();
        const email = (u.email || '').toLowerCase();

        return (
          code.includes(term) ||
          firstName.includes(term) ||
          lastName.includes(term) ||
          fullName.includes(term) ||
          email.includes(term)
        );
      })
      .sort((a, b) => {
        if (activeTab === 'STUDENT') {
          const codeA = (a.studentCode || a.username || '').toString();
          const codeB = (b.studentCode || b.username || '').toString();
          return sortOrder === 'asc'
            ? codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' })
            : codeB.localeCompare(codeA, undefined, { numeric: true, sensitivity: 'base' });
        } else {
          const nameA = (a.firstName || a.name || '').toString();
          const nameB = (b.firstName || b.name || '').toString();
          return sortOrder === 'asc'
            ? nameA.localeCompare(nameB, 'th')
            : nameB.localeCompare(nameA, 'th');
        }
      });
  }, [users, activeTab, searchTerm, sortOrder]);

  const teacherCount = users.filter((u) => u.role === 'TEACHER').length;
  const studentCount = users.filter((u) => u.role === 'STUDENT').length;

  const handleOpenEditModal = (user: any) => {
    setEditingUser(user);
    setEditFormData({
      firstName: user.firstName || (user.name ? user.name.split(' ')[0] : ''),
      lastName: user.lastName || (user.name ? user.name.split(' ').slice(1).join(' ') : ''),
      studentCode: user.studentCode || '',
      email: user.email || '',
      password: '',
    });
  };

  const handleOpenSaveConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSaveConfirmModal(true);
  };

  const handleConfirmSave = async () => {
    if (!editingUser) return;

    setIsSubmittingEdit(true);
    const token = getAuthToken();
    try {
      const res = await fetch('/api/admin/users/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          id: editingUser.id,
          role: editingUser.role,
          ...editFormData
        })
      });

      const json = await res.json();
      if (json.success) {
        setShowSaveConfirmModal(false);
        setEditingUser(null);
        setSuccessModal({
          show: true,
          title: 'แก้ไขข้อมูลเรียบร้อย',
          message: `${editingUser.role === 'STUDENT' ? 'ข้อมูลนักเรียน' : 'ข้อมูลอาจารย์'}ถูกแก้ไขเรียบร้อยแล้ว`,
        });
        fetchUsers();
      } else {
        setShowSaveConfirmModal(false);
        setSuccessModal({
          show: true,
          title: 'เกิดข้อผิดพลาด',
          message: json.error || 'ไม่สามารถแก้ไขข้อมูลได้',
        });
      }
    } catch {
      setShowSaveConfirmModal(false);
      setSuccessModal({
        show: true,
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
      });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!editingUser) return;

    setIsDeleting(true);
    const token = getAuthToken();
    try {
      const res = await fetch(`/api/admin/users?id=${editingUser.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setShowDeleteConfirmModal(false);
        setEditingUser(null);
        setSuccessModal({
          show: true,
          title: 'ลบข้อมูลสำเร็จ',
          message: 'บัญชีผู้ใช้งานถูกลบออกจากระบบเรียบร้อยแล้ว',
        });
        fetchUsers();
      } else {
        setShowDeleteConfirmModal(false);
        setSuccessModal({
          show: true,
          title: 'เกิดข้อผิดพลาด',
          message: json.error || 'ไม่สามารถลบบัญชีผู้ใช้ได้',
        });
      }
    } catch {
      setShowDeleteConfirmModal(false);
      setSuccessModal({
        show: true,
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f7f4] font-sans text-slate-800">
      {/* Header */}
      <header className="bg-[#0f766e] text-white pt-8 pb-6 px-4 text-center shadow-sm relative print:hidden">
        <div className="absolute top-6 left-6">
          <Link
            href="/admin/dashboard"
            className="text-emerald-100 hover:text-white font-bold inline-flex items-center gap-2 text-xs uppercase tracking-wider transition-all"
          >
            ← Back to Dashboard
          </Link>
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1">
          ระบบตรวจสอบรายชื่อด้วยการรู้จำใบหน้า
        </h1>
        <p className="text-emerald-100 font-medium text-xs md:text-sm">
          สาขาวิชานวัตกรรมระบบสารสนเทศ คณะบริหารธุรกิจ มหาวิทยาลัยเทคโนโลยีราชมงคลกรุงเทพ
        </p>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8">
        {/* กล่องหัวเรื่อง + ตัวสลับแท็บ */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200/80 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">รายชื่อผู้ใช้งาน</h2>
            <p className="text-slate-400 font-medium text-xs mt-1">ตรวจสอบและจัดการสิทธิ์การเข้าใช้งานระบบ</p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => handleTabChange('TEACHER')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'TEACHER'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              อาจารย์ ({teacherCount})
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('STUDENT')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'STUDENT'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              นักศึกษา ({studentCount})
            </button>
          </div>
        </div>

        {/* แถบค้นหาข้อมูล */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder={activeTab === 'STUDENT' ? "ค้นหารหัสประจำตัว, ชื่อ, นามสกุล หรือ อีเมล..." : "ค้นหาชื่อ, นามสกุล หรือ อีเมล..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                &times;
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 font-bold w-full sm:w-auto text-right">
            พบข้อมูลทั้งหมด <span className="text-emerald-700 font-black">{processedUsers.length}</span> รายการ
          </div>
        </div>

        {/* ตารางรายชื่อทั้งหมด */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/60">
                  <th className="p-4 text-xs font-bold text-slate-600 w-16 text-center">ลำดับ</th>

                  {/* แสดงคอลัมน์รหัสประจำตัวเฉพาะในแท็บ STUDENT */}
                  {activeTab === 'STUDENT' && (
                    <th
                      className="p-4 text-xs font-bold text-slate-600 w-44 cursor-pointer select-none hover:bg-slate-100/80 transition-colors"
                      onClick={toggleSortOrder}
                      title="คลิกเพื่อสลับการเรียงลำดับจากน้อยไปมาก / มากไปน้อย"
                    >
                      <div className="inline-flex items-center gap-1.5 group">
                        <span>รหัสประจำตัว</span>
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-slate-200/60 text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors text-[10px] font-black">
                          {sortOrder === 'asc' ? '▲' : '▼'}
                        </span>
                      </div>
                    </th>
                  )}

                  <th className="p-4 text-xs font-bold text-slate-600">ชื่อ</th>
                  <th className="p-4 text-xs font-bold text-slate-600">นามสกุล</th>
                  <th className="p-4 text-xs font-bold text-slate-600">อีเมล</th>
                  <th className="p-4 text-xs font-bold text-slate-600 text-center w-32">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={activeTab === 'STUDENT' ? 6 : 5} className="p-14 text-center font-bold text-slate-400 animate-pulse text-xs">
                      กำลังโหลดข้อมูลผู้ใช้...
                    </td>
                  </tr>
                ) : processedUsers.length > 0 ? (
                  processedUsers.map((user, index) => {
                    const firstName = user.firstName || (user.name ? user.name.split(' ')[0] : '-');
                    const lastName = user.lastName || (user.name ? user.name.split(' ').slice(1).join(' ') : '-');

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-4 text-xs font-bold text-slate-400 text-center">
                          {index + 1}
                        </td>

                        {/* แสดงข้อมูลรหัสประจำตัวเฉพาะในแท็บ STUDENT */}
                        {activeTab === 'STUDENT' && (
                          <td className="p-4 text-xs font-bold font-mono text-emerald-700">
                            {user.studentCode || user.username || '-'}
                          </td>
                        )}

                        <td className="p-4 text-xs font-bold text-slate-800">
                          {firstName}
                        </td>
                        <td className="p-4 text-xs font-bold text-slate-800">
                          {lastName}
                        </td>
                        <td className="p-4 text-xs font-medium text-slate-500 font-mono">
                          {user.email || '-'}
                        </td>
                        <td className="p-4 text-center">
                          {/* ปุ่มแก้ไขสีเหลืองทอง */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(user)}
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-[#eab308] hover:bg-[#ca8a04] active:scale-95 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            <span>แก้ไข</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={activeTab === 'STUDENT' ? 6 : 5} className="p-16 text-center text-slate-400 font-bold text-xs">
                      {searchTerm ? 'ไม่พบข้อมูลที่ตรงกับคำค้นหา' : 'ไม่พบข้อมูลผู้ใช้ในบทบาทนี้'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#0f766e] text-emerald-100 py-4 px-4 text-center text-xs font-medium md:text-sm">
        © 2026 ระบบตรวจสอบรายชื่อด้วยการรู้จำใบหน้า
        <p className="text-emerald-100 font-medium text-xs md:text-sm">
          สาขาวิชานวัตกรรมระบบสารสนเทศ คณะบริหารธุรกิจ มหาวิทยาลัยเทคโนโลยีราชมงคลกรุงเทพ
        </p>
      </footer>

      {/* 1. Modal Popup ฟอร์มแก้ไขข้อมูลผู้ใช้ */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 relative">

            {/* ปุ่มปิด Modal มุมบนขวา */}
            <button
              type="button"
              onClick={() => setEditingUser(null)}
              className="absolute top-6 right-6 text-slate-300 hover:text-slate-600 text-xl font-bold transition-colors cursor-pointer"
            >
              &times;
            </button>

            {/* หัวเรื่อง Modal */}
            <div className="mb-5">
              <h3 className="text-xl font-black text-slate-800">
                {editingUser.role === 'STUDENT' ? 'แก้ไขข้อมูลนักเรียน' : 'แก้ไขข้อมูลอาจารย์'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                บทบาท: <span className="font-bold text-emerald-700">{editingUser.role === 'STUDENT' ? 'นักศึกษา' : 'อาจารย์'}</span>
              </p>
            </div>

            <form onSubmit={handleOpenSaveConfirm} className="space-y-4">
              {/* ชื่อจริง และ นามสกุล */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">ชื่อจริง</label>
                  <input
                    type="text"
                    required
                    value={editFormData.firstName}
                    onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs md:text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">นามสกุล</label>
                  <input
                    type="text"
                    required
                    value={editFormData.lastName}
                    onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs md:text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              {/* รหัสนักศึกษา (แสดงเฉพาะนักศึกษา) */}
              {editingUser.role === 'STUDENT' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">รหัสนักศึกษา</label>
                  <input
                    type="text"
                    required
                    value={editFormData.studentCode}
                    onChange={(e) => setEditFormData({ ...editFormData, studentCode: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs md:text-sm font-bold font-mono text-emerald-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
              )}

              {/* อีเมล */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">อีเมลระบบ</label>
                <input
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs md:text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>

              {/* รหัสผ่านใหม่ */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  รหัสผ่านใหม่ <span className="text-slate-400 font-normal">(เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน)</span>
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs md:text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>

              {/* ปุ่มการจัดการด้านล่าง */}
              <div className="flex items-center justify-between gap-3 pt-4 mt-2">
                {/* ปุ่มเปิด Popup ยืนยันการลบ */}
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirmModal(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#dc2626] hover:bg-[#b91c1c] active:scale-95 text-white rounded-xl text-xs md:text-sm font-bold shadow-sm transition-all cursor-pointer"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                  <span>ลบ</span>
                </button>

                {/* ปุ่มเปิด Popup ยืนยันบันทึก */}
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 bg-[#16a34a] hover:bg-[#15803d] active:scale-95 text-white rounded-xl text-xs md:text-sm font-bold shadow-sm transition-all cursor-pointer"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  <span>บันทึก</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Custom Modal: ยืนยันการแก้ไข/บันทึกข้อมูล */}
      {showSaveConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
            </div>

            <h3 className="text-xl font-black text-slate-800 mb-2">ยืนยันการบันทึก</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6 font-medium">
              คุณต้องการบันทึกการเปลี่ยนแปลงข้อมูล{editingUser?.role === 'STUDENT' ? 'นักเรียน' : 'อาจารย์'}นี้ใช่หรือไม่?
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowSaveConfirmModal(false)}
                className="flex-1 py-2.5 bg-[#4b5563] hover:bg-[#374151] active:scale-95 text-white rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isSubmittingEdit}
                onClick={handleConfirmSave}
                className="flex-1 py-2.5 bg-[#16a34a] hover:bg-[#15803d] active:scale-95 text-white rounded-xl text-xs md:text-sm font-bold shadow-sm transition-all disabled:bg-slate-300 cursor-pointer"
              >
                {isSubmittingEdit ? 'กำลังบันทึก...' : 'ยืนยันการบันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Custom Modal: ยืนยันการลบ */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
            </div>

            <h3 className="text-xl font-black text-slate-800 mb-2">ยืนยันการลบ</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6 font-medium">
              คุณต้องการลบข้อมูล{editingUser?.role === 'STUDENT' ? 'นักเรียน' : 'อาจารย์'}นี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                className="flex-1 py-2.5 bg-[#4b5563] hover:bg-[#374151] active:scale-95 text-white rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-[#dc2626] hover:bg-[#b91c1c] active:scale-95 text-white rounded-xl text-xs md:text-sm font-bold shadow-sm transition-all disabled:bg-slate-300 cursor-pointer"
              >
                {isDeleting ? 'กำลังลบ...' : 'ยืนยันการลบ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Custom Modal: แจ้งเตือนสำเร็จ */}
      {successModal.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70] animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h3 className="text-xl font-black text-slate-800 mb-1.5">{successModal.title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6 font-medium">
              {successModal.message}
            </p>

            <button
              type="button"
              onClick={() => setSuccessModal({ show: false, title: '', message: '' })}
              className="w-28 py-2.5 bg-[#16a34a] hover:bg-[#15803d] active:scale-95 text-white rounded-xl text-xs md:text-sm font-bold shadow-sm transition-all mx-auto block cursor-pointer"
            >
              ตกลง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f0f7f4]">
        <div className="text-center font-bold text-emerald-700 animate-pulse text-sm">กำลังโหลดข้อมูล...</div>
      </div>
    }>
      <AdminUsersContent />
    </Suspense>
  );
}