'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ studentCode: '', password: '' });
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus('⌛ กำลังตรวจสอบข้อมูล...');

    try {
      const res = await fetch('/api/student/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        setStatus('✅ เข้าสู่ระบบสำเร็จ!');
        
        // 🚀 ปรับปรุงใหม่: ไม่ลบข้อมูล teacher_user และ teacher_token ออกแล้ว
        // เพื่อให้บอสสามารถใช้งาน Dashboard อาจารย์ในอีกแท็บหนึ่งได้พร้อมกัน
        
        // 1. เก็บข้อมูลเฉพาะของนักศึกษาลงใน Key ของตัวเอง
        localStorage.setItem('student_user', JSON.stringify(data.user));
        
        // 2. เก็บกุญแจแยกเป็น student_token
        if (data.token) {
          localStorage.setItem('student_token', data.token);
        }

        // 3. พาไปหน้า Dashboard นักศึกษา
        router.push('/student/dashboard');
      } else {
        setStatus(`❌ ${data.error}`);
      }
    } catch (err) {
      setStatus('❌ เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans text-slate-900">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 border border-slate-100">
        <div className="text-center mb-10">
          <div className="inline-block p-4 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-200">
            <span className="text-3xl">👨‍🎓</span>
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Student Login</h1>
          <p className="text-slate-400 mt-2 font-medium uppercase text-[10px] tracking-widest">ระบบเช็คชื่อนักศึกษา</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest">รหัสนักศึกษา</label>
            <input
              type="text" required
              className="w-full p-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-bold text-slate-800"
              placeholder="กรอกรหัสนักศึกษา"
              value={formData.studentCode}
              onChange={e => setFormData({ ...formData, studentCode: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest">รหัสผ่าน</label>
            <input
              type="password" required
              className="w-full p-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-bold text-slate-800"
              placeholder="••••••••"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <button
            type="submit" disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-100 transition-all active:scale-[0.98] disabled:bg-slate-300"
          >
            {isLoading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
          </button>

          {status && (
            <p className={`text-center text-sm font-bold ${status.includes('❌') ? 'text-red-500' : 'text-blue-600'}`}>
              {status}
            </p>
          )}

          <div className="pt-6 border-t border-slate-100 text-center">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-tighter">
              ยังไม่มีบัญชี? {' '}
              <Link href="/student/register" className="text-blue-600 hover:underline">
                ลงทะเบียนใหม่
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}