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
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        setStatus('✅ เข้าสู่ระบบสำเร็จ!');
        // 🚀 เก็บข้อมูลเบื้องต้น (บอสสามารถใช้ Context หรือ LocalStorage ได้)
        localStorage.setItem('user', JSON.stringify(data.user));
        
        setTimeout(() => router.push('/student/dashboard'), 1500);
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 border border-slate-100">
        <div className="text-center mb-10">
          <div className="inline-block p-4 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-200">
            <span className="text-3xl">👨‍🎓</span>
          </div>
          <h1 className="text-3xl font-black text-slate-800">เข้าสู่ระบบนักศึกษา</h1>
          <p className="text-slate-500 mt-2 font-medium">Smart Attendance System</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 ml-1 uppercase">รหัสนักศึกษา</label>
            <input 
              type="text" required
              className="w-full p-4 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="กรอกรหัสนักศึกษา"
              onChange={e => setFormData({...formData, studentCode: e.target.value})}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 ml-1 uppercase">รหัสผ่าน</label>
            <input 
              type="password" required
              className="w-full p-4 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="••••••••"
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <button 
            type="submit" disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-blue-100 transition-all active:scale-[0.98] disabled:bg-slate-300"
          >
            {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>

          {status && (
            <p className={`text-center text-sm font-bold ${status.includes('❌') ? 'text-red-500' : 'text-blue-600'}`}>
              {status}
            </p>
          )}

          <div className="pt-6 border-t border-slate-100 text-center">
            <p className="text-slate-500 text-sm">
              ยังไม่มีบัญชี? {' '}
              <Link href="/student/register" className="text-blue-600 font-bold hover:underline">
                ลงทะเบียนใหม่
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}