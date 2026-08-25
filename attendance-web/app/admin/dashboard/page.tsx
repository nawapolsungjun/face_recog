'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ teachers: 0, students: 0, courses: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // ดึงข้อมูลสถิติจาก API 
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      const json = await res.json();
      if (json.success) {
        setStats(json.stats);
      }
    } catch (err) {
      console.error("Failed to fetch admin stats:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f7f4] font-sans text-slate-800">
      
      {/* 1. Header ด้านบนตาม Style Canva (หัวข้อตรงกลาง 100%) */}
      <header className="bg-[#0f766e] text-white pt-8 pb-6 px-4 text-center shadow-sm relative">
        <div className="absolute top-6 right-6">
          <Link 
            href="/login" 
            className="bg-red-500/80 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
          >
            ออกจากระบบ
          </Link>
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1">
          ระบบตรวจสอบรายชื่อเข้าชั้นเรียน
        </h1>
        <p className="text-emerald-100 font-medium text-xs md:text-sm">
          แผงควบคุมผู้ดูแลระบบ (Admin Control Panel) - สาขาวิชานวัตกรรมระบบสารสนเทศ
        </p>
      </header>

      {/* 3. Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8">
        
        {/* การ์ดต้อนรับ */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800">ยินดีต้อนรับ ผู้ดูแลระบบ</h2>
            <p className="text-slate-500 text-xs font-medium mt-1">จัดการบัญชีผู้ใช้งาน สิทธิ์การเข้าถึง และตรวจสอบภาพรวมระบบได้ที่นี่</p>
          </div>
          <span className="bg-emerald-50 text-emerald-700 font-bold text-xs px-3.5 py-1.5 rounded-xl border border-emerald-100">
            สถานะ: ผู้ดูแลระบบสูงสุด
          </span>
        </div>

        {/* ส่วนแสดงสถิติภาพรวม 3 กล่อง */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

          {/* 1. กล่องอาจารย์ */}
          <Link 
            href="/admin/users?tab=TEACHER" 
            className="block bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm text-left hover:border-emerald-500/50 hover:shadow-md transition-all group"
          >
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">อาจารย์ทั้งหมด</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-slate-800 tracking-tight group-hover:text-emerald-700 transition-colors">
                {isLoading ? '...' : stats.teachers}
              </span>
              <span className="text-slate-400 font-bold text-xs">คน</span>
            </div>
          </Link>

          {/* 2. กล่องนักศึกษา */}
          <Link 
            href="/admin/users?tab=STUDENT" 
            className="block bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm text-left hover:border-emerald-500/50 hover:shadow-md transition-all group"
          >
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">นักศึกษาทั้งหมด</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-slate-800 tracking-tight group-hover:text-emerald-700 transition-colors">
                {isLoading ? '...' : stats.students}
              </span>
              <span className="text-slate-400 font-bold text-xs">คน</span>
            </div>
          </Link>

          {/* 3. กล่องรายวิชา */}
          <Link 
            href="/admin/courses" 
            className="block bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm text-left hover:border-emerald-500/50 hover:shadow-md transition-all group"
          >
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">รายวิชาในระบบ</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-slate-800 tracking-tight group-hover:text-emerald-700 transition-colors">
                {isLoading ? '...' : stats.courses}
              </span>
              <span className="text-slate-400 font-bold text-xs">วิชา</span>
            </div>
          </Link>

        </div>

        {/* เมนูจัดการหลัก */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* ส่วนจัดการบัญชีผู้ใช้ */}
          <section className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200/80">
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-100">
              <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center text-sm border border-emerald-100">
                👤
              </span>
              <h3 className="text-lg font-black text-slate-800">จัดการบัญชีผู้ใช้</h3>
            </div>
            <div className="space-y-3">
              <Link 
                href="/admin/users/register" 
                className="flex items-center justify-between p-4 bg-slate-50/80 rounded-xl hover:bg-emerald-50 hover:text-emerald-800 transition-all group border border-slate-100 hover:border-emerald-200"
              >
                <span className="font-bold text-slate-700 group-hover:text-emerald-800 text-xs md:text-sm">ลงทะเบียนอาจารย์ / นักศึกษาใหม่</span>
                <span className="group-hover:translate-x-1 transition-transform text-slate-400 group-hover:text-emerald-700">→</span>
              </Link>
              <Link 
                href="/admin/users" 
                className="flex items-center justify-between p-4 bg-slate-50/80 rounded-xl hover:bg-emerald-50 hover:text-emerald-800 transition-all group border border-slate-100 hover:border-emerald-200"
              >
                <span className="font-bold text-slate-700 group-hover:text-emerald-800 text-xs md:text-sm">รายชื่อผู้ใช้และยกเลิกบัญชี</span>
                <span className="group-hover:translate-x-1 transition-transform text-slate-400 group-hover:text-emerald-700">→</span>
              </Link>
            </div>
          </section>

          {/* ส่วนจัดการรายงานและระบบ */}
          <section className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200/80">
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-100">
              <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center text-sm border border-emerald-100">
                📊
              </span>
              <h3 className="text-lg font-black text-slate-800">รายงานและภาพรวม</h3>
            </div>
            <div className="space-y-3">
              <Link 
                href="/admin/reports/courses" 
                className="flex items-center justify-between p-4 bg-slate-50/80 rounded-xl hover:bg-emerald-50 hover:text-emerald-800 transition-all group border border-slate-100 hover:border-emerald-200"
              >
                <span className="font-bold text-slate-700 group-hover:text-emerald-800 text-xs md:text-sm">ออกรายงานสรุปการเข้าเรียนภาพรวม</span>
                <span className="group-hover:translate-x-1 transition-transform text-slate-400 group-hover:text-emerald-700">→</span>
              </Link>
            </div>
          </section>

        </div>
      </main>

      {/* 4. Footer ด้านล่าง */}
      <footer className="bg-white text-[#0f766e] py-4 px-4 text-center text-xs font-medium border-t border-slate-100 mt-auto">
        ระบบตรวจสอบรายชื่อเข้าชั้นเรียนสาขาวิชานวัตกรรมระบบสารสนเทศ
      </footer>

    </div>
  );
}