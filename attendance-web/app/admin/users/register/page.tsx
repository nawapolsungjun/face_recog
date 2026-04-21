'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterUserPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'TEACHER',
    department: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/admin/register', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (data.success) {
        alert('ลงทะเบียนสำเร็จ!');
        router.push('/admin/dashboard');
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto">
        <Link href="/admin/dashboard" className="text-blue-600 font-bold mb-6 inline-block">← กลับไป Dashboard</Link>
        
        <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100">
          <h1 className="text-2xl font-black text-slate-800 mb-6">ลงทะเบียนผู้ใช้ใหม่</h1>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">บทบาทผู้ใช้งาน</label>
              <select 
                className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
              >
                <option value="TEACHER">อาจารย์ (Teacher)</option>
                <option value="ADMIN">ผู้ดูแลระบบ (Admin)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">ชื่อ-นามสกุล</label>
                <input type="text" required className="w-full p-3 border border-slate-200 rounded-xl text-slate-800"
                  onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">สาขาวิชา/แผนก</label>
                <input type="text" className="w-full p-3 border border-slate-200 rounded-xl text-slate-800"
                  onChange={(e) => setFormData({...formData, department: e.target.value})} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">อีเมล</label>
              <input type="email" required className="w-full p-3 border border-slate-200 rounded-xl text-slate-800"
                onChange={(e) => setFormData({...formData, email: e.target.value})} />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">รหัสผ่านเริ่มต้น</label>
              <input type="password" required className="w-full p-3 border border-slate-200 rounded-xl text-slate-800"
                onChange={(e) => setFormData({...formData, password: e.target.value})} />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold mt-4 hover:bg-blue-700 transition-all disabled:bg-slate-300"
            >
              {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูลผู้ใช้'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}