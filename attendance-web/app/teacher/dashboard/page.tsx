// attendance-web/app/teacher/dashboard/page.tsx
'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface TeacherProfile {
  id?: string | number;
  firstName?: string;
  lastName?: string;
  name?: string;
  displayName?: string;
  role?: string;
  email?: string;
  [key: string]: unknown;
}

interface CourseItem {
  id: string;
  courseCode: string;
  courseName: string;
  credits?: string;
  section?: string;
  semester?: string;
  academicYear?: string;
  studentsCount?: number;
  students?: unknown[];
  _count?: {
    students?: number;
    attendances?: number;
  };
  createdAt?: string;
}

export default function TeacherDashboardPage() {
  const router = useRouter();

  const [teacherInfo, setTeacherInfo] = useState<TeacherProfile | null>(null);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const getAuthToken = () => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('teacher_token') || localStorage.getItem('token') || '';
  };

  const fetchCourses = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/courses', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const resJson = await res.json();
      if (resJson.success && Array.isArray(resJson.data)) {
        setCourses(resJson.data);
      } else {
        setCourses([]);
      }
    } catch (err) {
      console.error('Fetch courses error:', err);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTeacherProfile = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/teacher/profile', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const resJson = await res.json();
      if (resJson.success && resJson.data) {
        const freshName = `${resJson.data.firstName || ''} ${resJson.data.lastName || ''}`.trim() || resJson.data.name || 'อาจารย์';
        setTeacherInfo((prev: TeacherProfile | null) => ({
          ...(prev || {}),
          ...resJson.data,
          displayName: freshName,
        }));
      }
    } catch (err) {
      console.error('Fetch teacher profile error:', err);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedUserStr = localStorage.getItem('teacher_user') || localStorage.getItem('user');
    const token = getAuthToken();

    if (!savedUserStr || !token) {
      router.replace('/teacher/login');
      return;
    }

    try {
      const parsedUser: TeacherProfile = JSON.parse(savedUserStr);
      if (parsedUser.role && parsedUser.role.toUpperCase() !== 'TEACHER' && parsedUser.role.toUpperCase() !== 'ADMIN') {
        router.replace('/teacher/login');
        return;
      }

      const displayName = `${parsedUser.firstName || ''} ${parsedUser.lastName || ''}`.trim() || parsedUser.name || 'อาจารย์';
      setTeacherInfo({ ...parsedUser, displayName });

      fetchTeacherProfile(token);
      fetchCourses(token);
    } catch {
      router.replace('/teacher/login');
    }
  }, [fetchCourses, fetchTeacherProfile, router]);

  const handleLogout = () => {
    localStorage.removeItem('teacher_user');
    localStorage.removeItem('teacher_token');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    router.replace('/teacher/login');
  };

  const filteredCourses = useMemo(() => {
    if (!searchTerm.trim()) return courses;
    const term = searchTerm.toLowerCase().trim();
    return courses.filter((c) => {
      const code = (c.courseCode || '').toLowerCase();
      const name = (c.courseName || '').toLowerCase();
      return code.includes(term) || name.includes(term);
    });
  }, [courses, searchTerm]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f7f4] flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-emerald-800 font-bold text-xs animate-pulse tracking-wider">กำลังโหลดแดชบอร์ดอาจารย์...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f7f4] font-sans text-slate-800">
      <header className="bg-[#0f766e] text-white pt-8 pb-6 px-4 text-center shadow-sm relative">
        <div className="absolute top-6 right-6">
          <button
            type="button"
            onClick={handleLogout}
            className="text-emerald-100 hover:text-white font-bold inline-flex items-center gap-1.5 text-xs uppercase tracking-wider bg-emerald-800/60 hover:bg-emerald-800 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer"
          >
            ออกจากระบบ
          </button>
        </div>

        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1">
          ระบบตรวจสอบรายชื่อด้วยการรู้จำใบหน้า
        </h1>
        <p className="text-emerald-100 font-medium text-xs md:text-sm mt-1">
          ยินดีต้อนรับ: <span className="font-bold text-white">{teacherInfo?.displayName || 'อาจารย์ผู้สอน'}</span>
        </p>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 space-y-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="w-full md:w-auto">
            <h2 className="text-xl font-black text-slate-800">รายวิชาที่รับผิดชอบ</h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              จัดการการเช็คชื่อ สรุปสถิติเวลาเรียน และนำเข้ารายชื่อนักศึกษา
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <input
              type="text"
              placeholder="ค้นหารหัสวิชา หรือ ชื่อวิชา..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-64 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            <Link
              href="/teacher/course/create"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm whitespace-nowrap inline-flex items-center gap-1.5 cursor-pointer"
            >
              + เพิ่มรายวิชา
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCourses.length > 0 ? (
            filteredCourses.map((course) => {
              const studentsCount = course.studentsCount ?? course.students?.length ?? course._count?.students ?? 0;

              return (
                <div
                  key={course.id}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col justify-between hover:shadow-md transition-all group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono font-bold text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                        {course.courseCode}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">
                        นศ. {studentsCount} คน
                      </span>
                    </div>

                    <h3 className="text-base font-black text-slate-800 line-clamp-2 group-hover:text-emerald-700 transition-colors">
                      {course.courseName}
                    </h3>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Link
                      href={`/teacher/course/${course.id}`}
                      className="flex-1 text-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-xs"
                    >
                      เช็คชื่อสแกนใบหน้า
                    </Link>
                    <Link
                      href={`/teacher/report/${course.id}`}
                      className="flex-1 text-center bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs py-2.5 rounded-xl border border-slate-200/80 transition-all"
                    >
                      รายงานสรุป
                    </Link>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full bg-white rounded-2xl p-14 text-center border border-slate-200/80 shadow-sm">
              <p className="text-slate-400 font-bold text-xs">
                {searchTerm ? 'ไม่พบรายวิชาที่ตรงกับคำค้นหา' : 'ยังไม่มีรายวิชาที่เปิดสอน'}
              </p>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-[#0f766e] text-emerald-100 py-4 px-4 text-center text-xs font-medium md:text-sm mt-auto">
        © 2026 ระบบตรวจสอบรายชื่อด้วยการรู้จำใบหน้า
        <p className="text-emerald-100 font-medium text-xs md:text-sm">
          สาขาวิชานวัตกรรมระบบสารสนเทศ คณะบริหารธุรกิจ มหาวิทยาลัยเทคโนโลยีราชมงคลกรุงเทพ
        </p>
      </footer>
    </div>
  );
}