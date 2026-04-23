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
    role: 'STUDENT', 
    department: '',
    studentCode: '', 
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 🚀 แก้ไขจุดนี้: สร้างก้อนข้อมูลใหม่เพื่อรวม 'username' ส่งไปให้ API
      const payload = {
        ...formData,
        // เงื่อนไข: ถ้านักศึกษา ให้ใช้ studentCode เป็น username | ถ้าคนอื่น ให้ใช้อีเมล
        username: formData.role === 'STUDENT' ? formData.studentCode : formData.email 
      };

      const res = await fetch('/api/admin/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), // ✅ ส่ง payload ที่มี username ไป
      });
      
      const data = await res.json();

      if (data.success) {
        alert('✅ ลงทะเบียนผู้ใช้ใหม่สำเร็จเรียบร้อยครับบอส!');
        router.push('/admin/users'); 
      } else {
        alert("❌ " + data.error);
      }
    } catch (err) {
      alert('❌ เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans text-slate-900">
      <div className="max-w-2xl mx-auto">
        <Link href="/admin/users" className="text-blue-600 font-bold text-sm uppercase tracking-widest flex items-center gap-2 mb-6 hover:translate-x-[-4px] transition-all">
          ← กลับไปหน้าจัดการผู้ใช้
        </Link>
        
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100">
          <div className="mb-8 text-center md:text-left">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">ลงทะเบียนผู้ใช้ใหม่</h1>
            <p className="text-slate-400 font-medium mt-1">สร้างบัญชีสำหรับอาจารย์หรือนักศึกษา (Admin Only)</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* เลือกบทบาท */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">บทบาทผู้ใช้งาน</label>
              <select 
                className="w-full mt-1 p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 cursor-pointer"
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
              >
                <option value="STUDENT">นักศึกษา (Student)</option>
                <option value="TEACHER">อาจารย์ (Teacher)</option>
                <option value="ADMIN">ผู้ดูแลระบบ (Admin)</option>
              </select>
            </div>

            {/* ชื่อ-นามสกุล */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ชื่อ-นามสกุล</label>
              <input 
                type="text" required 
                placeholder="ระบุชื่อจริง และนามสกุล"
                className="w-full mt-1 p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
              />
            </div>

            {/* ฟิลด์พิเศษตาม Role */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {formData.role === 'STUDENT' ? (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">รหัสนักศึกษา (Username)</label>
                  <input 
                    type="text" required 
                    placeholder="เช่น 6530xxx"
                    className="w-full mt-1 p-4 bg-blue-50/50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-700"
                    value={formData.studentCode}
                    onChange={(e) => setFormData({...formData, studentCode: e.target.value})} 
                  />
                </div>
              ) : (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">สาขาวิชา/แผนก</label>
                  <input 
                    type="text" 
                    placeholder="เช่น IT-Development"
                    className="w-full mt-1 p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})} 
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">อีเมลระบบ</label>
                <input 
                  type="email" required 
                  placeholder="name@example.com"
                  className="w-full mt-1 p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})} 
                />
              </div>
            </div>

            {/* รหัสผ่าน */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">รหัสผ่านเริ่มต้น</label>
              <input 
                type="password" required 
                placeholder="••••••••"
                className="w-full mt-1 p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})} 
              />
              <p className="text-[10px] text-slate-400 font-bold mt-2 ml-1 italic">* รหัสนี้ผู้ใช้สามารถไปเปลี่ยนเองได้ภายหลังในหน้าโปรไฟล์</p>
            </div>

            {/* ปุ่มยืนยัน */}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-slate-900 text-white p-5 rounded-[2rem] font-black text-lg mt-4 hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95 disabled:bg-slate-300"
            >
              {loading ? 'กำลังบันทึกข้อมูล...' : 'ยืนยันการลงทะเบียน'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}