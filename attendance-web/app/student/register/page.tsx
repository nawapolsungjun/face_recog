'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentRegister() {
  const router = useRouter();
  const [formData, setFormData] = useState({ code: '', name: '', password: '' });
  const [files, setFiles] = useState<FileList | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(e.target.files);
      const fileArray = Array.from(e.target.files).map(file => URL.createObjectURL(file));
      setPreviews(fileArray);
      setStatus(`เลือกรูปภาพแล้ว ${e.target.files.length} รูป`);
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!files || files.length < 3) {
      alert('กรุณาอัปโหลดรูปภาพอย่างน้อย 3 มุม (หน้าตรง, ซ้าย, ขวา) ตามฟังก์ชัน 1.5');
      return;
    }

    setIsLoading(true);
    setStatus('⏳ กำลังส่งรูปไปวิเคราะห์ใบหน้า (AI)...');

    try {
      // 1. 🚀 ส่งรูปไปให้ Python Backend (FastAPI) เพื่อสกัด Face Vectors
      const faceFormData = new FormData();
      Array.from(files).forEach(file => faceFormData.append('files', file));

      const aiResponse = await fetch('http://localhost:8000/api/register-face-multi', {
        method: 'POST',
        body: faceFormData,
      });

      if (!aiResponse.ok) throw new Error('ติดต่อ AI Server ไม่ได้ (FastAPI)');
      
      const aiResult = await aiResponse.json();
      if (!aiResult.success) throw new Error(aiResult.error);

      // 2. 💾 ส่งข้อมูลไปบันทึกลง Next.js API (เวอร์ชั่นใหม่ที่สร้าง User + Student)
      setStatus('💾 AI วิเคราะห์เสร็จแล้ว! กำลังบันทึกลงฐานข้อมูล...');
      
      const dbResponse = await fetch('/api/student/register', { // 👈 ใช้ Path ใหม่ที่เราคุยกัน
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentCode: formData.code,
          name: formData.name,
          email: `${formData.code}@student.ac.th`, // 🚀 สร้าง Email จากรหัสนักศึกษาเพื่อให้เข้ากับ Schema User
          password: formData.password,
          faceVectors: JSON.stringify(aiResult.face_vectors) // แปลงเป็น String ก่อนเก็บลง SQLite
        }),
      });

      const dbResult = await dbResponse.json();

      if (dbResult.success) {
        setStatus('✅ ลงทะเบียนและเชื่อมโยงบัญชีสำเร็จ!');
        setTimeout(() => router.push('/student/login'), 2000);
      } else {
        throw new Error(dbResult.error || 'บันทึกลงฐานข้อมูลไม่สำเร็จ');
      }

    } catch (err: any) {
      setStatus(`❌ ข้อผิดพลาด: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-xl w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Student <span className="text-blue-600">Register</span></h1>
          <p className="text-slate-500 mt-3 font-medium">ลงทะเบียนใบหน้าและสร้างบัญชีผู้ใช้ (AI System)</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 ml-1 uppercase tracking-widest">Student Code</label>
              <input 
                type="text" placeholder="เช่น 6530901xxxx" required
                className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-800"
                onChange={e => setFormData({...formData, code: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 ml-1 uppercase tracking-widest">Password</label>
              <input 
                type="password" placeholder="รหัสผ่านเข้าใช้งาน" required
                className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-800"
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 ml-1 uppercase tracking-widest">Full Name</label>
            <input 
              type="text" placeholder="ชื่อ-นามสกุล" required
              className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-800"
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          {/* 📸 ส่วนอัปโหลดรูปภาพ */}
          <div className="p-8 border-2 border-dashed border-blue-100 rounded-[2rem] bg-blue-50/20 text-center">
            <div className="mb-4">
              <span className="text-4xl">📸</span>
              <p className="text-sm font-black text-blue-600 mt-2">Face Training Photos</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-tighter">ต้องอัปโหลดอย่างน้อย 3 รูป (ตรง/ซ้าย/ขวา)</p>
            </div>
            
            <input 
              type="file" multiple accept="image/*" required
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer transition-all shadow-sm"
            />
            
            {previews.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                {previews.map((src, i) => (
                  <img key={i} src={src} className="w-16 h-16 object-cover rounded-2xl border-2 border-white shadow-md ring-1 ring-slate-100" />
                ))}
              </div>
            )}
          </div>

          <button 
            type="submit" disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-[1.5rem] font-black text-lg shadow-xl shadow-blue-100 disabled:bg-slate-300 transition-all active:scale-[0.97]"
          >
            {isLoading ? 'Processing Face AI...' : 'Register & Scan Face'}
          </button>

          {status && (
            <div className={`p-4 rounded-2xl text-center text-xs font-bold ${status.includes('❌') ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600 animate-pulse'}`}>
              {status}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}