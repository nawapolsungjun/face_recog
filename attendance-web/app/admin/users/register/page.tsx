'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterUserPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    role: 'STUDENT' as 'STUDENT' | 'TEACHER',
    firstName: '',
    lastName: '',
    studentCode: '',
    email: '',
    password: '',
  });

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // เปิด Popup ยืนยันข้อมูล
  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim() || !formData.password.trim()) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    if (formData.role === 'STUDENT' && !formData.studentCode.trim()) {
      alert('กรุณาระบุรหัสนักศึกษา');
      return;
    }
    setShowConfirmModal(true);
  };

  // ส่งข้อมูลลงทะเบียนจริง
  const handleConfirmSubmit = async () => {
    setLoading(true);

    try {
      const payload = {
        ...formData,
        username: formData.role === 'STUDENT' ? formData.studentCode : formData.email,
      };

      const res = await fetch('/api/admin/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        setShowConfirmModal(false);
        alert('ลงทะเบียนผู้ใช้ใหม่สำเร็จเรียบร้อย');
        router.push('/admin/users');
      } else {
        alert('เกิดข้อผิดพลาด: ' + data.error);
        setShowConfirmModal(false);
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      setShowConfirmModal(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans text-slate-900">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/admin/dashboard"
          className="text-blue-600 font-bold text-sm uppercase tracking-widest flex items-center gap-2 mb-6 hover:translate-x-[-4px] transition-all"
        >
          ← กลับไปหน้า Dashboard
        </Link>

        <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100">
          <div className="mb-8 text-center md:text-left">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">ลงทะเบียนผู้ใช้ใหม่</h1>
            <p className="text-slate-400 font-medium mt-1">สร้างบัญชีสำหรับอาจารย์หรือนักศึกษา (Admin Only)</p>
          </div>

          <form onSubmit={handleOpenConfirm} className="space-y-6">
            {/* 1. บทบาท */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                บทบาทผู้ใช้งาน
              </label>
              <select
                className="w-full mt-1 p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 cursor-pointer"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'STUDENT' | 'TEACHER' })}
              >
                <option value="STUDENT">นักศึกษา (Student)</option>
                <option value="TEACHER">อาจารย์ (Teacher)</option>
              </select>
            </div>

            {/* 2. ชื่อจริง และ นามสกุล */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  ชื่อจริง
                </label>
                <input
                  type="text"
                  required
                  placeholder="ระบุชื่อจริง"
                  className="w-full mt-1 p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  นามสกุล
                </label>
                <input
                  type="text"
                  required
                  placeholder="ระบุนามสกุล"
                  className="w-full mt-1 p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>

            {/* 3. รหัสนักศึกษา (แสดงเฉพาะนักศึกษา) และ อีเมล */}
            <div className={`grid ${formData.role === 'STUDENT' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-6`}>
              {formData.role === 'STUDENT' && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">
                    รหัสนักศึกษา (Username)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น 67605050001-3"
                    className="w-full mt-1 p-4 bg-blue-50/50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-700 font-mono"
                    value={formData.studentCode}
                    onChange={(e) => setFormData({ ...formData, studentCode: e.target.value })}
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  อีเมลระบบ
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  className="w-full mt-1 p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            {/* 4. รหัสผ่าน */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                รหัสผ่านเริ่มต้น
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full mt-1 p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <p className="text-[10px] text-slate-400 font-bold mt-2 ml-1 italic">
                * รหัสนี้ผู้ใช้สามารถไปเปลี่ยนเองได้ภายหลังในหน้าโปรไฟล์
              </p>
            </div>

            {/* ปุ่มเปิด Modal ยืนยัน */}
            <button
              type="submit"
              className="w-full bg-slate-900 text-white p-5 rounded-[2rem] font-black text-lg mt-4 hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95 cursor-pointer"
            >
              ยืนยันการลงทะเบียน
            </button>
          </form>
        </div>
      </div>

      {/* Modal Popup ตรวจสอบและยืนยันข้อมูล */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 font-black text-2xl">
                ✓
              </div>
              <h3 className="text-2xl font-black text-slate-800">ตรวจสอบข้อมูลผู้ใช้</h3>
              <p className="text-xs text-slate-400 font-medium mt-1">กรุณาตรวจสอบความถูกต้องก่อนบันทึกลงระบบ</p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 space-y-3 mb-6 text-sm">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                <span className="text-xs font-bold text-slate-400">บทบาท:</span>
                <span className="font-black text-blue-600 uppercase bg-blue-100/60 px-2.5 py-0.5 rounded-lg text-xs">
                  {formData.role === 'STUDENT' ? 'นักศึกษา' : 'อาจารย์'}
                </span>
              </div>

              {formData.role === 'STUDENT' && (
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                  <span className="text-xs font-bold text-slate-400">รหัสนักศึกษา:</span>
                  <span className="font-mono font-black text-slate-800">{formData.studentCode}</span>
                </div>
              )}

              <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                <span className="text-xs font-bold text-slate-400">ชื่อ - นามสกุล:</span>
                <span className="font-black text-slate-800">{formData.firstName} {formData.lastName}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400">อีเมลระบบ:</span>
                <span className="font-medium text-slate-700">{formData.email}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-4 font-black text-slate-400 hover:text-slate-600 transition-all text-sm rounded-2xl"
              >
                แก้ไขข้อมูล
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmSubmit}
                className="flex-[2] bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl transition-all active:scale-95 disabled:bg-slate-300 cursor-pointer"
              >
                {loading ? 'กำลังบันทึก...' : 'ยืนยันถูกต้อง'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}