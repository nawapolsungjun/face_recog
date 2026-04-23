'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(''); 
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.success) {
        console.log("🚀 Login Success, Role:", data.user.role);

        // 🚀 ปรับปรุงใหม่: แยกการเก็บข้อมูลตาม Role โดยไม่ลบข้อมูลของบทบาทอื่น
        if (data.user.role === 'ADMIN') {
          // เก็บใน Key กลางสำหรับ Admin
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user)); 
          router.push('/admin/dashboard');

        } else if (data.user.role === 'TEACHER') {
          // ✅ เก็บข้อมูลและกุญแจแยกเฉพาะของอาจารย์
          localStorage.setItem('teacher_token', data.token); 
          localStorage.setItem('teacher_user', JSON.stringify(data.user));
          
          // 💡 ไม่ใช้ localStorage.removeItem('student_user') แล้ว 
          // เพื่อให้แท็บนักศึกษายังคงทำงานต่อได้
          
          router.push('/teacher/dashboard');

        } else if (data.user.role === 'STUDENT') {
          // ✅ เก็บข้อมูลและกุญแจแยกเฉพาะของนักศึกษา (กรณีล็อกอินผ่านหน้านี้)
          localStorage.setItem('student_token', data.token);
          localStorage.setItem('student_user', JSON.stringify(data.user));
          
          router.push('/student/dashboard');

        } else {
          setErrorMsg('บทบาทผู้ใช้งานไม่ถูกต้อง');
        }
      } else {
        setErrorMsg(data.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch (err) {
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans text-slate-900">
      <form onSubmit={handleLogin} className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Staff Login</h1>
          <p className="text-slate-400 font-medium mt-1 uppercase text-[10px] tracking-widest">Smart Attendance System</p>
        </div>
        
        {errorMsg && (
          <div className="bg-red-50 text-red-500 p-4 rounded-2xl mb-6 text-sm font-bold border border-red-100 text-center">
            ❌ {errorMsg}
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">อีเมลผู้ใช้งาน</label>
            <input 
              type="email" 
              className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-bold transition-all" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">รหัสผ่าน</label>
            <input 
              type="password" 
              className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-bold transition-all" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black mt-10 hover:bg-black shadow-lg transition-all active:scale-95 disabled:bg-slate-300"
        >
          {loading ? 'กำลังตรวจสอบสิทธิ์...' : 'ยืนยันเข้าสู่ระบบ'}
        </button>
        
        <div className="mt-6 text-center text-[10px] font-bold text-slate-300 uppercase tracking-tighter">
          Staff Portal Access
        </div>
      </form>
    </div>
  );
}