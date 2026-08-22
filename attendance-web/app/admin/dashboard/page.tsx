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
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Sidebar หรือ Navigation สำหรับ Admin */}
      <nav className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-4xl font-black text-slate-800 tracking-tighter">
            ผู้ดูแลระบบ
          </h1>
          <Link href="/login" className="text-sm font-bold text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl transition-all">
            ออกจากระบบ
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-10">
        <header className="mb-10">
          <h2 className="text-4xl font-black text-slate-800">แผงควบคุมผู้ดูแลระบบ</h2>
          <p className="text-slate-500 mt-2 font-medium">ยินดีต้อนรับ Admin! จัดการบัญชีและตรวจสอบระบบได้ที่นี่</p>
        </header>

        {/* ส่วนแสดงสถิติภาพรวม */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
  
          {/* 1. กล่องอาจารย์ */}
          <Link href="/admin/users?tab=TEACHER" className="block bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm text-left hover:shadow-xl hover:border-blue-100 hover:scale-[1.01] transition-all duration-300 group active:scale-[0.99]">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">อาจารย์ทั้งหมด</p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-black text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors">
                {isLoading ? '...' : stats.teachers}
              </span>
              <span className="text-slate-400 font-bold text-sm">คน</span>
            </div>
          </Link>

          {/* 2. กล่องนักศึกษา */}
          <Link href="/admin/users?tab=STUDENT" className="block bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm text-left hover:shadow-xl hover:border-blue-100 hover:scale-[1.01] transition-all duration-300 group active:scale-[0.99]">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">นักศึกษาทั้งหมด</p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-black text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors">
                {isLoading ? '...' : stats.students}
              </span>
              <span className="text-slate-400 font-bold text-sm">คน</span>
            </div>
          </Link>

          {/* 3. กล่องรายวิชา */}
          <Link href="/admin/courses" className="block bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm text-left hover:shadow-xl hover:border-blue-100 hover:scale-[1.01] transition-all duration-300 group active:scale-[0.99]">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">รายวิชาในระบบ</p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-black text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors">
                {isLoading ? '...' : stats.courses}
              </span>
              <span className="text-slate-400 font-bold text-sm">วิชา</span>
            </div>
          </Link>

        </div>

        {/* เมนูจัดการหลัก */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* ส่วนจัดการบัญชีผู้ใช้ */}
          <section className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100">
            <div className="flex items-center gap-4 mb-6">
              <h3 className="text-xl font-black text-slate-800">จัดการบัญชีผู้ใช้</h3>
            </div>
            <div className="space-y-3">
              <Link href="/admin/users/register" className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-blue-100 hover:text-white transition-all group">
                <span className="font-bold text-slate-700">ลงทะเบียนอาจารย์/นักศึกษาใหม่</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
              <Link href="/admin/users" className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-blue-100 hover:text-white transition-all group">
                <span className="font-bold text-slate-700">รายชื่อผู้ใช้และยกเลิกบัญชี</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
          </section>

          {/* ส่วนจัดการรายงานและระบบ */}
          <section className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100">
            <div className="flex items-center gap-4 mb-6">
              <h3 className="text-xl font-black text-slate-800">รายงานและภาพรวม</h3>
            </div>
            <div className="space-y-3">
              <Link href="/admin/reports/courses" className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-gray-200 hover:text-white transition-all group">
                <span className="font-bold text-slate-700">ออกรายงานสรุปการเข้าเรียนภาพรวม</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}