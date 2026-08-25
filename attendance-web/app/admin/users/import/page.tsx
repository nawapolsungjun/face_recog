'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import * as XLSX from 'xlsx';

export default function ImportUsersPage() {
  const router = useRouter();
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // ฟังก์ชันดาวน์โหลดแบบฟอร์มตัวอย่าง
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        รหัสนักศึกษา: '67605050001-3',
        ชื่อ: 'สมชาย',
        นามสกุล: 'ใจดี',
        อีเมล: '67605050001-3@rmutk.ac.th',
        รหัสผ่าน: '67605050001-3',
      },
      {
        รหัสนักศึกษา: '67605050002-1',
        ชื่อ: 'สมหญิง',
        นามสกุล: 'รักเรียน',
        อีเมล: '67605050002-1@rmutk.ac.th',
        รหัสผ่าน: '67605050002-1',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    XLSX.writeFile(workbook, 'student_register_template.xlsx');
  };

  // ฟังก์ชันส่งไฟล์ไปบันทึก
  const handleUploadSubmit = async () => {
    if (!selectedFile) {
      alert('กรุณาเลือกไฟล์ Excel หรือ CSV ก่อน');
      return;
    }

    const uploadFormData = new FormData();
    uploadFormData.append('file', selectedFile);

    setIsImporting(true);
    try {
      const res = await fetch('/api/admin/users/import', {
        method: 'POST',
        body: uploadFormData,
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        router.push('/admin/users');
      } else {
        alert('นำเข้าไม่สำเร็จ: ' + data.error);
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f7f4] font-sans text-slate-800">
      {/* 1. Header */}
      <header className="bg-[#0f766e] text-white pt-8 pb-6 px-4 text-center shadow-sm relative">
        <div className="absolute top-6 left-6">
          <Link
            href="/admin/users"
            className="text-emerald-100 hover:text-white font-bold inline-flex items-center gap-2 text-xs uppercase tracking-wider transition-all"
          >
            ← Back to Users
          </Link>
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1">
          ระบบตรวจสอบรายชื่อเข้าชั้นเรียน
        </h1>
        <p className="text-emerald-100 font-medium text-xs md:text-sm">
          สาขาวิชานวัตกรรมระบบสารสนเทศ
        </p>
      </header>

      {/* 2. Main Content Card */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 md:py-10 flex flex-col justify-center">
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200/80">
          
          <div className="text-center mb-6 pb-4 border-b border-slate-100">
            
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">นำเข้ารายชื่อนักศึกษา</h2>
            <p className="text-slate-400 font-medium mt-1 text-xs">
              เพิ่มบัญชีนักศึกษาพร้อมกันทั้งห้องผ่านไฟล์ Excel / Google Sheet
            </p>
          </div>

          <div className="space-y-5">
            {/* ขั้นตอนที่ 1 */}
            <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-slate-700">ขั้นตอนที่ 1: ดาวน์โหลดแบบฟอร์ม</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">ใช้แบบฟอร์มมาตรฐานเพื่อความถูกต้องของข้อมูล</p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 shadow-sm transition-all cursor-pointer whitespace-nowrap"
                >
                 ดาวน์โหลดฟอร์ม
                </button>
              </div>
            </div>

            {/* ขั้นตอนที่ 2 */}
            <div className="p-4 bg-emerald-50/40 border border-emerald-200/60 rounded-xl">
              <h4 className="text-xs font-bold text-emerald-900 mb-2">ขั้นตอนที่ 2: แนบไฟล์ข้อมูล</h4>
              
              <label className="block border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer bg-white transition-all">
                <span className="text-xs font-bold text-slate-700 block">
                  {selectedFile ? selectedFile.name : 'คลิกเพื่อเลือกไฟล์ Excel (.xlsx, .xls, .csv)'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">
                  {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'หรือลากไฟล์มาวางในบริเวณนี้'}
                </span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            </div>

            {/* ปุ่มยืนยัน */}
            <div className="pt-2 flex gap-3">
              <Link
                href="/admin/users"
                className="flex-1 py-3 text-center font-bold text-slate-400 hover:text-slate-600 text-xs rounded-xl bg-slate-50 hover:bg-slate-100 transition-all"
              >
                ยกเลิก
              </Link>
              <button
                type="button"
                disabled={!selectedFile || isImporting}
                onClick={handleUploadSubmit}
                className="flex-[2] bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white py-3 rounded-xl font-bold text-xs shadow-sm transition-all disabled:bg-slate-300 cursor-pointer"
              >
                {isImporting ? 'กำลังนำเข้าข้อมูล...' : 'ยืนยันนำเข้าข้อมูล'}
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white text-[#0f766e] py-4 px-4 text-center text-xs font-medium border-t border-slate-100 mt-auto">
        ระบบตรวจสอบรายชื่อเข้าชั้นเรียนสาขาวิชานวัตกรรมระบบสารสนเทศ
      </footer>
    </div>
  );
}