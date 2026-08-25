'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface ScanResult {
  url: string;
  boxes: any[];
  matches: string[];
}

interface StudentInCourse {
  id: number;
  studentCode: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}

export default function AttendancePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [courseInfo, setCourseInfo] = useState<{ courseName: string; courseCode: string } | null>(null);
  const [courseStudents, setCourseStudents] = useState<StudentInCourse[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [detectedStudents, setDetectedStudents] = useState<string[]>([]);
  const [status, setStatus] = useState('กำลังโหลดโมเดล AI...');
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [dailyRoundNumber, setDailyRoundNumber] = useState<number>(1);
  const [previousRoundAttendance, setPreviousRoundAttendance] = useState<any[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const imageRefs = useRef<(HTMLImageElement | null)[]>([]);

  const getAuthToken = () => localStorage.getItem('teacher_token') || localStorage.getItem('token');

  const fetchInitialData = useCallback(async () => {
    const token = getAuthToken();
    try {
      const resCourse = await fetch(`/api/courses/${courseId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const courseJson = await resCourse.json();
      if (courseJson.success && courseJson.data) {
        setCourseInfo({
          courseName: courseJson.data.courseName,
          courseCode: courseJson.data.courseCode
        });
        if (courseJson.data.students) {
          const sorted = [...courseJson.data.students].sort((a, b) =>
            (a.studentCode || '').localeCompare(b.studentCode || '', undefined, { numeric: true })
          );
          setCourseStudents(sorted);
        }
      }

      const [resDaily, resHistory] = await Promise.all([
        fetch(`/api/report/${courseId}?date=${selectedDate}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/attendance/history/${courseId}?date=${selectedDate}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => null)
      ]);

      const dailyJson = await resDaily.json();
      let historyJson = null;
      if (resHistory && resHistory.ok) {
        historyJson = await resHistory.json();
      }

      let recordedRoundsCount = 0;
      if (historyJson?.success && Array.isArray(historyJson.data)) {
        recordedRoundsCount = historyJson.data.length;
      }

      const hasDailyAttendance = dailyJson.success && (
        (dailyJson.summary && (dailyJson.summary.present > 0 || dailyJson.summary.late > 0 || dailyJson.summary.leave > 0)) ||
        (Array.isArray(dailyJson.data) && dailyJson.data.some((item: any) => item.time || item.status === 'มาเรียน' || item.status === 'มาสาย'))
      );

      if (recordedRoundsCount >= 2) {
        setDailyRoundNumber(3);
        setPreviousRoundAttendance(dailyJson.data || []);
      } else if (recordedRoundsCount === 1 || hasDailyAttendance) {
        setDailyRoundNumber(2);
        setPreviousRoundAttendance(dailyJson.data || []);
      } else {
        setDailyRoundNumber(1);
        setPreviousRoundAttendance([]);
      }
    } catch (err) {
      console.error('Fetch initial data error:', err);
    }
  }, [courseId, selectedDate]);

  useEffect(() => {
    setIsMounted(true);
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        ]);
        setIsLoading(false);
        setStatus('ระบบพร้อมใช้งาน');
      } catch {
        setStatus('โหลดโมเดลไม่สำเร็จ');
        setIsLoading(false);
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (courseId) {
      fetchInitialData();
    }
  }, [courseId, selectedDate, fetchInitialData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setSelectedFiles(files);
      const results = Array.from(files).map(file => ({
        url: URL.createObjectURL(file),
        boxes: [],
        matches: []
      }));
      setScanResults(results);
      setDetectedStudents([]);
      setStatus(`เลือกรูปภาพ ${files.length} รูป พร้อมเช็คชื่อ`);
    }
  };

  const handleScanAttendance = async () => {
    if (!selectedFiles || !courseId) return;
    setIsLoading(true);
    const uniqueDetected = new Set<string>();
    const updatedResults: ScanResult[] = [];

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setStatus(`กำลังวิเคราะห์รูปที่ ${i + 1}/${selectedFiles.length}...`);

        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.src = objectUrl;
        await img.decode();

        const detections = await faceapi.detectAllFaces(
          img,
          new faceapi.SsdMobilenetv1Options({ minConfidence: 0.6, maxResults: 20 })
        ).withFaceLandmarks();

        let currentBoxes: any[] = [];
        let currentMatches: string[] = [];

        if (detections.length > 0) {
          currentBoxes = detections.map((d: any) => ({
            x: d.detection.box.x,
            y: d.detection.box.y,
            width: d.detection.box.width,
            height: d.detection.box.height
          }));

          const formData = new FormData();
          formData.append('file', file);
          formData.append('boxes', JSON.stringify(currentBoxes));
          formData.append('course_id', courseId);

          const response = await fetch('http://localhost:8000/api/check-attendance-group', {
            method: 'POST',
            body: formData,
          });

          const apiResult = await response.json();
          currentMatches = Array.isArray(apiResult.matches) ? apiResult.matches : [];

          currentMatches.forEach(name => {
            if (name && name !== "Unknown") uniqueDetected.add(name);
          });
        }

        updatedResults.push({ url: objectUrl, boxes: currentBoxes, matches: currentMatches });
      }

      setScanResults(updatedResults);
      setDetectedStudents(Array.from(uniqueDetected));
      setStatus(`ตรวจเสร็จสิ้น: พบนักศึกษา ${uniqueDetected.size} คน จากทั้งหมด ${courseStudents.length} คนในคลาส`);

      setTimeout(() => {
        updatedResults.forEach((res, idx) => {
          const img = imageRefs.current[idx];
          const canvas = canvasRefs.current[idx];
          if (img && canvas) drawBoxes(img, canvas, res.boxes, res.matches);
        });
      }, 200);

    } catch (err: any) {
      setStatus(`ข้อผิดพลาด: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getEvaluatedAttendance = () => {
    const cleanedDetected = detectedStudents.map(s => s.replace(/\s+/g, ' ').trim());

    return courseStudents.map(student => {
      const fullName = `${student.firstName || ''} ${student.lastName || ''}`.replace(/\s+/g, ' ').trim();
      const displayName = fullName || student.name || 'ไม่ระบุชื่อ';
      
      const isDetectedInCurrentScan = cleanedDetected.includes(fullName) ||
        (student.name && cleanedDetected.includes(student.name.trim())) ||
        (student.firstName && cleanedDetected.includes(student.firstName.trim()));

      const prevRecord = previousRoundAttendance.find(
        (p: any) => p.studentId === student.id || p.id === student.id || p.studentCode === student.studentCode
      );

      let finalStatus: 'มาเรียน' | 'มาสาย' | 'ขาดเรียน' = 'ขาดเรียน';
      let autoRemark = '';

      if (dailyRoundNumber === 1) {
        if (isDetectedInCurrentScan) {
          finalStatus = 'มาเรียน';
          autoRemark = 'ตรวจพบในการเช็คชื่อรอบที่ 1';
        } else {
          finalStatus = 'ขาดเรียน';
          autoRemark = 'ไม่พบในการเช็คชื่อรอบที่ 1';
        }
      } else if (dailyRoundNumber === 2) {
        if (prevRecord?.status === 'มาเรียน') {
          finalStatus = 'มาเรียน';
          autoRemark = prevRecord.remark || 'ตรวจพบในการเช็คชื่อรอบที่ 1';
        } else if (isDetectedInCurrentScan) {
          finalStatus = 'มาสาย';
          autoRemark = 'เช็คชื่อรอบที่ 2';
        } else {
          finalStatus = 'ขาดเรียน';
          autoRemark = 'ไม่พบในการเช็คชื่อทั้งสองรอบ';
        }
      } else {
        if (prevRecord?.status === 'มาเรียน') {
          finalStatus = 'มาเรียน';
          autoRemark = prevRecord.remark || 'ตรวจพบในการเช็คชื่อรอบที่ 1';
        } else if (prevRecord?.status === 'มาสาย') {
          finalStatus = 'มาสาย';
          autoRemark = prevRecord.remark || 'เช็คชื่อรอบที่ 2';
        } else if (isDetectedInCurrentScan) {
          finalStatus = 'มาสาย';
          autoRemark = 'เช็คชื่อรอบเพิ่มเติม (เก็บตก)';
        } else {
          finalStatus = 'ขาดเรียน';
          autoRemark = 'ไม่พบในทุกรอบการเช็คชื่อ';
        }
      }

      return {
        studentId: student.id,
        studentCode: student.studentCode,
        displayName,
        isDetectedInCurrentScan,
        finalStatus,
        remark: autoRemark
      };
    });
  };

  const attendanceEvaluationList = getEvaluatedAttendance();

  const handleConfirmAndSave = async () => {
    setIsSaving(true);
    setStatus('กำลังบันทึกข้อมูลเข้าเรียน...');
    const token = getAuthToken();

    try {
      const attendanceData = attendanceEvaluationList.map(item => ({
        studentId: item.studentId,
        status: item.finalStatus,
        remark: item.remark
      }));

      let imagesBase64: string[] = [];
      if (selectedFiles && selectedFiles.length > 0) {
        imagesBase64 = await Promise.all(
          Array.from(selectedFiles).map((file) => {
            return new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(file);
            });
          })
        );
      }

      const res = await fetch('/api/attendance/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          courseId: courseId,
          date: selectedDate,
          imageUrls: imagesBase64,
          attendanceData: attendanceData,
          detectedNames: detectedStudents,
          round: dailyRoundNumber
        })
      });

      const data = await res.json();

      if (data.success) {
        setShowConfirmModal(false);
        const roundTitle = dailyRoundNumber >= 3 ? 'รอบเพิ่มเติม (เก็บตก)' : `รอบที่ ${dailyRoundNumber}`;
        alert(`บันทึกการเช็คชื่อวันที่ ${selectedDate} (${roundTitle}) เรียบร้อยแล้ว`);
        router.push(`/teacher/report/${courseId}`);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setShowConfirmModal(false);
      alert(`บันทึกไม่สำเร็จ: ${err.message}`);
      setStatus('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setIsSaving(false);
    }
  };

  const drawBoxes = (image: HTMLImageElement, canvas: HTMLCanvasElement, boxes: any[], matches: any[]) => {
    canvas.width = image.clientWidth;
    canvas.height = image.clientHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scaleX = image.clientWidth / image.naturalWidth;
    const scaleY = image.clientHeight / image.naturalHeight;

    boxes.forEach((box, index) => {
      const name = matches[index];
      const isMatched = name && name !== "Unknown";
      const dx = box.x * scaleX, dy = box.y * scaleY, dw = box.width * scaleX, dh = box.height * scaleY;
      ctx.strokeStyle = isMatched ? '#10b981' : '#ef4444';
      ctx.lineWidth = 3;
      ctx.strokeRect(dx, dy, dw, dh);
      ctx.font = 'bold 12px Arial';
      ctx.fillStyle = isMatched ? '#10b981' : '#ef4444';
      ctx.fillText(name || 'Unknown', dx, dy - 5);
    });
  };

  if (!isMounted) return <div className="p-20 text-center font-bold text-slate-400">กำลังเริ่มระบบ...</div>;

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f7f4] font-sans text-slate-800">
      
      {/* 1. Header ด้านบน */}
      <header className="bg-[#0f766e] text-white pt-8 pb-6 px-4 text-center shadow-sm relative print:hidden">
        <div className="absolute top-6 left-6">
          <Link
            href="/teacher/dashboard"
            className="text-emerald-100 hover:text-white font-bold inline-flex items-center gap-2 text-xs uppercase tracking-wider transition-all"
          >
            ← Back to Dashboard
          </Link>
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1">
          ระบบตรวจสอบรายชื่อเข้าชั้นเรียน
        </h1>
        <p className="text-emerald-100 font-medium text-xs md:text-sm">
          วิชา: <span className="font-bold text-white">{courseInfo?.courseName || 'กำลังโหลด...'}</span> {courseInfo?.courseCode ? `(${courseInfo.courseCode})` : ''}
        </p>
      </header>

      {/* 2. Navigation Tabs Bar (3 เมนูหลัก มาตรฐานเดียวกับหน้ารายงาน) */}
      <nav className="bg-[#0d9488] shadow-inner px-4 overflow-x-auto print:hidden">
        <div className="max-w-5xl mx-auto flex items-center justify-center gap-1 min-w-max">
          <button
            type="button"
            className="flex items-center gap-2 px-5 py-3 font-bold text-xs md:text-sm bg-white text-slate-800 shadow rounded-t-xl"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            เช็คชื่อสแกนใบหน้า
          </button>

          <Link
            href={`/teacher/report/${courseId}`}
            className="flex items-center gap-2 px-5 py-3 font-bold text-xs md:text-sm text-emerald-50 hover:bg-emerald-700/50 hover:text-white rounded-t-xl transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            รายงานการเข้าเรียน
          </Link>

          <Link
            href={`/teacher/course/${courseId}/students`}
            className="flex items-center gap-2 px-5 py-3 font-bold text-xs md:text-sm text-emerald-50 hover:bg-emerald-700/50 hover:text-white rounded-t-xl transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            จัดการรายชื่อนักศึกษา
          </Link>
        </div>
      </nav>

      {/* 3. Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 flex flex-col items-center">
        
        {/* การ์ดเลือกวันที่ และอัปโหลดรูปภาพ */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200/80 w-full mb-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5 pb-5 border-b border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                เลือกวันที่
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs md:text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                สถานะการเช็คชื่อประจำวัน
              </label>
              <div className={`px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm border flex items-center justify-between ${
                dailyRoundNumber === 1 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : dailyRoundNumber === 2
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-indigo-50 text-indigo-800 border-indigo-200'
              }`}>
                <span>
                  {dailyRoundNumber === 1 && 'การเช็คชื่อรอบที่ 1'}
                  {dailyRoundNumber === 2 && 'การเช็คชื่อรอบที่ 2'}
                  {dailyRoundNumber >= 3 && 'การเช็คชื่อรอบเพิ่มเติม'}
                </span>
                <span className="text-[11px] font-medium opacity-85">
                  {dailyRoundNumber === 1 && '(เริ่มคาบเรียน)'}
                  {dailyRoundNumber === 2 && '(ตรวจซ้ำ / บันทึกสาย)'}
                  {dailyRoundNumber >= 3 && '(เก็บตก)'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3 mb-5">
            <label className="block text-xs font-bold text-slate-700">อัปโหลดรูปภาพกลุ่ม:</label>
            <input
              type="file" multiple accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-all cursor-pointer border border-slate-200 rounded-xl p-1.5"
            />
          </div>

          <button
            onClick={handleScanAttendance}
            disabled={isLoading || !selectedFiles}
            className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white py-3 rounded-xl font-bold text-sm shadow-sm disabled:bg-slate-200 disabled:text-slate-400 transition-all cursor-pointer mb-3"
          >
            {isLoading ? 'กำลังประมวลผลใบหน้า...' : 'เริ่มสแกนใบหน้า'}
          </button>

          <div className={`text-center py-2.5 px-4 rounded-xl font-bold text-xs border ${
            status.includes('ข้อผิดพลาด') 
              ? 'bg-red-50 text-red-600 border-red-100' 
              : 'bg-emerald-50/60 text-emerald-700 border-emerald-100'
          }`}>
            {status}
          </div>
        </div>

        {/* ตารางแสดงรายชื่อนักศึกษาทั้งหมดในคลาส พร้อมผลการตรวจสอบ */}
        {scanResults.length > 0 && (
          <div className="w-full bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200/80 mb-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-5 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-black text-slate-800">
                  รายชื่อนักศึกษาในคลาส ({attendanceEvaluationList.length} คน)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  ตรวจพบในรูป {detectedStudents.length} คน • ไม่พบในรูป {attendanceEvaluationList.length - detectedStudents.length} คน
                </p>
              </div>

              <span className={`text-xs font-bold px-3 py-1 rounded-lg border ${
                dailyRoundNumber === 1 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : dailyRoundNumber === 2
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
              }`}>
                {dailyRoundNumber >= 3 ? 'รอบเพิ่มเติม (เก็บตก)' : `รอบที่ ${dailyRoundNumber}`} ประจำวันที่ {selectedDate}
              </span>
            </div>

            {/* แถวแสดงรายชื่อนักศึกษาทุกคน */}
            <div className="flex flex-col gap-2.5 mb-6">
              {attendanceEvaluationList.map((item, i) => {
                const isFound = item.isDetectedInCurrentScan;
                const statusColor = 
                  item.finalStatus === 'มาเรียน' ? 'bg-emerald-50/60 border-emerald-200' :
                  item.finalStatus === 'มาสาย' ? 'bg-amber-50/60 border-amber-200' :
                  'bg-red-50/60 border-red-200';

                return (
                  <div
                    key={item.studentId}
                    className={`border rounded-xl px-4 py-3 flex items-center justify-between transition-all ${statusColor}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center border ${
                        isFound ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'
                      }`}>
                        {i + 1}
                      </span>
                      <div>
                        <span className="font-bold text-slate-800 text-xs md:text-sm">
                          {item.displayName}
                        </span>
                        {!isFound && (
                          <span className="ml-2 text-[10px] text-red-500 font-medium">
                            (ไม่พบในรูปสแกน)
                          </span>
                        )}
                        {item.remark && (
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            หมายเหตุ: {item.remark}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-xs text-slate-600">
                        {item.studentCode}
                      </span>

                      <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                        item.finalStatus === 'มาเรียน'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : item.finalStatus === 'มาสาย'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-red-100 text-red-700 border-red-300'
                      }`}>
                        {item.finalStatus}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowConfirmModal(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white py-3.5 rounded-xl font-bold text-sm shadow-sm transition-all cursor-pointer"
            >
              ยืนยันการบันทึกเข้าเรียน ({dailyRoundNumber >= 3 ? 'รอบเพิ่มเติม' : `รอบที่ ${dailyRoundNumber}`})
            </button>
          </div>
        )}

        {/* ส่วนแสดงภาพวิเคราะห์ใบหน้า */}
        {scanResults.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {scanResults.map((res, idx) => (
              <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
                <p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">
                  รูปภาพที่ #{idx + 1}
                </p>
                <div className="relative rounded-xl overflow-hidden bg-slate-100 border border-slate-100">
                  <img
                    ref={(el) => { imageRefs.current[idx] = el; }}
                    src={res.url}
                    className="block w-full h-auto"
                    alt="Scan"
                  />
                  <canvas ref={(el) => { canvasRefs.current[idx] = el; }} className="absolute top-0 left-0 pointer-events-none" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 4. Footer ด้านล่าง */}
      <footer className="bg-white text-[#0f766e] py-4 px-4 text-center text-xs font-medium border-t border-slate-100 mt-auto">
        ระบบตรวจสอบรายชื่อเข้าชั้นเรียนสาขาวิชานวัตกรรมระบบสารสนเทศ
      </footer>

      {/* Modal Popup: ยืนยันการเช็คชื่อ */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-xl border border-slate-100 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4 font-black text-xl">
              ✓
            </div>

            <h3 className="text-xl font-black text-slate-800">ยืนยันการบันทึกเช็คชื่อ</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              บันทึกผลการเข้าเรียนประจำวันที่ <span className="font-bold text-slate-700">{selectedDate}</span><br />
              <span className={`font-black text-sm ${
                dailyRoundNumber === 1 
                  ? 'text-emerald-600' 
                  : dailyRoundNumber === 2 
                  ? 'text-amber-600' 
                  : 'text-indigo-600'
              }`}>
                {dailyRoundNumber >= 3 ? 'การเช็คชื่อรอบเพิ่มเติม (เก็บตก)' : `การเช็คชื่อรอบที่ ${dailyRoundNumber}`}
              </span>
            </p>

            <div className="bg-slate-50 rounded-xl p-4 my-5 text-xs text-slate-600 text-left space-y-2 border border-slate-200/60">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">นักศึกษาทั้งหมด:</span>
                <span className="font-bold text-slate-800">{attendanceEvaluationList.length} คน</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">มาเรียน:</span>
                <span className="font-bold text-emerald-700">
                  {attendanceEvaluationList.filter(s => s.finalStatus === 'มาเรียน').length} คน
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">มาสาย:</span>
                <span className="font-bold text-amber-700">
                  {attendanceEvaluationList.filter(s => s.finalStatus === 'มาสาย').length} คน
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">ขาดเรียน:</span>
                <span className="font-bold text-red-700">
                  {attendanceEvaluationList.filter(s => s.finalStatus === 'ขาดเรียน').length} คน
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 font-bold text-slate-400 hover:text-slate-600 transition-all text-xs rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleConfirmAndSave}
                className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 disabled:bg-slate-300 cursor-pointer"
              >
                {isSaving ? 'กำลังบันทึก...' : `ยืนยัน${dailyRoundNumber >= 3 ? 'รอบเพิ่มเติม' : `รอบที่ ${dailyRoundNumber}`}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}