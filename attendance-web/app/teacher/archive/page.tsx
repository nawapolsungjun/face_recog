'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ArchivedCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchArchived = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/courses/archived', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const json = await res.json();
    if (json.success) setCourses(json.data);
    setLoading(false);
  };

  const restoreCourse = async (id: string) => {
    if (!confirm('ต้องการดึงวิชานี้กลับไปที่ Dashboard ใช่ไหมครับบอส?')) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/courses/${id}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: 'ACTIVE' })
    });
    if (res.ok) fetchArchived();
  };

  useEffect(() => { fetchArchived(); }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-10 font-sans">
      <div className="max-w-4xl mx-auto">
        <Link href="/teacher/dashboard" className="text-blue-600 font-bold text-sm uppercase tracking-widest">
          ← กลับหน้า Dashboard
        </Link>
        <h1 className="text-3xl font-black text-slate-800 mt-6 mb-10">คลังรายวิชา (Archived)</h1>

        <div className="grid gap-4">
          {courses.map((course: any) => (
            <div key={course.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase">{course.courseCode}</span>
                <h3 className="text-xl font-black text-slate-700">{course.courseName}</h3>
              </div>
              <button 
                onClick={() => restoreCourse(course.id)}
                className="bg-blue-50 text-blue-600 px-6 py-2 rounded-xl font-black text-xs hover:bg-blue-600 hover:text-white transition-all"
              >
                🔄 ดึงกลับมาสอน
              </button>
            </div>
          ))}
          {courses.length === 0 && !loading && (
            <div className="text-center py-20 text-slate-300 font-bold italic">ไม่มีวิชาที่ถูกจัดเก็บไว้</div>
          )}
        </div>
      </div>
    </div>
  );
}