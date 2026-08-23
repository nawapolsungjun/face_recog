'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function AdminSingleCourseReportPage() {
  const params = useParams();
  const courseId = params.id as string;

  const [courseInfo, setCourseInfo] = useState<any>(null);
  const [reportMode, setReportMode] = useState<'daily' | 'summary'>('daily');
  const [dailyReport, setDailyReport] = useState<any>({
    success: false,
    data: [],
    summary: { total: 0, present: 0, late: 0, absent: 0, leave: 0 }
  });
  const [weeksSummaryData, setWeeksSummaryData] = useState<any[]>([]);
  const [totalStudentsCount, setTotalStudentsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [dailyRoundsCount, setDailyRoundsCount] = useState<number>(0);

  const [filter, setFilter] = useState('ทั้งหมด');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // State สำหรับ Modal แก้ไขสถานะและระบุหมายเหตุ
  const [editingStudent, setEditingStudent] = useState<{
    id: number;
    name: string;
    studentCode: string;
    currentStatus: string;
    newStatus: string;
    currentTime: string;
    remark: string;
  } | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const getAuthToken = () => localStorage.getItem('admin_token') || localStorage.getItem('token');

  const getLocalDateString = (dateObj: Date | string) => {
    const d = new Date(dateObj);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 1. ดึงข้อมูลรายวิชาและข้อมูลอาจารย์ผู้สอน
  const fetchCourseDetails = useCallback(async () => {
    const token = getAuthToken();
    try {
      let res = await fetch(`/api/admin/courses/${courseId}/students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let json = await res.json();

      if (json.success && json.data?.course) {
        setCourseInfo(json.data.course);
        setTotalStudentsCount(json.data.course.students?.length || 0);
      } else {
        res = await fetch(`/api/courses/${courseId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        json = await res.json();
        if (json.success && json.data) {
          setCourseInfo(json.data);
          setTotalStudentsCount(json.data.students?.length || 0);
        }
      }
    } catch (err) {
      console.error('Fetch course details error:', err);
    }
  }, [courseId]);

  // 2. ดึงข้อมูลรายงานประจำวันของวิชานี้
  const fetchDailyReport = useCallback(async (date: string) => {
    setLoading(true);
    const token = getAuthToken();
    try {
      const [resDaily, resHistory] = await Promise.all([
        fetch(`/api/report/${courseId}?date=${date}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/attendance/history/${courseId}?date=${date}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => null)
      ]);

      const dailyJson = await resDaily.json();
      if (dailyJson.success) {
        setDailyReport(dailyJson);
        if (dailyJson.summary?.total) setTotalStudentsCount(dailyJson.summary.total);
      } else {
        setDailyReport({ success: false, data: [], summary: { total: 0, present: 0, late: 0, absent: 0, leave: 0 } });
      }

      if (resHistory && resHistory.ok) {
        const historyJson = await resHistory.json();
        const rawList = Array.isArray(historyJson.data) ? historyJson.data : Array.isArray(historyJson) ? historyJson : [];
        const matchedSessions = rawList.filter((item: any) => {
          if (!item.createdAt && !item.date) return false;
          return getLocalDateString(item.createdAt || item.date) === date;
        });
        setDailyRoundsCount(matchedSessions.length);
      } else {
        setDailyRoundsCount(0);
      }
    } catch (err) {
      console.error("Fetch daily report error:", err);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  // 3. ดึงข้อมูลสรุปรายสัปดาห์ (18 สัปดาห์)
  const fetchWeeksSummary = useCallback(async () => {
    setLoading(true);
    const token = getAuthToken();
    try {
      const res = await fetch(`/api/report/${courseId}?mode=weeks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setWeeksSummaryData(json.data);
        if (json.totalStudents) setTotalStudentsCount(json.totalStudents);
      } else {
        setWeeksSummaryData([]);
      }
    } catch (err) {
      console.error("Fetch weeks summary error:", err);
      setWeeksSummaryData([]);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (courseId) {
      fetchCourseDetails();
      if (reportMode === 'daily') {
        fetchDailyReport(selectedDate);
      } else {
        fetchWeeksSummary();
      }
    }
  }, [courseId, selectedDate, reportMode, fetchCourseDetails, fetchDailyReport, fetchWeeksSummary]);

  // ฟังก์ชันเปิด Modal แก้ไขสถานะ
  const handleOpenStatusModal = (item: any, newStatus: string, timeString: string) => {
    const displayName = `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.name || 'ไม่ระบุชื่อ';
    
    let defaultRemark = item.remark || '';
    if (newStatus === 'มาสาย' && !defaultRemark) defaultRemark = 'เช็คชื่อรอบที่ 2';
    else if (newStatus === 'ลา' && !defaultRemark) defaultRemark = 'ลากิจ / ลาป่วย';
    else if (newStatus === 'มาเรียน' && !defaultRemark) defaultRemark = 'แก้ไขสถานะเป็นมาเรียน';
    else if (newStatus === 'ขาดเรียน' && !defaultRemark) defaultRemark = 'ไม่พบในชั้นเรียน';

    setEditingStudent({
      id: item.id,
      name: displayName,
      studentCode: item.studentCode,
      currentStatus: item.status,
      newStatus: newStatus,
      currentTime: timeString,
      remark: defaultRemark
    });
  };

  // ฟังก์ชันบันทึกการแก้ไขสถานะ
  const handleSaveStatusModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    setIsSubmittingEdit(true);
    const token = getAuthToken();

    try {
      const res = await fetch(`/api/attendance/direct`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          studentId: editingStudent.id,
          courseId: courseId,
          status: editingStudent.newStatus,
          date: selectedDate,
          time: editingStudent.currentTime,
          remark: editingStudent.remark.trim() || 'แก้ไขโดยผู้ดูแลระบบ'
        })
      });

      if (res.ok) {
        setEditingStudent(null);
        fetchDailyReport(selectedDate);
        fetchWeeksSummary();
      } else {
        alert('ไม่สามารถอัปเดตสถานะได้');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // ฟังก์ชันแก้ไขเวลาเช็คชื่อ
  const handleTimeChange = async (studentId: number, currentStatus: string, newTimeStr: string) => {
    const token = getAuthToken();
    try {
      const res = await fetch(`/api/attendance/direct`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          studentId,
          courseId,
          status: currentStatus,
          date: selectedDate,
          time: newTimeStr,
          remark: 'แก้ไขเวลาโดยผู้ดูแลระบบ'
        })
      });

      if (res.ok) {
        fetchDailyReport(selectedDate);
        fetchWeeksSummary();
      } else {
        alert('ไม่สามารถอัปเดตเวลาได้');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

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

  const filteredDailyData = dailyReport.data.filter((item: any) => {
    if (filter === 'ทั้งหมด') return true;
    return item.status === filter;
  });

  const TOTAL_WEEKS = 18;
  const weeksList = Array.from({ length: TOTAL_WEEKS }, (_, i) => {
    const weekNumber = i + 1;
    const weekData = weeksSummaryData[i];

    if (weekData) {
      return {
        weekNumber,
        dateStr: weekData.dateStr,
        rawDate: weekData.rawDate,
        present: weekData.present,
        late: weekData.late,
        leave: weekData.leave,
        absent: weekData.absent,
        totalCount: weekData.totalCount || totalStudentsCount,
        percentage: weekData.percentage,
        isChecked: true
      };
    }

    return {
      weekNumber,
      dateStr: 'ยังไม่บันทึก',
      rawDate: '',
      present: 0,
      late: 0,
      leave: 0,
      absent: 0,
      totalCount: totalStudentsCount || 0,
      percentage: 0,
      isChecked: false
    };
  });

  const handleSelectWeek = (week: any) => {
    if (week.rawDate) {
      setSelectedDate(week.rawDate);
    }
    setReportMode('daily');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f7f4] font-sans text-slate-800">

      {/* 1. Header ด้านบนตาม Style ของระบบ */}
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
            href="/admin/reports/courses"
            className="text-emerald-100 hover:text-white font-bold inline-flex items-center gap-1 text-xs uppercase tracking-wider transition-all"
          >
            รายวิชาทั้งหมด
          </Link>
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1">
          ระบบเช็คชื่อนักเรียน (ผู้ดูแลระบบ)
        </h1>
        <p className="text-emerald-100 font-medium text-xs md:text-sm">
          วิชา: <span className="font-bold text-white">{courseInfo?.courseName || 'กำลังโหลด...'}</span> {courseInfo?.courseCode ? `(${courseInfo.courseCode})` : ''} • อาจารย์ผู้สอน: {teacherName}
        </p>
      </header>

      {/* 2. Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8">

        {/* แถบสลับมุมมอง รายละเอียดรายวัน / สถิติรวมทุกสัปดาห์ */}
        <div className="flex justify-center mb-6 print:hidden">
          <div className="inline-flex bg-slate-200/80 p-1 rounded-xl shadow-inner border border-slate-300/60">
            <button
              type="button"
              onClick={() => setReportMode('daily')}
              className={`px-6 py-2 rounded-lg font-bold text-xs md:text-sm transition-all cursor-pointer ${
                reportMode === 'daily'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📅 รายละเอียดรายวัน
            </button>
            <button
              type="button"
              onClick={() => setReportMode('summary')}
              className={`px-6 py-2 rounded-lg font-bold text-xs md:text-sm transition-all cursor-pointer ${
                reportMode === 'summary'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📊 สถิติรวมทุกสัปดาห์
            </button>
          </div>
        </div>

        {/* โหมดรายงานประจำวัน */}
        {reportMode === 'daily' && (
          <div className="animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 mb-6 print:hidden">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    เลือกวันที่
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs md:text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    รายวิชา
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={`${courseInfo?.courseName || 'กำลังโหลด...'} ${courseInfo?.courseCode ? `(${courseInfo.courseCode})` : ''}`}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-bold text-slate-500 outline-none"
                  />
                </div>

                <div>
                  <Link
                    href={`/admin/reports/courses/${courseId}/history?date=${selectedDate}`}
                    className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm shadow-sm transition-all cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    ประวัติการบันทึก ({dailyRoundsCount} รอบ)
                  </Link>
                </div>
              </div>

              {/* การ์ดสรุปตัวเลข 5 ช่อง */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-100">
                {[
                  { label: 'ทั้งหมด', count: dailyReport.summary?.total || 0, color: 'text-slate-600', bg: 'bg-slate-50' },
                  { label: 'มาเรียน', count: dailyReport.summary?.present || 0, color: 'text-emerald-600', bg: 'bg-emerald-50/50' },
                  { label: 'มาสาย', count: dailyReport.summary?.late || 0, color: 'text-amber-600', bg: 'bg-amber-50/50' },
                  { label: 'ลา', count: dailyReport.summary?.leave || 0, color: 'text-blue-600', bg: 'bg-blue-50/50' },
                  { label: 'ขาดเรียน', count: dailyReport.summary?.absent || 0, color: 'text-red-600', bg: 'bg-red-50/50' }
                ].map((stat, i) => (
                  <div key={i} className={`${stat.bg} p-3.5 rounded-xl border border-slate-100 text-center`}>
                    <p className="text-[11px] font-bold text-slate-500 mb-1">{stat.label}</p>
                    <p className={`text-xl font-black ${stat.color}`}>{stat.count}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ตารางรายชื่อนักศึกษาประจำวัน */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex gap-2 overflow-x-auto print:hidden">
                {['ทั้งหมด', 'มาเรียน', 'มาสาย', 'ลา', 'ขาดเรียน'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      filter === f 
                        ? 'bg-emerald-600 text-white shadow-sm' 
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200/60'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/60">
                      <th className="p-4 text-xs font-bold text-slate-600 w-14 text-center">ลำดับ</th>
                      <th className="p-4 text-xs font-bold text-slate-600 w-36">เวลาเช็คชื่อ</th>
                      <th className="p-4 text-xs font-bold text-slate-600 w-36">รหัสประจำตัว</th>
                      <th className="p-4 text-xs font-bold text-slate-600">ชื่อ - นามสกุล</th>
                      <th className="p-4 text-xs font-bold text-slate-600 text-center w-40">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="p-14 text-center font-bold text-slate-400 animate-pulse">
                          กำลังโหลดข้อมูลประจำวัน...
                        </td>
                      </tr>
                    ) : filteredDailyData.length > 0 ? (
                      filteredDailyData.map((item: any, index: number) => {
                        const timeString = item.time 
                          ? new Date(item.time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false }) 
                          : '';
                        const displayName = `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.name || 'ไม่ระบุชื่อ';

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-4 text-xs font-bold text-slate-400 text-center">
                              {index + 1}
                            </td>
                            <td className="p-4 text-xs font-medium text-slate-600">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="time"
                                  value={timeString}
                                  onChange={(e) => handleTimeChange(item.id, item.status, e.target.value)}
                                  className="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                                />
                                <span className="text-[11px] text-slate-400">น.</span>
                              </div>
                            </td>
                            <td className="p-4 text-xs font-bold font-mono text-emerald-700">
                              {item.studentCode}
                            </td>
                            <td className="p-4">
                              <div className="text-xs font-bold text-slate-800">{displayName}</div>
                              {item.remark && (
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60 font-medium">
                                    หมายเหตุ: {item.remark}
                                  </span>
                                  {item.isManual && (
                                    <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded border border-amber-200">
                                      แก้ไขโดยผู้ดูแลระบบ
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <select
                                value={item.status}
                                onChange={(e) => handleOpenStatusModal(item, e.target.value, timeString)}
                                className={`text-xs font-bold px-3 py-1.5 rounded-xl border outline-none cursor-pointer transition-all ${
                                  item.status === 'มาเรียน' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  item.status === 'มาสาย' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  item.status === 'ลา' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  'bg-red-50 text-red-700 border-red-200'
                                }`}
                              >
                                <option value="มาเรียน">มาเรียน</option>
                                <option value="มาสาย">มาสาย</option>
                                <option value="ลา">ลา</option>
                                <option value="ขาดเรียน">ขาดเรียน</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-16 text-center text-slate-400 font-bold text-xs">
                          ไม่พบข้อมูลการเช็คชื่อสำหรับวันที่เลือก
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* โหมดสรุปภาพรวมทุกสัปดาห์ (18 สัปดาห์) */}
        {reportMode === 'summary' && (
          <div className="animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
              <div className="p-6 bg-emerald-700 text-white flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-black">ตารางสรุปสถิติภาพรวมทุกสัปดาห์</h2>
                  <p className="text-emerald-100 text-xs mt-0.5">รวมสถิติการเช็คชื่อทั้ง 18 สัปดาห์ตลอดภาคการศึกษา</p>
                </div>
                <span className="text-xs bg-emerald-800 text-white px-3.5 py-1.5 rounded-xl font-bold">
                  ทั้งหมด 18 สัปดาห์
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/60">
                      <th className="p-4 text-xs font-bold text-slate-600 w-28 text-center">สัปดาห์ที่</th>
                      <th className="p-4 text-xs font-bold text-slate-600 w-36">วันที่บันทึก</th>
                      <th className="p-4 text-xs font-bold text-slate-600 text-center w-28">นศ. ทั้งหมด</th>
                      <th className="p-4 text-xs font-bold text-slate-600 text-center">สรุปการเข้าเรียน (มา / สาย / ลา / ขาด)</th>
                      <th className="p-4 text-xs font-bold text-slate-600 text-center w-36">อัตราการเข้าเรียน (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="p-14 text-center font-bold text-slate-400 animate-pulse">
                          กำลังประมวลผลสถิติรายสัปดาห์...
                        </td>
                      </tr>
                    ) : (
                      weeksList.map((week) => (
                        <tr 
                          key={week.weekNumber} 
                          onClick={() => handleSelectWeek(week)}
                          className={`transition-colors cursor-pointer ${
                            week.isChecked ? 'hover:bg-emerald-50/40 bg-white' : 'hover:bg-slate-50/80 bg-slate-50/20'
                          }`}
                          title={week.isChecked ? `คลิกเพื่อดูรายชื่อนักศึกษาในสัปดาห์ที่ ${week.weekNumber}` : 'ยังไม่มีการเช็คชื่อในสัปดาห์นี้'}
                        >
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl font-bold text-xs ${
                              week.isChecked 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-slate-100 text-slate-400'
                            }`}>
                              {week.weekNumber}
                            </span>
                          </td>

                          <td className="p-4 text-xs font-bold text-slate-700">
                            {week.dateStr !== 'ยังไม่บันทึก' ? (
                              <span className="text-emerald-800 font-bold">{week.dateStr}</span>
                            ) : (
                              <span className="text-slate-300 font-medium">ยังไม่บันทึก</span>
                            )}
                          </td>

                          <td className="p-4 text-center font-bold font-mono text-emerald-700 text-xs">
                            {week.isChecked ? week.totalCount : '-'}
                          </td>

                          <td className="p-4">
                            {week.isChecked ? (
                              <div className="flex justify-center items-center gap-1.5 flex-wrap">
                                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-xs font-bold">
                                  มา {week.present}
                                </span>
                                <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg text-xs font-bold">
                                  สาย {week.late}
                                </span>
                                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-xs font-bold">
                                  ลา {week.leave}
                                </span>
                                <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-100 rounded-lg text-xs font-bold">
                                  ขาด {week.absent}
                                </span>
                              </div>
                            ) : (
                              <div className="text-center text-slate-300 text-xs font-medium italic">
                                - ยังไม่มีการเช็คชื่อ -
                              </div>
                            )}
                          </td>

                          <td className="p-4">
                            {week.isChecked ? (
                              <div className="flex flex-col items-center">
                                <span className="text-xs font-mono font-bold text-emerald-700">
                                  {week.percentage}%
                                </span>
                                <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                                  <div 
                                    className="h-full bg-emerald-500 rounded-full transition-all"
                                    style={{ width: `${week.percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center opacity-30">
                                <span className="text-xs font-mono font-bold text-slate-400">0%</span>
                                <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1.5"></div>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ปุ่ม Export PDF */}
        <div className="mt-8 flex justify-end print:hidden">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            พิมพ์รายงาน / Export PDF
          </button>
        </div>
      </main>

      {/* 3. Footer ด้านล่าง */}
      <footer className="bg-white text-[#0f766e] py-4 px-4 text-center text-xs font-medium border-t border-slate-100 mt-auto print:hidden">
        ระบบตรวจสอบรายชื่อเข้าชั้นเรียนสาขาวิชานวัตกรรมระบบสารสนเทศ
      </footer>

      {/* Modal Popup: แก้ไขสถานะและระบุหมายเหตุ */}
      {editingStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-slate-800 mb-1">แก้ไขสถานะการเข้าเรียน (โหมดผู้ดูแลระบบ)</h3>
            <p className="text-xs text-slate-400 mb-4">
              นักศึกษา: <span className="font-bold text-slate-700">{editingStudent.name}</span> ({editingStudent.studentCode})
            </p>

            <form onSubmit={handleSaveStatusModal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  สถานะใหม่
                </label>
                <select
                  value={editingStudent.newStatus}
                  onChange={(e) => {
                    const nextStatus = e.target.value;
                    let nextRemark = editingStudent.remark;
                    if (nextStatus === 'มาสาย') nextRemark = 'เช็คชื่อรอบที่ 2';
                    else if (nextStatus === 'ลา') nextRemark = 'ลากิจ / ลาป่วย';
                    else if (nextStatus === 'มาเรียน') nextRemark = 'แก้ไขสถานะเป็นมาเรียน';
                    else if (nextStatus === 'ขาดเรียน') nextRemark = 'ไม่พบในชั้นเรียน';

                    setEditingStudent({
                      ...editingStudent,
                      newStatus: nextStatus,
                      remark: nextRemark
                    });
                  }}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                >
                  <option value="มาเรียน">มาเรียน</option>
                  <option value="มาสาย">มาสาย</option>
                  <option value="ลา">ลา</option>
                  <option value="ขาดเรียน">ขาดเรียน</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  หมายเหตุ / เหตุผลการแก้ไข
                </label>
                <input
                  type="text"
                  required
                  value={editingStudent.remark}
                  onChange={(e) => setEditingStudent({ ...editingStudent, remark: e.target.value })}
                  placeholder="เช่น เช็คชื่อรอบที่ 2, ลากิจ, ลาป่วย, มาสาย"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs md:text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-400 block mb-1.5">ตัวเลือกด่วน:</span>
                <div className="flex flex-wrap gap-1.5">
                  {['เช็คชื่อรอบที่ 2', 'แก้ไขโดยผู้ดูแลระบบ', 'ลากิจ', 'ลาป่วย', 'เช็ครอบเก็บตก'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setEditingStudent({ ...editingStudent, remark: tag })}
                      className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg font-bold text-slate-600 transition-all border border-slate-200/60"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="flex-1 py-2.5 font-bold text-slate-400 hover:text-slate-600 text-xs rounded-xl bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 disabled:bg-slate-300 cursor-pointer"
                >
                  {isSubmittingEdit ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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