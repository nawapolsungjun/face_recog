'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function UserManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'TEACHER' | 'STUDENT'>('TEACHER');

  // --- 🚀 State สำหรับการแก้ไข ---
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

  useEffect(() => { fetchUsers(); }, []);

  // --- 🛠 ฟังก์ชันอัปเดตข้อมูล ---
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
        alert(' อัปเดตข้อมูลสำเร็จแล้วครับ!');
        setEditingUser(null);
        fetchUsers();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      alert('การเชื่อมต่อล้มเหลว');
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteUser = async (id: string, name: string) => {
    if (!confirm(`‼️ ยืนยันการ "ยกเลิกบัญชี" ของคุณ ${name}?\nข้อมูลทั้งหมดที่เกี่ยวข้องจะถูกลบถาวร`)) return;
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        alert('ยกเลิกบัญชีเรียบร้อยแล้วครับบอส');
        fetchUsers();
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาด');
    }
  };

  const filteredUsers = users.filter(u => u.role === tab);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans text-slate-900">
      <div className="max-w-5xl mx-auto">
        <Link href="/admin/dashboard" className="text-blue-600 font-bold text-sm uppercase tracking-widest flex items-center gap-2 mb-6 hover:translate-x-[-4px] transition-all">
          ← กลับหน้า Dashboard
        </Link>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">รายชื่อผู้ใช้</h1>
            <p className="text-slate-500 font-medium mt-2">ตรวจสอบและจัดการสิทธิ์การเข้าใช้งานระบบ</p>
          </div>
          
          <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
            <button onClick={() => setTab('TEACHER')} className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${tab === 'TEACHER' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400'}`}>อาจารย์</button>
            <button onClick={() => setTab('STUDENT')} className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${tab === 'STUDENT' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400'}`}>นักศึกษา</button>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Username / อีเมล</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">ข้อมูลผู้ใช้</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {!loading && filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-blue-50/30 transition-all group">
                  <td className="p-6">
                    <div className="font-mono font-bold text-blue-600 truncate max-w-[200px]">{user.username || user.email}</div>
                    {user.studentCode && <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase">CODE: {user.studentCode}</div>}
                  </td>
                  <td className="p-6">
                    <div className="font-black text-slate-700 text-lg">{user.name}</div>
                    {user.department ? (
                      <div className="text-[11px] font-bold text-blue-500 uppercase">{user.department}</div>
                    ) : (
                      <div className="text-[9px] font-black text-slate-300 uppercase">{user.role}</div>
                    )}
                  </td>
                  <td className="p-6 text-center flex justify-center gap-2">
                    <button 
                      onClick={() => setEditingUser(user)}
                      className="bg-blue-50 text-blue-600 px-4 py-2.5 rounded-xl font-black text-xs hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                    >
                      แก้ไข
                    </button>
                    <button 
                      onClick={() => deleteUser(user.id, user.name)}
                      className="bg-red-50 text-red-500 px-4 py-2.5 rounded-xl font-black text-xs hover:bg-red-600 hover:text-white transition-all shadow-sm"
                    >
                      ยกเลิกบัญชี
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🚀 Modal แก้ไขข้อมูล (ฉบับอัปเกรดเพื่ออาจารย์และนักศึกษา) */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in duration-200 border border-slate-100">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-800">แก้ไขข้อมูล</h2>
                <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest mt-2 inline-block">
                  {editingUser.role}
                </span>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-slate-300 hover:text-slate-500 transition-colors text-2xl font-bold">×</button>
            </div>
            
            <form onSubmit={handleUpdate} className="space-y-4">
              {/* --- ข้อมูลชื่อ (แก้ได้ทุกคน) --- */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">ชื่อ-นามสกุล</label>
                <input 
                  type="text" 
                  value={editingUser.name || ''}
                  onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                  className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 font-bold mt-1 text-slate-700"
                  required
                />
              </div>

              {/* --- ข้อมูลอีเมล/Username (แก้ได้ทุกคน) --- */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">อีเมลระบบ / Username</label>
                <input 
                  type="email" 
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                  className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 font-bold mt-1 text-slate-700"
                  required
                />
              </div>

              {/* --- 🍎 ส่วนของอาจารย์โดยเฉพาะ: ภาควิชา --- */}
              {editingUser.role === 'TEACHER' && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black text-blue-500 uppercase ml-1 italic tracking-widest">ภาควิชา / แผนกวิชา</label>
                  <input 
                    type="text" 
                    placeholder="เช่น เทคโนโลยีสารสนเทศ"
                    value={editingUser.department || ''}
                    onChange={(e) => setEditingUser({...editingUser, department: e.target.value})}
                    className="w-full p-4 bg-blue-50/50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 font-bold mt-1 text-blue-700 placeholder:text-blue-200"
                  />
                </div>
              )}

              {/* --- 🎓 ส่วนของนักศึกษา: รหัสประจำตัว --- */}
              {editingUser.role === 'STUDENT' && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">รหัสนักศึกษา</label>
                  <input 
                    type="text" 
                    value={editingUser.studentCode || ''}
                    onChange={(e) => setEditingUser({...editingUser, studentCode: e.target.value})}
                    className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 font-bold mt-1 text-slate-700"
                  />
                </div>
              )}

              <div className="flex gap-3 mt-8">
                <button 
                  type="button" 
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-4 font-black text-slate-400 hover:text-slate-600 transition-all text-sm"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  disabled={isUpdating}
                  className="flex-[2] bg-slate-900 text-white py-4 rounded-2xl font-black shadow-xl shadow-slate-200 hover:bg-black transition-all active:scale-95 disabled:bg-slate-300"
                >
                  {isUpdating ? ' บันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}