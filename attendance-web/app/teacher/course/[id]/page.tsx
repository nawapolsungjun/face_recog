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

// Preset ช่วงเวลามาตรฐาน (เรียบง่าย ไม่มี Emoji)
const TIME_PRESETS = [
  { id: 'morning', label: 'คาบเช้า', start: '09:00', end: '12:00' },
  { id: 'afternoon', label: 'คาบบ่าย', start: '13:00', end: '16:00' },
  { id: 'evening', label: 'คาบค่ำ', start: '17:00', end: '20:00' },
  { id: 'custom', label: 'กำหนดเอง', start: '', end: '' },
];

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

  // State สำหรับจัดการช่วงเวลา & การสอนชดเชย
  const [sessionType, setSessionType] = useState<'REGULAR' | 'COMPENSATION'>('REGULAR');
  const [selectedPreset, setSelectedPreset] = useState<string>('morning');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');

  const [dailyRoundNumber, setDailyRoundNumber] = useState<number>(1);
  const [previousRoundAttendance, setPreviousRoundAttendance] = useState<any[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // State สำหรับ Custom Alert / Success Popup
  const [alertModal, setAlertModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    isSuccess?: boolean;
    onClose?: () => void;
  }>({
    show: false,
    title: '',
    message: '',
    isSuccess: true,
  });

  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const imageRefs = useRef<(HTMLImageElement | null)[]>([]);

  const getAuthToken = () => localStorage.getItem('teacher_token') || localStorage.getItem('token');

  const handleSelectPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const found = TIME_PRESETS.find(p => p.id === presetId);
    if (found && presetId !== 'custom') {
      setStartTime(found.start);
      setEndTime(found.end);
    }
  };

  const fetchInitialData = useCallback(async () => {
    const token = getAuthToken();
    const currentSlot = `${startTime}-${endTime}`;

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

      // ดึงข้อมูลประวัติแยกตาม วันที่ + ช่วงเวลา + ประเภทคาบเรียน
      const resHistory = await fetch(
        `/api/attendance/history/${courseId}?date=${selectedDate}&timeSlot=${currentSlot}&sessionType=${sessionType}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      ).catch(() => null);

      let recordedRoundsCount = 0;
      let existingSessionData: any[] = [];

      if (resHistory && resHistory.ok) {
        const historyJson = await resHistory.json();
        if (historyJson?.success && Array.isArray(historyJson.data)) {
          const matchedSessions = historyJson.data.filter((item: any) => {
            const matchSlot = item.timeSlot ? item.timeSlot === currentSlot : true;
            const matchType = item.sessionType ? item.sessionType === sessionType : true;
            return matchSlot && matchType;
          });

          recordedRoundsCount = matchedSessions.length;
          if (matchedSessions.length > 0) {
            existingSessionData = matchedSessions[matchedSessions.length - 1].records || [];
          }
        }
      }

      // กำหนดรอบการเช็คชื่อของคาบปัจจุบัน
      if (recordedRoundsCount >= 2) {
        setDailyRoundNumber(3);
        setPreviousRoundAttendance(existingSessionData);
      } else if (recordedRoundsCount === 1) {
        setDailyRoundNumber(2);
        setPreviousRoundAttendance(existingSessionData);
      } else {
        setDailyRoundNumber(1);
        setPreviousRoundAttendance([]);
      }
    } catch (err) {
      console.error('Fetch initial data error:', err);
      setDailyRoundNumber(1);
      setPreviousRoundAttendance([]);
    }
  }, [courseId, selectedDate, startTime, endTime, sessionType]);

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
  }, [courseId, fetchInitialData]);

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

      const sessionPrefix = sessionType === 'COMPENSATION' ? '[สอนชดเชย] ' : '';
      let finalStatus: 'มาเรียน' | 'มาสาย' | 'ขาดเรียน' = 'ขาดเรียน';
      let autoRemark = '';

      if (dailyRoundNumber === 1) {
        if (isDetectedInCurrentScan) {
          finalStatus = 'มาเรียน';
          autoRemark = `${sessionPrefix}ตรวจพบในการเช็คชื่อรอบที่ 1 (${startTime}-${endTime} น.)`;
        } else {
          finalStatus = 'ขาดเรียน';
          autoRemark = `${sessionPrefix}ไม่พบในการเช็คชื่อรอบที่ 1 (${startTime}-${endTime} น.)`;
        }
      } else if (dailyRoundNumber === 2) {
        if (prevRecord?.status === 'มาเรียน') {
          finalStatus = 'มาเรียน';
          autoRemark = prevRecord.remark || `${sessionPrefix}ตรวจพบในการเช็คชื่อรอบที่ 1`;
        } else if (isDetectedInCurrentScan) {
          finalStatus = 'มาสาย';
          autoRemark = `${sessionPrefix}เช็คชื่อรอบที่ 2 (${startTime}-${endTime} น.)`;
        } else {
          finalStatus = 'ขาดเรียน';
          autoRemark = `${sessionPrefix}ไม่พบในการเช็คชื่อทั้งสองรอบ`;
        }
      } else {
        if (prevRecord?.status === 'มาเรียน') {
          finalStatus = 'มาเรียน';
          autoRemark = prevRecord.remark || `${sessionPrefix}ตรวจพบในการเช็คชื่อรอบที่ 1`;
        } else if (prevRecord?.status === 'มาสาย') {
          finalStatus = 'มาสาย';
          autoRemark = prevRecord.remark || `${sessionPrefix}เช็คชื่อรอบที่ 2`;
        } else if (isDetectedInCurrentScan) {
          finalStatus = 'มาสาย';
          autoRemark = `${sessionPrefix}เช็คชื่อรอบเพิ่มเติม (เก็บตก)`;
        } else {
          finalStatus = 'ขาดเรียน';
          autoRemark = `${sessionPrefix}ไม่พบในทุกรอบการเช็คชื่อ`;
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
          timeSlot: `${startTime}-${endTime}`,
          sessionType: sessionType,
          imageUrls: imagesBase64,
          attendanceData: attendanceData,
          detectedNames: detectedStudents,
          round: dailyRoundNumber
        })
      });

      const data = await res.json();

      if (data.success) {
        setShowConfirmModal(false);
        const roundTitle = dailyRoundNumber >= 3 ? 'รอบเพิ่มเติม' : `รอบที่ ${dailyRoundNumber}`;
        const typeText = sessionType === 'COMPENSATION' ? '(คาบสอนชดเชย)' : '(คาบปกติ)';
        setAlertModal({
          show: true,
          title: 'บันทึกสำเร็จเรียบร้อย',
          message: `บันทึกการเช็คชื่อวันที่ ${selectedDate} ช่วงเวลา ${startTime}-${endTime} น. ${typeText} ${roundTitle} เรียบร้อยแล้ว`,
          isSuccess: true,
          onClose: () => router.push(`/teacher/report/${courseId}`),
        });
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setShowConfirmModal(false);
      setAlertModal({
        show: true,
        title: 'บันทึกไม่สำเร็จ',
        message: err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
        isSuccess: false,
      });
      setStatus('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseAlertModal = () => {
    if (alertModal.onClose) {
      alertModal.onClose();
    }
    setAlertModal({ show: false, title: '', message: '', isSuccess: true });
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

      {/* 1. Header */}
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
          ระบบตรวจสอบรายชื่อด้วยการรู้จำใบหน้า
        </h1>
        <p className="text-emerald-100 font-medium text-xs md:text-sm">
          วิชา: <span className="font-bold text-white">{courseInfo?.courseCode || 'กำลังโหลด...'}</span>  <span className="text-white-200">{courseInfo?.courseName || 'กำลังโหลด...'}</span>
        </p>
      </header>

      {/* 2. Navigation Tabs Bar */}
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

        {/* การ์ดเลือกวันที่, ช่วงเวลาคาบเรียน และอัปโหลดรูปภาพ */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200/80 w-full mb-6 space-y-5">

          {/* ส่วนที่ 1: เลือกประเภทคาบเรียน (Basic Flat Switch) */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-800 block">ประเภทคาบเรียน</span>
              <span className="text-[11px] text-slate-500">เลือกรูปแบบการเรียนการสอน</span>
            </div>
            <div className="inline-flex bg-slate-200/70 p-1 rounded-lg w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setSessionType('REGULAR')}
                className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${sessionType === 'REGULAR'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                คาบเรียนปกติ
              </button>
              <button
                type="button"
                onClick={() => setSessionType('COMPENSATION')}
                className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${sessionType === 'COMPENSATION'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                คาบสอนชดเชย
              </button>
            </div>
          </div>

          {/* ส่วนที่ 2: วันที่ & ช่วงเวลาคาบเรียน */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                เลือกวันที่
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs md:text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ช่วงเวลาคาบเรียน
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-2">
                {TIME_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPreset(p.id)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer ${selectedPreset === p.id
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Input เลือกระบุเวลาเริ่มต้น - สิ้นสุด */}
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => { setStartTime(e.target.value); setSelectedPreset('custom'); }}
                  className="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-2 py-1.5 flex-1 outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-xs text-slate-400 font-bold">ถึง</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => { setEndTime(e.target.value); setSelectedPreset('custom'); }}
                  className="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-2 py-1.5 flex-1 outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-xs text-slate-500 font-bold pr-1">น.</span>
              </div>
            </div>
          </div>

          {/* ส่วนที่ 3: สถานะรอบการเช็คชื่อของคาบปัจจุบัน */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-xl border bg-slate-50 border-slate-200">
            <span className="text-xs font-bold text-slate-700">
              สถานะ: {dailyRoundNumber === 1 ? 'การเช็คชื่อรอบที่ 1 (เริ่มคาบ)' : dailyRoundNumber === 2 ? 'การเช็คชื่อรอบที่ 2 (ตรวจสาย)' : 'การเช็คชื่อรอบเพิ่มเติม (เก็บตก)'}
            </span>
            <span className="text-[11px] font-bold bg-white px-2.5 py-1 rounded-md border border-slate-200 text-slate-700">
              {sessionType === 'COMPENSATION' ? '[สอนชดเชย]' : '[คาบปกติ]'} {selectedDate} ({startTime} - {endTime} น.)
            </span>
          </div>

          {/* ส่วนที่ 4: อัปโหลดรูปภาพ */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">อัปโหลดรูปภาพกลุ่ม:</label>
            <input
              type="file" multiple accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-all cursor-pointer border border-slate-200 rounded-xl p-1"
            />
          </div>

          <button
            onClick={handleScanAttendance}
            disabled={isLoading || !selectedFiles}
            className="w-full bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white py-3 rounded-xl font-bold text-sm shadow-xs disabled:bg-slate-200 disabled:text-slate-400 transition-all cursor-pointer"
          >
            {isLoading ? 'กำลังประมวลผลใบหน้า...' : 'เริ่มสแกนใบหน้า'}
          </button>

          <div className={`text-center py-2.5 px-4 rounded-xl font-bold text-xs border ${status.includes('ข้อผิดพลาด')
            ? 'bg-red-50 text-red-600 border-red-100'
            : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}>
            {status}
          </div>
        </div>

        {/* ตารางแสดงผลการตรวจ */}
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

              <span className={`text-xs font-bold px-3 py-1 rounded-lg border ${sessionType === 'COMPENSATION' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}>
                {sessionType === 'COMPENSATION' ? 'คาบสอนชดเชย' : 'คาบเรียนปกติ'} ({startTime} - {endTime} น.)
              </span>
            </div>

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
                      <span className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center border ${isFound ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'
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

                      <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${item.finalStatus === 'มาเรียน'
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
              className="w-full bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white py-3.5 rounded-xl font-bold text-sm shadow-xs transition-all cursor-pointer"
            >
              ยืนยันการบันทึกเข้าเรียน ({sessionType === 'COMPENSATION' ? 'สอนชดเชย' : 'คาบปกติ'} {startTime}-{endTime} น.)
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

      {/* 4. Footer */}
      <footer className="bg-[#0f766e] text-emerald-100 py-4 px-4 text-center text-xs font-medium md:text-sm">
        © 2026 ระบบตรวจสอบรายชื่อด้วยการรู้จำใบหน้า
        <p className="text-emerald-100 font-medium text-xs md:text-sm">
          สาขาวิชานวัตกรรมระบบสารสนเทศ คณะบริหารธุรกิจ มหาวิทยาลัยเทคโนโลยีราชมงคลกรุงเทพ
        </p>
      </footer>

      {/* Modal Popup: ยืนยันการเช็คชื่อ */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-xl border border-slate-100 animate-in zoom-in-95 duration-200 text-center">
            <h3 className="text-xl font-black text-slate-800 mb-1">ยืนยันการบันทึกเช็คชื่อ</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              บันทึกผลประจำวันที่ <span className="font-bold text-slate-700">{selectedDate}</span><br />
              <span className="font-bold text-emerald-800">
                ช่วงเวลา: {startTime} - {endTime} น. {sessionType === 'COMPENSATION' ? '(สอนชดเชย)' : '(คาบปกติ)'}
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
                className="flex-1 py-2.5 font-bold text-slate-500 hover:text-slate-700 transition-all text-xs rounded-xl bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleConfirmAndSave}
                className="flex-[2] bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95 disabled:bg-slate-300 cursor-pointer"
              >
                {isSaving ? 'กำลังบันทึก...' : 'ยืนยันบันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Modal: แจ้งเตือนสำเร็จ / ข้อผิดพลาด */}
      {alertModal.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[80] animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center animate-in zoom-in-95 duration-200">
            {alertModal.isSuccess ? (
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            ) : (
              <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
              </div>
            )}

            <h3 className="text-lg font-black text-slate-800 mb-1">{alertModal.title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6 font-medium">
              {alertModal.message}
            </p>

            <button
              type="button"
              onClick={handleCloseAlertModal}
              className={`w-28 py-2.5 text-white rounded-xl text-xs md:text-sm font-bold shadow-xs transition-all mx-auto block active:scale-95 cursor-pointer ${alertModal.isSuccess ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-red-600 hover:bg-red-700'
                }`}
            >
              ตกลง
            </button>
          </div>
        </div>
      )}

    </div>
  );
}