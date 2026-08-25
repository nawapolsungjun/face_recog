'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'STUDENT' | 'TEACHER'>('STUDENT');
  
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

  // กรองตาม Tab, คำค้นหา (รหัส/ชื่อ/อีเมล) และเรียงลำดับ
  const processedUsers = useMemo(() => {
    return users
      .filter((u) => {
        if (u.role !== activeTab) return false;
        if (!searchTerm.trim()) return true;

        const term = searchTerm.toLowerCase().trim();
        const code = (u.studentCode || u.username || '').toLowerCase();
        const fullName = (u.name || `${u.firstName || ''} ${u.lastName || ''}`).toLowerCase();
        const email = (u.email || '').toLowerCase();

        return code.includes(term) || fullName.includes(term) || email.includes(term);
      })
      .sort((a, b) => {
        const codeA = (a.studentCode || a.username || '').toString();
        const codeB = (b.studentCode || b.username || '').toString();

        if (sortOrder === 'asc') {
          return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
        } else {
          return codeB.localeCompare(codeA, undefined, { numeric: true, sensitivity: 'base' });
        }
      });
  }, [users, activeTab, searchTerm, sortOrder]);

  const teacherCount = users.filter((u) => u.role === 'TEACHER').length;
  const studentCount = users.filter((u) => u.role === 'STUDENT').length;

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการยกเลิกบัญชีของ "${name}" ?`)) return;

    const token = getAuthToken();
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        alert('ลบบัญชีผู้ใช้เรียบร้อยแล้ว');
        fetchUsers();
      } else {
        alert('เกิดข้อผิดพลาด: ' + json.error);
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const handleOpenEditModal = (user: any) => {
    setEditingUser(user);
    setEditFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      studentCode: user.studentCode || '',
      email: user.email || '',
      password: '',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        alert('อัปเดตข้อมูลผู้ใช้เรียบร้อยแล้ว');
        setEditingUser(null);
        fetchUsers();
      } else {
        alert('เกิดข้อผิดพลาด: ' + json.error);
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsSubmittingEdit(false);
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
          ระบบตรวจสอบรายชื่อเข้าชั้นเรียน
        </h1>
        <p className="text-emerald-100 font-medium text-xs md:text-sm">
          สาขาวิชานวัตกรรมระบบสารสนเทศ
        </p>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8">
        {/* กล่องหัวเรื่อง + ตัวสลับแท็บ */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200/80 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">รายชื่อผู้ใช้งาน</h2>
            <p className="text-slate-400 font-medium text-xs mt-1">ตรวจสอบและจัดการสิทธิ์การเข้าใช้งานระบบ</p>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => setActiveTab('TEACHER')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'TEACHER'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              อาจารย์ ({teacherCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('STUDENT')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'STUDENT'
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
            <input
              type="text"
              placeholder="ค้นหารหัสประจำตัว, ชื่อ-นามสกุล หรือ อีเมล..."
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
                ✕
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
                  
                  <th 
                    className="p-4 text-xs font-bold text-slate-600 w-48 cursor-pointer select-none hover:bg-slate-100/80 transition-colors"
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

                  <th className="p-4 text-xs font-bold text-slate-600">ชื่อ - นามสกุล</th>
                  <th className="p-4 text-xs font-bold text-slate-600 text-center w-40">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-14 text-center font-bold text-slate-400 animate-pulse text-xs">
                      กำลังโหลดข้อมูลผู้ใช้...
                    </td>
                  </tr>
                ) : processedUsers.length > 0 ? (
                  processedUsers.map((user, index) => (
                    <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-4 text-xs font-bold text-slate-400 text-center">
                        {index + 1}
                      </td>
                      <td className="p-4 text-xs font-bold font-mono text-emerald-700">
                        {user.studentCode || user.username || '-'}
                      </td>
                      <td className="p-4">
                        <div className="text-xs font-bold text-slate-800">{user.name}</div>
                        <div className="text-[11px] text-slate-400">{user.email}</div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(user)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 transition-all cursor-pointer"
                          >
                            แก้ไข
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user.id, user.name)}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 text-xs font-bold rounded-xl border border-red-200 transition-all cursor-pointer"
                          >
                            ยกเลิกบัญชี
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-16 text-center text-slate-400 font-bold text-xs">
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
      <footer className="bg-white text-[#0f766e] py-4 px-4 text-center text-xs font-medium border-t border-slate-100 mt-auto print:hidden">
        ระบบตรวจสอบรายชื่อเข้าชั้นเรียนสาขาวิชานวัตกรรมระบบสารสนเทศ
      </footer>

      {/* Modal Popup แก้ไขข้อมูลผู้ใช้ */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-slate-800 mb-1">แก้ไขข้อมูลผู้ใช้</h3>
            <p className="text-xs text-slate-400 mb-4">
              บทบาท: <span className="font-bold text-emerald-700">{editingUser.role === 'STUDENT' ? 'นักศึกษา' : 'อาจารย์'}</span>
            </p>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อจริง</label>
                  <input
                    type="text"
                    required
                    value={editFormData.firstName}
                    onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">นามสกุล</label>
                  <input
                    type="text"
                    required
                    value={editFormData.lastName}
                    onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {editingUser.role === 'STUDENT' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">รหัสนักศึกษา</label>
                  <input
                    type="text"
                    required
                    value={editFormData.studentCode}
                    onChange={(e) => setEditFormData({ ...editFormData, studentCode: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">อีเมลระบบ</label>
                <input
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รหัสผ่านใหม่ <span className="text-slate-400 font-normal">(เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน)</span>
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2.5 font-bold text-slate-400 hover:text-slate-600 text-xs rounded-xl bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 disabled:bg-slate-300 cursor-pointer"
                >
                  {isSubmittingEdit ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}