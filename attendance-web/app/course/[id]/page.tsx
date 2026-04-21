'use client';
import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface ScanResult {
  url: string;
  boxes: any[];
  matches: string[];
}

export default function AttendancePage() {
  const params = useParams();
  const courseId = params.id as string;

  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [detectedStudents, setDetectedStudents] = useState<string[]>([]); // รายชื่อที่ AI ตรวจพบ (รอการยืนยัน)
  const [status, setStatus] = useState('⌛ กำลังโหลดโมเดล AI...');
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const imageRefs = useRef<(HTMLImageElement | null)[]>([]);

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
        setStatus('✅ ระบบพร้อมใช้งาน');
      } catch (err) {
        setStatus('❌ โหลดโมเดลไม่สำเร็จ');
        setIsLoading(false);
      }
    };
    loadModels();
  }, []);

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
      setDetectedStudents([]); // เคลียร์รายชื่อเก่าเมื่อเลือกรูปใหม่
      setStatus(`📸 เลือกรูปภาพ ${files.length} รูป พร้อมเช็คชื่อ`);
    }
  };

  // 🚀 สเต็ป 1: สแกนใบหน้า (ยังไม่บันทึก DB)
  const handleScanAttendance = async () => {
    if (!selectedFiles || !courseId) return;
    setIsLoading(true);
    const uniqueDetected = new Set<string>();
    const updatedResults: ScanResult[] = [];

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setStatus(`⏳ กำลังวิเคราะห์รูปที่ ${i + 1}/${selectedFiles.length}...`);

        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.src = objectUrl;
        await img.decode();

        const detections = await faceapi.detectAllFaces(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2 })).withFaceLandmarks();

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
      setStatus(uniqueDetected.size > 0 ? `🔍 ตรวจพบนักศึกษา ${uniqueDetected.size} คน กรุณายืนยันการบันทึก` : '❌ ไม่พบรายชื่อนักศึกษา');

      // วาดกรอบใบหน้า
      setTimeout(() => {
        updatedResults.forEach((res, idx) => {
          const img = imageRefs.current[idx];
          const canvas = canvasRefs.current[idx];
          if (img && canvas) drawBoxes(img, canvas, res.boxes, res.matches);
        });
      }, 200);

    } catch (err: any) {
      setStatus(`❌ ข้อผิดพลาด: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 🚀 สเต็ป 2: ยืนยันและบันทึกลง Database (ฟังก์ชัน 3.3)
  const handleConfirmAndSave = async () => {
    if (detectedStudents.length === 0) return;
    setIsSaving(true);
    setStatus('💾 กำลังบันทึกข้อมูลเข้าเรียน...');
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentNames: detectedStudents,
          courseId: courseId
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ บันทึกสำเร็จ ${data.count} รายการ`);
        setDetectedStudents([]); // เคลียร์หลังจากบันทึกแล้ว
        setStatus('✅ บันทึกข้อมูลเรียนร้อยแล้ว');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      alert(`❌ บันทึกไม่สำเร็จ: ${err.message}`);
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

  if (!isMounted) return <div className="p-20 text-center font-bold">🌀 กำลังเริ่มระบบ...</div>;

  return (
    <div className="flex flex-col items-center min-h-screen bg-slate-50 p-6 md:p-10 font-sans">
      <div className="mb-8 text-center w-full max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <Link href="/teacher/dashboard" className="text-blue-600 font-bold inline-flex items-center gap-2 hover:translate-x-[-4px] transition-all text-sm">
            ← กลับหน้า Dashboard
          </Link>
        </div>
        <h1 className="text-4xl font-black text-slate-800 tracking-tight">📸 ห้องเรียนอัจฉริยะ</h1>
        <p className="text-slate-400 font-bold text-xs mt-2 uppercase tracking-widest">Course ID: {courseId}</p>
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

        {/* ปุ่มสแกน */}
        {!detectedStudents.length && (
          <button
            onClick={handleScanAttendance}
            disabled={isLoading || !selectedFiles}
            className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-slate-200 disabled:bg-slate-200 transition-all active:scale-[0.98]"
          >
            {isLoading ? '⏳ กำลังประมวลผลใบหน้า...' : '🚀 เริ่มสแกนใบหน้า'}
          </button>
        )}

        <div className={`text-center py-3 px-4 rounded-xl font-bold text-sm ${status.includes('❌') ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
          {status}
        </div>
      </div>

      {/* รายชื่อที่ตรวจพบและปุ่มยืนยัน */}
      {detectedStudents.length > 0 && (
        <div className="w-full max-w-2xl bg-white p-8 rounded-[2.5rem] shadow-2xl border-t-8 border-green-500 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-slate-800">✅ ตรวจพบนักศึกษา ({detectedStudents.length} คน)</h2>
            <button onClick={() => setDetectedStudents([])} className="text-xs font-bold text-red-400 hover:text-red-600">ยกเลิกทั้งหมด</button>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-8">
            {detectedStudents.map((name, i) => (
              <span key={i} className="bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold border border-slate-100 flex items-center gap-3">
                {name}
                <button onClick={() => setDetectedStudents(prev => prev.filter(n => n !== name))} className="text-slate-300 hover:text-red-500">×</button>
              </span>
            ))}
          </div>

          <button
            onClick={handleConfirmAndSave}
            disabled={isSaving}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-green-100 transition-all active:scale-[0.98]"
          >
            {isSaving ? '💾 กำลังบันทึก...' : '✔️ ยืนยันการเข้าเรียน'}
          </button>
        </div>
      )}

      {/* ผลการวิเคราะห์รูปภาพ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-7xl">
        {scanResults.map((res, idx) => (
          <div key={idx} className="bg-white p-6 rounded-[2rem] shadow-lg border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-tighter">Image Analysis #{idx + 1}</p>
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
    </div>
  );
}