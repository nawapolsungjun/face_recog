'use client';
import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { useParams } from 'next/navigation'; // 🚀 ใช้ดึง ID วิชาจาก URL

interface ScanResult {
  url: string;
  boxes: any[];
  matches: string[];
}

export default function AttendancePage() {
  const params = useParams();
  const courseId = params.id as string; // 🚀 ดึง ID วิชามาเก็บไว้

  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]); 
  const [attendanceList, setAttendanceList] = useState<string[]>([]);
  const [status, setStatus] = useState('กำลังเตรียมความพร้อม...');
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false); // 🚀 ป้องกัน Hydration Mismatch

  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const imageRefs = useRef<(HTMLImageElement | null)[]>([]);

  useEffect(() => {
    setIsMounted(true); // ยืนยันว่าโหลดที่ Client แล้ว
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        ]);
        setIsLoading(false);
        setStatus('✅ ระบบพร้อมใช้งานสำหรับวิชานี้');
      } catch (err) {
        setStatus('❌ โหลดโมเดลไม่สำเร็จ');
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
      setAttendanceList([]);
      setStatus(`📸 เลือกรูปภาพ ${files.length} รูป พร้อมเช็คชื่อ`);
    }
  };

  const handleAttendance = async () => {
    if (!selectedFiles || !courseId) return;
    setIsLoading(true);
    const uniquePresentStudents = new Set<string>();
    const updatedResults: ScanResult[] = [];

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setStatus(`⏳ กำลังสแกนรูปที่ ${i + 1}/${selectedFiles.length}...`);

        const img = new Image();
        img.src = URL.createObjectURL(file);
        await img.decode();

        const detections = await faceapi.detectAllFaces(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.35 })).withFaceLandmarks();
        
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
          formData.append('course_id', courseId); // 🚀 ส่ง ID วิชาไปที่ Python เพื่อแยกบันทึก

          const response = await fetch('http://localhost:8000/api/check-attendance-group', {
            method: 'POST',
            body: formData,
          });
          const apiResult = await response.json();
          currentMatches = apiResult.matches;

          currentMatches.forEach(name => {
            if (name) uniquePresentStudents.add(name);
          });
        }

        updatedResults.push({
          url: img.src,
          boxes: currentBoxes,
          matches: currentMatches
        });
      }

      setScanResults(updatedResults);
      setAttendanceList(Array.from(uniquePresentStudents));
      setStatus(`✅ เช็คชื่อวิชา ${courseId} เสร็จสิ้น! พบ ${uniquePresentStudents.size} คน`);

      setTimeout(() => {
        updatedResults.forEach((res, idx) => {
          const img = imageRefs.current[idx];
          const canvas = canvasRefs.current[idx];
          if (img && canvas) drawBoxes(img, canvas, res.boxes, res.matches);
        });
      }, 100);

    } catch (err: any) {
      setStatus(`❌ Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const drawBoxes = (image: HTMLImageElement, canvas: HTMLCanvasElement, boxes: any[], matches: any[]) => {
    canvas.width = image.clientWidth;
    canvas.height = image.clientHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const scaleX = image.clientWidth / image.naturalWidth;
    const scaleY = image.clientHeight / image.naturalHeight;

    boxes.forEach((box, index) => {
      const name = matches[index];
      const isMatched = name && name !== "Unknown";
      const dx = box.x * scaleX, dy = box.y * scaleY, dw = box.width * scaleX, dh = box.height * scaleY;

      ctx.strokeStyle = isMatched ? '#22c55e' : '#ef4444';
      ctx.lineWidth = 3;
      ctx.strokeRect(dx, dy, dw, dh);
      
      const label = name || 'Unknown';
      ctx.font = 'bold 12px Arial';
      const textWidth = ctx.measureText(label).width;
      ctx.fillStyle = isMatched ? '#22c55e' : '#ef4444';
      ctx.fillRect(dx, dy - 20, textWidth + 8, 20);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, dx + 4, dy - 5);
    });
  };

  // 🚀 ถ้ายังไม่โหลดที่ Client ให้ return null หรือ Loading เปล่าๆ ป้องกัน Error
  if (!isMounted) return null;

  return (
    <div className="flex flex-col items-center min-h-screen bg-slate-50 p-6 md:p-10 font-sans">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">📸 สแกนเช็คชื่อ</h1>
        <p className="text-slate-500 mt-2 font-medium">รหัสวิชา: {courseId}</p>
      </div>

      <div className="flex flex-col gap-5 bg-white p-8 rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl mb-8">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-600">อัปโหลดรูปภาพกลุ่มเพื่อเช็คชื่อ:</label>
          <input 
            type="file" 
            multiple 
            accept="image/*" 
            onChange={handleFileChange} 
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer" 
          />
        </div>
        
        <button 
          onClick={handleAttendance} 
          disabled={isLoading || !selectedFiles} 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 disabled:bg-slate-300 disabled:shadow-none transition-all active:scale-[0.98]"
        >
          {isLoading ? '⏳ กำลังสแกน...' : '🚀 เริ่มเช็คชื่อนักศึกษา'}
        </button>
        
        <div className={`text-center py-2 px-4 rounded-lg font-medium ${status.includes('❌') ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
          {status}
        </div>
      </div>

      {attendanceList.length > 0 && (
        <div className="w-full max-w-2xl bg-white p-8 rounded-2xl shadow-xl border-t-8 border-green-500 mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">มาเรียนวันนี้ ({attendanceList.length} คน)</h2>
          <div className="flex flex-wrap gap-2">
            {attendanceList.map((name, i) => (
              <span key={i} className="bg-green-50 text-green-700 px-4 py-2 rounded-xl text-sm font-semibold border border-green-100">
                ✅ {name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-7xl px-4">
        {scanResults.map((res, idx) => (
          <div key={idx} className="flex flex-col bg-white p-4 rounded-2xl shadow-lg border border-slate-100">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Image #{idx + 1}</span>
            </div>
            <div className="relative inline-block rounded-xl overflow-hidden bg-slate-100">
              <img
                ref={(el) => { imageRefs.current[idx] = el; }}
                src={res.url}
                className="block w-full h-auto"
                alt={`Scan result ${idx + 1}`}
              />
              <canvas
                ref={(el) => { canvasRefs.current[idx] = el; }}
                className="absolute top-0 left-0 pointer-events-none"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}