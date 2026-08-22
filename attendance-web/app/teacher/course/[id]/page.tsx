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

  const [courseStudents, setCourseStudents] = useState<StudentInCourse[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [detectedStudents, setDetectedStudents] = useState<string[]>([]);
  const [status, setStatus] = useState('กำลังโหลดโมเดล AI...');
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sessionRound, setSessionRound] = useState<number>(1);

  // State ควบคุม Modal ยืนยันการเช็คชื่อ
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const imageRefs = useRef<(HTMLImageElement | null)[]>([]);

  const getAuthToken = () => localStorage.getItem('teacher_token') || localStorage.getItem('token');

  // ดึงข้อมูลรายวิชา (นักศึกษาทั้งหมด) และประวัติเพื่อคำนวณรอบถัดไป
  const fetchInitialData = useCallback(async () => {
    const token = getAuthToken();
    try {
      // 1. ดึงรายชื่อนักศึกษาในวิชา
      const resCourse = await fetch(`/api/courses/${courseId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const courseJson = await resCourse.json();
      if (courseJson.success && courseJson.data?.students) {
        setCourseStudents(courseJson.data.students);
      }

      // 2. ดึงประวัติรอบการเช็คชื่อ
      const resHistory = await fetch(`/api/attendance/history/${courseId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const contentType = resHistory.headers.get('content-type');
      if (resHistory.ok && contentType && contentType.includes('application/json')) {
        const historyJson = await resHistory.json();
        if (historyJson.success && Array.isArray(historyJson.data)) {
          setSessionRound(historyJson.data.length + 1);
          return;
        }
      }
      setSessionRound(1);
    } catch {
      setSessionRound(1);
    }
  }, [courseId]);

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
    if (courseId) fetchInitialData();
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
      setStatus(uniqueDetected.size > 0 ? `ตรวจพบนักศึกษา ${uniqueDetected.size} คน กรุณายืนยันการบันทึก` : 'ไม่พบรายชื่อนักศึกษา');

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

  // ดึงรหัสนักศึกษาจากชื่อที่สแกนเจอ
  const getStudentCode = (detectedName: string) => {
    const cleanName = detectedName.replace(/\s+/g, ' ').trim();
    const found = courseStudents.find((s) => {
      const fullName = `${s.firstName || ''} ${s.lastName || ''}`.replace(/\s+/g, ' ').trim();
      return fullName === cleanName || (s.name && s.name.trim() === cleanName) || (s.firstName && cleanName.includes(s.firstName));
    });
    return found ? found.studentCode : '';
  };

  // 1. กดปุ่มบันทึก -> เปิด Popup ยืนยัน
  const handleOpenConfirmModal = () => {
    if (detectedStudents.length === 0) {
      alert('ไม่มีรายชื่อนักศึกษาที่ต้องบันทึก');
      return;
    }
    setShowConfirmModal(true);
  };

  // 2. กดยืนยันใน Popup -> ส่งข้อมูลบันทึกลง Database
  const handleConfirmAndSave = async () => {
    setIsSaving(true);
    setStatus('กำลังบันทึกข้อมูลเข้าเรียน...');
    const token = getAuthToken();

    try {
      // แมปสถานะนักศึกษา
      const cleanedDetected = detectedStudents.map(s => s.replace(/\s+/g, ' ').trim());
      const attendanceData = courseStudents.map((student: any) => {
        const fullName = `${student.firstName || ''} ${student.lastName || ''}`.replace(/\s+/g, ' ').trim();
        const isPresent = cleanedDetected.includes(fullName) ||
          (student.firstName && cleanedDetected.includes(student.firstName.trim()));

        return {
          studentId: student.id,
          status: isPresent ? 'มาเรียน' : 'ขาดเรียน'
        };
      });

      // แปลงรูปภาพเป็น Base64
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
          imageUrls: imagesBase64,
          attendanceData: attendanceData,
          detectedNames: detectedStudents,
          round: sessionRound
        })
      });

      const data = await res.json();

      if (data.success) {
        setShowConfirmModal(false);
        alert(`บันทึกการเช็คชื่อครั้งที่ ${sessionRound} เรียบร้อยแล้ว`);
        setDetectedStudents([]);
        setStatus('บันทึกข้อมูลเรียบร้อยแล้ว');
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
      ctx.strokeStyle = isMatched ? '#22c55e' : '#ef4444';
      ctx.lineWidth = 3;
      ctx.strokeRect(dx, dy, dw, dh);
      ctx.font = 'bold 12px Arial';
      ctx.fillStyle = isMatched ? '#22c55e' : '#ef4444';
      ctx.fillText(name || 'Unknown', dx, dy - 5);
    });
  };

  if (!isMounted) return <div className="p-20 text-center font-bold text-slate-400">กำลังเริ่มระบบ...</div>;

  return (
    <div className="flex flex-col items-center min-h-screen bg-slate-50 p-6 md:p-10 font-sans text-slate-900">
      <div className="mb-8 text-center w-full max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <Link href="/teacher/dashboard" className="text-blue-600 font-bold inline-flex items-center gap-2 hover:translate-x-[-4px] transition-all text-sm">
            ← กลับหน้า Dashboard
          </Link>
        </div>
        <h1 className="text-4xl font-black text-slate-800 tracking-tight">ตรวจสอบรายชื่อเข้าชั้นเรียน</h1>
        <p className="text-slate-400 font-bold text-xs mt-2 uppercase tracking-widest">COURSE ID: {courseId}</p>
      </div>

      <div className="flex flex-col gap-5 bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100 w-full max-w-2xl mb-8">
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">อัปโหลดรูปภาพกลุ่ม:</label>
          <input
            type="file" multiple accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition-all cursor-pointer"
          />
        </div>

        {!detectedStudents.length && (
          <button
            onClick={handleScanAttendance}
            disabled={isLoading || !selectedFiles}
            className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-slate-200 disabled:bg-slate-200 transition-all active:scale-[0.98] cursor-pointer"
          >
            {isLoading ? 'กำลังประมวลผลใบหน้า...' : 'เริ่มสแกนใบหน้า'}
          </button>
        )}

        <div className={`text-center py-3 px-4 rounded-xl font-bold text-sm ${status.includes('ข้อผิดพลาด') ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
          {status}
        </div>
      </div>

      {/* กล่องแสดงรายชื่อแบบแถวตอนเรียงเดี่ยวแนวตั้ง */}
      {detectedStudents.length > 0 && (
        <div className="w-full max-w-2xl bg-white p-8 rounded-[2.5rem] shadow-xl border-t-8 border-green-500 mb-8 animate-in fade-in duration-300">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-slate-800">ตรวจพบนักศึกษา ({detectedStudents.length} คน)</h2>
            <button onClick={() => setDetectedStudents([])} className="text-xs font-bold text-red-400 hover:text-red-600 cursor-pointer">ยกเลิกทั้งหมด</button>
          </div>

          {/* แถวรายการนักศึกษาแบบเรียบง่ายตามตัวอย่าง */}
          <div className="flex flex-col gap-3 mb-8">
            {detectedStudents.map((name, i) => {
              const studentCode = getStudentCode(name);

              return (
                <div
                  key={i}
                  className="bg-white border border-slate-100 rounded-2xl px-5 py-3.5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">

                    <span className="w-8 h-8 rounded-xl bg-white text-blue-950 font-black text-xs flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="font-bold text-slate-800 text-sm">
                      {name}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">

                    {studentCode && (
                      <span className="bg-white text-blue-600 font-mono font-bold text-xs px-4  ">
                        {studentCode}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setDetectedStudents(prev => prev.filter(n => n !== name))}
                      className="text-slate-300 hover:text-red-500 font-bold text-lg leading-none cursor-pointer transition-colors"
                      title="ลบรายการนี้"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleOpenConfirmModal}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-5 rounded-2xl font-black text-xl shadow-lg shadow-green-100 transition-all active:scale-[0.98] cursor-pointer"
          >
            ยืนยันการเข้าเรียน
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-7xl">
        {scanResults.map((res, idx) => (
          <div key={idx} className="bg-white p-6 rounded-[2rem] shadow-lg border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-tighter">รูปที่ #{idx + 1}</p>
            <div className="relative rounded-2xl overflow-hidden bg-slate-100">
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

      {/* Modal Popup: ยืนยันการเช็คชื่อตามรอบ */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 font-black text-2xl">
              ✓
            </div>

            <h3 className="text-2xl font-black text-slate-800">ยืนยันการเช็คชื่อ</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              คุณต้องการยืนยันการเช็คชื่อ <br />
              <span className="font-black text-green-600 text-base">ครั้งที่ {sessionRound}</span> สำหรับรายวิชานี้ใช่หรือไม่?
            </p>

            <div className="bg-slate-50 rounded-2xl p-4 my-6 text-xs text-slate-600 text-left space-y-2 border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">รอบการเช็คชื่อ:</span>
                <span className="font-black text-slate-800">ครั้งที่ {sessionRound}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">จำนวนนักศึกษาที่สแกนเจอ:</span>
                <span className="font-black text-green-600 text-sm">{detectedStudents.length} คน</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-4 font-black text-slate-400 hover:text-slate-600 transition-all text-sm rounded-2xl bg-slate-50 hover:bg-slate-100 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleConfirmAndSave}
                className="flex-[2] bg-green-500 hover:bg-green-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-green-100 transition-all active:scale-95 disabled:bg-slate-300 cursor-pointer"
              >
                {isSaving ? 'กำลังบันทึก...' : `ยืนยันรอบที่ ${sessionRound}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}