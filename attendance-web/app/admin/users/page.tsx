'use client';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function UserManagementContent() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const searchParams = useSearchParams();
  const urlTab = searchParams.get('tab');
  const [tab, setTab] = useState<'TEACHER' | 'STUDENT'>(
    urlTab === 'STUDENT' ? 'STUDENT' : 'TEACHER'
  );

  const [editingUser, setEditingUser] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const json = await res.json();
      if (json.success) {
        setUsers(json.data);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (urlTab === 'STUDENT' || urlTab === 'TEACHER') {
      setTab(urlTab);
    }
  }, [urlTab]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const res = await fetch('/api/admin/users/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUser),
      });
      const data = await res.json();
      if (data.success) {
        alert('อัปเดตข้อมูลสำเร็จแล้ว');
        setEditingUser(null);
        fetchUsers();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch {
      alert('การเชื่อมต่อล้มเหลว');
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteUser = async (id: string, name: string) => {
    if (!confirm(`ยืนยันการ "ยกเลิกบัญชี" ของคุณ ${name}?`)) return;
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        alert('ลบบัญชีเรียบร้อยแล้ว');
        fetchUsers();
      }
    } catch {
      alert('เกิดข้อผิดพลาด');
    }
  };

  // กรองตามแท็บ และเรียงลำดับรหัสนักศึกษา / ชื่อ จากน้อยไปมาก
  const filteredUsers = users
    .filter(u => u.role === tab)
    .sort((a, b) => {
      if (tab === 'STUDENT') {
        const codeA = a.studentCode || '';
        const codeB = b.studentCode || '';
        return codeA.localeCompare(codeB, undefined, { numeric: true });
      }
      return (a.firstName || '').localeCompare(b.firstName || '', 'th');
    });

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f7f4] font-sans text-slate-800">

      {/* 1. Header ด้านบนตาม Style Canva (หัวข้อตรงกลาง 100%) */}
      <header className="bg-[#0f766e] text-white pt-8 pb-6 px-4 text-center shadow-sm relative">
        <div className="absolute top-6 left-6">
          <Link
            href="/admin/dashboard"
            className="text-emerald-100 hover:text-white font-bold inline-flex items-center gap-2 text-xs uppercase tracking-wider transition-all"
          >
            ← Back to Dashboard
          </Link>
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1">
          ระบบเช็คชื่อนักเรียน
        </h1>
        <p className="text-emerald-100 font-medium text-xs md:text-sm">
          ระบบตรวจสอบรายชื่อเข้าชั้นเรียน สาขาวิชานวัตกรรมระบบสารสนเทศ
        </p>
      </header>

      {/* 3. Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8">

        {/* การ์ดส่วนหัวและการสลับแท็บ */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800">รายชื่อผู้ใช้งาน</h2>
            <p className="text-slate-500 text-xs font-medium mt-1">ตรวจสอบและจัดการสิทธิ์การเข้าใช้งานระบบ</p>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60">
            <button
              onClick={() => setTab('TEACHER')}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${tab === 'TEACHER'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              อาจารย์ ({users.filter(u => u.role === 'TEACHER').length})
            </button>
            <button
              onClick={() => setTab('STUDENT')}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${tab === 'STUDENT'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              นักศึกษา ({users.filter(u => u.role === 'STUDENT').length})
            </button>
          </div>
        </div>

        {/* ตารางรายชื่อ */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/60">
                  <th className="p-4 text-xs font-bold text-slate-600 w-16 text-center">ลำดับ</th>
                  <th className="p-4 text-xs font-bold text-slate-600 w-44">
                    {tab === 'STUDENT' ? 'รหัสประจำตัว' : 'อีเมลระบบ'}
                  </th>
                  <th className="p-4 text-xs font-bold text-slate-600">ชื่อ - นามสกุล</th>
                  <th className="p-4 text-xs font-bold text-slate-600 text-center w-44">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="text-center p-14 text-slate-400 font-bold text-xs animate-pulse">กำลังโหลดรายชื่อ...</td>
                  </tr>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((user, index) => {
                    const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || 'ไม่ระบุชื่อ';

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-4 text-xs font-bold text-slate-400 text-center">
                          {index + 1}
                        </td>
                        <td className="p-4 font-mono font-bold text-emerald-700 text-xs md:text-sm">
                          {user.studentCode || user.email}
                        </td>
                        <td className="p-4 font-bold text-slate-800 text-xs md:text-sm">
                          {displayName}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => setEditingUser({ ...user })}
                              className="text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-200/60 transition-all cursor-pointer"
                            >
                              แก้ไข
                            </button>
                            <button
                              onClick={() => deleteUser(user.id, displayName)}
                              className="text-red-600 bg-red-50 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold border border-red-200/60 transition-all cursor-pointer"
                            >
                              ยกเลิกบัญชี
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center p-14 text-slate-400 font-bold text-xs">ไม่พบข้อมูลรายชื่อในกลุ่มนี้</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* 4. Footer ด้านล่าง */}
      <footer className="bg-white text-[#0f766e] py-4 px-4 text-center text-xs font-medium border-t border-slate-100 mt-auto">
        ระบบตรวจสอบรายชื่อเข้าชั้นเรียนสาขาวิชานวัตกรรมระบบสารสนเทศ
      </footer>

      {/* Modal แก้ไขข้อมูล */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 md:p-8 animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="flex justify-between items-start mb-5 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-800">แก้ไขข้อมูล</h3>
                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-[10px] font-bold uppercase tracking-wider mt-1 inline-block">
                  {editingUser.role === 'STUDENT' ? 'นักศึกษา' : 'อาจารย์'}
                </span>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-300 hover:text-slate-500 text-2xl font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อจริง</label>
                  <input
                    type="text"
                    value={editingUser.firstName || ''}
                    onChange={e => setEditingUser({ ...editingUser, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="ชื่อจริง"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">นามสกุล</label>
                  <input
                    type="text"
                    value={editingUser.lastName || ''}
                    onChange={e => setEditingUser({ ...editingUser, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="นามสกุล"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">อีเมลระบบ</label>
                <input
                  type="email"
                  value={editingUser.email || ''}
                  onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="อีเมล"
                  required
                />
              </div>

              {editingUser.role === 'STUDENT' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">รหัสประจำตัว</label>
                  <input
                    type="text"
                    value={editingUser.studentCode || ''}
                    onChange={e => setEditingUser({ ...editingUser, studentCode: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2.5 font-bold text-slate-400 hover:text-slate-600 text-xs rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 disabled:bg-slate-300 cursor-pointer"
                >
                  {isUpdating ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UserManagementPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f0f7f4] flex items-center justify-center p-10">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-emerald-800 font-bold animate-pulse uppercase text-xs tracking-widest">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    }>
      <UserManagementContent />
    </Suspense>
  );
}