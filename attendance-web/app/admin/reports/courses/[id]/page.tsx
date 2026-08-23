'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function AdminSingleCourseReportPage() {
    const params = useParams();
    const courseId = params.id as string;

    const [courseInfo, setCourseInfo] = useState<any>(null);
    const [summaryReport, setSummaryReport] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // 1. ดึงข้อมูลรายวิชา (ลองดึงจาก API Admin ก่อนเพื่อเอาข้อมูล Teacher มาให้ครบ)
    const fetchCourseDetails = useCallback(async () => {
        try {
            let res = await fetch(`/api/admin/courses/${courseId}/students`);
            let json = await res.json();

            if (json.success && json.data?.course) {
                setCourseInfo(json.data.course);
            } else {
                // Fallback ไปที่ API ทั่วไป
                res = await fetch(`/api/courses/${courseId}`);
                json = await res.json();
                if (json.success && json.data) {
                    setCourseInfo(json.data);
                }
            }
        } catch (err) {
            console.error('Fetch course details error:', err);
        }
    }, [courseId]);

    // 2. ดึงข้อมูลสรุปการเข้าเรียนของวิชานี้
    const fetchSummaryReport = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/report/${courseId}?mode=summary`);
            const json = await res.json();
            if (json.success) {
                setSummaryReport(json.data || []);
            }
        } catch (err) {
            console.error('Fetch summary report error:', err);
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        if (courseId) {
            fetchCourseDetails();
            fetchSummaryReport();
        }
    }, [courseId, fetchCourseDetails, fetchSummaryReport]);

    // ประมวลผลชื่ออาจารย์ผู้สอนจากทุกฟิลด์ที่ส่งมาจาก API
    const getTeacherName = () => {
        if (!courseInfo) return 'กำลังโหลด...';
        if (courseInfo.teacherDisplayName) return courseInfo.teacherDisplayName;
        if (courseInfo.teacher?.firstName) {
            return `${courseInfo.teacher.firstName} ${courseInfo.teacher.lastName || ''}`.trim();
        }
        if (courseInfo.teacher?.name) return courseInfo.teacher.name;
        if (typeof courseInfo.teacher === 'string') return courseInfo.teacher;
        return 'ไม่ระบุอาจารย์ผู้สอน';
    };

    const teacherName = getTeacherName();

    return (
        <div className="min-h-screen flex flex-col bg-[#f0f7f4] font-sans text-slate-800">

            {/* 1. Header ด้านบนตาม Style Canva (หัวข้อตรงกลาง 100%) */}
            <header className="bg-[#0f766e] text-white pt-8 pb-6 px-4 text-center shadow-sm relative print:hidden">
                <div className="absolute top-6 left-6 flex items-center gap-3">
                    <Link
                        href="/admin/dashboard"
                        className="text-emerald-100 hover:text-white font-bold inline-flex items-center gap-1 text-xs uppercase tracking-wider transition-all"
                    >
                        ← Dashboard
                    </Link>
                    <span className="text-emerald-300/60 text-xs">/</span>
                    <Link
                        href="/admin/courses"
                        className="text-emerald-100 hover:text-white font-bold inline-flex items-center gap-1 text-xs uppercase tracking-wider transition-all"
                    >
                        รายวิชา
                    </Link>
                </div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1">
                    ระบบเช็คชื่อนักเรียน
                </h1>
                <p className="text-emerald-100 font-medium text-xs md:text-sm">
                    รายงานการเข้าเรียนรายวิชา: <span className="font-bold text-white">{courseInfo?.courseName || 'กำลังโหลด...'}</span> {courseInfo?.courseCode ? `(${courseInfo.courseCode})` : ''}
                </p>
            </header>

            {/* 3. Main Content */}
            <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8">

                {/* การ์ดข้อมูลรายวิชา */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 rounded-xl font-mono uppercase">
                                {courseInfo?.courseCode || '-'}
                            </span>
                            <span className="text-xs text-slate-400 font-bold">
                                อาจารย์ผู้สอน: <span className="text-slate-700 font-bold">{teacherName}</span>
                            </span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-800">{courseInfo?.courseName || 'กำลังโหลด...'}</h2>
                    </div>

                    <div className="flex items-center gap-3 print:hidden">
                        <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl border border-slate-200/60">
                            นักศึกษาทั้งหมด {summaryReport.length} คน
                        </span>
                        <button
                            onClick={() => window.print()}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
                        >
                            พิมพ์รายงาน PDF
                        </button>
                    </div>
                </div>

                {/* ตารางแสดงผลรายชื่อนักศึกษาและสถิติภาพรวม */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200/60">
                                    <th className="p-4 text-xs font-bold text-slate-600 w-14 text-center">ลำดับ</th>
                                    <th className="p-4 text-xs font-bold text-slate-600 w-40">รหัสประจำตัว</th>
                                    <th className="p-4 text-xs font-bold text-slate-600">ชื่อ - นามสกุล</th>
                                    <th className="p-4 text-xs font-bold text-emerald-700 text-center w-20">มาเรียน</th>
                                    <th className="p-4 text-xs font-bold text-amber-700 text-center w-20">มาสาย</th>
                                    <th className="p-4 text-xs font-bold text-blue-700 text-center w-20">ลา</th>
                                    <th className="p-4 text-xs font-bold text-red-700 text-center w-20">ขาดเรียน</th>
                                    <th className="p-4 text-xs font-bold text-slate-700 text-center w-28">อัตราเข้าเรียน</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="p-16 text-center font-bold text-slate-400 text-xs animate-pulse">
                                            กำลังคำนวณสถิติภาพรวมรายวิชา...
                                        </td>
                                    </tr>
                                ) : summaryReport.length > 0 ? (
                                    summaryReport.map((student: any, index: number) => {
                                        const totalChecked = (student.present || 0) + (student.late || 0) + (student.leave || 0) + (student.absent || 0);
                                        const attendPercentage = totalChecked > 0
                                            ? Math.round((((student.present || 0) + (student.late || 0)) / totalChecked) * 100)
                                            : 0;
                                        const displayName = `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.name || 'ไม่ระบุชื่อ';

                                        return (
                                            <tr key={student.id || index} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="p-4 font-bold text-slate-400 text-xs text-center">{index + 1}</td>
                                                <td className="p-4 font-mono text-xs font-bold text-emerald-700">{student.studentCode}</td>
                                                <td className="p-4 font-bold text-slate-800 text-xs md:text-sm">{displayName}</td>
                                                <td className="p-4 text-center font-black text-emerald-700 bg-emerald-50/30">{student.present || 0}</td>
                                                <td className="p-4 text-center font-black text-amber-700 bg-amber-50/30">{student.late || 0}</td>
                                                <td className="p-4 text-center font-black text-blue-700 bg-blue-50/30">{student.leave || 0}</td>
                                                <td className="p-4 text-center font-black text-red-700 bg-red-50/30">{student.absent || 0}</td>
                                                <td className="p-4 text-center">
                                                    <span className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs ${attendPercentage >= 80 ? 'bg-emerald-100 text-emerald-800' :
                                                            attendPercentage >= 50 ? 'bg-amber-100 text-amber-800' :
                                                                'bg-red-100 text-red-800'
                                                        }`}>
                                                        {attendPercentage}%
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="p-16 text-center text-slate-400 font-bold text-xs">
                                            ไม่พบข้อมูลสถิติการเข้าเรียนในรายวิชานี้
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* 4. Footer ด้านล่าง */}
            <footer className="bg-white text-[#0f766e] py-4 px-4 text-center text-xs font-medium border-t border-slate-100 mt-auto print:hidden">
                ระบบตรวจสอบรายชื่อเข้าชั้นเรียนสาขาวิชานวัตกรรมระบบสารสนเทศ
            </footer>

            <style jsx global>{`
        @media print {
          body { background: white !important; }
          header, nav, footer, .print\\:hidden { display: none !important; }
          main { max-width: 100% !important; padding: 0 !important; }
          .bg-white { box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
          td, th { padding: 8px 12px !important; }
        }
      `}</style>

        </div>
    );
}